'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api, apiFetch } from '../../../../lib/api'
import AccesosStats      from './components/AccesosStats'
import AccesosToolbar    from './components/AccesosToolbar'
import AccesosTabla      from './components/AccesosTabla'
import AccesoDetalle     from './components/AccesoDetalle'
import AccesoModal       from './components/AccesoModal'
import AccesoDeleteModal from './components/AccesoDeleteModal'

function SearchParamsHandler({ onNuevo }) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      onNuevo()
      router.replace('/admin/accesos')
    }
  }, [searchParams])
  return null
}

export default function AccesosPage() {
  const [accesos, setAccesos]           = useState([])
  const [stats, setStats]               = useState(null)
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast]               = useState(null)
  const [filtros, setFiltros]           = useState({ search: '', nivel_acceso: '', estado: '', criticidad: '', entorno: '' })
  const [empresaActiva, setEmpresaActiva] = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  const slug    = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}

  // Auto-expirar antes de cargar datos
  const autoExpirar = useCallback(async () => {
    if (!slug) return
    try {
      await apiFetch('/api/admin/accesos/expirar', {
        method: 'POST',
        headers: { 'X-Company-Slug': slug },
      })
    } catch { /* no-op */ }
  }, [slug])

  const cargarDatos = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
      )
      const [dataAcc, dataStats] = await Promise.all([
        api.get(`/api/admin/accesos?${params}`, headers),
        api.get('/api/admin/accesos/stats', headers),
      ])
      setAccesos(dataAcc.accesos)
      setTotal(dataAcc.total)
      setStats(dataStats)
    } catch (err) {
      showToast(err.message || 'Error cargando accesos', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, filtros])

  // Al montar: primero auto-expirar, luego cargar
  useEffect(() => {
    if (!slug) return
    autoExpirar().then(() => cargarDatos())
  }, [slug])

  // Recargar solo cuando cambian filtros (no en mount)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) { setMounted(true); return }
    cargarDatos()
  }, [filtros])

  function handleSelect(a)  { setSelected(prev => prev?.id === a.id ? null : a) }
  function handleEdit(a)    { setEditando(a); setModalOpen(true) }
  function handleNuevo()    { setEditando(null); setModalOpen(true) }

  function handleSaved() {
    setModalOpen(false)
    cargarDatos()
    showToast(editando ? 'Acceso actualizado' : 'Acceso creado', 'success')
  }
  function handleDeleted() {
    setDeleteTarget(null)
    setSelected(null)
    cargarDatos()
    showToast('Acceso eliminado', 'success')
  }
  function handleSuspendido() {
    setSelected(null)
    cargarDatos()
    showToast('Acceso suspendido', 'success')
  }

  function filtrarPorEstado(estado) {
    setFiltros(prev => ({ ...prev, estado }))
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const TOAST_COLORS = { success: '#639922', error: '#E24B4A', info: '#534AB7' }

  if (empresaActiva === null && typeof window !== 'undefined' && !localStorage.getItem('empresa_activa')) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🏢</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2A', margin: '0 0 8px' }}>Ninguna empresa seleccionada</h2>
        <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
          Ve a Clientes, selecciona una empresa y haz clic en <strong>Operar como empresa</strong>.
        </p>
        <a href="/admin/clientes" style={{ display: 'inline-block', padding: '9px 20px', background: '#534AB7', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Ir a Clientes
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      <Suspense fallback={null}>
        <SearchParamsHandler onNuevo={handleNuevo} />
      </Suspense>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ maxWidth: selected ? '100%' : 1200, margin: '0 auto' }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>Accesos</h1>
            <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>
              {empresaActiva ? `Permisos y accesos de ${empresaActiva.name}` : 'Selecciona una empresa para continuar'}
            </p>
          </div>

          {/* Banners de alerta */}
          {(stats?.expirados > 0 || stats?.criticos > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {stats.expirados > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#FCEBEB', borderLeft: '3px solid #E24B4A', fontSize: 12, color: '#791F1F' }}>
                  <span style={{ fontSize: 16 }}>⛔</span>
                  <span style={{ flex: 1 }}>
                    <strong>{stats.expirados}</strong> acceso{stats.expirados !== 1 ? 's' : ''} expirado{stats.expirados !== 1 ? 's' : ''} — revocar o renovar
                  </span>
                  <button onClick={() => filtrarPorEstado('expirado')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#791F1F', fontWeight: 600, fontSize: 12, padding: 0 }}>
                    Ver →
                  </button>
                </div>
              )}
              {stats.criticos > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#FFFBF0', borderLeft: '3px solid #EF9F27', fontSize: 12, color: '#633806' }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span style={{ flex: 1 }}>
                    <strong>{stats.criticos}</strong> acceso{stats.criticos !== 1 ? 's' : ''} crítico{stats.criticos !== 1 ? 's' : ''} activo{stats.criticos !== 1 ? 's' : ''} — verificar justificación
                  </span>
                  <button onClick={() => filtrarPorEstado('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#633806', fontWeight: 600, fontSize: 12, padding: 0 }}>
                    Ver →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div style={{ marginBottom: 20 }}>
            <AccesosStats stats={stats} />
          </div>

          {/* Toolbar */}
          <div style={{ marginBottom: 16 }}>
            <AccesosToolbar
              filtros={filtros}
              onFiltroChange={setFiltros}
              total={total}
              empresaSlug={slug}
              onNuevo={handleNuevo}
            />
          </div>

          {/* Tabla */}
          <AccesosTabla
            accesos={accesos}
            loading={loading}
            selected={selected}
            onSelect={handleSelect}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        </div>
      </div>

      {/* Panel lateral */}
      {selected && (
        <AccesoDetalle
          acceso={selected}
          empresaSlug={slug}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDeleted={handleSuspendido}
        />
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <AccesoModal
          acceso={editando}
          empresaSlug={slug}
          onClose={() => setModalOpen(false)}
          onSave={handleSaved}
        />
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <AccesoDeleteModal
          acceso={deleteTarget}
          empresaSlug={slug}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#2C2C2A', color: '#fff', padding: '10px 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 320 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: TOAST_COLORS[toast.type], flexShrink: 0 }} />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
