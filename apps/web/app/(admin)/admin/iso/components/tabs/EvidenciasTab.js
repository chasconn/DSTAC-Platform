'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../../../../../../lib/api'

const STATUS_STYLE = {
  aprobada:  { label: 'Aprobada',  color: '#27500A', bg: '#EAF3DE' },
  pendiente: { label: 'Pendiente', color: '#633806', bg: '#FAEEDA' },
  rechazada: { label: 'Rechazada', color: '#791F1F', bg: '#FCEBEB' },
}

function fileIcon(type) {
  if (!type) return '📄'
  if (type.includes('pdf'))   return '📑'
  if (type.includes('image')) return '🖼'
  if (type.includes('sheet') || type.includes('excel')) return '📊'
  if (type.includes('word') || type.includes('document')) return '📝'
  return '📄'
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

export default function EvidenciasTab({ domainId, slug }) {
  const [evidencias, setEvidencias] = useState([])
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [toast,      setToast]      = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [controls,   setControls]   = useState([])
  const [controlId,  setControlId]  = useState('')
  const [comment,    setComment]    = useState('')
  const fileRef = useRef(null)

  const headers = { 'X-Company-Slug': slug }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [eData, cData] = await Promise.all([
        apiFetch(`/api/admin/iso/evidencias?domain_id=${domainId}`, { headers }),
        apiFetch(`/api/admin/iso/controls?domain_id=${domainId}`, { headers }),
      ])
      setEvidencias(eData.evidencias ?? [])
      setStats(eData.stats ?? null)
      setControls(cData.controls ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, domainId])

  useEffect(() => { cargar() }, [cargar])

  async function uploadFile(file) {
    if (!controlId) { showToast('Selecciona un control primero', 'error'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('control_id', controlId)
    if (comment) formData.append('comment', comment)

    try {
      const res = await fetch(
        `/api/admin/iso/evidencias`,
        { method: 'POST', credentials: 'include', headers: { 'X-Company-Slug': slug }, body: formData }
      )
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error al subir') }
      showToast('Evidencia subida')
      setComment('')
      setControlId('')
      await cargar()
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function cambiarEstado(id, status, comments) {
    try {
      await apiFetch(`/api/admin/iso/evidencias/${id}`, {
        method:  'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status, comments }),
      })
      showToast(status === 'aprobada' ? 'Evidencia aprobada' : 'Evidencia rechazada')
      await cargar()
      setSelectedId(null)
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta evidencia?')) return
    try {
      await apiFetch(`/api/admin/iso/evidencias/${id}`, { method: 'DELETE', headers })
      showToast('Evidencia eliminada')
      await cargar()
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const filtered = filterStatus ? evidencias.filter(e => e.status === filterStatus) : evidencias

  if (loading) return <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando evidencias…</div>

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',     value: stats.total                || 0, color: '#2C2C2A', bg: '#f8f7f4' },
            { label: 'Aprobadas', value: stats.aprobadas            || 0, ...STATUS_STYLE.aprobada  },
            { label: 'Pendientes',value: stats.pendientes_revision  || 0, ...STATUS_STYLE.pendiente },
            { label: 'Rechazadas',value: stats.rechazadas           || 0, ...STATUS_STYLE.rechazada },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 16px', minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px dashed #e2e0d8', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>Subir nueva evidencia</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={controlId} onChange={e => setControlId(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
            <option value="">— Seleccionar control —</option>
            {controls.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
          </select>
          <input value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Comentario (opcional)"
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, fontFamily: 'inherit' }} />
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) uploadFile(e.target.files[0]); e.target.value = '' }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading || !controlId}
          style={{
            padding: '9px 20px', borderRadius: 8, border: '1px dashed #3C3489',
            background: '#EEEDFE', color: '#3C3489', cursor: (!controlId || uploading) ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, opacity: (!controlId || uploading) ? 0.6 : 1,
          }}>
          {uploading ? 'Subiendo…' : '+ Seleccionar archivo'}
        </button>
        <span style={{ fontSize: 11, color: '#B4B2A9', marginLeft: 10 }}>Máx. 20 MB</span>
      </div>

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 12 }}>
          {toast.msg}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { value: '',         label: 'Todas'    },
          { value: 'aprobada', label: 'Aprobadas'},
          { value: 'pendiente',label: 'Pendientes'},
          { value: 'rechazada',label: 'Rechazadas'},
        ].map(o => (
          <button key={o.value} onClick={() => setFilterStatus(o.value)}
            style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: filterStatus === o.value ? '#3C3489' : '#f8f7f4',
              color:      filterStatus === o.value ? '#fff'    : '#888780',
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(e => {
          const style   = STATUS_STYLE[e.status] ?? STATUS_STYLE.pendiente
          const isOpen  = selectedId === e.id
          return (
            <div key={e.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{fileIcon(e.file_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>
                    {e.control_name} · {formatSize(e.file_size)} · {e.uploaded_by_name}
                  </div>
                </div>
                <span style={{ background: style.bg, color: style.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                  {style.label}
                </span>
                <button onClick={() => setSelectedId(isOpen ? null : e.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 12, padding: '4px 8px' }}>
                  {isOpen ? '▲' : '▼'}
                </button>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid #f1efe8', padding: '12px 16px', background: '#f8f7f4', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {e.comments && <span style={{ fontSize: 12, color: '#888780', flex: 1 }}>{e.comments}</span>}
                  {e.status !== 'aprobada' && (
                    <button onClick={() => cambiarEstado(e.id, 'aprobada', null)}
                      style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#EAF3DE', color: '#27500A', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Aprobar
                    </button>
                  )}
                  {e.status !== 'rechazada' && (
                    <button onClick={() => cambiarEstado(e.id, 'rechazada', null)}
                      style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#FCEBEB', color: '#791F1F', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Rechazar
                    </button>
                  )}
                  <button onClick={() => eliminar(e.id)}
                    style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 12 }}>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 32, background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8' }}>
            Sin evidencias. Sube la primera desde el área de arriba.
          </div>
        )}
      </div>
    </div>
  )
}
