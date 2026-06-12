'use client'

const FUNCIONES = [
  { key: 'identificar', label: 'Identificar', short: 'I'  },
  { key: 'proteger',    label: 'Proteger',    short: 'P'  },
  { key: 'detectar',    label: 'Detectar',    short: 'D'  },
  { key: 'responder',   label: 'Responder',   short: 'R'  },
  { key: 'recuperar',   label: 'Recuperar',   short: 'Rc' },
]

function getNivelColor(pct) {
  if (pct >= 70) return { stroke: '#1D9E75', label: 'Gestionado', text: '#085041' }
  if (pct >= 50) return { stroke: '#534AB7', label: 'Parcial',    text: '#3C3489' }
  return             { stroke: '#EF9F27', label: 'Inicial',    text: '#633806' }
}

function pentagonPoints(cx, cy, r) {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 72 - 90) * (Math.PI / 180)
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
}

function pts(points) {
  return points.map(p => `${p.x},${p.y}`).join(' ')
}

export default function NistWidget({ stats, width }) {
  const nist = stats?.nist ?? { identificar: 0, proteger: 0, detectar: 0, responder: 0, recuperar: 0 }
  const promedio = Math.round(FUNCIONES.reduce((s, f) => s + (nist[f.key] ?? 0), 0) / 5)

  const cx = 55, cy = 57

  // ── MODO CHICO — w <= 3: radar + labels compactos "I · 80%" ──────────────
  if (width <= 3) {
    const R = 38
    const grids = [1, 0.75, 0.5, 0.25]
    const fullVerts = pentagonPoints(cx, cy, R)
    const dataVerts = FUNCIONES.map((f, i) => {
      const angle = (i * 72 - 90) * (Math.PI / 180)
      const r = (nist[f.key] ?? 0) / 100 * R
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
    })
    const labelVerts = pentagonPoints(cx, cy, R + 14)

    return (
      <div>
        <div className="widget-title">
          <i className="ti ti-chart-radar" aria-hidden="true" />
          NIST CSF
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: '#3C3489' }}>
            {promedio}%
          </span>
        </div>
        <svg width="100%" viewBox="0 0 110 115"
          role="img" aria-label={`Radar NIST CSF. Promedio ${promedio}%`}>
          <title>Radar NIST CSF</title>
          {grids.map((level, gi) => (
            <polygon key={gi}
              points={pts(pentagonPoints(cx, cy, R * level))}
              fill="none" stroke="#e2e0d8"
              strokeWidth={gi === 0 ? 0.8 : 0.5} />
          ))}
          {fullVerts.map((v, i) => (
            <line key={i} x1={cx} y1={cy} x2={v.x} y2={v.y}
              stroke="#e2e0d8" strokeWidth="0.5" />
          ))}
          <polygon points={pts(dataVerts)}
            fill="#534AB7" fillOpacity="0.18"
            stroke="#534AB7" strokeWidth="1.8" />
          {dataVerts.map((v, i) => (
            <circle key={i} cx={v.x} cy={v.y} r="2.5" fill="#534AB7" />
          ))}
          {FUNCIONES.map((f, i) => {
            const lv = labelVerts[i]
            const pct = nist[f.key] ?? 0
            const col = getNivelColor(pct)
            return (
              <text key={f.key}
                x={lv.x} y={lv.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fontWeight="500" fill={col.stroke}>
                {f.short} · {pct}%
              </text>
            )
          })}
        </svg>
      </div>
    )
  }

  // ── MODO MEDIANO — w <= 6: radar centrado + mini barras en 2 col debajo ───
  if (width <= 6) {
    const R = 38
    const fullVerts = pentagonPoints(cx, cy, R)
    const dataVerts = FUNCIONES.map((f, i) => {
      const angle = (i * 72 - 90) * (Math.PI / 180)
      const r = (nist[f.key] ?? 0) / 100 * R
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
    })
    const labelVerts = pentagonPoints(cx, cy, R + 14)

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="widget-title">
          <i className="ti ti-chart-radar" aria-hidden="true" />
          Madurez NIST CSF
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 500, color: '#3C3489' }}>
            {promedio}% prom.
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg width="100%" viewBox="0 0 110 115"
            role="img" aria-label={`Radar NIST CSF. Promedio ${promedio}%`}>
            <title>Radar NIST CSF</title>
            {[1, 0.75, 0.5, 0.25].map((level, gi) => (
              <polygon key={gi}
                points={pts(pentagonPoints(cx, cy, R * level))}
                fill="none" stroke="#e2e0d8"
                strokeWidth={gi === 0 ? 0.8 : 0.5} />
            ))}
            {fullVerts.map((v, i) => (
              <line key={i} x1={cx} y1={cy} x2={v.x} y2={v.y}
                stroke="#e2e0d8" strokeWidth="0.5" />
            ))}
            <polygon points={pts(dataVerts)}
              fill="#534AB7" fillOpacity="0.18"
              stroke="#534AB7" strokeWidth="1.8" />
            {dataVerts.map((v, i) => (
              <circle key={i} cx={v.x} cy={v.y} r="2.5" fill="#534AB7" />
            ))}
            {FUNCIONES.map((f, i) => {
              const lv = labelVerts[i]
              const col = getNivelColor(nist[f.key] ?? 0)
              return (
                <text key={f.key} x={lv.x} y={lv.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="8" fontWeight="500" fill={col.stroke}>
                  {f.short} · {nist[f.key] ?? 0}%
                </text>
              )
            })}
          </svg>
        </div>
        <div style={{
          borderTop: '0.5px solid #f1efe8',
          paddingTop: 8,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 10px',
        }}>
          {FUNCIONES.map((f, i) => (
            <div key={f.key} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              gridColumn: i === 4 ? 'span 2' : undefined,
            }}>
              <div style={{ fontSize: 10, color: '#888780', width: 52, flexShrink: 0 }}>{f.label}</div>
              <div style={{ flex: 1, height: 4, background: '#f1efe8', borderRadius: 2 }}>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: getNivelColor(nist[f.key] ?? 0).stroke,
                  width: `${nist[f.key] ?? 0}%`,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── MODO GRANDE — w > 6: radar prominente + barras detalladas debajo ──────
  const R = 50
  const cxG = 70, cyG = 70
  const fullVertsG = pentagonPoints(cxG, cyG, R)
  const dataVertsG = FUNCIONES.map((f, i) => {
    const angle = (i * 72 - 90) * (Math.PI / 180)
    const r = (nist[f.key] ?? 0) / 100 * R
    return { x: cxG + r * Math.cos(angle), y: cyG + r * Math.sin(angle) }
  })
  const labelVertsG = pentagonPoints(cxG, cyG, R + 18)

  return (
    <div>
      <div className="widget-title">
        <i className="ti ti-chart-radar" aria-hidden="true" />
        Madurez NIST CSF
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 500, color: '#3C3489' }}>
          {promedio}% prom.
        </span>
      </div>
      <svg width="100%" viewBox="0 0 140 140"
        role="img" aria-label={`Radar NIST CSF. Promedio ${promedio}%`}>
        <title>Radar NIST CSF</title>
        {[1, 0.75, 0.5, 0.25].map((level, gi) => (
          <polygon key={gi}
            points={pts(pentagonPoints(cxG, cyG, R * level))}
            fill="none" stroke="#e2e0d8"
            strokeWidth={gi === 0 ? 0.8 : 0.5} />
        ))}
        {fullVertsG.map((v, i) => (
          <line key={i} x1={cxG} y1={cyG} x2={v.x} y2={v.y}
            stroke="#e2e0d8" strokeWidth="0.5" />
        ))}
        <polygon points={pts(dataVertsG)}
          fill="#534AB7" fillOpacity="0.18"
          stroke="#534AB7" strokeWidth="2" />
        {dataVertsG.map((v, i) => (
          <circle key={i} cx={v.x} cy={v.y} r="3" fill="#534AB7" />
        ))}
        {FUNCIONES.map((f, i) => {
          const lv = labelVertsG[i]
          const col = getNivelColor(nist[f.key] ?? 0)
          return (
            <g key={f.key}>
              <text x={lv.x} y={lv.y - 4}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontWeight="500" fill={col.stroke}>
                {f.label}
              </text>
              <text x={lv.x} y={lv.y + 6}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill={col.stroke}>
                {nist[f.key] ?? 0}%
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{
        borderTop: '0.5px solid #f1efe8',
        paddingTop: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {FUNCIONES.map(f => {
          const cfg = getNivelColor(nist[f.key] ?? 0)
          return (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, color: '#888780', width: 70, flexShrink: 0 }}>{f.label}</div>
              <div style={{ flex: 1, height: 6, background: '#f1efe8', borderRadius: 3 }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: cfg.stroke,
                  width: `${nist[f.key] ?? 0}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#3C3489', width: 28, textAlign: 'right' }}>
                {nist[f.key] ?? 0}%
              </div>
              <div style={{ fontSize: 10, color: cfg.text, width: 60 }}>{cfg.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
