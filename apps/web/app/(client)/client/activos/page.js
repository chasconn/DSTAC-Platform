'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import ClienteActivosTabla from './components/ClienteActivosTabla'
import ClienteActivoDetalle from './components/ClienteActivoDetalle'

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

export default function ClienteActivosPage() {
  const [activos, setActivos]   = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)

  const [search, setSearch]       = useState('')
  const [criticidad, setCriticidad] = useState('')
  const [estado, setEstado]       = useState('')
  const [ambiente, setAmbiente]   = useState('')

  const LIMIT = 20

  const cargarStats = useCallback(async () => {
    try { setStats(await apiFetch('/api/client/activos/stats')) } catch {}
  }, [])

  const cargarActivos = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (search)     params.set('search', search)
      if (criticidad) params.set('criticidad', criticidad)
      if (estado)     params.set('estado', estado)
      if (ambiente)   params.set('ambiente', ambiente)
      const data = await apiFetch(`/api/client/activos?${params}`)
      setActivos(data.activos ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch { setActivos([]) }
    finally { setLoading(false) }
  }, [search, criticidad, estado, ambiente])

  useEffect(() => {
    cargarStats()
    cargarActivos(1)
  }, [cargarStats, cargarActivos])

  const totalPages           = Math.ceil(total / LIMIT)
  const alertaFueraServicio  = stats?.fuera_servicio > 0
  const alertaDegradado      = !alertaFueraServicio && stats?.degradados > 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Área scrollable principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {/* Encabezado */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Inventario de Activos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Vista de solo lectura — los datos son cargados por tu analista DSTAC.
          </p>
        </div>

        {/* Alertas */}
        {alertaFueraServicio && (
          <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#791F1F', fontWeight: 500, marginBottom: 16 }}>
            ⛔ {stats.fuera_servicio} activo{stats.fuera_servicio !== 1 ? 's' : ''} fuera de servicio. Contacta a tu analista DSTAC.
          </div>
        )}
        {alertaDegradado && (
          <div style={{ background: '#FAEEDA', border: '1px solid #F8D57A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#633806', fontWeight: 500, marginBottom: 16 }}>
            ⚠️ {stats.degradados} activo{stats.degradados !== 1 ? 's' : ''} en estado degradado. Contacta a tu analista DSTAC.
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Total activos"     value={stats?.total}          />
          <StatCard label="Operativos"        value={stats?.operativos}     color="#1D9E75" />
          <StatCard label="Críticos"          value={stats?.criticos}       color="#791F1F" />
          <StatCard label="Degradados"        value={stats?.degradados}     color="#633806" />
          <StatCard label="Fuera de servicio" value={stats?.fuera_servicio} color="#E24B4A" />
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o proveedor…"
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }}
          />
          <select value={criticidad} onChange={e => setCriticidad(e.target.value)} style={SELECT_STYLE}>
            <option value="">Criticidad</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} style={SELECT_STYLE}>
            <option value="">Estado</option>
            <option value="operativo">Operativo</option>
            <option value="degradado">Degradado</option>
            <option value="fuera_de_servicio">Fuera de servicio</option>
            <option value="en_mantencion">En mantención</option>
          </select>
          <select value={ambiente} onChange={e => setAmbiente(e.target.value)} style={SELECT_STYLE}>
            <option value="">Ambiente</option>
            <option value="produccion">Producción</option>
            <option value="desarrollo">Desarrollo</option>
            <option value="testing">Testing</option>
            <option value="staging">Staging</option>
          </select>
          {(search || criticidad || estado || ambiente) && (
            <button onClick={() => { setSearch(''); setCriticidad(''); setEstado(''); setAmbiente('') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        <ClienteActivosTabla
          activos={activos}
          loading={loading}
          selected={selected}
          onSelect={a => setSelected(prev => prev?.id === a.id ? null : a)}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => cargarActivos(page - 1)} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
            <button onClick={() => cargarActivos(page + 1)} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Panel detalle lateral */}
      {selected && (
        <ClienteActivoDetalle
          activo={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
