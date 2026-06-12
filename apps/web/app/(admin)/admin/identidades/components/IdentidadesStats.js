'use client'

const STATS_CONFIG = [
  { key: 'total',         label: 'Total identidades', border: '#534AB7', color: null },
  { key: 'activas',       label: 'Activas',            border: '#1D9E75', color: '#27500A' },
  { key: 'comprometidas', label: 'Comprometidas',      border: '#E24B4A', color: '#A32D2D' },
  { key: 'expiradas',     label: 'Expiradas',          border: '#EF9F27', color: '#854F0B' },
  { key: 'por_vencer',    label: 'Vencen en 30 días',  border: '#854F0B', color: '#854F0B' },
]

export default function IdentidadesStats({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      {STATS_CONFIG.map(({ key, label, border, color }) => {
        const valor = stats ? (stats[key] ?? 0) : null
        // Cards de alerta con fondo coloreado cuando hay problemas
        const esAlerta = key === 'comprometidas' && valor > 0
        const esWarning = key === 'expiradas' && valor > 0

        return (
          <div key={key} style={{
            background: esAlerta ? '#FFF0F0' : esWarning ? '#FFFBF0' : '#fff',
            border: `1px solid ${esAlerta ? '#F5C6C6' : esWarning ? '#F5DFA0' : '#e2e0d8'}`,
            borderLeft: `4px solid ${border}`,
            borderRadius: 10,
            padding: '16px 20px',
            animation: esAlerta ? 'alertPulse 2s ease-in-out infinite' : undefined,
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: color ?? '#2C2C2A', lineHeight: 1, marginBottom: 6 }}>
              {valor !== null
                ? valor
                : <span style={{ display: 'inline-block', width: 48, height: 32, background: '#f1efe8', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
              }
            </div>
            <div style={{ fontSize: 12, color: '#888780', fontWeight: 500 }}>{label}</div>
          </div>
        )
      })}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes alertPulse { 0%,100%{border-color:#F5C6C6} 50%{border-color:#E24B4A} }
      `}</style>
    </div>
  )
}
