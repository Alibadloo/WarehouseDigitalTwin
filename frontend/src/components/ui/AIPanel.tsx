import { useAppSelector, useAppDispatch, clearAnalysis, highlightShelves, clearHighlights } from '../../store/store';

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

export default function AIPanel() {
  const dispatch = useAppDispatch();
  const analysis = useAppSelector((s) => s.warehouse.analysis);

  if (!analysis) return null;

  const healthColor = analysis.overall_health === 'GOOD' ? '#22c55e'
    : analysis.overall_health === 'WARNING' ? '#f59e0b' : '#ef4444';

  const handleHighlight = (codes: string[]) => {
    if (codes.length === 0) return;
    dispatch(highlightShelves(codes));
    setTimeout(() => dispatch(clearHighlights()), 5000);
  };

  return (
    <div style={{
      position: 'absolute', left: 16, top: 64,
      width: 290,
      background: 'rgba(7,13,26,.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(139,92,246,.25)',
      borderRadius: 14, padding: 16,
      color: '#e5e7eb',
      maxHeight: 'calc(100vh - 90px)',
      overflowY: 'auto',
      zIndex: 20,
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '.08em' }}>AI ANALYSIS</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4,
            padding: '2px 8px', borderRadius: 6,
            background: `${healthColor}15`, border: `1px solid ${healthColor}40`,
            fontSize: 11, fontWeight: 700, color: healthColor,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: healthColor, display: 'inline-block' }} />
            {analysis.overall_health}
          </div>
        </div>
        <button
          onClick={() => dispatch(clearAnalysis())}
          style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 6, color: '#6b7280', cursor: 'pointer', padding: '3px 7px', fontSize: 13 }}
        >
          ✕
        </button>
      </div>

      {/* summary */}
      <div style={{
        padding: '8px 10px', borderRadius: 8, marginBottom: 12,
        background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
        fontSize: 12, color: '#d1d5db', lineHeight: 1.5,
      }}>
        {analysis.summary}
      </div>

      {/* recommendations */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: '.08em', marginBottom: 8 }}>
        RECOMMENDATIONS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {analysis.recommendations.map((rec, i) => {
          const pc = PRIORITY_COLOR[rec.priority] ?? '#6b7280';
          return (
            <div
              key={i}
              onClick={() => handleHighlight(rec.shelves)}
              style={{
                padding: '10px 12px', borderRadius: 10,
                background: `${pc}08`, border: `1px solid ${pc}25`,
                cursor: rec.shelves.length > 0 ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: pc,
                  background: `${pc}20`, padding: '1px 6px', borderRadius: 4,
                }}>
                  {rec.priority}
                </span>
                {rec.shelves.length > 0 && (
                  <span style={{ fontSize: 10, color: '#4b5563' }}>tap to highlight ↗</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#e5e7eb', marginBottom: 3, lineHeight: 1.4 }}>{rec.action}</div>
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{rec.reason}</div>
              {rec.shelves.length > 0 && (
                <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {rec.shelves.map((code) => (
                    <span key={code} style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 4,
                      background: `${pc}18`, color: pc, fontFamily: 'monospace',
                    }}>{code}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: '#374151', textAlign: 'center' }}>
        Powered by Ollama · Click to highlight shelves
      </div>
    </div>
  );
}
