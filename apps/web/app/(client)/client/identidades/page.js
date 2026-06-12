'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import ClienteIdentidadesTabla from './components/ClienteIdentidadesTabla'
import ClienteIdentidadDetalle from './components/ClienteIdentidadDetalle'

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

export default function ClienteIdentidadesPage() {
  const [identidades, setIdentidades] = useState([])
  const [stats, setStats]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)

  const [search, setSearch]               = useState('')
  const [tipoIdentidad, setTipoIdentidad] = useState('')
  const [estado, setEstado]               = useState('')

  const LIMIT = 20

  const cargarStats = useCallback(async () => {
    try { setStats(await apiFetch('/api/client/identidades/stats')) } catch {}
  }, [])

  const cargarIdentidades = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (search)        params.set('search', search)
      if (tipoIdentidad) params.set('tipo_identidad', tipoIdentidad)
      if (estado)        params.set('estado', estado)
      const data = await apiFetch(`/api/client/identidades?${params}`)
      setIdentidades(data.identidades ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch { setIdentidades([]) }
    finally { setLoading(false) }
  }, [search, tipoIdentidad, estado])

  useEffect(() => {
    cargarStats()
    cargarIdentidades(1)
  }, [cargarStats, cargarIdentidades])

  const totalPages       = Math.ceil(total / LIMIT)
  const hayComprometidas = stats?.comprometidas > 0
  const hayPorVencer     = !hayComprometidas && stats?.por_vencer > 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Área scrollable principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {/* Encabezado */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Identidades Digitales</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Inventario de identidades y cuentas registradas por tu analista DSTAC.
          </p>
        </div>

        {/* Alertas */}
        {hayComprometidas && (
          <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#791F1F', fontWeight: 500, marginBottom: 16 }}>
            ⛔ {stats.comprometidas} identidad{stats.comprometidas !== 1 ? 'es' : ''} comprometida{stats.comprometidas !== 1 ? 's' : ''}. Contacta urgentemente a tu analista DSTAC.
          </div>
        )}
        {hayPorVencer && (
          <div style={{ background: '#FAEEDA', border: '1px solid #F8D57A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#633806', fontWeight: 500, marginBottom: 16 }}>
            ⏰ {stats.por_vencer} identidad{stats.por_vencer !== 1 ? 'es' : ''} por vencer en los próximos 30 días. Revisa con tu analista DSTAC.
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Total"         value={stats?.total}          />
          <StatCard label="Activas"       value={stats?.activas}        color="#1D9E75" />
          <StatCard label="Comprometidas" value={stats?.comprometidas}  color="#E24B4A" />
          <StatCard label="Expiradas"     value={stats?.expiradas}      color="#633806" />
          <StatCard label="Por vencer"    value={stats?.por_vencer}     color="#EF9F27" />
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o identidad…"
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }}
          />
          <select value={tipoIdentidad} onChange={e => setTipoIdentidad(e.target.value)} style={SELECT_STYLE}>
            <option value="">Tipo</option>
            <option value="usuario">Usuario</option>
            <option value="cuenta_servicio">Cuenta servicio</option>
            <option value="api_key">API Key</option>
            <option value="certificado">Certificado</option>
            <option value="otro">Otro</option>
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} style={SELECT_STYLE}>
            <option value="">Estado</option>
            <option value="activa">Activa</option>
            <option value="inactiva">Inactiva</option>
            <option value="comprometida">Comprometida</option>
            <option value="expirada">Expirada</option>
          </select>
          {(search || tipoIdentidad || estado) && (
            <button onClick={() => { setSearch(''); setTipoIdentidad(''); setEstado('') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        <ClienteIdentidadesTabla
          identidades={identidades}
          loading={loading}
          selected={selected}
          onSelect={id => setSelected(prev => prev?.id === id.id ? null : id)}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => cargarIdentidades(page - 1)} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
            <button onClick={() => cargarIdentidades(page + 1)} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Panel detalle lateral */}
      {selected && (
        <ClienteIdentidadDetalle
          identidad={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
