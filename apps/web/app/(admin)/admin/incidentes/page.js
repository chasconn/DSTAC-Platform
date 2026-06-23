'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'
import BotonInforme from '../../../../components/admin/BotonInforme'
import IncidenteDetalle     from './components/IncidenteDetalle'
import IncidenteModal       from './components/IncidenteModal'
import IncidenteDeleteModal from './components/IncidenteDeleteModal'
import ImportarExcelModal   from '../../../../components/admin/ImportarExcelModal'

const SEV_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F', label: 'Crítica' },
  alta:    { bg: '#FAEEDA', color: '#633806', label: 'Alta'    },
  media:   { bg: '#EAF3DE', color: '#27500A', label: 'Media'   },
  baja:    { bg: '#F1EFE8', color: '#444441', label: 'Baja'    },
}
const ESTADO_STYLE = {
  abierto:          { bg: '#FCEBEB', color: '#791F1F', label: 'Abierto'         },
  en_investigacion: { bg: '#FAEEDA', color: '#633806', label: 'En investigación' },
  en_respuesta:     { bg: '#EEEDFE', color: '#3C3489', label: 'En respuesta'     },
  cerrado:          { bg: '#EAF3DE', color: '#27500A', label: 'Cerrado'          },
  falso_positivo:   { bg: '#F1EFE8', color: '#888780', label: 'Falso positivo'   },
}

