'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../../../lib/api'

const NAVY = '#1a1740', PURPLE = '#534AB7'

function fechaHora(d) {
  if (!d) return '—'
  let date = new Date(d)
  if (isNaN(date.getTime())) date = new Date(String(d).replace(' ', 'T') + 'Z')
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Las fotos de camara de celular pesan varios MB -- se redimensionan y
// recomprimen en el propio navegador antes de subirlas (mas rapido en la red
// del evento y evita pasarse del limite de tamaño del servidor).
function fileToDataUrlComprimido(file, maxDim = 1400, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim }
        else if (height >= width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
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
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [verCorreoHtml, setVerCorreoHtml] = useState(null) // null = cerrado

  const [escaneando, setEscaneando] = useState(false)
  const [textoOcr, setTextoOcr] = useState('')
  const fileInputRef = useRef(null)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const cargarEnvios = useCallback(async () => {
    setLoadingEnvios(true)
    try {
      const params = new URLSearchParams()
      if (filtroTexto.trim()) params.set('q', filtroTexto.trim())
      if (filtroEstado) params.set('estado', filtroEstado)
      const r = await api.get(`/api/admin/marketing/envios?${params.toString()}`)
      setEnvios(r.envios ?? [])
    } catch { showToast('No se pudo cargar el historial') }
    finally { setLoadingEnvios(false) }
  }, [filtroTexto, filtroEstado])

  useEffect(() => {
    const t = setTimeout(cargarEnvios, 300)
    return () => clearTimeout(t)
  }, [cargarEnvios])

  async function generarPreview() {
    setLoadingPreview(true)
    try {
      const r = await api.post('/api/admin/marketing/preview', { empresa, nombre })
      setPreviewHtml(r.html)
    } catch (e) { showToast(e.message || 'No se pudo generar la vista previa') }
    finally { setLoadingPreview(false) }
  }

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
      setEmpresa(''); setNombre(''); setEmail(''); setPreviewHtml(''); setTextoOcr('')
      cargarEnvios()
    } catch (e) { showToast(e.message || 'No se pudo enviar el correo') }
    finally { setEnviando(false) }
  }

  async function onFotoTarjeta(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir la misma foto despues
    if (!file) return
    setEscaneando(true)
    try {
      const dataUrl = await fileToDataUrlComprimido(file)
      const r = await api.post('/api/admin/marketing/escanear-tarjeta', { imageDataUrl: dataUrl })
      if (r.sugerido?.empresa) setEmpresa(r.sugerido.empresa)
      if (r.sugerido?.nombre)  setNombre(r.sugerido.nombre)
      if (r.sugerido?.email)   setEmail(r.sugerido.email)
      setTextoOcr(r.textoCompleto || '')
      showToast('Tarjeta leída — revisa los datos antes de enviar')
    } catch (e) { showToast(e.message || 'No se pudo leer la tarjeta') }
    finally { setEscaneando(false) }
  }

  async function verCorreo(id) {
    try {
      const r = await api.get(`/api/admin/marketing/envios/${id}/html`)
      setVerCorreoHtml(r.html || '<p>Sin contenido guardado.</p>')
    } catch (e) { showToast(e.message || 'No se pudo cargar el correo') }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>📧 Marketing — Seguimiento Exponor</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Envía el correo de seguimiento a cada contacto, uno por uno.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginTop: 20, alignItems: 'start' }}>
        {/* Formulario */}
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A' }}>Nuevo contacto</div>
            <button onClick={() => fileInputRef.current?.click()} disabled={escaneando}
              style={{ background: '#F7F6F2', color: NAVY, border: '1px solid #ECEAE3', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {escaneando ? 'Leyendo…' : '📷 Escanear tarjeta'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFotoTarjeta} />
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Empresa</label>
          <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ej: Minera Los Andes"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Nombre del contacto</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María Pérez"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Correo</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@empresa.cl" type="email"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          {textoOcr && (
            <details style={{ marginBottom: 14, fontSize: 11.5, color: '#8A877E' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Texto leído de la tarjeta (revisa si algo quedó mal)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#F7F6F2', padding: 8, borderRadius: 6, marginTop: 6 }}>{textoOcr}</pre>
            </details>
          )}

          <button onClick={enviar} disabled={enviando}
            style={{ width: '100%', background: PURPLE, color: '#fff', border: 'none', borderRadius: 999, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {enviando ? 'Enviando…' : '✉️ Enviar correo'}
          </button>
          <div style={{ fontSize: 11.5, color: '#8A877E', marginTop: 10, lineHeight: 1.5 }}>
            La vista previa se actualiza automáticamente. "Escanear tarjeta" usa la cámara del celular y completa los campos — siempre revisa antes de enviar.
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A' }}>
            Historial ({envios.filter(e => e.estado === 'enviado').length} enviados)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Buscar empresa, contacto o correo…"
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 13, flex: '1 1 200px', minWidth: 160, boxSizing: 'border-box' }} />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 13 }}>
              <option value="">Todos los estados</option>
              <option value="enviado">Enviado</option>
              <option value="error">Error</option>
            </select>
            <a href="/api/admin/marketing/envios/export" target="_blank" rel="noopener noreferrer"
              style={{ background: '#F7F6F2', color: NAVY, border: '1px solid #ECEAE3', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              ⬇️ Exportar a Excel
            </a>
          </div>
        </div>

        {loadingEnvios ? (
          <div style={{ color: '#8A877E', fontSize: 13 }}>Cargando…</div>
        ) : envios.length === 0 ? (
          <div style={{ color: '#8A877E', fontSize: 13 }}>No hay envíos que coincidan con el filtro.</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#8A877E', borderBottom: '1px solid #ECEAE3' }}>
                <th style={{ padding: '6px 8px' }}>Empresa</th>
                <th style={{ padding: '6px 8px' }}>Contacto</th>
                <th style={{ padding: '6px 8px' }}>Correo</th>
                <th style={{ padding: '6px 8px' }}>Estado</th>
                <th style={{ padding: '6px 8px' }}>Fecha</th>
                <th style={{ padding: '6px 8px' }}></th>
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
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => verCorreo(e.id)}
                      style={{ background: 'none', border: '1px solid #ECEAE3', borderRadius: 8, padding: '4px 10px', fontSize: 11.5, cursor: 'pointer', color: PURPLE, fontWeight: 700 }}>
                      Ver correo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal "Ver correo" */}
      {verCorreoHtml !== null && (
        <div onClick={() => setVerCorreoHtml(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: NAVY }}>Correo enviado</div>
              <button onClick={() => setVerCorreoHtml(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <iframe srcDoc={verCorreoHtml} title="Correo enviado" style={{ width: '100%', height: 'min(600px, 65vh)', border: '1px solid #ECEAE3', borderRadius: 8 }} />
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div>}
    </div>
  )
}
