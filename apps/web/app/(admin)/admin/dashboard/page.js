'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import { StatusBadge, PlanBadge, getInitials } from '../clientes/components/badges'

export default function AdminDashboard() {
  const router  = useRouter()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.get('/api/dashboard/stats')
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />
  if (error) return (
    <div style={{ padding: 32, color: '#E24B4A', fontSize: 14 }}>
      Error cargando dashboard: {error}
    </div>
  )

  const {
    empresas,
    score_promedio,
    incidentes_abiertos,
    nist             = [],
    nist_por_empresa = [],
    nist_stats       = {},
    ultimas_empresas = [],
  } = data

  const ns = {
    empresas_con_eval:       nist_stats.empresas_con_eval       ?? 0,
    controles_pendientes:    nist_stats.controles_pendientes    ?? 0,
    controles_implementados: nist_stats.controles_implementados ?? 0,
    evidencias_pendientes:   nist_stats.evidencias_pendientes   ?? 0,
  }

  const scoreColor = score_promedio === null ? '#B4B2A9'
    : score_promedio >= 70 ? '#639922'
    : score_promedio >= 40 ? '#EF9F27'
    : '#E24B4A'

  function abrirNist(empresa) {
    localStorage.setItem('empresa_activa', JSON.stringify({ name: empresa.name, slug: empresa.slug }))
    router.push('/admin/nist')
  }

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>
          Resumen operacional de la cartera de clientes
        </p>
      </div>

      {/* Fila 1 — KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
        <KpiCard label="Clientes activos"    value={empresas.activas}                          sub={`de ${empresas.total} totales`}       color="#534AB7"  icon={<IconUsers />} />
        <KpiCard label="Score promedio"      value={score_promedio !== null ? `${score_promedio}%` : '—'} sub="cartera NIST CSF"          color={scoreColor} icon={<IconScore color={scoreColor} />} />
        <KpiCard label="Incidentes abiertos" value={incidentes_abiertos}                       sub="en todos los clientes"                color={incidentes_abiertos > 0 ? '#E24B4A' : '#639922'} icon={<IconAlert color={incidentes_abiertos > 0 ? '#E24B4A' : '#639922'} />} />
        <KpiCard label="Suspendidos"         value={empresas.suspendidas}                      sub={`${empresas.en_setup} en setup`}      color={empresas.suspendidas > 0 ? '#EF9F27' : '#B4B2A9'} icon={<IconPause color={empresas.suspendidas > 0 ? '#EF9F27' : '#B4B2A9'} />} />
      </div>

      {/* Fila 1b — NIST mini-stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Empresas evaluadas',     value: `${ns.empresas_con_eval} / ${empresas.activas}`, color: '#3C3489' },
          { label: 'Controles pendientes',   value: ns.controles_pendientes,    color: ns.controles_pendientes > 0 ? '#E24B4A' : '#639922' },
          { label: 'Controles implementados',value: ns.controles_implementados, color: '#1D9E75' },
          { label: 'Evidencias por revisar', value: ns.evidencias_pendientes,   color: ns.evidencias_pendientes > 0 ? '#EF9F27' : '#639922' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1, flexShrink: 0 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888780', lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Fila 2 — NIST cartera + Distribución por plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 20 }}>

        {/* NIST de la cartera */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>NIST CSF — Promedio de cartera</div>
            <button
              onClick={() => router.push('/admin/nist')}
              style={{ fontSize: 12, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
              Ver módulo →
            </button>
          </div>
          {nist.every(n => n.promedio === null) ? (
            <div style={{ fontSize: 13, color: '#888780', textAlign: 'center', padding: '20px 0' }}>
              Sin evaluaciones NIST registradas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {nist.map(n => {
                const pct      = n.promedio ?? 0
                const barColor = n.color ?? (pct >= 70 ? '#639922' : pct >= 40 ? '#EF9F27' : '#E24B4A')
                return (
                  <div key={n.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: barColor, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 13, color: '#2C2C2A', fontWeight: 500 }}>{n.name}</span>
                        {(n.pendientes > 0 || n.implementados > 0) && (
                          <span style={{ fontSize: 10, color: '#888780' }}>
                            {n.implementados} impl. · {n.pendientes} pend.
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: n.promedio === null ? '#B4B2A9' : barColor }}>
                        {n.promedio !== null ? `${pct}%` : '—'}
                      </span>
                    </div>
                    <div style={{ height: 7, background: '#f1efe8', borderRadius: 99 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Distribución por plan */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 16 }}>
            Distribución por plan
          </div>
          {empresas.por_plan.length === 0 ? (
            <div style={{ fontSize: 13, color: '#888780', textAlign: 'center', padding: '20px 0' }}>Sin clientes activos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {empresas.por_plan.map(p => {
                const pct = empresas.activas > 0 ? Math.round((p.total / empresas.activas) * 100) : 0
                const planColors = { pyme: '#534AB7', profesional: '#185FA5', enterprise: '#0F6E56' }
                const c = planColors[p.plan] || '#888780'
                return (
                  <div key={p.plan}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A' }}>{p.display_name}</span>
                      <span style={{ fontSize: 12, color: '#888780' }}>{p.total} clientes</span>
                    </div>
                    <div style={{ height: 8, background: '#f1efe8', borderRadius: 99 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fila 3 — NIST por empresa */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>NIST CSF — Score por empresa</div>
          <span style={{ fontSize: 12, color: '#888780' }}>
            {nist_por_empresa.filter(e => e.eval_id).length} de {nist_por_empresa.length} evaluadas
          </span>
        </div>

        {nist_por_empresa.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780', textAlign: 'center', padding: '20px 0' }}>Sin empresas activas</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {nist_por_empresa.map((emp, i) => {
              const score = emp.score_total ?? null
              const pct   = score ?? 0
              const col   = pct >= 70 ? '#1D9E75' : pct >= 40 ? '#EF9F27' : '#E24B4A'
              const hasBrand = emp.theme_color && emp.theme_color !== '#3C3489'
              return (
                <div key={emp.slug} style={{
                  display: 'grid', gridTemplateColumns: '220px 1fr 70px 120px 110px',
                  gap: 16, alignItems: 'center',
                  padding: '11px 4px',
                  borderBottom: i < nist_por_empresa.length - 1 ? '1px solid #f8f7f4' : 'none',
                }}>
                  {/* Empresa */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: emp.theme_color || '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(emp.name)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</span>
                  </div>

                  {/* Barra de score */}
                  <div>
                    {score !== null ? (
                      <>
                        <div style={{ height: 6, background: '#f1efe8', borderRadius: 99, marginBottom: 3 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 99, transition: 'width 0.6s' }} />
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: '#B4B2A9' }}>Sin evaluación</span>
                    )}
                  </div>

                  {/* Score % */}
                  <div style={{ textAlign: 'right' }}>
                    {score !== null ? (
                      <span style={{ fontSize: 15, fontWeight: 800, color: col }}>{pct}%</span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#B4B2A9' }}>—</span>
                    )}
                  </div>

                  {/* Última evaluación */}
                  <div style={{ fontSize: 11, color: '#888780', textAlign: 'right' }}>
                    {emp.ultima_eval
                      ? new Date(emp.ultima_eval).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </div>

                  {/* Botón */}
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => abrirNist(emp)}
                      style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: '#EEEDFE', color: '#3C3489', border: 'none',
                      }}>
                      Ver NIST →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fila 4 — Últimas empresas */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 14 }}>
          Últimas empresas registradas
        </div>
        {ultimas_empresas.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780', textAlign: 'center', padding: '20px 0' }}>Sin empresas registradas</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Empresa', 'Plan', 'Estado', 'Fecha de alta'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.6, padding: '0 0 10px', borderBottom: '1px solid #f1efe8' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimas_empresas.map((emp, i) => (
                <tr key={emp.slug} style={{ borderBottom: i < ultimas_empresas.length - 1 ? '1px solid #f1efe8' : 'none' }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: emp.theme_color || '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(emp.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: '#888780' }}>{emp.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 0' }}><PlanBadge plan={emp.plan_name} /></td>
                  <td style={{ padding: '10px 0' }}><StatusBadge status={emp.status} /></td>
                  <td style={{ padding: '10px 0', fontSize: 12, color: '#888780' }}>
                    {new Date(emp.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#888780', fontWeight: 500 }}>{label}</span>
        <span style={{ opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#B4B2A9' }}>{sub}</div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ height: 28, width: 180, background: '#e2e0d8', borderRadius: 8, marginBottom: 8 }} />
      <div style={{ height: 14, width: 280, background: '#f1efe8', borderRadius: 6, marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: '18px 20px', height: 100 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', height: 56 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', height: 220 }} />
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', height: 220 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', height: 240 }} />
    </div>
  )
}

// ─── Íconos ───────────────────────────────────────────────────────────────────
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconScore({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function IconAlert({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function IconPause({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  )
}