function Badge({ value, map }) {
  if (!value) return null
  const s = map[value]
  return (
    <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {s?.label ?? value}
    </span>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${color}`, padding: '14px 18px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#2C2C2A' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function IncidentesPage() {
  const [incidentes, setIncidentes]     = useState([])
  const [stats, setStats]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [selected, setSelected]         = useState(null)
  const [empresaActiva, setEmpresaActiva] = useState(null)

  const [filterEstado,   setFilterEstado]   = useState('')
  const [filterSeveridad, setFilterSeveridad] = useState('')
  const [search, setSearch]               = useState('')

  const [modalOpen,  setModalOpen]  = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [toast,      setToast]      = useState(null)

  const LIMIT = 25

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  const slug    = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}

  const cargarStats = useCallback(async () => {
    if (!slug) return
    try { setStats(await api.get('/api/incidents/stats', headers)) } catch {}
  }, [slug])

  const cargarIncidentes = useCallback(async (p = 1) => {
    if (!slug) { setLoading(false); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (filterEstado)    params.set('estado', filterEstado)
      if (filterSeveridad) params.set('severidad', filterSeveridad)
      if (search)          params.set('search', search)
      const data = await api.get(`/api/incidents?${params}`, headers)
      setIncidentes(data.incidentes ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch { setIncidentes([]) }
    finally { setLoading(false) }
  }, [slug, filterEstado, filterSeveridad, search])

  useEffect(() => { cargarStats(); cargarIncidentes(1) }, [cargarStats, cargarIncidentes])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSaved() {
    setModalOpen(false); setEditando(null)
    cargarStats(); cargarIncidentes(1)
    showToast(editando ? 'Incidente actualizado' : 'Incidente creado')
  }

  function handleDeleted() {
    setEliminando(null); setSelected(null)
    cargarStats(); cargarIncidentes(page)
    showToast('Incidente eliminado')
  }

  const totalPages = Math.ceil(total / LIMIT)

  if (!empresaActiva) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🏢</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2A', margin: '0 0 8px' }}>Ninguna empresa seleccionada</h2>
        <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
          Ve a Clientes y selecciona una empresa para ver sus incidentes.
        </p>
        <a href="/admin/clientes" style={{ display: 'inline-block', padding: '9px 20px', background: '#534AB7', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Ir a Clientes
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Incidentes</h1> <BotonInforme tipo="incidentes" slug={slug} />
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
              {empresaActiva.name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setImportarOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <i className="ti ti-file-spreadsheet" /> Importar Excel
            </button>
            <button onClick={() => { setEditando(null); setModalOpen(true) }}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + Nuevo incidente
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
            {toast.msg}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Total"            value={stats?.total}            color="#534AB7" />
          <StatCard label="Abiertos"         value={stats?.abiertos}         color="#E24B4A" />
          <StatCard label="En investigación" value={stats?.en_investigacion} color="#633806" />
          <StatCard label="En respuesta"     value={stats?.en_respuesta}     color="#3C3489" />
          <StatCard label="Críticos"         value={stats?.criticos}         color="#791F1F" />
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tipo, descripción, responsable…"
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }}
          />
          <select value={filterSeveridad} onChange={e => setFilterSeveridad(e.target.value)} style={SEL}>
            <option value="">Severidad</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={SEL}>
            <option value="">Estado</option>
            <option value="abierto">Abierto</option>
            <option value="en_investigacion">En investigación</option>
            <option value="en_respuesta">En respuesta</option>
            <option value="cerrado">Cerrado</option>
            <option value="falso_positivo">Falso positivo</option>
          </select>
          {(search || filterEstado || filterSeveridad) && (
            <button onClick={() => { setSearch(''); setFilterEstado(''); setFilterSeveridad('') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
              Limpiar
            </button>
          )}
          <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>{total} incidente{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Tabla */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflowX: 'auto' }}>
          <div style={{ minWidth: 640 }}>
          {/* Cabecera */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr', gap: 12, padding: '8px 18px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
            {['Tipo / Categoría', 'Severidad', 'Estado', 'Detección', 'Responsable'].map(c => (
              <span key={c} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5 }}>{c}</span>
            ))}
          </div>

          {loading && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>
          )}

          {!loading && incidentes.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin incidentes registrados</div>
              <div style={{ fontSize: 13, color: '#888780' }}>Crea el primer incidente con "+ Nuevo incidente".</div>
            </div>
          )}

          {!loading && incidentes.map((inc, i) => {
            const isSelected = inc.id === selected?.id
            return (
              <div
                key={inc.id}
                onClick={() => setSelected(prev => prev?.id === inc.id ? null : inc)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr', gap: 12, padding: '11px 18px', alignItems: 'center', borderBottom: i < incidentes.length - 1 ? '1px solid #f1efe8' : 'none', background: isSelected ? '#EEEDFE' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f7f4' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#EEEDFE' : 'transparent' }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.tipo}</div>
                  {inc.categoria && <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{inc.categoria}</div>}
                </div>
                <Badge value={inc.severidad} map={SEV_STYLE} />
                <Badge value={inc.estado}    map={ESTADO_STYLE} />
                <span style={{ fontSize: 12, color: '#888780' }}>
                  {inc.fecha_deteccion ? new Date(inc.fecha_deteccion).toLocaleDateString('es-CL') : '—'}
                </span>
                <span style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inc.responsable || '—'}
                </span>
              </div>
            )
          })}
          </div>
        </div>

        {/* Paginación */}
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

      {/* Panel detalle */}
      {selected && (
        <IncidenteDetalle
          incidente={selected}
          onClose={() => setSelected(null)}
          onEdit={inc => { setEditando(inc); setModalOpen(true) }}
          onDelete={inc => setEliminando(inc)}
        />
      )}

      {/* Modales */}
      {modalOpen && (
        <IncidenteModal
          incidente={editando}
          empresaSlug={slug}
          onClose={() => { setModalOpen(false); setEditando(null) }}
          onSaved={handleSaved}
        />
      )}
      {eliminando && (
        <IncidenteDeleteModal
          incidente={eliminando}
          empresaSlug={slug}
          onClose={() => setEliminando(null)}
          onDeleted={handleDeleted}
        />
      )}
      {importarOpen && (
        <ImportarExcelModal
          modulo="incidentes"
          empresaSlug={slug}
          onClose={() => setImportarOpen(false)}
          onImportado={() => { cargarStats(); cargarIncidentes(1) }}
        />
      )}
    </div>
  )
}
