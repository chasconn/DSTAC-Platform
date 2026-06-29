'use client'

const STATS_CONFIG = [
  { key: 'total',      label: 'Total activos',      border: '#534AB7', value: null },
  { key: 'criticos',   label: 'Criticidad crítica', border: '#E24B4A', value: '#A32D2D' },
  { key: 'degradados', label: 'Degradados',          border: '#EF9F27', value: '#854F0B' },
  { key: 'operativos', label: 'Operativos',          border: '#1D9E75', value: '#27500A' },
]

export default function ActivosStats({ stats }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12,
    }}>
      {STATS_CONFIG.map(({ key, label, border, value }) => (
        <div key={key} style={{
          background: '#fff',
          border: '1px solid #e2e0d8',
          borderLeft: `4px solid ${border}`,
          borderRadius: 10,
          padding: '16px 20px',
        }}>
          {/* Número grande — skeleton si aún no llegan los datos */}
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: value ?? '#2C2C2A',
            lineHeight: 1,
            marginBottom: 6,
          }}>
            {stats
              ? (stats[key] ?? 0)
              : <span style={{
                  display: 'inline-block',
                  width: 48, height: 32,
                  background: '#f1efe8',
                  borderRadius: 6,
                  animation: 'pulse 1.4s ease-in-out infinite',
                }} />
            }
          </div>
          <div style={{ fontSize: 12, color: '#888780', fontWeight: 500 }}>
            {label}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
