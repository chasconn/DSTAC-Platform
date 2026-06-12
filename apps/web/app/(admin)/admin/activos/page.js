'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import ActivosStats       from './components/ActivosStats'
import ActivosToolbar     from './components/ActivosToolbar'
import ActivosTabla       from './components/ActivosTabla'
import ActivoDetalle      from './components/ActivoDetalle'
import ActivoModal        from './components/ActivoModal'
import ActivoDeleteModal  from './components/ActivoDeleteModal'
import ImportarExcelModal from '../../../../components/admin/ImportarExcelModal'

// Componente aislado para leer query params — Suspense requerido por Next.js 14
function SearchParamsHandler({ onNuevo }) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      onNuevo()
      router.replace('/admin/activos')
    }
    if (searchParams.get('exportar') === '1') {
      router.replace('/admin/activos')
    }
  }, [searchParams])

  return null
}

export default function ActivosPage() {
  const [activos, setActivos]           = useState([])
  const [stats, setStats]               = useState(null)
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importarOpen, setImportarOpen] = useState(false)
  const [toast, setToast]               = useState(null)
  const [filtros, setFiltros]           = useState({
    search: '', tipo: '', criticidad: '', estado: '', ambiente: ''
  })
  const [empresaActiva, setEmpresaActiva] = useState(null)

  // Leer empresa activa del localStorage solo en el cliente
  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  const slug = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}

  const cargarDatos = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
      )
      const [dataActivos, dataStats] = await Promise.all([
        api.get(`/api/admin/activos?${params}`, headers),
        api.get('/api/admin/activos/stats', headers)
      ])
      setActivos(dataActivos.activos)
      setTotal(dataActivos.total)
      setStats(dataStats)
    } catch (err) {
      showToast(err.message || 'Error cargando activos', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, filtros])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  function handleSelect(activo) {
    setSelected(prev => prev?.id === activo.id ? null : activo)
  }

  function handleEdit(activo) {
    setEditando(activo)
    setModalOpen(true)
  }

  function handleNuevo() {
    setEditando(null)
    setModalOpen(true)
  }

  function handleSaved() {
    setModalOpen(false)
    cargarDatos()
    showToast(editando ? 'Activo actualizado' : 'Activo creado', 'success')
  }

  function handleDeleted() {
    setDeleteTarget(null)
    setSelected(null)
    cargarDatos()
    showToast('Activo eliminado', 'success')
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const TOAST_COLORS = { success: '#639922', error: '#E24B4A', info: '#534AB7' }

  // Pantalla de espera si aún no se leyó localStorage
  if (empresaActiva === null && typeof window !== 'undefined' && !localStorage.getItem('empresa_activa')) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🏢</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2A', margin: '0 0 8px' }}>
          Ninguna empresa seleccionada
        </h2>
        <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
          Ve a Clientes, selecciona una empresa y haz clic en <strong>Operar como empresa</strong>.
        </p>
        <a
          href="/admin/clientes"
          style={{ display: 'inline-block', padding: '9px 20px', background: '#534AB7', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
        >
          Ir a Clientes
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Manejo de query params del sidebar (?nuevo=1, ?exportar=1) */}
      <Suspense fallback={null}>
        <SearchParamsHandler onNuevo={() => { setEditando(null); setModalOpen(true) }} />
      </Suspense>

      {/* Contenido principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ maxWidth: selected ? '100%' : 1200, margin: '0 auto' }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>
              Activos
            </h1>
            <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>
              {empresaActiva
                ? `Inventario de activos de ${empresaActiva.name}`
                : 'Selecciona una empresa para continuar'}
            </p>
          </div>

          {/* Stats */}
          <div style={{ marginBottom: 20 }}>
            <ActivosStats stats={stats} />
          </div>

          {/* Toolbar */}
          <div style={{ marginBottom: 16 }}>
            <ActivosToolbar
              filtros={filtros}
              onFiltroChange={setFiltros}
              total={total}
              empresaSlug={slug}
              onNuevo={handleNuevo}
              onImportar={() => setImportarOpen(true)}
            />
          </div>

          {/* Tabla */}
          <ActivosTabla
            activos={activos}
            loading={loading}
            selected={selected}
            onSelect={handleSelect}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        </div>
      </div>

      {/* Panel lateral de detalle */}
      {selected && (
        <ActivoDetalle
          activo={selected}
          onClose={() => setSelected(null)}
          onEdit={() => handleEdit(selected)}
          onDelete={() => setDeleteTarget(selected)}
        />
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <ActivoModal
          activo={editando}
          empresaSlug={slug}
          onClose={() => setModalOpen(false)}
          onSave={handleSaved}
        />
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <ActivoDeleteModal
          activo={deleteTarget}
          empresaSlug={slug}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Modal importar Excel */}
      {importarOpen && (
        <ImportarExcelModal
          modulo="activos"
          empresaSlug={slug}
          onClose={() => setImportarOpen(false)}
          onImportado={cargarDatos}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#2C2C2A', color: '#fff', padding: '10px 16px',
          borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 320,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: TOAST_COLORS[toast.type], flexShrink: 0
          }} />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
