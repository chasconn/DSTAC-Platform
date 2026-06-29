'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch } from '../../../../../../lib/api'
import EvidenciaPanel from '../panels/EvidenciaPanel'
import FixedPortal from '../../../../../../components/admin/FixedPortal'

const STATUS_MAP = {
  pendiente: { bg: '#FAEEDA', color: '#633806', label: 'Pendiente' },
  aprobada:  { bg: '#EAF3DE', color: '#27500A', label: 'Aprobada'  },
  rechazada: { bg: '#FCEBEB', color: '#791F1F', label: 'Rechazada' },
}

function fileIcon(fileType) {
  if (!fileType) return { icon: '📄', color: '#888780' }
  if (fileType.includes('pdf'))   return { icon: '📕', color: '#E24B4A' }
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('xlsx')) return { icon: '📗', color: '#1D9E75' }
  if (fileType.includes('word') || fileType.includes('doc'))   return { icon: '📘', color: '#185FA5' }
  if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg')) return { icon: '🖼️', color: '#534AB7' }
  return { icon: '📎', color: '#888780' }
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function EvidenciasTab({ slug, functionId, categories }) {
  const headers = { 'X-Company-Slug': slug }

  const [evidencias, setEvidencias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [catFilter,  setCatFilter]  = useState('')
  const [stFilter,   setStFilter]   = useState('')
  const [q,          setQ]          = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [uploadCtrl, setUploadCtrl] = useState('')
  const [controls,   setControls]   = useState([])
  const [selected,   setSelected]   = useState(null)

  const cargar = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (functionId) params.set('function_id', functionId)
      if (catFilter)  params.set('category_id', catFilter)
      if (stFilter)   params.set('status', stFilter)
      if (q)          params.set('q', q)
      const data = await apiFetch(`/api/admin/nist/evidencias?${params}`, { headers })
      setEvidencias(data.evidencias ?? [])
    } catch { setEvidencias([]) }
    finally { setLoading(false) }
  }, [slug, functionId, catFilter, stFilter, q])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!slug || !functionId) return
    apiFetch(`/api/admin/nist/controls?function_id=${functionId}`, { headers })
      .then(d => setControls(d.controls ?? []))
      .catch(() => {})
  }, [slug, functionId])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !uploadCtrl) return alert('Selecciona un control primero')
    const form = new FormData()
    form.append('file', file)
    form.append('control_id', uploadCtrl)
    setUploading(true)
    try {
      await fetch(
        `/api/admin/nist/evidencias`,
        { method: 'POST', credentials: 'include', headers: { 'X-Company-Slug': slug }, body: form }
      )
      await cargar()
    } catch { alert('Error al subir evidencia') }
    finally { setUploading(false); e.target.value = '' }
  }

  async function handleRevisar(id, status) {
    try {
      await apiFetch(`/api/admin/nist/evidencias/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      setEvidencias(prev => prev.map(ev => ev.id === id ? { ...ev, status } : ev))
      if (selected?.id === id) setSelected(prev => ({ ...prev, status }))
    } catch (err) { alert(err.message) }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta evidencia?')) return
    try {
      await apiFetch(`/api/admin/nist/evidencias/${id}`, { method: 'DELETE', headers })
      setEvidencias(prev => prev.filter(ev => ev.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) { alert(err.message) }
  }

  // Stats
  const total      = evidencias.length
  const aprobadas  = evidencias.filter(e => e.status === 'aprobada').length
  const pendientes = evidencias.filter(e => e.status === 'pendiente').length
  const rechazadas = evidencias.filter(e => e.status === 'rechazada').length

  // Cobertura NIST: controles únicos con evidencia aprobada / total controles de la función
  const controlesConEvidencia = useMemo(() => new Set(
    evidencias.filter(e => e.status === 'aprobada').map(e => e.control_id)
  ).size, [evidencias])
  const totalControlesF = controls.length || 1
  const coberturaPct = Math.round((controlesConEvidencia / totalControlesF) * 100)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  return (
    <div>
      {/* Stats cards — 5 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total',         value: total,         color: '#534AB7' },
          { label: 'Aprobadas',     value: aprobadas,     color: '#27500A' },
          { label: 'Pendientes',    value: pendientes,    color: '#633806' },
          { label: 'Rechazadas',    value: rechazadas,    color: '#791F1F' },
          { label: 'Cobertura NIST',value: `${coberturaPct}%`, color: coberturaPct >= 61 ? '#1D9E75' : coberturaPct >= 41 ? '#EF9F27' : '#E24B4A' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upload + filtros */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar evidencia…"
            style={{ flex: 1, minWidth: 120, padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, outline: 'none' }}
          />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
            <option value="">Todas las categorías</option>
            {(categories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.id}</option>)}
          </select>
          <select value={stFilter} onChange={e => setStFilter(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Subir evidencia */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1efe8' }}>
          <select value={uploadCtrl} onChange={e => setUploadCtrl(e.target.value)}
            style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
            <option value="">Seleccionar control…</option>
            {controls.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
          </select>
          <label style={{
            padding: '7px 16px', borderRadius: 7, background: '#3C3489', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? 'Subiendo…' : '+ Subir evidencia'}
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Grid de evidencias */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 15 }}>Cargando evidencias…</div>
      ) : evidencias.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 15 }}>No hay evidencias registradas</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {evidencias.map(ev => {
            const fi = fileIcon(ev.file_type)
            const st = STATUS_MAP[ev.status] ?? STATUS_MAP.pendiente
            return (
              <div key={ev.id}
                onClick={() => setSelected(ev)}
                style={{ background: '#fff', borderRadius: 10, border: `1px solid ${selected?.id === ev.id ? '#534AB7' : '#e2e0d8'}`, padding: '14px 16px', cursor: 'pointer', transition: 'box-shadow 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(83,74,183,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{fi.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.original_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>
                      {ev.control_id} · {formatBytes(ev.file_size)}
                    </div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#888780', marginBottom: 10 }}>
                  {ev.uploaded_by_name ?? 'DSTAC'} · {ev.created_at ? new Date(ev.created_at).toLocaleDateString('es-CL') : ''}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Ver */}
                  <a
                    href={ev.file_path ? `${apiBase}/${ev.file_path}` : '#'}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e0d8', background: '#fff', color: '#534AB7', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Ver
                  </a>
                  {/* Descargar */}
                  <a
                    href={ev.file_path ? `${apiBase}/${ev.file_path}` : '#'}
                    download={ev.original_name}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e0d8', background: '#fff', color: '#2C2C2A', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Descargar
                  </a>
                  {ev.status === 'pendiente' && (
                    <>
                      <button onClick={e => { e.stopPropagation(); handleRevisar(ev.id, 'aprobada') }}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: '#EAF3DE', color: '#27500A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Aprobar
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleRevisar(ev.id, 'rechazada') }}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: '#FCEBEB', color: '#791F1F', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Rechazar
                      </button>
                    </>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleEliminar(ev.id) }}
                    style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #f1efe8', background: '#fff', color: '#888780', fontSize: 13, cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Panel lateral de evidencia */}
      {selected && (
        <>
          <FixedPortal>
            <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 99 }} />
          </FixedPortal>
          <EvidenciaPanel
            evidencia={selected}
            slug={slug}
            allEvidencias={evidencias}
            onClose={() => setSelected(null)}
            onUpdated={updated => {
              setEvidencias(prev => prev.map(e => e.id === updated.id ? updated : e))
              setSelected(updated)
            }}
          />
        </>
      )}
    </div>
  )
}
