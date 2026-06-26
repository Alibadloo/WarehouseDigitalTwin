import { useState } from 'react';
import {
  useAppSelector, useAppDispatch,
  selectShelf, fetchShelfDetail, fetchShelves, fetchStats,
  fetchMoveSuggestions, highlightShelves, clearHighlights,
  addItem, updateItem, deleteItem, moveItem,
  deleteShelf, updateShelf,
} from '../../store/store';
import type { ItemData } from '../../types';

const CATEGORIES = ['Electronics', 'Food & Beverage', 'Clothing', 'Tools', 'Automotive', 'Chemicals', 'Packaging', 'General'];

interface ItemForm {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  weight: number;
}

const emptyForm = (): ItemForm => ({ name: '', sku: '', category: 'General', quantity: 1, weight: 1 });

export default function ShelfPanel() {
  const dispatch = useAppDispatch();
  const shelf = useAppSelector((s) => s.warehouse.selectedShelf);
  const suggestions = useAppSelector((s) => s.warehouse.moveSuggestions);
  const allShelves = useAppSelector((s) => s.warehouse.shelves);

  const [mode, setMode] = useState<'view' | 'addItem' | 'editShelf'>('view');
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyForm());
  const [deletingItem, setDeletingItem] = useState<number | null>(null);
  const [movingItem, setMovingItem] = useState<ItemData | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [shelfCapacity, setShelfCapacity] = useState(0);
  const [shelfCategory, setShelfCategory] = useState('');
  const [shelfNotes, setShelfNotes] = useState('');
  const [confirmDeleteShelf, setConfirmDeleteShelf] = useState(false);

  if (!shelf) return null;

  const pct = shelf.occupancyPct;
  const fillColor = pct === 0 ? '#4b5563' : pct < 30 ? '#3b82f6' : pct < 60 ? '#22c55e' : pct < 90 ? '#f59e0b' : '#ef4444';

  const refresh = async () => {
    await dispatch(fetchShelfDetail(shelf.id) as any);
    await dispatch(fetchShelves() as any);
    await dispatch(fetchStats() as any);
  };

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  // ── Add item ──
  const handleAddItem = async () => {
    if (!itemForm.name || itemForm.quantity < 1) return;
    setBusy(true);
    try {
      await dispatch(addItem({ ...itemForm, shelfId: shelf.id }) as any);
      await refresh();
      setItemForm(emptyForm());
      setMode('view');
      showMsg('✅ Item added');
    } catch (e: any) {
      showMsg(`❌ ${e?.response?.data?.error ?? 'Failed'}`);
    }
    setBusy(false);
  };

  // ── Edit item ──
  const startEdit = (item: ItemData) => {
    setEditingItem(item);
    setItemForm({ name: item.name, sku: item.sku, category: item.category, quantity: item.quantity, weight: item.weight });
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    setBusy(true);
    try {
      await dispatch(updateItem({ id: editingItem.id, ...itemForm }) as any);
      await refresh();
      setEditingItem(null);
      setItemForm(emptyForm());
      showMsg('✅ Item updated');
    } catch (e: any) {
      showMsg(`❌ ${e?.response?.data?.error ?? 'Failed'}`);
    }
    setBusy(false);
  };

  // ── Delete item ──
  const handleDeleteItem = async (id: number) => {
    setBusy(true);
    await dispatch(deleteItem(id) as any);
    await refresh();
    setDeletingItem(null);
    showMsg('✅ Item deleted');
    setBusy(false);
  };

  // ── Move item ──
  const handleMoveItem = async () => {
    if (!movingItem || !moveTarget) return;
    const targetShelf = allShelves.find(s => s.code === moveTarget);
    if (!targetShelf) return;
    setBusy(true);
    try {
      await dispatch(moveItem({ itemId: movingItem.id, toShelfId: targetShelf.id, reason: moveReason || 'Manual move' }) as any);
      await refresh();
      setMovingItem(null);
      setMoveTarget('');
      setMoveReason('');
      showMsg(`✅ Moved to ${moveTarget}`);
    } catch (e: any) {
      showMsg(`❌ ${e?.response?.data?.error ?? 'Failed'}`);
    }
    setBusy(false);
  };

  // ── AI suggestions ──
  const handleSuggestMove = async () => {
    setLoadingSugg(true);
    await dispatch(fetchMoveSuggestions({ shelfCode: shelf.code, items: shelf.items, allShelves }) as any);
    setLoadingSugg(false);
  };

  const handleHighlight = (codes: string[]) => {
    dispatch(highlightShelves(codes));
    setTimeout(() => dispatch(clearHighlights()), 5000);
  };

  // ── Edit shelf ──
  const openEditShelf = () => {
    setShelfCapacity(shelf.maxCapacity);
    setShelfCategory(shelf.category);
    setShelfNotes(shelf.notes ?? '');
    setMode('editShelf');
  };

  const handleUpdateShelf = async () => {
    setBusy(true);
    try {
      await dispatch(updateShelf({ id: shelf.id, maxCapacity: shelfCapacity, category: shelfCategory, notes: shelfNotes }) as any);
      await refresh();
      setMode('view');
      showMsg('✅ Shelf updated');
    } catch {
      showMsg('❌ Failed to update shelf');
    }
    setBusy(false);
  };

  const handleDeleteShelf = async () => {
    if (shelf.items.length > 0) { showMsg('❌ Remove all items before deleting shelf'); return; }
    setBusy(true);
    try {
      await dispatch(deleteShelf(shelf.id) as any);
      await dispatch(fetchShelves() as any);
      await dispatch(fetchStats() as any);
      dispatch(selectShelf(null));
    } catch (e: any) {
      showMsg(`❌ ${e?.response?.data?.error ?? 'Cannot delete shelf'}`);
    }
    setBusy(false);
  };

  const availableShelves = allShelves.filter(s => s.id !== shelf.id && s.occupancyPct < 95);

  return (
    <div style={{
      position: 'absolute', right: 16, top: 64,
      width: 320, maxHeight: 'calc(100vh - 88px)',
      background: 'rgba(7,13,26,.95)', backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,.1)', borderRadius: 14,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', zIndex: 20,
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f3f4f6' }}>{shelf.code}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Zone {shelf.zone} · Row {shelf.row} · Col {shelf.column}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={openEditShelf} title="Edit shelf" style={iconBtn}>✎</button>
            <button onClick={() => dispatch(selectShelf(null))} style={iconBtn}>✕</button>
          </div>
        </div>

        {/* Category badge */}
        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,.2)', color: '#a5b4fc', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
          {shelf.category}
        </div>

        {/* Occupancy bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#9ca3af' }}>Occupancy</span>
            <span style={{ color: fillColor, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 7, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: fillColor, borderRadius: 4, boxShadow: `0 0 6px ${fillColor}88`, transition: 'width .5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 3, color: '#4b5563' }}>
            <span>{shelf.currentCount} items stored</span>
            <span>Max {shelf.maxCapacity}</span>
          </div>
        </div>

        {shelf.notes && (
          <div style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.2)', fontSize: 11, color: '#fcd34d', marginBottom: 10 }}>
            📝 {shelf.notes}
          </div>
        )}

        {msg && (
          <div style={{ padding: '6px 10px', borderRadius: 7, background: msg.startsWith('✅') ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', color: msg.startsWith('✅') ? '#86efac' : '#fca5a5', fontSize: 12, marginBottom: 8 }}>
            {msg}
          </div>
        )}
      </div>

      {/* ── EDIT SHELF MODE ── */}
      {mode === 'editShelf' && (
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: '.07em', marginBottom: 10 }}>EDIT SHELF</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FormField label="Max Capacity">
              <input type="number" min={shelf.currentCount} value={shelfCapacity} onChange={e => setShelfCapacity(+e.target.value)} style={finp} />
            </FormField>
            <FormField label="Category">
              <select value={shelfCategory} onChange={e => setShelfCategory(e.target.value)} style={finp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Notes (optional)">
              <input value={shelfNotes} onChange={e => setShelfNotes(e.target.value)} placeholder="e.g. Cold storage" style={finp} />
            </FormField>

            <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
              <button onClick={handleUpdateShelf} disabled={busy} style={{ ...actBtn, background: '#1d4ed8', color: '#fff', border: 'none', flex: 2 }}>
                {busy ? '⟳' : '💾 Save'}
              </button>
              <button onClick={() => setMode('view')} style={{ ...actBtn, background: 'rgba(255,255,255,.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,.1)', flex: 1 }}>
                Cancel
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 10, marginTop: 4 }}>
              {confirmDeleteShelf ? (
                <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 8 }}>⚠ This will permanently delete shelf {shelf.code}. Only possible if empty.</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleDeleteShelf} disabled={busy} style={{ ...actBtn, background: 'rgba(239,68,68,.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)', flex: 1 }}>Delete</button>
                    <button onClick={() => setConfirmDeleteShelf(false)} style={{ ...actBtn, background: 'rgba(255,255,255,.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,.08)', flex: 1 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteShelf(true)} style={{ ...actBtn, width: '100%', background: 'rgba(239,68,68,.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,.15)' }}>
                  🗑 Delete Shelf
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODE ── */}
      {mode === 'view' && (
        <div style={{ padding: '0 18px 18px' }}>

          {/* Items list */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '.07em', marginBottom: 8 }}>
            ITEMS ({shelf.items.length})
          </div>

          {shelf.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '18px 0', color: '#374151', fontSize: 13 }}>Shelf is empty</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
              {shelf.items.map(item => (
                <div key={item.id}>
                  {editingItem?.id === item.id ? (
                    /* ── Inline edit form ── */
                    <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" style={finp} />
                        <input value={itemForm.sku} onChange={e => setItemForm(p => ({ ...p, sku: e.target.value }))} placeholder="SKU" style={finp} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input type="number" min={1} value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: +e.target.value }))} placeholder="Qty" style={{ ...finp, flex: 1 }} />
                          <input type="number" min={0} step={0.1} value={itemForm.weight} onChange={e => setItemForm(p => ({ ...p, weight: +e.target.value }))} placeholder="kg" style={{ ...finp, flex: 1 }} />
                        </div>
                        <select value={itemForm.category} onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))} style={finp}>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={handleEditItem} disabled={busy} style={{ ...actBtn, background: '#1d4ed8', color: '#fff', border: 'none', flex: 2 }}>
                            {busy ? '⟳' : '✓ Save'}
                          </button>
                          <button onClick={() => { setEditingItem(null); setItemForm(emptyForm()); }} style={{ ...actBtn, background: 'rgba(255,255,255,.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,.1)', flex: 1 }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : movingItem?.id === item.id ? (
                    /* ── Move form ── */
                    <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)' }}>
                      <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}>Move "{item.name}" to:</div>
                      <select value={moveTarget} onChange={e => setMoveTarget(e.target.value)} style={{ ...finp, marginBottom: 6 }}>
                        <option value="">— Select destination —</option>
                        {availableShelves.map(s => (
                          <option key={s.id} value={s.code}>{s.code} ({s.occupancyPct.toFixed(0)}% full, {s.category})</option>
                        ))}
                      </select>
                      <input value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder="Reason (optional)" style={{ ...finp, marginBottom: 6 }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={handleMoveItem} disabled={busy || !moveTarget} style={{ ...actBtn, background: '#92400e', color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)', flex: 2 }}>
                          {busy ? '⟳' : '→ Move'}
                        </button>
                        <button onClick={() => { setMovingItem(null); setMoveTarget(''); setMoveReason(''); }} style={{ ...actBtn, background: 'rgba(255,255,255,.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,.1)', flex: 1 }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : deletingItem === item.id ? (
                    /* ── Delete confirm ── */
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 11, color: '#fca5a5' }}>Delete "{item.name}"?</div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => handleDeleteItem(item.id)} disabled={busy} style={{ ...actBtn, background: 'rgba(239,68,68,.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)', padding: '3px 10px' }}>Yes</button>
                        <button onClick={() => setDeletingItem(null)} style={{ ...actBtn, background: 'rgba(255,255,255,.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,.08)', padding: '3px 10px' }}>No</button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal item row ── */
                    <div style={{ padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>
                          {item.sku} · Qty: <b style={{ color: '#9ca3af' }}>{item.quantity}</b> · {item.weight}kg
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        <button onClick={() => startEdit(item)} title="Edit" style={microBtn('rgba(59,130,246,.6)')}>✎</button>
                        <button onClick={() => { setMovingItem(item); setMoveTarget(''); }} title="Move" style={microBtn('rgba(245,158,11,.6)')}>→</button>
                        <button onClick={() => setDeletingItem(item.id)} title="Delete" style={microBtn('rgba(239,68,68,.6)')}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add item button */}
          {mode === 'view' && (
            <button onClick={() => { setMode('addItem'); setItemForm(emptyForm()); setEditingItem(null); }}
              style={{ ...actBtn, width: '100%', background: 'rgba(34,197,94,.08)', color: '#86efac', border: '1px solid rgba(34,197,94,.2)', marginBottom: 12 }}>
              + Add Item to Shelf
            </button>
          )}

          {/* AI suggestions */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 12 }}>
            {shelf.items.length > 0 && (
              <button onClick={handleSuggestMove} disabled={loadingSugg}
                style={{ ...actBtn, width: '100%', background: 'rgba(139,92,246,.1)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,.25)', marginBottom: 8 }}>
                {loadingSugg ? '✦ AI thinking…' : '✦ AI: Suggest where to move'}
              </button>
            )}

            {suggestions?.suggestions && suggestions.suggestions.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', letterSpacing: '.07em', marginBottom: 6 }}>SUGGESTIONS</div>
                {suggestions.suggestions.map((s, i) => (
                  <div key={i} onClick={() => handleHighlight([s.targetShelf])}
                    style={{ padding: '7px 10px', borderRadius: 8, marginBottom: 5, background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.2)', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>→ {s.targetShelf}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.reason}</div>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: '#374151', textAlign: 'center' }}>Click to highlight in 3D view</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD ITEM MODE ── */}
      {mode === 'addItem' && (
        <div style={{ padding: '0 18px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: '.07em', marginBottom: 10 }}>ADD NEW ITEM</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FormField label="Name *">
              <input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Electronics Box #123" style={finp} />
            </FormField>
            <FormField label="SKU (leave blank to auto-generate)">
              <input value={itemForm.sku} onChange={e => setItemForm(p => ({ ...p, sku: e.target.value }))} placeholder="SKU-XXXXX" style={finp} />
            </FormField>
            <FormField label="Category">
              <select value={itemForm.category} onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))} style={finp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <div style={{ display: 'flex', gap: 8 }}>
              <FormField label="Quantity *" style={{ flex: 1 }}>
                <input type="number" min={1} value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: +e.target.value }))} style={finp} />
              </FormField>
              <FormField label="Weight (kg)" style={{ flex: 1 }}>
                <input type="number" min={0} step={0.1} value={itemForm.weight} onChange={e => setItemForm(p => ({ ...p, weight: +e.target.value }))} style={finp} />
              </FormField>
            </div>

            <div style={{ fontSize: 11, color: pct >= 90 ? '#ef4444' : '#6b7280', marginTop: 2 }}>
              Available space: {shelf.maxCapacity - shelf.currentCount} units
            </div>

            <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
              <button onClick={handleAddItem} disabled={busy || !itemForm.name || itemForm.quantity < 1}
                style={{ ...actBtn, flex: 2, background: '#1d4ed8', color: '#fff', border: 'none' }}>
                {busy ? '⟳ Adding…' : '+ Add Item'}
              </button>
              <button onClick={() => { setMode('view'); setItemForm(emptyForm()); }}
                style={{ ...actBtn, flex: 1, background: 'rgba(255,255,255,.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,.1)' }}>
                Cancel
              </button>
            </div>

            {msg && <div style={{ fontSize: 12, color: msg.startsWith('✅') ? '#86efac' : '#fca5a5' }}>{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 7,
  color: '#6b7280', cursor: 'pointer', padding: '4px 8px', fontSize: 13,
};

const actBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, transition: 'all .15s',
};

const finp: React.CSSProperties = {
  width: '100%', padding: '7px 9px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)',
  color: '#e5e7eb', fontSize: 12, outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function microBtn(color: string): React.CSSProperties {
  return {
    background: `${color}20`, border: `1px solid ${color}40`,
    borderRadius: 6, color, cursor: 'pointer',
    padding: '3px 7px', fontSize: 11, fontWeight: 700,
    transition: 'all .12s',
  };
}
