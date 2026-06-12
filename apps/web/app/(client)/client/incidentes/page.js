'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import ClienteIncidentesTabla  from './components/ClienteIncidentesTabla'
import ClienteIncidenteDetalle from './components/ClienteIncidenteDetalle'

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

function UpgradeMessage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 20 }}>
        🔒
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2A', margin: '0 0 10px' }}>Módulo no disponible</h2>
      <p style={{ fontSize: 14, color: '#888780', maxWidth: 380, lineHeight: 1.6, margin: '0 0 24px' }}>
        El módulo de Incidentes de Seguridad está disponible en los planes Profesional y Enterprise.
        Contacta a tu analista DSTAC para conocer las opciones de actualización.
      </p>
      <div style={{ background: '#FAEEDA', border: '1px solid #F8D57A', borderRadius: 10, padding: '12px 20px', fontSize: 13, color: '#633806', fontWeight: 500 }}>
        Plan actual no incluye este módulo
      </div>
    </div>
  )
}

export default function ClienteIncidentesPage() {
  const [incidentes, setIncidentes] = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [noDisponible, setNoDisponible] = useState(false)

  const [search,    setSearch]    = useState('')
  const [estado,    setEstado]    = useState('')
  const [severidad, setSeveridad] = useState('')

  const LIMIT = 20

  const cargarStats = useCallback(async () => {
    try { setStats(await apiFetch('/api/client/incidentes/stats')) }
    catch (err) {
      if (err.status === 403) setNoDisponible(true)
    }
  }, [])

  const cargarIncidentes = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (search)    params.set('search', search)
      if (estado)    params.set('estado', estado)
      if (severidad) params.set('severidad', severidad)
      const data = await apiFetch(`/api/client/incidentes?${params}`)
      setIncidentes(data.incidentes ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch (err) {
      if (err.status === 403) setNoDisponible(true)
      setIncidentes([])
    }
    finally { setLoading(false) }
  }, [search, estado, severidad])

  useEffect(() => {
    cargarStats()
    cargarIncidentes(1)
  }, [cargarStats, cargarIncidentes])

  if (noDisponible) {
    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <UpgradeMessage />
        </div>
      </div>
    )
  }

  const totalPages    = Math.ceil(total / LIMIT)
  const alertaCritico = stats?.criticos > 0 && stats?.abiertos > 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Incidentes de Seguridad</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Vista de solo lectura — los datos son gestionados por tu analista DSTAC.
          </p>
        </div>

        {alertaCritico && (
          <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#791F1F', fontWeight: 500, marginBottom: 16 }}>
            ⛔ {stats.criticos} incidente{stats.criticos !== 1 ? 's' : ''} crítico{stats.criticos !== 1 ? 's' : ''} activo{stats.criticos !== 1 ? 's' : ''}. Contacta a tu analista DSTAC.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Total"            value={stats?.total}            />
          <StatCard label="Abiertos"         value={stats?.abiertos}         color="#E24B4A" />
          <StatCard label="En investigación" value={stats?.en_investigacion} color="#633806" />
          <StatCard label="En respuesta"     value={stats?.en_respuesta}     color="#3C3489" />
          <StatCard label="Cerrados"         value={stats?.cerrados}         color="#1D9E75" />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por tipo o descripción…"
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }}
          />
          <select value={severidad} onChange={e => setSeveridad(e.target.value)} style={SELECT_STYLE}>
            <option value="">Severidad</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} style={SELECT_STYLE}>
            <option value="">Estado</option>
            <option value="abierto">Abierto</option>
            <option value="en_investigacion">En investigación</option>
            <option value="en_respuesta">En respuesta</option>
            <option value="cerrado">Cerrado</option>
            <option value="falso_positivo">Falso positivo</option>
          </select>
          {(search || estado || severidad) && (
            <button onClick={() => { setSearch(''); setEstado(''); setSeveridad('') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
              Limpiar
            </button>
          )}
        </div>

        <ClienteIncidentesTabla
          incidentes={incidentes}
          loading={loading}
          selected={selected}
          onSelect={i => setSelected(prev => prev?.id === i.id ? null : i)}
        />

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => cargarIncidentes(page - 1)} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
            <button onClick={() => cargarIncidentes(page + 1)} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {selected && (
        <ClienteIncidenteDetalle
          incidente={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
