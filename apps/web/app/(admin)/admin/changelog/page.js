'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'
import BotonInforme from '../../../../components/admin/BotonInforme'

const NAVY = '#1a1740', PURPLE = '#534AB7'
// `fecha` llega como "YYYY-MM-DD" (columna DATE, sin hora). new Date(str) la
// interpreta como medianoche UTC, y al formatear en hora de Chile (UTC-4) se
// corre un dia hacia atras. Se parsea a mano para que quede en hora local.
function fmtFecha(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = String(fechaStr).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
}
const CATEGORIA_COLOR = {
  correccion: { bg: '#FCEBEB', color: '#C0392B', label: 'Corrección' },
  feature:    { bg: '#EAF3DE', color: '#1D9E75', label: 'Funcionalidad nueva' },
  mejora:     { bg: '#EEEDFE', color: '#534AB7', label: 'Mejora' },
}

export default function ChangelogPage() {
  const [entradas, setEntradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [abiertas, setAbiertas] = useState({})
  const [detalles, setDetalles] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/api/admin/changelog'); setEntradas(r.entradas ?? []) }
    catch { showToast('No se pudo cargar el registro') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function toggle(id) {
    setAbiertas(p => ({ ...p, [id]: !p[id] }))
    if (!detalles[id]) {
      try { const r = await api.get(`/api/admin/changelog/${id}`); setDetalles(p => ({ ...p, [id]: r })) }
      catch { showToast('No se pudo cargar el detalle') }
    }
  }

  function parseJson(v, fallback = []) {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') { try { return JSON.parse(v) || fallback } catch { return fallback } }
    return fallback
  }

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>🗒️ Registro de cambios</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Historial interno de correcciones y mejoras de la plataforma — uso exclusivo DSTAC</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotonInforme tipo="changelog" label="📄 Ver informe completo" />
          <button onClick={() => setShowForm(true)}
            style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Nuevo registro
          </button>
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#888780' }}>Cargando…</div>}

      {!loading && entradas.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888780', fontSize: 13 }}>
          Aún no hay registros.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entradas.map(e => {
          const cat = CATEGORIA_COLOR[e.categoria] || CATEGORIA_COLOR.correccion
          const abierta = !!abiertas[e.id]
          const detalle = detalles[e.id]
          const archivosResumen = parseJson(e.archivos)
          return (
            <div key={e.id} style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, overflow: 'hidden' }}>
              <div onClick={() => toggle(e.id)} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#888780' }}>
                      {fmtFecha(e.fecha)}
                    </span>
                    <span style={{ background: cat.bg, color: cat.color, fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {cat.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', marginBottom: 6 }}>{e.titulo}</div>
                  <div style={{ fontSize: 13.5, color: '#444441', lineHeight: 1.6 }}>{e.resumen_simple}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div onClick={ev => ev.stopPropagation()}>
                    <BotonInforme tipo="changelog" label="Ver informe" query={{ id: e.id }} />
                  </div>
                  <span style={{ fontSize: 13, color: '#888780', transform: abierta ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                </div>
              </div>

              {abierta && (
                <div style={{ borderTop: '1px solid #f1efe8', padding: '16px 20px', background: '#faf9f6' }}>
                  {!detalle ? (
                    <div style={{ fontSize: 13, color: '#888780' }}>Cargando detalle técnico…</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                        Detalle técnico
                      </div>
                      <div style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
                        {detalle.detalle_tecnico}
                      </div>

                      {parseJson(detalle.archivos).length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                            Archivos modificados
                          </div>
                          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
                            {parseJson(detalle.archivos).map((a, i) => (
                              <li key={i} style={{ fontSize: 12.5, fontFamily: 'monospace', color: '#444441', marginBottom: 3, wordBreak: 'break-all' }}>{a}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {parseJson(detalle.comandos).length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                            Comandos utilizados
                          </div>
                          <div style={{ background: '#1c1c22', borderRadius: 8, padding: '12px 14px', overflowX: 'auto' }}>
                            {parseJson(detalle.comandos).map((c, i) => (
                              <div key={i} style={{ fontSize: 12, fontFamily: 'monospace', color: '#A6E3A1', marginBottom: i < parseJson(detalle.comandos).length - 1 ? 8 : 0, whiteSpace: 'pre' }}>
                                $ {c}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <NuevoRegistroModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); cargar(); showToast('Registro creado') }} />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div>}
    </div>
  )
}

function NuevoRegistroModal({ onClose, onCreated }) {
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('correccion')
  const [resumenSimple, setResumenSimple] = useState('')
  const [detalleTecnico, setDetalleTecnico] = useState('')
  const [archivos, setArchivos] = useState('')
  const [comandos, setComandos] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    if (!titulo.trim() || !resumenSimple.trim() || !detalleTecnico.trim()) {
      setError('Completa al menos título, resumen simple y detalle técnico')
      return
    }
    setSaving(true); setError('')
    try {
      await api.post('/api/admin/changelog', {
        titulo, categoria, resumen_simple: resumenSimple, detalle_tecnico: detalleTecnico,
        archivos: archivos.split('\n').map(s => s.trim()).filter(Boolean),
        comandos: comandos.split('\n').map(s => s.trim()).filter(Boolean),
      })
      onCreated()
    } catch (e) { setError(e.message || 'No se pudo guardar') }
    finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '9px 11px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 'min(640px, 94vw)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1efe8' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>Nuevo registro</h2>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#444441', marginBottom: 6 }}>Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} style={inputStyle} placeholder="Ej: Bug: la app no rotaba a horizontal" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#444441', marginBottom: 6 }}>Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputStyle}>
              <option value="correccion">Corrección</option>
              <option value="feature">Funcionalidad nueva</option>
              <option value="mejora">Mejora</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#444441', marginBottom: 6 }}>Resumen simple (sin tecnicismos)</label>
            <textarea value={resumenSimple} onChange={e => setResumenSimple(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#444441', marginBottom: 6 }}>Detalle técnico</label>
            <textarea value={detalleTecnico} onChange={e => setDetalleTecnico(e.target.value)} rows={6} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#444441', marginBottom: 6 }}>Archivos modificados (uno por línea)</label>
            <textarea value={archivos} onChange={e => setArchivos(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#444441', marginBottom: 6 }}>Comandos utilizados (uno por línea)</label>
            <textarea value={comandos} onChange={e => setComandos(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5 }} />
          </div>
          {error && <div style={{ background: '#FCEBEB', color: '#791F1F', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e2e0d8', background: '#fff', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ padding: '8px 18px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, background: PURPLE, color: '#fff', cursor: 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar registro'}
          </button>
        </div>
      </div>
    </div>
  )
}
