'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../../../../../../lib/api'

// Estilos por estado del documento de política
const STATUS_STYLE = {
  vigente:       { label: 'Vigente',       color: '#27500A', bg: '#EAF3DE', card: '#F6FAEF' },
  borrador:      { label: 'Borrador',      color: '#633806', bg: '#FAEEDA', card: '#FDF8EF' },
  sin_documento: { label: 'Sin documento', color: '#791F1F', bg: '#FCEBEB', card: '#FDF4F4' },
}

const ESTADO_FILTROS = [
  { id: '',              label: 'Todos los estados' },
  { id: 'vigente',       label: 'Vigente' },
  { id: 'borrador',      label: 'Borrador' },
  { id: 'sin_documento', label: 'Sin documento' },
]

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFecha(d) {
  if (!d) return ''
  try {
    return new Date(String(d).replace(' ', 'T')).toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return String(d).slice(0, 10) }
}

export default function PoliticasTab({ domainId, slug }) {
  const [politicas, setPoliticas] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [estado,    setEstado]    = useState('')
  const [busy,      setBusy]      = useState(null)   // controlId en proceso
  const [toast,     setToast]     = useState(null)

  const fileInputRef  = useRef(null)
  const uploadTarget  = useRef(null)                 // controlId destino de la subida

  const headers = { 'X-Company-Slug': slug }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/iso/politicas', { headers })
      // El tab está dentro de un dominio → mostrar solo sus controles
      const filtered = (data.politicas ?? []).filter(p => p.domain_id === domainId)
      setPoliticas(filtered)
    } catch (err) {
      console.error(err)
      showToast(err.message ?? 'Error cargando políticas', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, domainId])

  useEffect(() => { cargar() }, [cargar])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  // Descarga autenticada (blob) — apiFetch fuerza JSON, así que usamos fetch directo
  async function descargar(url, fallbackName) {
    const res = await fetch(url, { credentials: 'include', headers })
    if (!res.ok) {
      let msg = 'No se pudo descargar el archivo'
      try { msg = (await res.json()).error || msg } catch { /* no-op */ }
      throw new Error(msg)
    }
    const blob = await res.blob()
    const cd   = res.headers.get('Content-Disposition') || ''
    const match= cd.match(/filename="?([^"]+)"?/)
    const name = match ? match[1] : fallbackName
    const link = document.createElement('a')
    link.href  = URL.createObjectURL(blob)
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  async function descargarPlantilla(p) {
    setBusy(p.id)
    try {
      await descargar(`/api/admin/iso/politicas/${encodeURIComponent(p.id)}/plantilla`, p.policy_filename)
    } catch (err) {
      showToast(err.message, 'error')
    } finally { setBusy(null) }
  }

  async function descargarDocumento(p) {
    setBusy(p.id)
    try {
      await descargar(`/api/admin/iso/politicas/${encodeURIComponent(p.id)}/documento`, p.docx_original)
    } catch (err) {
      showToast(err.message, 'error')
    } finally { setBusy(null) }
  }

  function pedirArchivo(p) {
    uploadTarget.current = p.id
    fileInputRef.current?.click()
  }

  async function onArchivoElegido(e) {
    const file = e.target.files?.[0]
    e.target.value = ''                 // permite re-subir el mismo archivo
    const controlId = uploadTarget.current
    if (!file || !controlId) return

    const ext = file.name.toLowerCase().split('.').pop()
    if (!['docx', 'doc'].includes(ext)) {
      showToast('Solo se aceptan archivos Word (.docx / .doc)', 'error')
      return
    }

    setBusy(controlId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/iso/politicas/${encodeURIComponent(controlId)}/documento`, {
        method: 'POST',
        credentials: 'include',
        headers,                         // sin Content-Type → el navegador pone el boundary
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo subir el documento')
      showToast(data.message || 'Política subida')
      await cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally { setBusy(null) }
  }

  async function eliminarDocumento(p) {
    if (!confirm(`¿Eliminar el documento de política de ${p.id}?`)) return
    setBusy(p.id)
    try {
      await apiFetch(`/api/admin/iso/politicas/${encodeURIComponent(p.id)}/documento`, {
        method: 'DELETE', headers,
      })
      showToast('Documento eliminado')
      await cargar()
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally { setBusy(null) }
  }

  const visibles = estado ? politicas.filter(p => p.politica_status === estado) : politicas
  const stats = {
    total:         politicas.length,
    vigentes:      politicas.filter(p => p.politica_status === 'vigente').length,
    borradores:    politicas.filter(p => p.politica_status === 'borrador').length,
    sin_documento: politicas.filter(p => p.politica_status === 'sin_documento').length,
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando políticas…</div>
  }

  if (politicas.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8' }}>
        Ningún control de este dominio requiere política documentada.
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Requeridas',    value: stats.total,         color: '#3C3489' },
    { label: 'Vigentes',      value: stats.vigentes,      color: '#27500A' },
    { label: 'Borradores',    value: stats.borradores,    color: '#633806' },
    { label: 'Sin documento', value: stats.sin_documento, color: '#791F1F' },
  ]

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".docx,.doc" onChange={onArchivoElegido} style={{ display: 'none' }} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 18 }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '14px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {ESTADO_FILTROS.map(f => (
          <button key={f.id} onClick={() => setEstado(f.id)}
            style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${estado === f.id ? '#3C3489' : '#e2e0d8'}`,
              background: estado === f.id ? '#EEEDFE' : '#fff',
              color: estado === f.id ? '#3C3489' : '#888780',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {toast && (
        <div style={{ marginBottom: 14, background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500 }}>
          {toast.msg}
        </div>
      )}

      {/* Lista de políticas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibles.map(p => {
          const st        = STATUS_STYLE[p.politica_status] ?? STATUS_STYLE.sin_documento
          const domColor  = p.domain_color ?? '#3C3489'
          const tieneDoc  = p.politica_status !== 'sin_documento'
          const estaBusy  = busy === p.id
          return (
            <div key={p.id} style={{ background: st.card, borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                {/* Identidad del control */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ background: domColor + '20', color: domColor, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>{p.id}</span>
                    <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#2C2C2A', lineHeight: 1.45 }}>{p.name}</div>
                  {tieneDoc && p.docx_original && (
                    <div style={{ fontSize: 11.5, color: '#888780', marginTop: 6, lineHeight: 1.6 }}>
                      📄 {p.docx_original} · v{p.version} · {formatSize(p.docx_size)}<br />
                      {formatFecha(p.docx_uploaded_at)}
                      {p.uploaded_by_name ? ` · ${p.uploaded_by_name} ${p.uploaded_by_last ?? ''}`.trimEnd() : ''}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => descargarPlantilla(p)} disabled={estaBusy}
                    style={btnStyle('#e2e0d8', '#fff', '#444441', estaBusy)}>
                    ↓ Plantilla .docx
                  </button>
                  {tieneDoc && (
                    <button onClick={() => descargarDocumento(p)} disabled={estaBusy}
                      style={btnStyle('#c8c4f0', '#EEEDFE', '#3C3489', estaBusy)}>
                      ↓ Descargar Word
                    </button>
                  )}
                  <button onClick={() => pedirArchivo(p)} disabled={estaBusy}
                    style={btnStyle('none', '#3C3489', '#fff', estaBusy)}>
                    {estaBusy ? '…' : tieneDoc ? '↑ Actualizar' : '↑ Subir Word'}
                  </button>
                  {tieneDoc && (
                    <button onClick={() => eliminarDocumento(p)} disabled={estaBusy} title="Eliminar documento"
                      style={btnStyle('#f0c4c4', '#FDF4F4', '#791F1F', estaBusy)}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Nota informativa */}
      <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e2e0d8', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#888780', lineHeight: 1.7 }}>
        <strong style={{ color: '#444441' }}>Flujo:</strong> descarga la plantilla <strong>.docx</strong> (viene auto-rellenada con la empresa, el responsable y la fecha), completa en Word los campos entre corchetes [CARGO] / [APROBADOR], revisa el contenido y súbela aquí como política vigente.
        Luego expórtala a PDF y adjúntala en <strong>Evidencias</strong> del control correspondiente.
      </div>
    </div>
  )
}

function btnStyle(borderColor, bg, color, disabled) {
  return {
    padding: '8px 14px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    border: borderColor === 'none' ? 'none' : `1px solid ${borderColor}`,
    background: bg, color, opacity: disabled ? 0.6 : 1,
  }
}
