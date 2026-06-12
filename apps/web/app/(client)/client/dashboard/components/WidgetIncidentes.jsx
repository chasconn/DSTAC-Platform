'use client'

const SEV_BADGE = {
  critica: { bg: 'rgba(226,75,74,0.12)',  color: '#B91C1C', label: 'Crítico' },
  alta:    { bg: 'rgba(239,159,39,0.12)', color: '#92400E', label: 'Alto'    },
  media:   { bg: 'rgba(29,158,117,0.12)', color: '#047857', label: 'Medio'   },
  baja:    { bg: 'rgba(29,158,117,0.08)', color: '#047857', label: 'Bajo'    },
}

function dotColor(estado) {
  if (estado === 'abierto')          return '#E24B4A'
  if (estado === 'en_investigacion') return '#EF9F27'
  return '#1D9E75'
}

function textWeight(estado) {
  return (estado === 'abierto' || estado === 'en_investigacion') ? 500 : 400
}

function textClr(estado) {
  return (estado === 'cerrado' || estado === 'falso_positivo') ? '#6155BD' : '#1a1740'
}

function formatDate(val) {
  if (!val) return ''
  try {
    return new Date(val).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

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

export default function WidgetIncidentes({ stats }) {
  const inc      = stats?.incidentes ?? {}
  const abiertos = inc.abiertos ?? 0
  const recientes = (inc.recientes ?? []).slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Sub-header */}
      <div style={{
        padding: '6px 14px',
        borderBottom: '0.5px solid rgba(83,74,183,0.2)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        {abiertos > 0 ? (
          <span style={{
            fontSize: 12, padding: '2px 8px', borderRadius: 6, fontWeight: 500,
            background: 'rgba(226,75,74,0.1)', color: '#B91C1C',
            border: '0.5px solid rgba(226,75,74,0.25)',
          }}>
            {abiertos} abierto{abiertos !== 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{
            fontSize: 12, padding: '2px 8px', borderRadius: 6,
            background: 'rgba(29,158,117,0.1)', color: '#047857',
          }}>
            Sin incidentes abiertos
          </span>
        )}
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}>
        {recientes.length === 0 ? (
          <div style={{
            padding: '24px 14px', textAlign: 'center',
            color: '#534AB7', fontSize: 12,
          }}>
            No hay incidentes recientes
          </div>
        ) : (
          recientes.map((item, idx) => {
            const badge = SEV_BADGE[item.severidad] ?? SEV_BADGE.media
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 14px',
                borderBottom: idx < recientes.length - 1
                  ? '0.5px solid rgba(83,74,183,0.1)' : 'none',
              }}>
                {/* Dot de estado */}
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: dotColor(item.estado),
                  boxShadow: `0 0 5px ${dotColor(item.estado)}55`,
                }} />

                {/* Nombre del incidente */}
                <div style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', fontSize: 13,
                  color: textClr(item.estado),
                  fontWeight: textWeight(item.estado),
                }}>
                  {item.tipo}
                </div>

                {/* Badge severidad */}
                <span style={{
                  fontSize: 11, padding: '2px 6px', borderRadius: 5,
                  background: badge.bg, color: badge.color,
                  fontWeight: 500, flexShrink: 0,
                }}>
                  {badge.label}
                </span>

                {/* Fecha */}
                <span style={{
                  fontSize: 11, color: '#534AB7', flexShrink: 0, width: 32,
                  textAlign: 'right',
                }}>
                  {formatDate(item.fecha_deteccion)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Info */}
      <InfoStrip text="Un incidente es cualquier evento que puede afectar la seguridad de tu empresa. Los que aparecen como 'abiertos' aún están siendo atendidos por DSTAC." />

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid rgba(83,74,183,0.2)',
        padding: '6px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#6155BD' }}>
          Abiertos{' '}
          <strong style={{ color: '#B91C1C' }}>{inc.abiertos ?? 0}</strong>
          {'  ·  '}
          Revisión{' '}
          <strong style={{ color: '#92400E' }}>{inc.en_investigacion ?? 0}</strong>
          {'  ·  '}
          Cerrados{' '}
          <strong style={{ color: '#047857' }}>{inc.cerrados ?? 0}</strong>
        </span>
        <span style={{
          fontSize: 12, color: '#6155BD', cursor: 'pointer',
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.target.style.color = '#3730A3'}
          onMouseLeave={e => e.target.style.color = '#6155BD'}
        >
          Ver todos →
        </span>
      </div>

    </div>
  )
}
