'use client'

import { useState, useEffect, useMemo } from 'react'
import { api } from '../../../../lib/api'
import ClientesToolbar from './components/ClientesToolbar'
import ClientesTabla from './components/ClientesTabla'
import ClienteFormModal from './components/ClienteFormModal'
import ClienteDetailPanel from './components/ClienteDetailPanel'
import ClientesCards from './components/ClientesCards'
import SuspenderModal from './components/SuspenderModal'

export default function ClientesPage() {
  const [empresas, setEmpresas]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [planFilter, setPlanFilter]       = useState(null)
  const [statusFilter, setStatusFilter]   = useState(null)
  const [view, setView]                   = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('clientes_view') || 'list') : 'list'
  )
  const [selectedEmp, setSelectedEmp]     = useState(null)
  const [showFormModal, setShowFormModal]       = useState(false)
  const [suspenderEmp, setSuspenderEmp]         = useState(null)
  const [toast, setToast]                       = useState(null)

  useEffect(() => { fetchEmpresas() }, [])

  async function fetchEmpresas() {
    setLoading(true)
    try {
      const data = await api.get('/api/companies')
      setEmpresas(data)

      // Fetch stats de cada empresa en paralelo y mergear score/incidentes
      const statsResults = await Promise.allSettled(
        data.map(e => api.get(`/api/companies/${e.slug}/stats`))
      )
      setEmpresas(data.map((e, i) => {
        const r = statsResults[i]
        if (r.status === 'fulfilled') {
          return { ...e, score: r.value.score, incidentes: r.value.incidentes }
        }
        return e
      }))
    } catch (err) {
      showToast(err.message || 'Error cargando empresas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = !search
        || e.name.toLowerCase().includes(search.toLowerCase())
        || e.slug.includes(search.toLowerCase())
      const matchPlan   = !planFilter   || e.plan_name === planFilter
      const matchStatus = !statusFilter || e.status    === statusFilter
      return matchSearch && matchPlan && matchStatus
    })
  }, [empresas, search, planFilter, statusFilter])

  function handleViewChange(v) {
    setView(v)
    localStorage.setItem('clientes_view', v)
  }

  function handleSelect(emp) {
    setSelectedEmp(prev => prev?.slug === emp.slug ? null : emp)
  }

  function handleUpdated(empActualizada) {
    setEmpresas(prev => prev.map(e => e.slug === empActualizada.slug ? { ...e, ...empActualizada } : e))
    setSelectedEmp(empActualizada)
    showToast('Cambios guardados', 'success')
  }

  function handleSuspender(emp) {
    setSuspenderEmp(emp)
  }

  function handleSuspenderDone(empActualizada) {
    setSuspenderEmp(null)
    setEmpresas(prev => prev.map(e => e.slug === empActualizada.slug ? { ...e, ...empActualizada } : e))
    if (selectedEmp?.slug === empActualizada.slug) setSelectedEmp(empActualizada)
    const accion = empActualizada.status === 'suspended' ? 'suspendida' : 'reactivada'
    showToast(`Empresa "${empActualizada.name}" ${accion} correctamente`, 'success')
  }

  function handleCreated(nuevaEmp) {
    setShowFormModal(false)
    showToast(`Empresa "${nuevaEmp.name}" creada correctamente`, 'success')
    fetchEmpresas()
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const TOAST_COLORS = { success: '#639922', error: '#E24B4A', info: '#534AB7' }

  return (
    // Shell principal — tabla + panel lateral en flex row
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Contenido principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ maxWidth: selectedEmp ? '100%' : 1200, margin: '0 auto' }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>Clientes</h1>
            <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>
              Gestiona las empresas cliente y su acceso a la plataforma
            </p>
          </div>

          {/* Toolbar */}
          <div style={{ marginBottom: 16 }}>
            <ClientesToolbar
              search={search}             onSearch={setSearch}
              planFilter={planFilter}     onPlanFilter={setPlanFilter}
              statusFilter={statusFilter} onStatusFilter={setStatusFilter}
              view={view}                 onViewChange={handleViewChange}
              onNueva={() => setShowFormModal(true)}
              total={empresas.length}     filtered={filtered.length}
            />
          </div>

          {/* Lista o tarjetas según preferencia */}
          {view === 'list' ? (
            <ClientesTabla
              empresas={filtered}
              loading={loading}
              selectedSlug={selectedEmp?.slug}
              onSelect={handleSelect}
              onSuspender={handleSuspender}
            />
          ) : (
            <ClientesCards
              empresas={filtered}
              loading={loading}
              selectedSlug={selectedEmp?.slug}
              onSelect={handleSelect}
              onSuspender={handleSuspender}
            />
          )}
        </div>
      </div>

      {/* Panel lateral — desliza desde la derecha */}
      {selectedEmp && (
        <ClienteDetailPanel
          empresa={selectedEmp}
          onClose={() => setSelectedEmp(null)}
          onUpdated={handleUpdated}
          onSuspender={handleSuspender}
        />
      )}

      {/* Modal suspender / reactivar */}
      {suspenderEmp && (
        <SuspenderModal
          empresa={suspenderEmp}
          onClose={() => setSuspenderEmp(null)}
          onDone={handleSuspenderDone}
        />
      )}

      {/* Modal crear empresa */}
      {showFormModal && (
        <ClienteFormModal
          onClose={() => setShowFormModal(false)}
          onCreated={handleCreated}
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
