'use client'

// ── Color dinámico según score ────────────────────────────────────────────────
// Interpolación suave entre paradas de color
const STOPS = [
  { at:   0, hex: '#DC2626' },  // rojo intenso
  { at:  20, hex: '#DC2626' },  // rojo
  { at:  40, hex: '#EA580C' },  // naranja
  { at:  60, hex: '#D97706' },  // ámbar
  { at:  80, hex: '#65A30D' },  // verde-lima oscuro (legible sobre blanco)
  { at: 100, hex: '#059669' },  // verde
]

function lerpHex(a, b, t) {
  const p = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b)
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  return '#' + [
    clamp(ar + (br-ar)*t),
    clamp(ag + (bg-ag)*t),
    clamp(ab + (bb-ab)*t),
  ].map(v => v.toString(16).padStart(2,'0')).join('')
}

function getScoreColor(score) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i], hi = STOPS[i + 1]
    if (score <= hi.at) {
      const t = (score - lo.at) / (hi.at - lo.at)
      return lerpHex(lo.hex, hi.hex, Math.max(0, Math.min(1, t)))
    }
  }
  return STOPS[STOPS.length - 1].hex
}

function getNivelLabel(nivel) {
  if (!nivel || nivel === '—') return '—'
  return nivel.charAt(0).toUpperCase() + nivel.slice(1)
}

// ── Anillo ────────────────────────────────────────────────────────────────────
const R    = 38
const CIRC = 2 * Math.PI * R   // ≈ 238.8

// ── Filas de métricas ─────────────────────────────────────────────────────────
const STAT_ROWS = [
  {
    label: 'Activos evaluados',
    icon:  'ti-server',
    key:   (s) => s?.activos?.total        ?? 0,
    color: '#0369A1',
  },
  {
    label: 'Identidades activas',
    icon:  'ti-users',
    key:   (s) => s?.identidades?.activas  ?? 0,
    color: '#047857',
  },
  {
    label: 'Incidentes abiertos',
    icon:  'ti-alert-triangle',
    key:   (s) => s?.incidentes?.abiertos  ?? 0,
    color: '#B91C1C',
  },
]

function InfoStrip({ text }) {
  return (
    <div style={{
      marginTop: 'auto', paddingTop: 10,
      borderTop: '0.5px solid rgba(83,74,183,0.15)',
      display: 'flex', alignItems: 'flex-start', gap: 6,
    }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: '#7F77DD', flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 11, color: '#6155BD', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

export default function WidgetScore({ stats }) {
  const score      = stats?.security_score?.valor ?? 0
  const nivel      = stats?.security_score?.nivel ?? '—'
  const ringColor  = getScoreColor(score)
  const trackColor = `${ringColor}28`   // track muy tenue del mismo color

  return (
    <div style={{
      padding: '16px 14px 14px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
    }}>


      {/* ── Anillo ──────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
        <svg width="90" height="90" viewBox="0 0 90 90"
          style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="45" cy="45" r={R}
            fill="none" stroke={trackColor} strokeWidth="9" />
          {/* Progreso */}
          <circle cx="45" cy="45" r={R}
            fill="none" stroke={ringColor} strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * CIRC} ${CIRC}`} />
        </svg>

        {/* Número central */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 28, fontWeight: 700,
            color: ringColor, lineHeight: 1,
            letterSpacing: '-0.5px',
          }}>
            {score}
          </span>
          <span style={{ fontSize: 11, color: ringColor, marginTop: 2, opacity: 0.8 }}>
            /100
          </span>
        </div>
      </div>

      {/* ── Nivel ───────────────────────────────────────────────── */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: '#1a1740',
        marginTop: 10, letterSpacing: '0.01em',
      }}>
        Nivel {getNivelLabel(nivel)}
      </div>
      <div style={{
        fontSize: 11, color: '#047857', marginTop: 4,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <i className="ti ti-trending-up" style={{ fontSize: 11 }} />
        +3 puntos este mes
      </div>

      {/* ── Métricas ────────────────────────────────────────────── */}
      <div style={{
        width: '100%', marginTop: 14,
        borderTop: '0.5px solid rgba(83,74,183,0.2)',
        paddingTop: 10,
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        {STAT_ROWS.map(row => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className={`ti ${row.icon}`}
                style={{ fontSize: 12, color: row.color, opacity: 0.75 }} />
              <span style={{ fontSize: 12, color: '#6155BD' }}>{row.label}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: row.color, flexShrink: 0 }}>
              {row.key(stats)}
            </span>
          </div>
        ))}
      </div>

      <InfoStrip text="Este puntaje resume qué tan protegida está tu empresa, de 0 a 100. Mientras más alto, mejor. Se recalcula automáticamente cada vez que cargas el panel." />

    </div>
  )
}
