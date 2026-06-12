'use client'

function InfoStrip({ text }) {
  return (
    <div style={{
      padding: '6px 14px',
      borderTop: '0.5px solid rgba(83,74,183,0.15)',
      display: 'flex', alignItems: 'flex-start', gap: 6,
      flexShrink: 0,
    }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: '#7F77DD', flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 11, color: '#6155BD', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

const R_D  = 22
const CIRC = 2 * Math.PI * R_D   // ≈ 138.2

const CRIT_BARS = [
  { key: 'criticos',   label: 'Crítica', fill: '#DC2626', text: '#B91C1C' },
  { key: 'alta',       label: 'Alta',    fill: '#D97706', text: '#92400E' },
  { key: 'media',      label: 'Media',   fill: '#059669', text: '#047857' },
  { key: 'baja',       label: 'Baja',    fill: '#534AB7', text: '#3730A3' },
]

// Segmentos del donut: orden visual en sentido horario
function buildSegments(ident) {
  const total        = ident?.total          ?? 0
  const activas      = ident?.activas        ?? 0
  const comprometidas = ident?.comprometidas ?? 0
  const expiradas    = ident?.expiradas      ?? 0

  if (total === 0) return []

  return [
    { pct: activas / total,        stroke: 'rgba(29,158,117,0.6)',  label: 'Activas'       },
    { pct: comprometidas / total,  stroke: 'rgba(226,75,74,0.75)',  label: 'Comprometidas' },
    { pct: expiradas / total,      stroke: 'rgba(239,159,39,0.65)', label: 'Expiradas'     },
  ]
}

function DonutSVG({ ident }) {
  const segments = buildSegments(ident)
  const total    = ident?.total ?? 0

  let cumPct = 0
  return (
    <svg width="58" height="58" viewBox="0 0 58 58">
      {/* Track */}
      <circle cx="29" cy="29" r={R_D}
        fill="none" stroke="rgba(83,74,183,0.1)" strokeWidth="7" />

      {total === 0 ? (
        <circle cx="29" cy="29" r={R_D}
          fill="none" stroke="rgba(83,74,183,0.25)" strokeWidth="7" />
      ) : segments.map(seg => {
        if (seg.pct <= 0) { cumPct += seg.pct; return null }
        const arc    = seg.pct * CIRC
        const gap    = CIRC - arc
        const offset = -(cumPct * CIRC)
        cumPct += seg.pct
        return (
          <circle key={seg.label}
            cx="29" cy="29" r={R_D}
            fill="none"
            stroke={seg.stroke} strokeWidth="7"
            strokeDasharray={`${arc.toFixed(2)} ${gap.toFixed(2)}`}
            strokeDashoffset={offset.toFixed(2)}
            transform="rotate(-90 29 29)" />
        )
      })}

      {/* Número central */}
      <text x="29" y="27" textAnchor="middle"
        fontSize="12" fontWeight="500" fill="#1a1740">{total}</text>
      <text x="29" y="37" textAnchor="middle"
        fontSize="7" fill="#6155BD">total</text>
    </svg>
  )
}

export default function WidgetActivosIdent({ stats }) {
  const act   = stats?.activos     ?? {}
  const ident = stats?.identidades ?? {}
  const total = act.total ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

      {/* ── Activos ──────────────────────────────────── */}
      <div style={{
        flex: 1, padding: '12px 14px',
        borderRight: '0.5px solid rgba(83,74,183,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          fontSize: 11, color: '#4A43A8', textTransform: 'uppercase',
          letterSpacing: '0.07em', marginBottom: 10,
        }}>
          Activos
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {CRIT_BARS.map(bar => {
            const val = act[bar.key] ?? 0
            const pct = total > 0 ? (val / total) * 100 : 0
            return (
              <div key={bar.key}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 2,
                }}>
                  <span style={{ fontSize: 12, color: '#4A43A8' }}>{bar.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: bar.text }}>{val}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(83,74,183,0.1)' }}>
                  <div style={{
                    height: 4, borderRadius: 2, background: bar.fill,
                    width: `${pct}%`, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Pills Operativos / Degradados */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <span style={{
            fontSize: 11, padding: '3px 7px', borderRadius: 5,
            background: 'rgba(29,158,117,0.15)',
            border: '0.5px solid rgba(29,158,117,0.3)',
            color: '#047857',
          }}>
            <i className="ti ti-circle-check" style={{ fontSize: 9, marginRight: 3 }} />
            {act.operativos ?? 0} oper.
          </span>
          <span style={{
            fontSize: 11, padding: '3px 7px', borderRadius: 5,
            background: 'rgba(239,159,39,0.12)',
            border: '0.5px solid rgba(239,159,39,0.3)',
            color: '#92400E',
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 9, marginRight: 3 }} />
            {act.degradados ?? 0} deg.
          </span>
        </div>
      </div>

      {/* ── Identidades ──────────────────────────────── */}
      <div style={{
        flex: 1, padding: '12px 14px',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          fontSize: 11, color: '#4A43A8', textTransform: 'uppercase',
          letterSpacing: '0.07em', marginBottom: 10,
        }}>
          Identidades
        </div>

        {/* Donut + leyenda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <DonutSVG ident={ident} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Activas',        val: ident.activas        ?? 0, color: '#059669' },
              { label: 'Comprometidas',  val: ident.comprometidas  ?? 0, color: '#DC2626' },
              { label: 'Expiradas',      val: ident.expiradas      ?? 0, color: '#D97706' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: row.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 11, color: '#6155BD' }}>{row.label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: row.color, marginLeft: 2,
                }}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(ident.comprometidas ?? 0) > 0 && (
            <div style={{
              padding: '4px 8px', borderRadius: '0 5px 5px 0',
              background: 'rgba(220,38,38,0.08)',
              borderLeft: '2px solid #DC2626',
              fontSize: 12, color: '#B91C1C',
            }}>
              {ident.comprometidas} comprometida{ident.comprometidas !== 1 ? 's' : ''}
            </div>
          )}
          {(ident.expiradas ?? 0) > 0 && (
            <div style={{
              padding: '4px 8px', borderRadius: '0 5px 5px 0',
              background: 'rgba(217,119,6,0.08)',
              borderLeft: '2px solid #D97706',
              fontSize: 12, color: '#92400E',
            }}>
              {ident.expiradas} expirada{ident.expiradas !== 1 ? 's' : ''}
            </div>
          )}
          {(ident.comprometidas ?? 0) === 0 && (ident.expiradas ?? 0) === 0 && (
            <div style={{
              padding: '4px 8px', borderRadius: '0 5px 5px 0',
              background: 'rgba(5,150,105,0.08)',
              borderLeft: '2px solid #059669',
              fontSize: 12, color: '#047857',
            }}>
              Sin alertas activas
            </div>
          )}
        </div>
      </div>

    </div>
    <InfoStrip text="Los activos son tus equipos y sistemas (servidores, computadores, aplicaciones). Las identidades son las cuentas de usuario de tu empresa. Los elementos comprometidos o degradados necesitan revisión urgente." />
    </div>
  )
}
