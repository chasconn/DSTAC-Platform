'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'
import BotonInforme from '../../../../components/admin/BotonInforme'

const NAVY = '#1a1740', PURPLE = '#534AB7'
const OPTS = [
  { v: 'si', label: 'Sí', color: '#1D9E75', bg: '#EAF3DE' },
  { v: 'parcial', label: 'Parcial', color: '#C98A1E', bg: '#FFF6DD' },
  { v: 'no', label: 'No', color: '#D8543F', bg: '#FCEBEB' },
  { v: 'na', label: 'N/A', color: '#888780', bg: '#F1EFE8' },
]
const scoreColor = (s) => (s == null ? '#B4B2A9' : s >= 80 ? '#1D9E75' : s >= 50 ? '#C98A1E' : '#D8543F')
const CLP = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL')

export default function DiagnosticoPage() {
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [dominios, setDominios] = useState([])
  const [tamanos, setTamanos] = useState([])
  const [respuestas, setRespuestas] = useState({})
  const [resultado, setResultado] = useState(null)
  const [cotResult, setCotResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')
  const [historial, setHistorial] = useState([])
  const [showHistorial, setShowHistorial] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    if (raw) { try { setEmpresaActiva(JSON.parse(raw)) } catch {} }
  }, [])

  const slug = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const cargar = useCallback(async () => {
    if (!slug) return
    try { const d = await api.get('/api/admin/diagnostico/cuestionario', headers); setDominios(d.dominios ?? []); setTamanos(d.tamanos ?? []) }
    catch { showToast('No se pudo cargar el cuestionario') }
  }, [slug])
  useEffect(() => { cargar() }, [slug])

  const cargarHistorial = useCallback(async () => {
    if (!slug) return
    try { const r = await api.get('/api/admin/diagnostico', headers); setHistorial(r.diagnosticos ?? []) }
    catch { showToast('No se pudo cargar el historial') }
  }, [slug])
  useEffect(() => { cargarHistorial() }, [slug, resultado])

  const setResp = (key, v) => setRespuestas(p => ({ ...p, [key]: v }))
  const totalPreg = dominios.reduce((a, d) => a + d.preguntas.length, 0)
  const respondidas = Object.keys(respuestas).filter(k => k !== 'tamano' && k !== 'trabajadores').length
  const autoTamano = (() => { const n = Number(respuestas.trabajadores) || 0; if (n <= 0) return null; if (n <= 15) return 'PYMES'; if (n <= 50) return 'Profesional'; return 'Empresarial' })()
  const tamanoElegido = respuestas.tamano || autoTamano || ''
  const planElegido = (tamanos.find(t => t.id === tamanoElegido) || {}).plan
    || { PYMES: 'Plan PYMES', Profesional: 'Plan Profesional', Empresarial: 'Plan Empresarial' }[tamanoElegido]

  async function guardar() {
    if (!slug) return
    setSaving(true); setCotResult(null)
    try {
      const r = await api.post('/api/admin/diagnostico', { respuestas }, headers)
      setResultado(r)
      showToast(`Diagnóstico guardado · madurez ${r.scoreTotal}% (${r.nivel})`)
    } catch (e) { showToast(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function generarCotizacion() {
    if (!resultado?.id) return
    setGenerating(true)
    try {
      const r = await api.post(`/api/admin/diagnostico/${resultado.id}/cotizacion`, {}, headers)
      setCotResult(r)
      showToast(`Cotización ${r.numero} creada (borrador)`)
    } catch (e) { showToast(e.message || 'No se pudo generar la cotización') }
    finally { setGenerating(false) }
  }

  if (!slug) return <div style={{ padding: 24 }}>Selecciona una empresa para hacerle el diagnóstico.</div>

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>🩺 Diagnóstico de Madurez</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{empresaActiva?.name} · cuestionario interno · {respondidas}/{totalPreg} respondidas</div>
        </div>
        <button onClick={() => setShowHistorial(s => !s)}
          style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          🗂 {showHistorial ? 'Ocultar historial' : `Historial (${historial.length})`}
        </button>
      </div>

      {showHistorial && (
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Historial de diagnósticos · {empresaActiva?.name}</div>
          {historial.length === 0
            ? <div style={{ fontSize: 13, color: '#888780' }}>Aún no hay diagnósticos guardados para esta empresa.</div>
            : (
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f7f4' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Fecha</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Madurez</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Nivel</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Cotización</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Informe</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(h => (
                    <tr key={h.id}>
                      <td style={{ padding: '8px 10px', fontSize: 13, color: '#2C2C2A', borderBottom: '1px solid #f5f4ef' }}>{new Date(h.fecha).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, textAlign: 'center', color: scoreColor(h.score_total), borderBottom: '1px solid #f5f4ef' }}>{h.score_total}%</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'center', borderBottom: '1px solid #f5f4ef' }}>
                        <span style={{ background: '#f1efe8', color: '#444441', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>{h.nivel}</span>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'center', color: h.cotizacion_id ? '#1D9E75' : '#B4B2A9', borderBottom: '1px solid #f5f4ef' }}>{h.cotizacion_id ? '✓ generada' : '—'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #f5f4ef' }}>
                        <BotonInforme tipo="diagnostico" slug={slug} label="Ver informe" query={{ id: h.id }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </div>
      )}

      {/* Cantidad de trabajadores → sugiere un plan, pero el admin puede corregirlo */}
      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>Cantidad de trabajadores</span>
        <input type="number" min="1" value={respuestas.trabajadores ?? ''} onChange={e => setResp('trabajadores', e.target.value)} placeholder="Ej. 12"
          style={{ width: 130, padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 14, color: '#2C2C2A', outline: 'none' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>Plan</span>
        <select value={tamanoElegido} onChange={e => setResp('tamano', e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CECBF6', background: '#EEEDFE', fontSize: 13, fontWeight: 700, color: '#3C3489', outline: 'none' }}>
          <option value="" disabled>Selecciona…</option>
          {(tamanos.length ? tamanos : [{ id: 'PYMES', label: 'PYME', plan: 'Plan PYMES' }, { id: 'Profesional', label: 'Mediana', plan: 'Plan Profesional' }, { id: 'Empresarial', label: 'Grande', plan: 'Plan Empresarial' }])
            .map(t => <option key={t.id} value={t.id}>{t.plan || t.label}{autoTamano === t.id ? ' (sugerido)' : ''}</option>)}
        </select>
        {respuestas.tamano && respuestas.tamano !== autoTamano && (
          <button onClick={() => setResp('tamano', undefined)} title="Volver a la sugerencia automática"
            style={{ fontSize: 11.5, color: '#888780', background: 'none', border: '1px solid #e2e0d8', borderRadius: 999, padding: '5px 10px', cursor: 'pointer' }}>↺ usar sugerencia</button>
        )}
        <span style={{ fontSize: 12, color: '#888780', marginLeft: 'auto' }}>1–15 PYME · 16–50 Profesional · +50 Empresarial (puedes elegir otro plan manualmente)</span>
      </div>

      {/* Cuestionario */}
      {dominios.map(d => (
        <div key={d.id} style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>{d.nombre}</div>
          {d.preguntas.map((p, i) => {
            const key = `${d.id}-${i}`
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: i ? '1px solid #f5f4ef' : 'none' }}>
                <span style={{ fontSize: 13, color: '#444441', flex: 1 }}>{p}</span>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {OPTS.map(o => (
                    <button key={o.v} onClick={() => setResp(key, o.v)}
                      style={{ padding: '5px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        background: respuestas[key] === o.v ? o.bg : '#f8f7f4',
                        color: respuestas[key] === o.v ? o.color : '#aaa',
                        outline: respuestas[key] === o.v ? `1.5px solid ${o.color}55` : 'none' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '6px 0 24px' }}>
        <button onClick={guardar} disabled={saving || !respondidas}
          style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: respondidas ? 'pointer' : 'not-allowed', opacity: respondidas ? 1 : 0.5 }}>
          {saving ? 'Guardando…' : 'Guardar diagnóstico'}
        </button>
        <span style={{ fontSize: 12, color: '#888780' }}>{respondidas} de {totalPreg} preguntas respondidas</span>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: scoreColor(resultado.scoreTotal) }}>{resultado.scoreTotal}%</div>
              <div>
                <div style={{ fontSize: 12, color: '#888780', textTransform: 'uppercase', letterSpacing: 1 }}>Madurez global</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(resultado.scoreTotal) }}>Nivel {resultado.nivel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <BotonInforme tipo="diagnostico" slug={slug} label="Ver informe" />
              <button onClick={generarCotizacion} disabled={generating}
                style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>
                {generating ? 'Generando…' : '💰 Generar cotización'}
              </button>
            </div>
          </div>

          {/* Barras por dominio */}
          <div style={{ marginBottom: 16 }}>
            {(resultado.dominios ?? []).map(dm => (
              <div key={dm.id} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#2C2C2A', marginBottom: 3 }}>
                  <span>{dm.nombre}</span><strong>{dm.score == null ? 'sin datos' : `${dm.score}%`}</strong>
                </div>
                <div style={{ height: 8, background: '#f1efe8', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${dm.score || 0}%`, height: '100%', background: scoreColor(dm.score), borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#EEEDFE', border: '1px solid #CECBF6', borderRadius: 10, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: '#3C3489' }}>
            <b>Plan recomendado:</b> {resultado.plan} <span style={{ color: '#7C7AA8' }}>(según el tamaño seleccionado)</span>
          </div>

          {resultado.proyectos?.length > 0 && (
            <div style={{ fontSize: 12.5, color: '#6A675E', background: '#f8f7f4', borderRadius: 8, padding: '10px 12px' }}>
              <b>Proyectos sugeridos</b> para cerrar brechas: {resultado.proyectos.join(' · ')}. Usa <b>Generar cotización</b> para crear el borrador con el plan + estos proyectos.
            </div>
          )}

          {cotResult && (
            <div style={{ marginTop: 14, background: '#EAF3DE', border: '1px solid #C0DD97', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#27500A' }}>
              ✓ Cotización <b>{cotResult.numero}</b> creada como borrador para {empresaActiva?.name} ({cotResult.items} ítems · neto {CLP(cotResult.neto)}). Ábrela en <b>Cotizaciones</b> para revisarla y enviarla.
            </div>
          )}
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div>}
    </div>
  )
}
