'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'

const NAVY = '#1a1740', PURPLE = '#534AB7'

function fechaHora(d) {
  if (!d) return '—'
  let date = new Date(d)
  if (isNaN(date.getTime())) date = new Date(String(d).replace(' ', 'T') + 'Z')
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function MarketingExponorPage() {
  const [empresa, setEmpresa] = useState('')
  const [nombre, setNombre]   = useState('')
  const [email, setEmail]     = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState('')
  const [envios, setEnvios] = useState([])
  const [loadingEnvios, setLoadingEnvios] = useState(false)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const cargarEnvios = useCallback(async () => {
    setLoadingEnvios(true)
    try { const r = await api.get('/api/admin/marketing/envios'); setEnvios(r.envios ?? []) }
    catch { showToast('No se pudo cargar el historial') }
    finally { setLoadingEnvios(false) }
  }, [])

  useEffect(() => { cargarEnvios() }, [cargarEnvios])

  async function generarPreview() {
    setLoadingPreview(true)
    try {
      const r = await api.post('/api/admin/marketing/preview', { empresa, nombre })
      setPreviewHtml(r.html)
    } catch (e) { showToast(e.message || 'No se pudo generar la vista previa') }
    finally { setLoadingPreview(false) }
  }

  // Vista previa automática mientras se escribe (con un pequeño debounce)
  useEffect(() => {
    if (!empresa && !nombre) { setPreviewHtml(''); return }
    const t = setTimeout(generarPreview, 500)
    return () => clearTimeout(t)
  }, [empresa, nombre])

  async function enviar() {
    if (!empresa.trim() || !nombre.trim() || !email.trim()) {
      showToast('Completa empresa, nombre y correo'); return
    }
    setEnviando(true)
    try {
      await api.post('/api/admin/marketing/enviar', { empresa, nombre, email })
      showToast(`Correo enviado a ${nombre} (${email})`)
      setEmpresa(''); setNombre(''); setEmail(''); setPreviewHtml('')
      cargarEnvios()
    } catch (e) { showToast(e.message || 'No se pudo enviar el correo') }
    finally { setEnviando(false) }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>📧 Marketing — Seguimiento Exponor</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Envía el correo de seguimiento a cada contacto, uno por uno.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, marginTop: 20, alignItems: 'start' }}>
        {/* Formulario */}
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', marginBottom: 14 }}>Nuevo contacto</div>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Empresa</label>
          <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ej: Minera Los Andes"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Nombre del contacto</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María Pérez"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Correo</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@empresa.cl" type="email"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 18, fontSize: 14, boxSizing: 'border-box' }} />

          <button onClick={enviar} disabled={enviando}
            style={{ width: '100%', background: PURPLE, color: '#fff', border: 'none', borderRadius: 999, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {enviando ? 'Enviando…' : '✉️ Enviar correo'}
          </button>
          <div style={{ fontSize: 11.5, color: '#8A877E', marginTop: 10, lineHeight: 1.5 }}>
            La vista previa de la derecha se actualiza automáticamente mientras escribes.
          </div>
        </div>

        {/* Vista previa */}
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8A877E', marginBottom: 10 }}>
            {loadingPreview ? 'Actualizando vista previa…' : 'Vista previa del correo'}
          </div>
          {previewHtml ? (
            <iframe srcDoc={previewHtml} title="Vista previa" style={{ width: '100%', height: 720, border: '1px solid #ECEAE3', borderRadius: 8 }} />
          ) : (
            <div style={{ height: 720, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A877E', fontSize: 13 }}>
              Escribe el nombre de la empresa o del contacto para ver la vista previa.
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', marginBottom: 14 }}>
          Enviados ({envios.filter(e => e.estado === 'enviado').length})
        </div>
        {loadingEnvios ? (
          <div style={{ color: '#8A877E', fontSize: 13 }}>Cargando…</div>
        ) : envios.length === 0 ? (
          <div style={{ color: '#8A877E', fontSize: 13 }}>Todavía no has enviado ningún correo.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#8A877E', borderBottom: '1px solid #ECEAE3' }}>
                <th style={{ padding: '6px 8px' }}>Empresa</th>
                <th style={{ padding: '6px 8px' }}>Contacto</th>
                <th style={{ padding: '6px 8px' }}>Correo</th>
                <th style={{ padding: '6px 8px' }}>Estado</th>
                <th style={{ padding: '6px 8px' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {envios.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #F4F3EE' }}>
                  <td style={{ padding: '8px' }}>{e.empresa}</td>
                  <td style={{ padding: '8px' }}>{e.contacto_nombre}</td>
                  <td style={{ padding: '8px', color: '#6A675E' }}>{e.contacto_email}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      color: e.estado === 'enviado' ? '#27500A' : '#791F1F',
                      background: e.estado === 'enviado' ? '#EAF3DE' : '#FCEBEB',
                    }}>{e.estado === 'enviado' ? 'Enviado' : 'Error'}</span>
                  </td>
                  <td style={{ padding: '8px', color: '#8A877E' }}>{fechaHora(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div>}
    </div>
  )
}
