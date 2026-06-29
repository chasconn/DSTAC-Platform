'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '../../../../lib/api'
import FixedPortal from '../../../../components/admin/FixedPortal'

const NAVY = '#1a1740', PURPLE = '#534AB7'

export default function OnboardingPage() {
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [pasos, setPasos] = useState([])
  const [planActual, setPlanActual] = useState('')
  const [loading, setLoading] = useState(true)
  const [abiertos, setAbiertos] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    if (raw) { try { setEmpresaActiva(JSON.parse(raw)) } catch {} }
  }, [])

  const slug = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const cargar = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try { const r = await api.get('/api/admin/onboarding', headers); setPasos(r.pasos ?? []); setPlanActual(r.plan_actual || '') }
    catch { showToast('No se pudo cargar el checklist') }
    finally { setLoading(false) }
  }, [slug])
  useEffect(() => { cargar() }, [cargar])

  async function toggle(paso) {
    const nuevoEstado = !paso.completado
    setPasos(prev => prev.map(p => p.id === paso.id ? { ...p, completado: nuevoEstado ? 1 : 0 } : p))
    try { await api.post(`/api/admin/onboarding/${paso.id}/toggle`, { completado: nuevoEstado }, headers) }
    catch {
      showToast('No se pudo guardar el cambio')
      setPasos(prev => prev.map(p => p.id === paso.id ? { ...p, completado: paso.completado } : p))
    }
  }

  if (!slug) return <div style={{ padding: 24 }}>Selecciona una empresa para ver su checklist de onboarding.</div>

  const obligatorios = pasos.filter(p => !p.opcional)
  const completados = obligatorios.filter(p => p.completado).length
  const pct = obligatorios.length ? Math.round((completados / obligatorios.length) * 100) : 0

  const fases = []
  for (const p of pasos) {
    let f = fases.find(x => x.nombre === p.fase)
    if (!f) { f = { nombre: p.fase, pasos: [] }; fases.push(f) }
    f.pasos.push(p)
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🚀 Onboarding de cliente</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          {empresaActiva?.name} · Plan {planActual ? planActual.toUpperCase() : '—'} · Guía paso a paso, pensada para seguir sin supervisión
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 999, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{completados}/{obligatorios.length} pasos · {pct}%</span>
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#888780' }}>Cargando…</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {fases.map(fase => (
          <div key={fase.nombre}>
            <div style={{ fontSize: 12, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              {fase.nombre}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fase.pasos.map(p => {
                const abierto = !!abiertos[p.id]
                return (
                  <div key={p.id} style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
                      <input type="checkbox" checked={!!p.completado} onChange={() => toggle(p)}
                        style={{ width: 18, height: 18, marginTop: 2, accentColor: PURPLE, cursor: 'pointer', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setAbiertos(s => ({ ...s, [p.id]: !s[p.id] }))}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: p.completado ? '#888780' : '#2C2C2A', textDecoration: p.completado ? 'line-through' : 'none' }}>
                            {p.titulo}
                          </span>
                          {!!p.opcional && (
                            <span style={{ background: '#F1EFE8', color: '#888780', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999, textTransform: 'uppercase' }}>
                              Opcional
                            </span>
                          )}
                          {!p.disponible_en_plan && (
                            <span style={{ background: '#FFF6DD', color: '#C98A1E', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999, textTransform: 'uppercase' }}>
                              No incluido en tu plan actual
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#666', marginTop: 4, lineHeight: 1.55 }}>{p.explicacion_simple}</div>
                      </div>
                      <span style={{ fontSize: 12, color: '#888780', flexShrink: 0, cursor: 'pointer' }} onClick={() => setAbiertos(s => ({ ...s, [p.id]: !s[p.id] }))}>
                        {abierto ? 'Ocultar ▾' : 'Ver pasos ▸'}
                      </span>
                    </div>

                    {abierto && (
                      <div style={{ borderTop: '1px solid #f1efe8', padding: '16px 16px 16px 46px', background: '#faf9f6' }}>
                        <div style={{ fontSize: 12.5, color: '#2C2C2A', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: p.modulo_link ? 14 : 0 }}>
                          {p.instrucciones}
                        </div>
                        {p.modulo_link && (
                          <Link href={p.modulo_link}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: PURPLE, color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
                            {p.modulo_label || 'Ir al módulo'} →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {toast && <FixedPortal><div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div></FixedPortal>}
    </div>
  )
}
