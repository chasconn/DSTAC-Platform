'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import PersonalStats       from './components/PersonalStats'
import PersonalToolbar     from './components/PersonalToolbar'
import PersonalTabla       from './components/PersonalTabla'
import PersonalDetalle     from './components/PersonalDetalle'
import PersonalModal       from './components/PersonalModal'
import PersonalDeleteModal from './components/PersonalDeleteModal'
import ImportarExcelModal  from '../../../../components/admin/ImportarExcelModal'

function SearchParamsHandler({ onNuevo }) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      onNuevo()
      router.replace('/admin/personal')
    }
  }, [searchParams])

  return null
}

export default function PersonalPage() {
  const [personal, setPersonal]         = useState([])
  const [stats, setStats]               = useState(null)
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importarOpen, setImportarOpen] = useState(false)
  const [toast, setToast]               = useState(null)
  const [filtros, setFiltros]           = useState({ search: '', estado: '', nivel_responsabilidad: '' })
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
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
      )
      const [dataPersonal, dataStats] = await Promise.all([
        api.get(`/api/admin/personal?${params}`, headers),
        api.get('/api/admin/personal/stats', headers),
      ])
      setPersonal(dataPersonal.personal)
      setTotal(dataPersonal.total)
      setStats(dataStats)
    } catch (err) {
      showToast(err.message || 'Error cargando personal', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, filtros])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  function handleSelect(p) {
    setSelected(prev => prev?.id === p.id ? null : p)
  }
  function handleEdit(p) { setEditando(p); setModalOpen(true) }
  function handleNuevo() { setEditando(null); setModalOpen(true) }

  function handleSaved() {
    setModalOpen(false)
    cargarDatos()
    showToast(editando ? 'Persona actualizada' : 'Persona creada', 'success')
  }
  function handleDeleted() {
    setDeleteTarget(null)
    setSelected(null)
    cargarDatos()
    showToast('Persona eliminada', 'success')
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const TOAST_COLORS = { success: '#639922', error: '#E24B4A', info: '#534AB7' }

  // Sin empresa activa — guiar al analista
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
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>Personal</h1>
            <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>
              {empresaActiva
                ? `Trabajadores de ${empresaActiva.name}`
                : 'Selecciona una empresa para continuar'}
            </p>
          </div>

          {/* Stats */}
          <div style={{ marginBottom: 20 }}>
            <PersonalStats stats={stats} />
          </div>

          {/* Banner informativo */}
          {empresaActiva && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f8f7f4', border: '1px solid #e2e0d8', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#888780', lineHeight: 1.5 }}>
              <i className="ti ti-info-circle" style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }} />
              <span>
                <strong style={{ color: '#2C2C2A' }}>Este personal no tiene acceso a la plataforma.</strong>
                {' '}Son registros de trabajadores de {empresaActiva.name} usados para relacionar identidades y accesos.
                Para dar acceso al portal, ir a{' '}
                <a href="/admin/usuarios" style={{ color: '#534AB7' }}>Usuarios → Nuevo usuario cliente</a>.
              </span>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ marginBottom: 16 }}>
            <PersonalToolbar
              filtros={filtros}
              onFiltroChange={setFiltros}
              total={total}
              empresaSlug={slug}
              onNuevo={handleNuevo}
              onImportar={() => setImportarOpen(true)}
            />
          </div>

          {/* Tabla */}
          <PersonalTabla
            personal={personal}
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
        <PersonalDetalle
          persona={selected}
          empresaSlug={slug}
          onClose={() => setSelected(null)}
          onEdit={() => handleEdit(selected)}
          onDelete={() => setDeleteTarget(selected)}
        />
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <PersonalModal
          persona={editando}
          empresaSlug={slug}
          empresaNombre={empresaActiva?.name}
          onClose={() => setModalOpen(false)}
          onSave={handleSaved}
        />
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <PersonalDeleteModal
          persona={deleteTarget}
          empresaSlug={slug}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Modal importar Excel */}
      {importarOpen && (
        <ImportarExcelModal
          modulo="personal"
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
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: TOAST_COLORS[toast.type], flexShrink: 0 }} />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
