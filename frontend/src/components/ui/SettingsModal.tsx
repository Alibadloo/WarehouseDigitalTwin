import { useState, useEffect } from 'react';
import {
  useAppSelector, useAppDispatch,
  closeSettings, updateSettings, checkConnections,
  fetchOllamaModels, updateAIModel,
  resetWarehouse, exportWarehouse,
  fetchShelves, fetchStats,
  addShelf,
} from '../../store/store';

type Tab = 'connection' | 'model' | 'data' | 'shelves';

const CATEGORIES = ['Electronics', 'Food & Beverage', 'Clothing', 'Tools', 'Automotive', 'Chemicals', 'Packaging', 'General'];

export default function SettingsModal() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.warehouse.settings);
  const stats = useAppSelector((s) => s.warehouse.stats);
  const conn = useAppSelector((s) => s.warehouse.connectionStatus);
  const ollamaModels = useAppSelector((s) => s.warehouse.ollamaModels);
  const activeModel = useAppSelector((s) => s.warehouse.activeModel);
  const resetting = useAppSelector((s) => s.warehouse.resetting);

  const [tab, setTab] = useState<Tab>('connection');
  const [backendUrl, setBackendUrl] = useState(settings.backendUrl);
  const [aiUrl, setAiUrl] = useState(settings.aiUrl);
  const [refreshInterval, setRefreshInterval] = useState(settings.refreshInterval);
  const [testing, setTesting] = useState(false);
  const [selectedModel, setSelectedModel] = useState(activeModel);
  const [modelUpdating, setModelUpdating] = useState(false);
  const [modelMsg, setModelMsg] = useState('');
  const [resetConfirm, setResetConfirm] = useState<'empty' | 'seed' | null>(null);
  const [resetDone, setResetDone] = useState('');

  // Add shelf form
  const [newShelf, setNewShelf] = useState({ zone: 'A', row: 1, column: 1, maxCapacity: 50, category: 'General' });
  const [shelfMsg, setShelfMsg] = useState('');

  useEffect(() => {
    setSelectedModel(activeModel);
  }, [activeModel]);

  const testConnections = async () => {
    setTesting(true);
    await dispatch(checkConnections() as any);
    setTesting(false);
  };

  const saveConnections = () => {
    dispatch(updateSettings({ backendUrl, aiUrl, refreshInterval }));
  };

  const handleModelUpdate = async () => {
    if (!selectedModel || selectedModel === activeModel) return;
    setModelUpdating(true);
    setModelMsg('');
    try {
      await dispatch(updateAIModel(selectedModel) as any);
      setModelMsg(`✅ Model changed to ${selectedModel}`);
    } catch {
      setModelMsg('❌ Failed to update model');
    }
    setModelUpdating(false);
  };

  const handleReset = async () => {
    if (!resetConfirm) return;
    await dispatch(resetWarehouse(resetConfirm) as any);
    await dispatch(fetchShelves() as any);
    await dispatch(fetchStats() as any);
    setResetConfirm(null);
    setResetDone(resetConfirm === 'seed' ? '✅ Reset with sample data complete' : '✅ Warehouse cleared');
    setTimeout(() => setResetDone(''), 4000);
  };

  const handleAddShelf = async () => {
    setShelfMsg('');
    try {
      await dispatch(addShelf(newShelf) as any);
      await dispatch(fetchShelves() as any);
      await dispatch(fetchStats() as any);
      setShelfMsg(`✅ Shelf ${newShelf.zone}-${String(newShelf.row).padStart(2, '0')}${String(newShelf.column).padStart(2, '0')} added`);
      setNewShelf({ zone: 'A', row: 1, column: 1, maxCapacity: 50, category: 'General' });
    } catch (e: any) {
      setShelfMsg(`❌ ${e?.response?.data?.error ?? 'Failed to add shelf'}`);
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'connection', label: '🔌 Connection' },
    { id: 'model', label: '🤖 AI & Model' },
    { id: 'data', label: '🗄 Data' },
    { id: 'shelves', label: '🏗 Shelves' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={() => dispatch(closeSettings())}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 540, maxHeight: '88vh',
          background: '#0d1424',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 18, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,.02)',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f3f4f6' }}>⚙ Professional Settings</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>Warehouse Digital Twin Configuration</div>
          </div>
          <button onClick={() => dispatch(closeSettings())} style={closeBtn}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '11px 4px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontSize: 11, fontWeight: 600,
              color: tab === t.id ? '#60a5fa' : '#6b7280',
              borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all .15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>

          {/* ── CONNECTION ── */}
          {tab === 'connection' && (
            <div style={colGap(16)}>
              <Section title="Backend API (C# .NET)">
                <Field label="URL">
                  <input value={backendUrl} onChange={e => setBackendUrl(e.target.value)} style={inp} placeholder="http://localhost:5052" />
                </Field>
                {conn && (
                  <StatusBadge ok={conn.backend} okLabel="Connected" failLabel="Unreachable" />
                )}
              </Section>

              <Section title="AI Service (Python / Ollama)">
                <Field label="URL">
                  <input value={aiUrl} onChange={e => setAiUrl(e.target.value)} style={inp} placeholder="http://localhost:8002" />
                </Field>
                {conn && (
                  <StatusBadge ok={conn.ai} okLabel="Connected" failLabel="Unreachable" />
                )}
              </Section>

              <Section title="Auto-Refresh">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 15, 30, 60].map(v => (
                    <button key={v} onClick={() => setRefreshInterval(v)} style={{
                      flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: refreshInterval === v ? '#1d4ed8' : 'rgba(255,255,255,.06)',
                      color: refreshInterval === v ? '#fff' : '#6b7280',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {v === 0 ? 'Off' : `${v}s`}
                    </button>
                  ))}
                </div>
              </Section>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={testConnections} disabled={testing} style={{ ...btn, flex: 1, background: 'rgba(99,102,241,.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.3)' }}>
                  {testing ? '⟳ Testing…' : '⚡ Test Connections'}
                </button>
                <button onClick={saveConnections} style={{ ...btn, flex: 1, background: '#1d4ed8', color: '#fff', border: 'none' }}>
                  💾 Save
                </button>
              </div>
            </div>
          )}

          {/* ── AI & MODEL ── */}
          {tab === 'model' && (
            <div style={colGap(16)}>
              <Section title="Ollama Status">
                <button onClick={() => dispatch(fetchOllamaModels() as any)} style={{ ...btn, background: 'rgba(255,255,255,.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,.1)', marginBottom: 10 }}>
                  ↺ Refresh Models
                </button>
                {ollamaModels.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#ef4444', padding: '10px 0' }}>
                    No models found — make sure Ollama is running and models are installed.<br />
                    <code style={{ fontSize: 11, color: '#6b7280' }}>ollama pull llama3.2</code>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ollamaModels.map(m => (
                      <button key={m} onClick={() => setSelectedModel(m)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: selectedModel === m ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.04)',
                        color: selectedModel === m ? '#93c5fd' : '#9ca3af',
                        transition: 'all .15s',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: m === activeModel ? '#22c55e' : 'rgba(255,255,255,.2)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: selectedModel === m ? '#e5e7eb' : '#9ca3af' }}>{m}</div>
                          {m === activeModel && <div style={{ fontSize: 10, color: '#22c55e' }}>Active</div>}
                        </div>
                        {selectedModel === m && selectedModel !== activeModel && (
                          <span style={{ fontSize: 10, color: '#60a5fa' }}>→ Select</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Section>

              {selectedModel !== activeModel && (
                <button onClick={handleModelUpdate} disabled={modelUpdating} style={{ ...btn, background: '#1d4ed8', color: '#fff', border: 'none' }}>
                  {modelUpdating ? '⟳ Updating…' : `✓ Switch to ${selectedModel}`}
                </button>
              )}

              {modelMsg && (
                <div style={{ fontSize: 12, color: modelMsg.startsWith('✅') ? '#22c55e' : '#ef4444', padding: '6px 0' }}>
                  {modelMsg}
                </div>
              )}

              <Section title="Current Configuration">
                <InfoRow label="Active Model" value={activeModel || '—'} />
                <InfoRow label="AI Service" value={settings.aiUrl} />
              </Section>
            </div>
          )}

          {/* ── DATA ── */}
          {tab === 'data' && (
            <div style={colGap(16)}>
              {stats && (
                <Section title="Current State">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <StatChip label="Shelves" value={stats.totalShelves} />
                    <StatChip label="Items" value={stats.totalItems} />
                    <StatChip label="Empty" value={stats.emptyShelves} />
                    <StatChip label="Fill" value={`${stats.avgOccupancyPct.toFixed(0)}%`} />
                  </div>
                </Section>
              )}

              <Section title="Reset Warehouse">
                <div style={colGap(8)}>
                  {resetConfirm === 'seed' ? (
                    <ConfirmBox
                      message="Load 60 shelves with realistic sample items. Current data will be deleted."
                      color="#f59e0b"
                      onConfirm={handleReset}
                      onCancel={() => setResetConfirm(null)}
                      loading={resetting}
                    />
                  ) : (
                    <button onClick={() => setResetConfirm('seed')} style={{ ...btn, background: 'rgba(245,158,11,.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.25)' }}>
                      🔄 Reset with Sample Data
                    </button>
                  )}

                  {resetConfirm === 'empty' ? (
                    <ConfirmBox
                      message="This will permanently delete ALL shelves and items. The warehouse will be completely empty."
                      color="#ef4444"
                      onConfirm={handleReset}
                      onCancel={() => setResetConfirm(null)}
                      loading={resetting}
                    />
                  ) : (
                    <button onClick={() => setResetConfirm('empty')} style={{ ...btn, background: 'rgba(239,68,68,.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,.25)' }}>
                      🗑 Clear All Data (Start Fresh)
                    </button>
                  )}
                </div>
                {resetDone && <div style={{ fontSize: 12, color: '#22c55e', marginTop: 8 }}>{resetDone}</div>}
              </Section>

              <Section title="Export / Import">
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => dispatch(exportWarehouse() as any)} style={{ ...btn, flex: 1, background: 'rgba(99,102,241,.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.25)' }}>
                    📤 Export JSON
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 6 }}>
                  Export saves all shelves and items as a JSON file you can import later.
                </div>
              </Section>
            </div>
          )}

          {/* ── SHELVES ── */}
          {tab === 'shelves' && (
            <div style={colGap(16)}>
              <Section title="Add New Shelf">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Zone">
                    <select value={newShelf.zone} onChange={e => setNewShelf(p => ({ ...p, zone: e.target.value }))} style={inp}>
                      {['A', 'B', 'C', 'D', 'E'].map(z => <option key={z} value={z}>Zone {z}</option>)}
                    </select>
                  </Field>
                  <Field label="Row">
                    <input type="number" min={1} max={20} value={newShelf.row}
                      onChange={e => setNewShelf(p => ({ ...p, row: +e.target.value }))} style={inp} />
                  </Field>
                  <Field label="Column">
                    <input type="number" min={1} max={20} value={newShelf.column}
                      onChange={e => setNewShelf(p => ({ ...p, column: +e.target.value }))} style={inp} />
                  </Field>
                  <Field label="Max Capacity">
                    <input type="number" min={1} max={500} value={newShelf.maxCapacity}
                      onChange={e => setNewShelf(p => ({ ...p, maxCapacity: +e.target.value }))} style={inp} />
                  </Field>
                  <Field label="Category" style={{ gridColumn: '1 / -1' }}>
                    <select value={newShelf.category} onChange={e => setNewShelf(p => ({ ...p, category: e.target.value }))} style={inp}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <button onClick={handleAddShelf} style={{ ...btn, marginTop: 6, background: '#1d4ed8', color: '#fff', border: 'none' }}>
                  + Add Shelf
                </button>
                {shelfMsg && <div style={{ fontSize: 12, color: shelfMsg.startsWith('✅') ? '#22c55e' : '#ef4444', marginTop: 6 }}>{shelfMsg}</div>}
              </Section>

              <Section title="How Shelf Codes Work">
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7 }}>
                  Zone <strong style={{ color: '#9ca3af' }}>A</strong>, Row <strong style={{ color: '#9ca3af' }}>3</strong>, Column <strong style={{ color: '#9ca3af' }}>2</strong> → Code <strong style={{ color: '#60a5fa' }}>A-0302</strong><br />
                  Zone <strong style={{ color: '#9ca3af' }}>B</strong>, Row <strong style={{ color: '#9ca3af' }}>1</strong>, Column <strong style={{ color: '#9ca3af' }}>4</strong> → Code <strong style={{ color: '#60a5fa' }}>B-0104</strong>
                </div>
              </Section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', letterSpacing: '.08em', marginBottom: 10 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function StatusBadge({ ok, okLabel, failLabel }: { ok: boolean; okLabel: string; failLabel: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 6 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? '#22c55e' : '#ef4444' }} />
      <span style={{ color: ok ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{ok ? okLabel : failLabel}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', fontSize: 12 }}>
      <div style={{ color: '#4b5563', fontSize: 10 }}>{label}</div>
      <div style={{ color: '#e5e7eb', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ConfirmBox({ message, color, onConfirm, onCancel, loading }: {
  message: string; color: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: `${color}08`, border: `1px solid ${color}30` }}>
      <div style={{ fontSize: 12, color: '#d1d5db', marginBottom: 10, lineHeight: 1.5 }}>⚠ {message}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} disabled={loading} style={{ ...btn, flex: 1, background: `${color}20`, color, border: `1px solid ${color}40` }}>
          {loading ? '⟳ Processing…' : 'Confirm'}
        </button>
        <button onClick={onCancel} style={{ ...btn, flex: 1, background: 'rgba(255,255,255,.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,.1)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const closeBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 8,
  color: '#6b7280', cursor: 'pointer', padding: '5px 10px', fontSize: 14,
};

const btn: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, transition: 'all .15s', width: '100%',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)',
  color: '#e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function colGap(gap: number): React.CSSProperties {
  return { display: 'flex', flexDirection: 'column', gap };
}
