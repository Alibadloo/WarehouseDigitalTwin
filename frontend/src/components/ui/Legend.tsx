export default function Legend() {
  const items = [
    { color: '#374151', label: 'Empty (0%)' },
    { color: '#1e40af', label: 'Low (1–30%)' },
    { color: '#15803d', label: 'Medium (30–60%)' },
    { color: '#b45309', label: 'High (60–90%)' },
    { color: '#b91c1c', label: 'Critical (>90%)' },
    { color: '#f0abfc', label: 'Selected' },
    { color: '#fbbf24', label: 'Highlighted' },
  ];

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      background: 'rgba(7,13,26,.88)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 5,
      zIndex: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', letterSpacing: '.08em', marginBottom: 2 }}>LEGEND</div>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
