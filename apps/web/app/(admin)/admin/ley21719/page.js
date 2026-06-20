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

export default function Ley21719Page() {
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [respuestas, setRespuestas] = useState({})
  const [resultado, setResultado] = useState(null)
  const [cotResult, setCotResult] = useState(null)
  const [certResult, setCertResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [emitiendo, setEmitiendo] = useState(false)
  const [descargando, setDescargando] = useState(false)
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
    try { const d = await api.get('/api/admin/ley21719/cuestionario', headers); setPreguntas(d.preguntas ?? []) }
    catch { showToast('No se pudo cargar el cuestionario') }
  }, [slug])
  useEffect(() => { cargar() }, [cargar])

  const cargarHistorial = useCallback(async () => {
    if (!slug) return
    try { const r = await api.get('/api/admin/ley21719', headers); setHistorial(r.evaluaciones ?? []) }
    catch { showToast('No se pudo cargar el historial') }
  }, [slug])
  useEffect(() => { cargarHistorial() }, [slug, resultado])

  const setResp = (i, v) => setRespuestas(p => ({ ...p, [i]: v }))
  const respondidas = Object.keys(respuestas).length

  async function guardar() {
    if (!slug) return
    setSaving(true); setCotResult(null); setCertResult(null)
    try {
      const r = await api.post('/api/admin/ley21719', { respuestas }, headers)
      setResultado(r)
      showToast(`Evaluación guardada · cumplimiento ${r.scoreTotal}% (${r.nivel})`)
    } catch (e) { showToast(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function generarCotizacion() {
    if (!resultado?.id) return
    setGenerating(true)
    try {
      const r = await api.post(`/api/admin/ley21719/${resultado.id}/cotizacion`, {}, headers)
      setCotResult(r)
      showToast(`Cotización ${r.numero} creada (borrador)`)
    } catch (e) { showToast(e.message || 'No se pudo generar la cotización') }
    finally { setGenerating(false) }
  }

  async function emitirCertificado() {
    if (!resultado?.id) return
    setEmitiendo(true)
    try {
      const r = await api.post(`/api/admin/ley21719/${resultado.id}/certificado`, {}, headers)
      setCertResult(r)
      showToast('Certificado de cumplimiento emitido')
    } catch (e) { showToast(e.message || 'No se pudo emitir el certificado') }
    finally { setEmitiendo(false) }
  }

  async function descargarDocumento() {
    if (!slug) return
    setDescargando(true)
    try {
      const res = await fetch('/api/admin/ley21719/documento', { credentials: 'include', headers })
      if (!res.ok) { let msg = 'No se pudo descargar el documento'; try { msg = (await res.json()).error || msg } catch {}; throw new Error(msg) }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const name = match ? match[1] : `Politica_Proteccion_Datos_Ley21719_${slug}.docx`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
    } catch (e) { showToast(e.message || 'Error al descargar') }
    finally { setDescargando(false) }
  }

  if (!slug) return <div style={{ padding: 24 }}>Selecciona una empresa para evaluar su cumplimiento.</div>

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>🔒 Ley N° 21.719 · Protección de Datos</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{empresaActiva?.name} · Protección de Datos Personales · {respondidas}/{preguntas.length} respondidas</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={descargarDocumento} disabled={descargando}
            style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📄 {descargando ? 'Descargando…' : 'Descargar política (.docx)'}
          </button>
          <button onClick={() => setShowHistorial(s => !s)}
            style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            🗂 {showHistorial ? 'Ocultar historial' : `Historial (${historial.length})`}
          </button>
        </div>
      </div>

      {showHistorial && (
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Historial de evaluaciones · {empresaActiva?.name}</div>
          {historial.length === 0
            ? <div style={{ fontSize: 13, color: '#888780' }}>Aún no hay evaluaciones guardadas para esta empresa.</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f7f4' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Fecha</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Cumplimiento</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Nivel</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Cotización</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }}>Certificado</th>
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
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'center', borderBottom: '1px solid #f5f4ef' }}>
                        {h.certificado_codigo
                          ? <BotonInforme tipo="certificado" slug={slug} label="Ver" query={{ evaluacionId: h.id, ley: '21719' }} />
                          : <span style={{ color: '#B4B2A9' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}

      {/* Cuestionario (lista única, sin dominios) */}
      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Autoevaluación de cumplimiento</div>
        {preguntas.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: i ? '1px solid #f5f4ef' : 'none' }}>
            <span style={{ fontSize: 13, color: '#444441', flex: 1 }}>{p}</span>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {OPTS.map(o => (
                <button key={o.v} onClick={() => setResp(i, o.v)}
                  style={{ padding: '5px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: respuestas[i] === o.v ? o.bg : '#f8f7f4',
                    color: respuestas[i] === o.v ? o.color : '#aaa',
                    outline: respuestas[i] === o.v ? `1.5px solid ${o.color}55` : 'none' }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '6px 0 24px' }}>
        <button onClick={guardar} disabled={saving || !respondidas}
          style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: respondidas ? 'pointer' : 'not-allowed', opacity: respondidas ? 1 : 0.5 }}>
          {saving ? 'Guardando…' : 'Guardar evaluación'}
        </button>
        <span style={{ fontSize: 12, color: '#888780' }}>{respondidas} de {preguntas.length} preguntas respondidas</span>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: scoreColor(resultado.scoreTotal) }}>{resultado.scoreTotal}%</div>
              <div>
                <div style={{ fontSize: 12, color: '#888780', textTransform: 'uppercase', letterSpacing: 1 }}>Cumplimiento</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(resultado.scoreTotal) }}>Nivel {resultado.nivel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {resultado.nivel === 'Alto' && !certResult?.codigo && (
                <button onClick={emitirCertificado} disabled={emitiendo}
                  style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>
                  {emitiendo ? 'Emitiendo…' : '🏅 Emitir certificado'}
                </button>
              )}
              {certResult?.codigo && (
                <BotonInforme tipo="certificado" slug={slug} label="Ver certificado" query={{ evaluacionId: resultado.id, ley: '21719' }} />
              )}
              <button onClick={generarCotizacion} disabled={generating}
                style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>
                {generating ? 'Generando…' : '💰 Generar cotización'}
              </button>
            </div>
          </div>

          {resultado.brechas?.length > 0 && (
            <div style={{ fontSize: 12.5, color: '#6A675E', background: '#f8f7f4', borderRadius: 8, padding: '10px 12px' }}>
              <b>Brechas detectadas:</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {resultado.brechas.map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
              </ul>
            </div>
          )}

          {cotResult && (
            <div style={{ marginTop: 14, background: '#EAF3DE', border: '1px solid #C0DD97', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#27500A' }}>
              ✓ Cotización <b>{cotResult.numero}</b> creada como borrador para {empresaActiva?.name} ({cotResult.items} ítems · neto {CLP(cotResult.neto)}). Ábrela en <b>Cotizaciones</b> para revisarla y enviarla.
            </div>
          )}

          {certResult?.codigo && (
            <div style={{ marginTop: 14, background: '#EEEDFE', border: '1px solid #C9C3F2', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#3C3489' }}>
              ✓ Certificado <b>{certResult.codigo}</b> emitido para {empresaActiva?.name}. Verificable en <b>portal.dstac.cl/verificar/{certResult.codigo}</b>.
            </div>
          )}
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div>}
    </div>
  )
}
