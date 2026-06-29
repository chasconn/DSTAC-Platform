'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import BotonInforme from '../../../../components/admin/BotonInforme'
import FixedPortal from '../../../../components/admin/FixedPortal'
import IdentidadesStats      from './components/IdentidadesStats'
import IdentidadesToolbar    from './components/IdentidadesToolbar'
import IdentidadesTabla      from './components/IdentidadesTabla'
import IdentidadDetalle      from './components/IdentidadDetalle'
import IdentidadModal        from './components/IdentidadModal'
import IdentidadDeleteModal  from './components/IdentidadDeleteModal'
import ImportarExcelModal    from '../../../../components/admin/ImportarExcelModal'

function SearchParamsHandler({ onNuevo }) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      onNuevo()
      router.replace('/admin/identidades')
    }
  }, [searchParams])

  return null
}

export default function IdentidadesPage() {
  const [identidades, setIdentidades]   = useState([])
  const [stats, setStats]               = useState(null)
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importarOpen, setImportarOpen] = useState(false)
  const [toast, setToast]               = useState(null)
  const [filtros, setFiltros]           = useState({ search: '', tipo_identidad: '', estado: '', _problemas: false })
  const [empresaActiva, setEmpresaActiva] = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  const slug    = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}

  const cargarDatos = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([k, v]) => v && k !== '_problemas'))
      )
      const [dataIdent, dataStats] = await Promise.all([
        api.get(`/api/admin/identidades?${params}`, headers),
        api.get('/api/admin/identidades/stats', headers),
      ])
      setIdentidades(dataIdent.identidades)
      setTotal(dataIdent.total)
      setStats(dataStats)
    } catch (err) {
      showToast(err.message || 'Error cargando identidades', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, filtros])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  function handleSelect(i)  { setSelected(prev => prev?.id === i.id ? null : i) }
  function handleEdit(i)    { setEditando(i); setModalOpen(true) }
  function handleNuevo()    { setEditando(null); setModalOpen(true) }

  function handleSaved() {
    setModalOpen(false)
    cargarDatos()
    showToast(editando ? 'Identidad actualizada' : 'Identidad creada', 'success')
  }
  function handleDeleted() {
    setDeleteTarget(null)
    setSelected(null)
    cargarDatos()
    showToast('Identidad eliminada', 'success')
  }

  // Filtro rápido desde el banner de alertas
  function filtrarPorEstado(estado) {
    setFiltros(prev => ({ ...prev, estado, _problemas: false }))
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
        <SearchParamsHandler onNuevo={() => { setEditando(null); setModalOpen(true) }} />
      </Suspense>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ maxWidth: selected ? '100%' : 1200, margin: '0 auto' }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>Identidades</h1> <BotonInforme tipo="identidades" slug={slug} />
            <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>
              {empresaActiva ? `Cuentas digitales de ${empresaActiva.name}` : 'Selecciona una empresa para continuar'}
            </p>
          </div>

          {/* Banner de alertas — solo cuando hay problemas */}
          {(stats?.comprometidas > 0 || stats?.expiradas > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {stats.comprometidas > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#FCEBEB', borderLeft: '3px solid #E24B4A', fontSize: 12, color: '#791F1F' }}>
                  <span style={{ fontSize: 16 }}>⚠</span>
                  <span style={{ flex: 1 }}>
                    <strong>{stats.comprometidas}</strong> identidad{stats.comprometidas !== 1 ? 'es' : ''} comprometida{stats.comprometidas !== 1 ? 's' : ''} — requieren atención inmediata
                  </span>
                  <button onClick={() => filtrarPorEstado('comprometida')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#791F1F', fontWeight: 600, fontSize: 12, padding: 0 }}>
                    Ver →
                  </button>
                </div>
              )}
              {stats.expiradas > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#FAEEDA', borderLeft: '3px solid #EF9F27', fontSize: 12, color: '#633806' }}>
                  <span style={{ fontSize: 16 }}>⏰</span>
                  <span style={{ flex: 1 }}>
                    <strong>{stats.expiradas}</strong> identidad{stats.expiradas !== 1 ? 'es' : ''} expirada{stats.expiradas !== 1 ? 's' : ''} sin revocar
                  </span>
                  <button onClick={() => filtrarPorEstado('expirada')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#633806', fontWeight: 600, fontSize: 12, padding: 0 }}>
                    Ver →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div style={{ marginBottom: 20 }}>
            <IdentidadesStats stats={stats} />
          </div>

          {/* Toolbar */}
          <div style={{ marginBottom: 16 }}>
            <IdentidadesToolbar
              filtros={filtros}
              onFiltroChange={setFiltros}
              total={total}
              empresaSlug={slug}
              onNuevo={handleNuevo}
              onImportar={() => setImportarOpen(true)}
            />
          </div>

          {/* Tabla */}
          <IdentidadesTabla
            identidades={identidades}
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
        <IdentidadDetalle
          identidad={selected}
          empresaSlug={slug}
          onClose={() => setSelected(null)}
          onEdit={() => handleEdit(selected)}
          onDelete={() => setDeleteTarget(selected)}
        />
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <IdentidadModal
          identidad={editando}
          empresaSlug={slug}
          onClose={() => setModalOpen(false)}
          onSave={handleSaved}
        />
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <IdentidadDeleteModal
          identidad={deleteTarget}
          empresaSlug={slug}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Modal importar Excel */}
      {importarOpen && (
        <ImportarExcelModal
          modulo="identidades"
          empresaSlug={slug}
          onClose={() => setImportarOpen(false)}
          onImportado={cargarDatos}
        />
      )}

      {/* Toast */}
      {toast && (
        <FixedPortal>
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#2C2C2A', color: '#fff', padding: '10px 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 320 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: TOAST_COLORS[toast.type], flexShrink: 0 }} />
          {toast.msg}
        </div>
        </FixedPortal>
      )}
    </div>
  )
}
