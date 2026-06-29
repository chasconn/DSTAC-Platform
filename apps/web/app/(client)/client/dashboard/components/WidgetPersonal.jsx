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

const NIVELES = [
  { key: 'criticos',    label: 'Alto',  desc: 'Crítico',  barColor: '#DC2626', badgeBg: 'rgba(220,38,38,0.1)',  badgeText: '#B91C1C' },
  { key: 'nivel_medio', label: 'Medio', desc: 'Estándar', barColor: '#534AB7', badgeBg: 'rgba(83,74,183,0.1)', badgeText: '#3730A3' },
  { key: 'nivel_bajo',  label: 'Bajo',  desc: 'General',  barColor: '#059669', badgeBg: 'rgba(5,150,105,0.1)', badgeText: '#047857' },
]

const KPI_TILES = [
  { key: 'total',     label: 'Total',     icon: 'ti-users',       color: '#534AB7', bg: 'rgba(83,74,183,0.06)',   border: 'rgba(83,74,183,0.18)'   },
  { key: 'activos',   label: 'Activos',   icon: 'ti-user-check',  color: '#059669', bg: 'rgba(29,158,117,0.06)', border: 'rgba(29,158,117,0.22)'  },
  { key: 'criticos',  label: 'Críticos',  icon: 'ti-shield-half', color: '#D97706', bg: 'rgba(217,119,6,0.06)',  border: 'rgba(217,119,6,0.22)'   },
  { key: 'inactivos', label: 'Inactivos', icon: 'ti-user-off',    color: '#6155BD', bg: 'rgba(97,85,189,0.05)',  border: 'rgba(97,85,189,0.15)'   },
]

