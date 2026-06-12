'use client'

export default function SecurityScoreWidget({ stats, width }) {
  const score = stats?.security_score?.valor ?? null
  const nivel = stats?.security_score?.nivel ?? '—'
  const nivelLabel = nivel === '—' ? '—' : nivel.charAt(0).toUpperCase() + nivel.slice(1)

  // ── MODO MICRO — w <= 2: número grande centrado + nivel ──────────────────
  if (width <= 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#888780',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Score</div>
        <div style={{ fontSize: 36, fontWeight: 500, color: '#3C3489', lineHeight: 1 }}>{score ?? '—'}</div>
        <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>{nivelLabel}</div>
      </div>
    )
  }

  // ── MODO MEDIANO — w <= 5: anillo + nivel + delta ────────────────────────
  if (width <= 5) {
    return (
      <div>
        <div className="widget-title">
          <i className="ti ti-shield-check" aria-hidden="true" />Security score
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
            <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="30" cy="30" r="24" fill="none" stroke="#EEEDFE" strokeWidth="6" />
              <circle cx="30" cy="30" r="24" fill="none" stroke="#534AB7" strokeWidth="6"
                strokeDasharray={`${((score ?? 0) / 100) * 150.8} 150.8`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#3C3489' }}>{score ?? '—'}</span>
              <span style={{ fontSize: 8, color: '#888780' }}>/100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A' }}>{nivelLabel}</div>
            <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 5,
              display: 'flex', alignItems: 'center', gap: 3 }}>
              <i className="ti ti-trending-up" aria-hidden="true" style={{ fontSize: 12 }} />
              +3 este mes
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── MODO GRANDE — w > 5: anillo + descripción completa ───────────────────
  return (
    <div>
      <div className="widget-title">
        <i className="ti ti-shield-check" aria-hidden="true" />Security score
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
          <svg width="70" height="70" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="35" cy="35" r="29" fill="none" stroke="#EEEDFE" strokeWidth="7" />
            <circle cx="35" cy="35" r="29" fill="none" stroke="#534AB7" strokeWidth="7"
              strokeDasharray={`${((score ?? 0) / 100) * 182.2} 182.2`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 19, fontWeight: 500, color: '#3C3489' }}>{score ?? '—'}</span>
            <span style={{ fontSize: 9, color: '#888780' }}>/100</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A', marginBottom: 4 }}>
            {nivelLabel}
          </div>
          <div style={{ fontSize: 11, color: '#888780', lineHeight: 1.5, marginBottom: 6 }}>
            Basado en {stats?.activos?.total ?? 0} activos,{' '}
            {stats?.identidades?.total ?? 0} identidades y{' '}
            {stats?.incidentes?.abiertos ?? 0} incidentes abiertos
          </div>
          <div style={{ fontSize: 11, color: '#3B6D11', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-trending-up" aria-hidden="true" style={{ fontSize: 12 }} />
            +3 puntos este mes
          </div>
        </div>
      </div>
    </div>
  )
}
