'use client'

export default function IdentidadesWidget({ stats, width, variant }) {
  const ident = stats?.identidades ?? { total: 0, activas: 0, expiradas: 0, comprometidas: 0 }
  const total = ident.total ?? 0
  const r    = 32
  const circ = 2 * Math.PI * r

  const pctActivas       = total > 0 ? (ident.activas       / total) * circ : 0
  const pctExpiradas     = total > 0 ? (ident.expiradas     / total) * circ : 0
  const pctComprometidas = total > 0 ? (ident.comprometidas / total) * circ : 0

  // ── MODO MICRO — w <= 2: total + badge comprometidas ─────────────────────
  if (width <= 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: '#888780', marginBottom: 3 }}>Identidades</div>
        <div style={{ fontSize: 30, fontWeight: 500, color: '#3C3489', lineHeight: 1 }}>
          {total}
        </div>
        {ident.comprometidas > 0 && (
          <div style={{ marginTop: 6, background: '#FCEBEB', borderRadius: 6,
            padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-alert-octagon" aria-hidden="true"
              style={{ fontSize: 11, color: '#E24B4A' }} />
            <span style={{ fontSize: 10, color: '#791F1F', fontWeight: 500 }}>
              {ident.comprometidas} comprometida{ident.comprometidas > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    )
  }

  // ── Variante A: donut SVG + leyenda + alertas ─────────────────────────────
  if (variant !== 'B') {
    const showBothAlerts = width > 5

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="widget-title">
          <i className="ti ti-users" aria-hidden="true" />
          Identidades
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#EAF3DE" strokeWidth="10"
              strokeDasharray={`${pctActivas} ${circ - pctActivas}`}
              transform="rotate(-90 40 40)" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="#FAEEDA" strokeWidth="10"
              strokeDasharray={`${pctExpiradas} ${circ - pctExpiradas}`}
              strokeDashoffset={-pctActivas}
              transform="rotate(-90 40 40)" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="#FCEBEB" strokeWidth="10"
              strokeDasharray={`${pctComprometidas} ${circ - pctComprometidas}`}
              strokeDashoffset={-(pctActivas + pctExpiradas)}
              transform="rotate(-90 40 40)" />
            <text x="40" y="37" textAnchor="middle" fontSize="16" fontWeight="500" fill="#3C3489">{total}</text>
            <text x="40" y="48" textAnchor="middle" fontSize="9" fill="#888780">total</text>
          </svg>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'Activas',       val: ident.activas,       dot: '#639922', num: '#3B6D11' },
              { label: 'Expiradas',     val: ident.expiradas,     dot: '#EF9F27', num: '#854F0B' },
              { label: 'Comprometidas', val: ident.comprometidas, dot: '#E24B4A', num: '#A32D2D' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.dot, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: '#888780', flex: 1 }}>{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: row.num }}>{row.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {ident.comprometidas > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
              background: '#FCEBEB', borderRadius: 8, fontSize: 11, marginBottom: 6 }}>
              <i className="ti ti-alert-octagon" style={{ fontSize: 15, color: '#E24B4A', flexShrink: 0 }} aria-hidden="true" />
              <div style={{ flex: 1, color: '#791F1F' }}>
                {ident.comprometidas} identidad{ident.comprometidas > 1 ? 'es' : ''} comprometida{ident.comprometidas > 1 ? 's' : ''}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#A32D2D' }}>!</span>
            </div>
          )}
          {showBothAlerts && ident.expiradas > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
              background: '#FAEEDA', borderRadius: 8, fontSize: 11 }}>
              <i className="ti ti-clock-x" style={{ fontSize: 15, color: '#EF9F27', flexShrink: 0 }} aria-hidden="true" />
              <div style={{ flex: 1, color: '#633806' }}>
                {ident.expiradas} identidad{ident.expiradas > 1 ? 'es' : ''} expirada{ident.expiradas > 1 ? 's' : ''}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#854F0B' }}>{ident.expiradas}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Variante B: grid 2×2 + tarjetas con borde izquierdo ──────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="widget-title">
        <i className="ti ti-users" aria-hidden="true" />
        Identidades
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <div style={{ background: '#f8f7f4', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: '#3C3489' }}>{total}</div>
          <div style={{ fontSize: 11, color: '#888780' }}>Total</div>
        </div>
        <div style={{ background: '#EAF3DE', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: '#3B6D11' }}>{ident.activas}</div>
          <div style={{ fontSize: 11, color: '#3B6D11' }}>Activas</div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 500, color: '#888780', marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
        Requieren atención
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        {ident.comprometidas > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            background: '#FCEBEB', borderRadius: 8, borderLeft: '3px solid #E24B4A', flexShrink: 0 }}>
            <i className="ti ti-shield-x" style={{ fontSize: 16, color: '#E24B4A', flexShrink: 0 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#791F1F' }}>
                {ident.comprometidas} comprometida{ident.comprometidas > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 10, color: '#A32D2D' }}>Acción urgente requerida</div>
            </div>
          </div>
        )}
        {ident.expiradas > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            background: '#FAEEDA', borderRadius: 8, borderLeft: '3px solid #EF9F27', flexShrink: 0 }}>
            <i className="ti ti-clock-x" style={{ fontSize: 16, color: '#EF9F27', flexShrink: 0 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#633806' }}>
                {ident.expiradas} expirada{ident.expiradas > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 10, color: '#854F0B' }}>Pendientes de revocar</div>
            </div>
          </div>
        )}
        {ident.comprometidas === 0 && ident.expiradas === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#3B6D11', padding: 12,
            background: '#EAF3DE', borderRadius: 8 }}>
            <i className="ti ti-check" style={{ fontSize: 16, marginRight: 6 }} aria-hidden="true" />
            Todo en orden
          </div>
        )}
      </div>
    </div>
  )
}