export default function WidgetPersonal({ stats }) {
  const p = stats?.personal ?? {}

  const total        = p.total        ?? 0
  const activos      = p.activos      ?? 0
  const inactivos    = p.inactivos    ?? 0
  const enVacaciones = p.en_vacaciones ?? 0
  const criticos     = p.criticos     ?? 0
  const conAcceso    = p.con_acceso   ?? 0
  const conProblemas = p.con_problemas ?? 0
  const sinIdentidad = p.sin_identidad ?? 0

  const kpiValues = { total, activos, criticos, inactivos }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── KPI tiles ────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
        gap: 8, padding: '10px 14px 10px',
        borderBottom: '0.5px solid rgba(83,74,183,0.12)',
        flexShrink: 0,
      }}>
        {KPI_TILES.map(t => (
          <div key={t.key} style={{
            background: t.bg,
            border: `0.5px solid ${t.border}`,
            borderRadius: 8, padding: '8px 10px',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 1,
            }}>
              <span style={{
                fontSize: 9, color: '#6155BD',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {t.label}
              </span>
              <i className={`ti ${t.icon}`}
                style={{ fontSize: 11, color: t.color, opacity: 0.7 }} />
            </div>
            <span style={{
              fontSize: 24, fontWeight: 700,
              color: t.color, lineHeight: 1,
            }}>
              {kpiValues[t.key]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Secciones ────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex',
        overflow: 'hidden', minHeight: 0,
      }}>

        {/* Left — Distribución por nivel */}
        <div style={{
          flex: 1, padding: '12px 14px',
          borderRight: '0.5px solid rgba(83,74,183,0.12)',
          display: 'flex', flexDirection: 'column', minWidth: 0,
        }}>
          <div style={{
            fontSize: 11, color: '#4A43A8', textTransform: 'uppercase',
            letterSpacing: '0.07em', marginBottom: 10, fontWeight: 500,
          }}>
            Distribución por Nivel
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 9 }}>
            {NIVELES.map(n => {
              const val = p[n.key] ?? 0
              const pct = total > 0 ? Math.round((val / total) * 100) : 0
              return (
                <div key={n.key}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: n.badgeBg, color: n.badgeText, fontWeight: 500,
                        border: `0.5px solid ${n.badgeBg.replace('0.1)', '0.3)')}`,
                      }}>
                        {n.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#6155BD' }}>{n.desc}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: n.badgeText }}>{val}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(83,74,183,0.1)' }}>
                    <div style={{
                      height: 5, borderRadius: 3, background: n.barColor,
                      width: `${pct}%`, transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pills estado */}
          <div style={{
            marginTop: 10, paddingTop: 8,
            borderTop: '0.5px solid rgba(83,74,183,0.12)',
            display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 5,
              background: 'rgba(83,74,183,0.07)',
              border: '0.5px solid rgba(83,74,183,0.2)',
              color: '#4A43A8', display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <i className="ti ti-beach" style={{ fontSize: 9 }} />
              {enVacaciones} vacaciones
            </span>
            <span style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 5,
              background: 'rgba(220,38,38,0.07)',
              border: '0.5px solid rgba(220,38,38,0.2)',
              color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <i className="ti ti-user-off" style={{ fontSize: 9 }} />
              {inactivos} inactivos
            </span>
          </div>
        </div>

        {/* Right — Indicadores de acceso */}
        <div style={{
          flex: 1, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', minWidth: 0,
        }}>
          <div style={{
            fontSize: 11, color: '#4A43A8', textTransform: 'uppercase',
            letterSpacing: '0.07em', marginBottom: 10, fontWeight: 500,
          }}>
            Indicadores de Acceso
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7 }}>

            {/* Con acceso activo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 7,
              background: 'rgba(29,158,117,0.06)',
              border: '0.5px solid rgba(29,158,117,0.22)',
            }}>
              <i className="ti ti-circle-check"
                style={{ fontSize: 14, color: '#059669', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#1a1740' }}>
                Con acceso activo
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#047857', flexShrink: 0 }}>
                {conAcceso}
              </span>
            </div>

            {/* Identidades en riesgo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 7,
              background: conProblemas > 0 ? 'rgba(220,38,38,0.06)' : 'rgba(83,74,183,0.04)',
              border: `0.5px solid ${conProblemas > 0 ? 'rgba(220,38,38,0.22)' : 'rgba(83,74,183,0.12)'}`,
            }}>
              <i className={`ti ${conProblemas > 0 ? 'ti-alert-triangle' : 'ti-circle-check'}`}
                style={{ fontSize: 14, color: conProblemas > 0 ? '#D97706' : '#059669', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#1a1740' }}>
                Identidades en riesgo
              </span>
              <span style={{
                fontSize: 16, fontWeight: 700, flexShrink: 0,
                color: conProblemas > 0 ? '#B91C1C' : '#047857',
              }}>
                {conProblemas}
              </span>
            </div>

            {/* Sin identidad registrada */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 7,
              background: sinIdentidad > 0 ? 'rgba(217,119,6,0.06)' : 'rgba(83,74,183,0.04)',
              border: `0.5px solid ${sinIdentidad > 0 ? 'rgba(217,119,6,0.22)' : 'rgba(83,74,183,0.12)'}`,
            }}>
              <i className={`ti ${sinIdentidad > 0 ? 'ti-user-question' : 'ti-circle-check'}`}
                style={{ fontSize: 14, color: sinIdentidad > 0 ? '#D97706' : '#059669', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#1a1740' }}>
                Sin identidad registrada
              </span>
              <span style={{
                fontSize: 16, fontWeight: 700, flexShrink: 0,
                color: sinIdentidad > 0 ? '#92400E' : '#047857',
              }}>
                {sinIdentidad}
              </span>
            </div>

          </div>

          {/* Total activos */}
          <div style={{
            marginTop: 10, paddingTop: 8,
            borderTop: '0.5px solid rgba(83,74,183,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: '#6155BD' }}>Personal activo</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1740' }}>{activos}</span>
          </div>
        </div>

      </div>

      <InfoStrip text="El personal representa las personas que interactúan con los activos e identidades de la organización. Mantener esta información actualizada permite una mejor gestión de riesgos y accesos." />
    </div>
  )
}
