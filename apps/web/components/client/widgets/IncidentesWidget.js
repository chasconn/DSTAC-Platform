'use client'

export default function IncidentesWidget({ stats, width, height, variant }) {
  const inc   = stats?.incidentes ?? { abiertos: 0, en_investigacion: 0, cerrados: 0, recientes: [] }
  const total = (inc.abiertos ?? 0) + (inc.en_investigacion ?? 0) + (inc.cerrados ?? 0)

  // ── MODO MICRO — w <= 2: solo número de abiertos ─────────────────────────
  if (width <= 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#A32D2D', textTransform: 'uppercase',
          letterSpacing: '0.04em', marginBottom: 3 }}>Abiertos</div>
        <div style={{ fontSize: 38, fontWeight: 500, color: '#E24B4A', lineHeight: 1 }}>
          {inc.abiertos}
        </div>
        <div style={{ fontSize: 10, color: '#888780', marginTop: 3 }}>incidentes</div>
      </div>
    )
  }

  // ── Variante A: contadores en grid + lista de recientes ───────────────────
  if (variant !== 'B') {
    const showRecientes = width > 5
    const maxRecientes  = height >= 5 ? 5 : 3

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="widget-title">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          Incidentes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8,
          marginBottom: showRecientes ? 12 : 0, flexShrink: 0 }}>
          <div style={{ textAlign: 'center', background: '#FCEBEB', borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#E24B4A' }}>{inc.abiertos}</div>
            <div style={{ fontSize: 10, color: '#A32D2D' }}>Abiertos</div>
          </div>
          <div style={{ textAlign: 'center', background: '#FAEEDA', borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#EF9F27' }}>{inc.en_investigacion}</div>
            <div style={{ fontSize: 10, color: '#854F0B' }}>En revisión</div>
          </div>
          <div style={{ textAlign: 'center', background: '#EAF3DE', borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#639922' }}>{inc.cerrados}</div>
            <div style={{ fontSize: 10, color: '#3B6D11' }}>Cerrados</div>
          </div>
        </div>

        {showRecientes && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(inc.recientes ?? []).slice(0, maxRecientes).map((item, idx, arr) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 11,
                padding: '5px 0',
                borderBottom: idx < arr.length - 1 ? '0.5px solid #f1efe8' : 'none',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: item.estado === 'abierto' ? '#E24B4A'
                    : item.estado === 'en_investigacion' ? '#EF9F27' : '#639922',
                }} />
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#2C2C2A' }}>
                  {item.tipo}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 7,
                  background: item.severidad === 'critica' ? '#FCEBEB'
                    : item.severidad === 'alta' ? '#FAEEDA' : '#EEEDFE',
                  color: item.severidad === 'critica' ? '#791F1F'
                    : item.severidad === 'alta' ? '#633806' : '#3C3489',
                }}>
                  {item.severidad === 'critica' ? 'Crítico' : item.severidad === 'alta' ? 'Alto' : 'Medio'}
                </span>
              </div>
            ))}
            {(inc.recientes ?? []).length === 0 && (
              <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', paddingTop: 8 }}>
                Sin incidentes recientes
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Variante B: donut SVG + leyenda lateral ───────────────────────────────
  const circ = 2 * Math.PI * 35
  const segmentos = [
    { val: inc.abiertos,         color: '#E24B4A', label: 'Abiertos',    tc: '#A32D2D' },
    { val: inc.en_investigacion, color: '#EF9F27', label: 'En revisión', tc: '#854F0B' },
    { val: inc.cerrados,         color: '#639922', label: 'Cerrados',    tc: '#3B6D11' },
  ]
  let acum = 0
  const arcs = segmentos.map(s => {
    const dash = total > 0 ? (s.val / total) * circ : 0
    const arc  = { ...s, dash, offset: acum }
    acum += dash
    return arc
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="widget-title">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        Incidentes
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minHeight: 0 }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
          <circle cx="45" cy="45" r="35" fill="none" stroke="#f1efe8" strokeWidth="12" />
          {arcs.map((arc, i) => arc.dash > 0 && (
            <circle key={i} cx="45" cy="45" r="35" fill="none"
              stroke={arc.color} strokeWidth="12"
              strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 45 45)" />
          ))}
          <text x="45" y="42" textAnchor="middle" fontSize="18" fontWeight="500" fill="#3C3489">{total}</text>
          <text x="45" y="54" textAnchor="middle" fontSize="9" fill="#888780">total</text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {segmentos.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#888780', flex: 1 }}>{s.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: s.tc }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {width > 5 && (inc.recientes ?? [])[0] && (
        <div style={{ paddingTop: 10, borderTop: '0.5px solid #f1efe8', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#888780', marginBottom: 6 }}>Más reciente</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: inc.recientes[0].estado === 'abierto' ? '#E24B4A'
                : inc.recientes[0].estado === 'en_investigacion' ? '#EF9F27' : '#639922',
            }} />
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#2C2C2A' }}>
              {inc.recientes[0].tipo}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 7,
              background: inc.recientes[0].severidad === 'critica' ? '#FCEBEB' : '#FAEEDA',
              color: inc.recientes[0].severidad === 'critica' ? '#791F1F' : '#633806',
            }}>
              {inc.recientes[0].severidad === 'critica' ? 'Crítico' : 'Alto'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
