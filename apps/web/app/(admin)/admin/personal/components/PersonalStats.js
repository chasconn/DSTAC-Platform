'use client'

const STATS_CONFIG = [
  { key: 'total',           label: 'Total personal',  border: '#534AB7', color: null },
  { key: 'activos',         label: 'Activos',          border: '#1D9E75', color: '#27500A' },
  { key: 'desvinculados',   label: 'Desvinculados',    border: '#E24B4A', color: '#A32D2D' },
  { key: 'con_identidades', label: 'Con identidades',  border: '#EF9F27', color: '#854F0B' },
]

export default function PersonalStats({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      {STATS_CONFIG.map(({ key, label, border, color }) => (
        <div key={key} style={{
          background: '#fff',
          border: '1px solid #e2e0d8',
          borderLeft: `4px solid ${border}`,
          borderRadius: 10,
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: color ?? '#2C2C2A', lineHeight: 1, marginBottom: 6 }}>
            {stats
              ? (stats[key] ?? 0)
              : <span style={{ display: 'inline-block', width: 48, height: 32, background: '#f1efe8', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
            }
          </div>
          <div style={{ fontSize: 12, color: '#888780', fontWeight: 500 }}>{label}</div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  )
}
