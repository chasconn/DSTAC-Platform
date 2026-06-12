'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import ClienteAccesosTabla from './components/ClienteAccesosTabla'
import ClienteAccesoDetalle from './components/ClienteAccesoDetalle'

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 20px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? '#2C2C2A' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const SELECT_STYLE = {
  padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8',
  fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none',
}

export default function ClienteAccesosPage() {
  const [accesos, setAccesos]   = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [mounted, setMounted]   = useState(false)

  const [search, setSearch]           = useState('')
  const [nivelAcceso, setNivelAcceso] = useState('')
  const [estado, setEstado]           = useState('')
  const [criticidad, setCriticidad]   = useState('')

  const LIMIT = 20

  const cargarStats = useCallback(async () => {
    try { setStats(await apiFetch('/api/client/accesos/stats')) } catch {}
  }, [])

  const cargarAccesos = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (search)      params.set('search', search)
      if (nivelAcceso) params.set('nivel_acceso', nivelAcceso)
      if (estado)      params.set('estado', estado)
      if (criticidad)  params.set('criticidad', criticidad)
      const data = await apiFetch(`/api/client/accesos?${params}`)
      setAccesos(data.accesos ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch { setAccesos([]) }
    finally { setLoading(false) }
  }, [search, nivelAcceso, estado, criticidad])

  // Carga inicial: auto-expirar primero, luego cargar datos
  useEffect(() => {
    const init = async () => {
      try { await apiFetch('/api/client/accesos/expirar', { method: 'POST' }) } catch {}
      await Promise.all([cargarStats(), cargarAccesos(1)])
      setMounted(true)
    }
    init()
  }, [])

  // Recargar al cambiar filtros (solo después de la carga inicial)
  useEffect(() => {
    if (!mounted) return
    cargarStats()
    cargarAccesos(1)
  }, [search, nivelAcceso, estado, criticidad])

  const totalPages   = Math.ceil(total / LIMIT)
  const hayCriticos  = stats?.criticos > 0
  const hayPorVencer = !hayCriticos && stats?.por_vencer > 0
  const hayExpirados = !hayCriticos && !hayPorVencer && stats?.expirados > 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Área scrollable principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {/* Encabezado */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Matriz de Accesos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Inventario de accesos y permisos registrados por tu analista DSTAC.
          </p>
        </div>

        {/* Alertas (solo una a la vez, por prioridad) */}
        {hayCriticos && (
          <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#791F1F', fontWeight: 500, marginBottom: 16 }}>
            ⛔ {stats.criticos} acceso{stats.criticos !== 1 ? 's' : ''} crítico{stats.criticos !== 1 ? 's' : ''} activo{stats.criticos !== 1 ? 's' : ''}. Contacta a tu analista DSTAC.
          </div>
        )}
        {hayPorVencer && (
          <div style={{ background: '#FAEEDA', border: '1px solid #F8D57A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#633806', fontWeight: 500, marginBottom: 16 }}>
            ⏰ {stats.por_vencer} acceso{stats.por_vencer !== 1 ? 's' : ''} por vencer en los próximos 30 días. Revisa con tu analista DSTAC.
          </div>
        )}
        {hayExpirados && (
          <div style={{ background: '#F1EFE8', border: '1px solid #e2e0d8', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#444441', marginBottom: 16 }}>
            ℹ️ {stats.expirados} acceso{stats.expirados !== 1 ? 's' : ''} expirado{stats.expirados !== 1 ? 's' : ''} en el inventario.
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Total accesos" value={stats?.total}      />
          <StatCard label="Activos"       value={stats?.activos}    color="#1D9E75" />
          <StatCard label="Críticos"      value={stats?.criticos}   color="#E24B4A" />
          <StatCard label="Por vencer"    value={stats?.por_vencer} color="#EF9F27" />
          <StatCard label="Expirados"     value={stats?.expirados}  color="#B4B2A9" />
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por identidad o activo…"
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }}
          />
          <select value={nivelAcceso} onChange={e => setNivelAcceso(e.target.value)} style={SELECT_STYLE}>
            <option value="">Nivel</option>
            <option value="lectura">Lectura</option>
            <option value="escritura">Escritura</option>
            <option value="administrador">Administrador</option>
            <option value="root">Root</option>
          </select>
          <select value={criticidad} onChange={e => setCriticidad(e.target.value)} style={SELECT_STYLE}>
            <option value="">Criticidad</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} style={SELECT_STYLE}>
            <option value="">Estado</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
            <option value="expirado">Expirado</option>
            <option value="pendiente_revision">Pend. revisión</option>
          </select>
          {(search || nivelAcceso || estado || criticidad) && (
            <button onClick={() => { setSearch(''); setNivelAcceso(''); setEstado(''); setCriticidad('') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        <ClienteAccesosTabla
          accesos={accesos}
          loading={loading}
          selected={selected}
          onSelect={ac => setSelected(prev => prev?.id === ac.id ? null : ac)}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => cargarAccesos(page - 1)} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
            <button onClick={() => cargarAccesos(page + 1)} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Panel detalle lateral */}
      {selected && (
        <ClienteAccesoDetalle
          acceso={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
