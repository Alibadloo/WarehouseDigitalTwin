import { useAppSelector, useAppDispatch, setFilter, fetchShelves, fetchStats, runAIAnalysis, openSettings } from '../../store/store';

export default function StatsBar() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector((s) => s.warehouse.stats);
  const filter = useAppSelector((s) => s.warehouse.filter);
  const shelves = useAppSelector((s) => s.warehouse.shelves);
  const aiLoading = useAppSelector((s) => s.warehouse.aiLoading);
  const analysis = useAppSelector((s) => s.warehouse.analysis);
  const loading = useAppSelector((s) => s.warehouse.loading);

  const refresh = () => {
    dispatch(fetchShelves() as any);
    dispatch(fetchStats() as any);
  };

  const runAI = () => {
    if (shelves.length > 0) dispatch(runAIAnalysis(shelves) as any);
  };

  const healthColor = analysis?.overall_health === 'GOOD' ? '#22c55e'
    : analysis?.overall_health === 'WARNING' ? '#f59e0b' : '#ef4444';

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'empty', label: 'Empty' },
    { id: 'warning', label: 'Warning' },
    { id: 'full', label: 'Critical' },
  ] as const;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      padding: '9px 14px',
      background: 'linear-gradient(180deg, rgba(7,13,26,.96) 0%, rgba(7,13,26,.82) 100%)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,.07)',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ fontWeight: 800, fontSize: 14, color: '#e5e7eb', letterSpacing: '.04em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#3b82f6', fontSize: 18 }}>▣</span>
        <span>Warehouse Digital Twin</span>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip label="Shelves" value={stats.totalShelves} color="#6b7280" />
          <Chip label="Items" value={stats.totalItems.toLocaleString()} color="#3b82f6" />
          <Chip label="Empty" value={stats.emptyShelves} color="#9ca3af" />
          <Chip label="Critical" value={stats.fullShelves} color="#ef4444" />
          <Chip label="Fill" value={`${stats.avgOccupancyPct.toFixed(0)}%`} color="#f59e0b" />
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Filter */}
      <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: 3 }}>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => dispatch(setFilter(f.id))} style={{
            padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            background: filter === f.id ? '#3b82f6' : 'transparent',
            color: filter === f.id ? '#fff' : '#6b7280',
            transition: 'all .15s',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* AI */}
      <button onClick={runAI} disabled={aiLoading || shelves.length === 0} style={{
        padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(139,92,246,.35)',
        background: analysis ? 'rgba(139,92,246,.15)' : 'rgba(139,92,246,.07)',
        color: '#a78bfa', cursor: 'pointer', fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      }}>
        {aiLoading ? '⟳ Analyzing…' : '✦ AI Analysis'}
        {analysis && <span style={{ width: 7, height: 7, borderRadius: '50%', background: healthColor, display: 'inline-block' }} />}
      </button>

      {/* Refresh */}
      <button onClick={refresh} title="Refresh data" style={{
        padding: '5px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)', color: '#6b7280', cursor: 'pointer', fontSize: 13,
        animation: loading ? 'spin .8s linear infinite' : 'none',
      }}>
        ↺
      </button>

      {/* Settings */}
      <button onClick={() => dispatch(openSettings())} title="Settings" style={{
        padding: '5px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)',
        background: 'rgba(255,255,255,.04)', color: '#9ca3af', cursor: 'pointer', fontSize: 14,
      }}>
        ⚙
      </button>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '3px 7px', borderRadius: 6,
      background: `${color}12`, border: `1px solid ${color}28`, fontSize: 11,
    }}>
      <span style={{ color: '#4b5563' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
