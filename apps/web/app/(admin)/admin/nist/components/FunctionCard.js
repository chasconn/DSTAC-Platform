'use client'

import NistScoreRing from './NistScoreRing'

function scoreLevel(pct) {
  if (pct >= 81) return { label: 'Excelente', color: '#1D9E75' }
  if (pct >= 61) return { label: 'Alto',      color: '#1D9E75' }
  if (pct >= 41) return { label: 'Medio',     color: '#EF9F27' }
  if (pct >= 21) return { label: 'Bajo',      color: '#E24B4A' }
  return           { label: 'Crítico',    color: '#E24B4A' }
}

export default function FunctionCard({ fn, onClick }) {
  const score   = Math.round(Number(fn.score) || 0)
  const level   = scoreLevel(score)
  const total   = fn.total_controls || 0

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8',
        padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
        display: 'flex', alignItems: 'center', gap: 16,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(60,52,137,0.1)'; e.currentTarget.style.borderColor = '#c8c4f0' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e0d8' }}
    >
      {/* Anillo */}
      <NistScoreRing value={score} size={64} strokeWidth={6} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            background: fn.color + '22', color: fn.color,
            fontSize: 10, fontWeight: 700, padding: '2px 9px',
            borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5,
            flexShrink: 0,
          }}>
            {fn.code}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fn.name}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#888780', marginBottom: 6 }}>
          {total} controles
        </div>
        {/* Barra de progreso */}
        <div style={{ height: 5, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, height: '100%', background: level.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Porcentaje + nivel */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: level.color, lineHeight: 1 }}>{score}%</div>
        <div style={{ fontSize: 10, color: level.color, fontWeight: 600, marginTop: 2 }}>{level.label}</div>
      </div>

      {/* Flecha */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}
