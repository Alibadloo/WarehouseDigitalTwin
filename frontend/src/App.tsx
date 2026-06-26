import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store, fetchShelves, fetchStats, fetchOllamaModels } from './store/store';
import { useAppDispatch, useAppSelector } from './store/store';
import WarehouseScene from './components/warehouse/WarehouseScene';
import StatsBar from './components/ui/StatsBar';
import ShelfPanel from './components/ui/ShelfPanel';
import AIPanel from './components/ui/AIPanel';
import Legend from './components/ui/Legend';
import SettingsModal from './components/ui/SettingsModal';

function App() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s) => s.warehouse.loading);
  const error = useAppSelector((s) => s.warehouse.error);
  const shelves = useAppSelector((s) => s.warehouse.shelves);
  const settingsOpen = useAppSelector((s) => s.warehouse.settingsOpen);
  const refreshInterval = useAppSelector((s) => s.warehouse.settings.refreshInterval);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = () => {
    dispatch(fetchShelves() as any);
    dispatch(fetchStats() as any);
  };

  useEffect(() => {
    loadAll();
    dispatch(fetchOllamaModels() as any);
  }, []);

  // Auto-refresh with configurable interval
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (refreshInterval > 0) {
      timerRef.current = setInterval(loadAll, refreshInterval * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refreshInterval]);

  if (loading && shelves.length === 0) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#070d1a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#3b82f6', fontFamily: 'system-ui, sans-serif', gap: 10,
      }}>
        <div style={{ fontSize: 36 }}>▣</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e5e7eb' }}>Loading Warehouse…</div>
        <div style={{ fontSize: 12, color: '#4b5563' }}>Connecting to backend on port 5052</div>
      </div>
    );
  }

  if (error && shelves.length === 0) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#070d1a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#ef4444', fontFamily: 'system-ui, sans-serif', gap: 10,
      }}>
        <div style={{ fontSize: 28 }}>⚠</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Cannot reach backend</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Make sure the C# API is running</div>
        <code style={{ fontSize: 11, background: 'rgba(255,255,255,.05)', padding: '6px 14px', borderRadius: 8, color: '#9ca3af' }}>
          cd backend && dotnet run
        </code>
        <button onClick={loadAll} style={{ marginTop: 8, padding: '7px 18px', borderRadius: 8, border: '1px solid #ef444444', background: '#ef444410', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <WarehouseScene />
      <StatsBar />
      <AIPanel />
      <ShelfPanel />
      <Legend />
      {settingsOpen && <SettingsModal />}

      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        background: 'rgba(7,13,26,.75)', backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 8, padding: '6px 12px',
        fontSize: 10, color: '#374151', lineHeight: 1.8,
      }}>
        🖱 Drag to orbit · Scroll to zoom · Right-drag to pan · Click shelf to inspect
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}
