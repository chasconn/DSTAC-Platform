'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import ClientePersonalTabla   from './components/ClientePersonalTabla'
import ClientePersonalDetalle from './components/ClientePersonalDetalle'

const STATS_CONFIG = [
  { key: 'total',         label: 'Total personal', color: null         },
  { key: 'activos',       label: 'Activos',        color: '#27500A'    },
  { key: 'en_vacaciones', label: 'En vacaciones',  color: '#854F0B'    },
  { key: 'desvinculados', label: 'Desvinculados',  color: '#A32D2D'    },
]

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

export default function ClientePersonalPage() {
  const [personal, setPersonal] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)

  const [search, setSearch]                     = useState('')
  const [estado, setEstado]                     = useState('')
  const [nivelResponsabilidad, setNivelResp]    = useState('')

  const LIMIT = 20

  const cargarStats = useCallback(async () => {
    try { setStats(await apiFetch('/api/client/personal/stats')) } catch {}
  }, [])

  const cargarPersonal = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (search)               params.set('search', search)
      if (estado)               params.set('estado', estado)
      if (nivelResponsabilidad) params.set('nivel_responsabilidad', nivelResponsabilidad)
      const data = await apiFetch(`/api/client/personal?${params}`)
      setPersonal(data.personal ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch { setPersonal([]) }
    finally { setLoading(false) }
  }, [search, estado, nivelResponsabilidad])

  useEffect(() => {
    cargarStats()
    cargarPersonal(1)
  }, [cargarStats, cargarPersonal])

  const totalPages     = Math.ceil(total / LIMIT)
  const hayDesvinculados = stats?.desvinculados > 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Área scrollable principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {/* Encabezado */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Personal</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Directorio de personal registrado por tu analista DSTAC.
          </p>
        </div>

        {/* Alerta si hay desvinculados */}
        {hayDesvinculados && (
          <div style={{ background: '#FAEEDA', border: '1px solid #F8D57A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#633806', fontWeight: 500, marginBottom: 16 }}>
            ⚠️ {stats.desvinculados} persona{stats.desvinculados !== 1 ? 's' : ''} desvinculada{stats.desvinculados !== 1 ? 's' : ''}. Verifica que sus accesos e identidades estén revocados.
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {STATS_CONFIG.map(({ key, label, color }) => (
            <StatCard key={key} label={label} value={stats?.[key]} color={color} />
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o rol…"
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }}
          />
          <select value={estado} onChange={e => setEstado(e.target.value)} style={SELECT_STYLE}>
            <option value="">Estado</option>
            <option value="activo">Activo</option>
            <option value="vacaciones">Vacaciones</option>
            <option value="inactivo">Inactivo</option>
            <option value="desvinculado">Desvinculado</option>
          </select>
          <select value={nivelResponsabilidad} onChange={e => setNivelResp(e.target.value)} style={SELECT_STYLE}>
            <option value="">Nivel</option>
            <option value="alto">Alto</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </select>
          {(search || estado || nivelResponsabilidad) && (
            <button onClick={() => { setSearch(''); setEstado(''); setNivelResp('') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
              Limpiar
            </button>
          )}
          <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>{total} persona{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Tabla */}
        <ClientePersonalTabla
          personal={personal}
          loading={loading}
          selected={selected}
          onSelect={p => setSelected(prev => prev?.id === p.id ? null : p)}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => cargarPersonal(page - 1)} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
            <button onClick={() => cargarPersonal(page + 1)} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Panel detalle lateral */}
      {selected && (
        <ClientePersonalDetalle
          persona={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
