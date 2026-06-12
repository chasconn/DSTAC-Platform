'use client'

function scoreColor(pct) {
  if (pct >= 76) return '#1D9E75'
  if (pct >= 51) return '#EF9F27'
  if (pct >= 26) return '#EF9F27'
  return '#E24B4A'
}

function scoreLabel(pct) {
  if (pct >= 76) return 'Alto'
  if (pct >= 51) return 'Medio'
  if (pct >= 26) return 'Bajo'
  return 'Crítico'
}

export default function DomainCard({ domain, onClick }) {
  const score  = Math.round(Number(domain.score) || 0)
  const color  = domain.color ?? scoreColor(score)
  const total  = domain.total_controls || 0

  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8',
      padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
      display: 'flex', alignItems: 'center', gap: 16,
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(60,52,137,0.1)'; e.currentTarget.style.borderColor = '#c8c4f0' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e0d8' }}
    >
      {/* Badge dominio */}
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: 0.5 }}>{domain.id}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain.name}</div>
        <div style={{ fontSize: 12, color: '#888780', marginBottom: 6 }}>{total} controles</div>
        <div style={{ height: 5, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>{score}%</div>
        <div style={{ fontSize: 10, color: scoreColor(score), fontWeight: 600, marginTop: 2 }}>{scoreLabel(score)}</div>
      </div>

      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}
