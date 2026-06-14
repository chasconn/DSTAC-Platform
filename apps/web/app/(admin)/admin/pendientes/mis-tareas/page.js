'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../lib/api'
import TareaModal       from '../components/TareaModal'
import TareaDeleteModal from '../components/TareaDeleteModal'
import TareaDetalle     from '../components/TareaDetalle'
import PendientesSubnav from '../components/PendientesSubnav'

const PRIORITY_STYLE = {
  critical: { bg: '#FCEBEB', color: '#791F1F', label: 'Crítica'  },
  high:     { bg: '#FEF3E2', color: '#633806', label: 'Alta'     },
  medium:   { bg: '#FAEEDA', color: '#854F0B', label: 'Media'    },
  low:      { bg: '#F1EFE8', color: '#444441', label: 'Baja'     },
}

const STATUS_STYLE = {
  pending:     { bg: '#E6F1FB', color: '#0C447C', label: 'Pendiente'   },
  in_progress: { bg: '#EEEDFE', color: '#3C3489', label: 'En progreso' },
  done:        { bg: '#EAF3DE', color: '#27500A', label: 'Completada'  },
  cancelled:   { bg: '#F1EFE8', color: '#888780', label: 'Cancelada'   },
}

const PRIORITY_DOT = { critical: '#E24B4A', high: '#EF9F27', medium: '#C47A1A', low: '#B4B2A9' }

function Badge({ value, map }) {
  if (!value) return null
  const s = map[value]
  return <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s?.label ?? value}</span>
}

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function MisTareasPage() {
  const [tasks,    setTasks]    = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)

  const [empresas,      setEmpresas]      = useState({ internas: [], clientes: [] })
  const [empresaActiva, setEmpresaActiva] = useState(null)

  const [filterStatus,    setFilterStatus]    = useState('')
  const [filterPriority,  setFilterPriority]  = useState('')
  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [viendo,     setViendo]     = useState(null)
  const [toast,      setToast]      = useState(null)

  const LIMIT = 40
  const isMobile = useIsMobile()   // < 820px → layout de tarjetas

  // Debounce search — evita un fetch por cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Empresa activa inicial desde localStorage
  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  // Cargar lista de empresas para el selector
  useEffect(() => {
    apiFetch('/api/admin/empresas/selector')
      .then(d => setEmpresas({ internas: d.internas ?? [], clientes: d.clientes ?? [] }))
      .catch(() => {})
  }, [])

  const companyId = empresaActiva?.id ?? null

  const cargarStats = useCallback(async () => {
    const params = new URLSearchParams()
    if (companyId) params.set('company_id', companyId)
    try { setStats(await apiFetch(`/api/pending/stats?${params}`)) } catch {}
  }, [companyId])

  const cargarTasks = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (companyId)       params.set('company_id', companyId)
      if (filterStatus)    params.set('status', filterStatus)
      if (filterPriority)  params.set('priority', filterPriority)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const data = await apiFetch(`/api/pending?${params}`)
      setTasks(data.tasks ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch (err) {
      showToast(err.message || 'Error al cargar tareas', 'error')
    }
    finally { setLoading(false) }
  }, [companyId, filterStatus, filterPriority, debouncedSearch])

  useEffect(() => { cargarStats(); cargarTasks(1) }, [cargarStats, cargarTasks])

  function seleccionarEmpresa(slug) {
    if (!slug) {
      setEmpresaActiva(null)
      return
    }
    const all = [...empresas.internas, ...empresas.clientes]
    const emp = all.find(e => e.slug === slug)
    if (!emp) return
    const val = { id: emp.id, name: emp.name, slug: emp.slug }
    localStorage.setItem('empresa_activa', JSON.stringify(val))
    window.dispatchEvent(new Event('empresa_activa_changed'))
    setEmpresaActiva(val)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSaved() {
    setModalOpen(false); setEditando(null)
    cargarStats(); cargarTasks(1)
    showToast(editando ? 'Tarea actualizada' : 'Tarea creada')
  }
  function handleDeleted() {
    setEliminando(null)
    cargarStats(); cargarTasks(page)
    showToast('Tarea eliminada')
  }

  async function toggleStatus(task) {
    const next = task.status === 'done' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'done'
    // Optimistic update: refleja el cambio inmediatamente sin esperar refetch
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    try {
      await apiFetch(`/api/pending/${task.id}`, { method: 'PUT', body: JSON.stringify({ status: next }) })
      cargarStats()
    } catch (err) {
      // Revertir si falla
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
      showToast(err.message || 'Error', 'error')
    }
  }

  const totalPages   = Math.ceil(total / LIMIT)
  const hayFiltros   = filterStatus || filterPriority || search

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '24px 28px' }}>

      <PendientesSubnav />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Pendientes</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            {empresaActiva ? `Tareas de ${empresaActiva.name}` : 'Tareas de todas las empresas'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Selector de empresa */}
          <select
            value={empresaActiva?.slug ?? ''}
            onChange={e => seleccionarEmpresa(e.target.value)}
            style={{ ...SEL, minWidth: 200, color: empresaActiva ? '#2C2C2A' : '#888780' }}
          >
            <option value="">Todas las empresas</option>
            {empresas.internas.length > 0 && (
              <optgroup label="DSTAC (interno)">
                {empresas.internas.map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}
              </optgroup>
            )}
            {empresas.clientes.length > 0 && (
              <optgroup label="Clientes">
                {empresas.clientes.map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}
              </optgroup>
            )}
          </select>
          <button
            onClick={() => { setEditando(null); setModalOpen(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Nueva tarea
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      {/* Stats — 5 columnas en PC, 2 en móvil */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 10, marginBottom: 20 }}>
        {[
          { label: 'Total',       value: stats?.total,       color: '#534AB7' },
          { label: 'Pendientes',  value: stats?.pendientes,  color: '#EF9F27' },
          { label: 'En progreso', value: stats?.en_progreso, color: '#3C3489' },
          { label: 'Completadas', value: stats?.completadas, color: '#1D9E75' },
          { label: 'Vencidas',    value: stats?.vencidas,    color: '#E24B4A' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${s.color}`, padding: isMobile ? '10px 12px' : '14px 18px' }}>
            <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#2C2C2A' }}>{s.value ?? '—'}</div>
            <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por título…"
          style={{ ...SEL, minWidth: 220, flex: '0 1 auto' }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={SEL}>
          <option value="">Estado</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En progreso</option>
          <option value="done">Completada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={SEL}>
          <option value="">Prioridad</option>
          <option value="critical">Crítica</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        {hayFiltros && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setSearch('') }}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
            Limpiar
          </button>
        )}
        <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>
          {total} tarea{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

        {/* Cabecera (solo en PC/tablet ancho; en móvil se usan tarjetas) */}
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '32px 40px 1fr 130px 160px 160px 110px 160px 96px', gap: 0, padding: '9px 16px', background: '#f8f7f4', borderBottom: '1px solid #e2e0d8' }}>
            {['', 'Pri.', 'Título', 'Estado', 'Empresa', 'Personal', 'Vence', 'Analista', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 8 }}>{h}</div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>
        )}

        {!loading && tasks.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin tareas</div>
            <div style={{ fontSize: 13, color: '#888780' }}>Crea la primera tarea con el botón "Nueva tarea".</div>
          </div>
        )}

        {!loading && tasks.map((t, i) => {
          const vencida = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'cancelled'

          // ── Layout de tarjeta para móvil ──────────────────────────────────
          if (isMobile) {
            return (
              <div key={t.id} style={{
                padding: '12px 14px',
                borderBottom: i < tasks.length - 1 ? '1px solid #f1efe8' : 'none',
                background: vencida ? '#FFFBF0' : 'transparent',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* Checkbox */}
                  <button onClick={() => toggleStatus(t)} title="Cambiar estado"
                    style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${t.status === 'done' ? '#639922' : '#e2e0d8'}`, background: t.status === 'done' ? '#EAF3DE' : '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#639922', padding: 0, marginTop: 1 }}>
                    {t.status === 'done' ? '✓' : ''}
                  </button>
                  {/* Título + descripción */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div onClick={() => setViendo(t)} style={{ fontSize: 14, fontWeight: 600, color: t.status === 'done' ? '#888780' : '#2C2C2A', textDecoration: t.status === 'done' ? 'line-through' : 'none', cursor: 'pointer', wordBreak: 'break-word' }}>
                      <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: PRIORITY_DOT[t.priority] ?? '#B4B2A9', marginRight: 7, verticalAlign: 'middle' }} />
                      {t.title}
                      {vencida && <span style={{ marginLeft: 6, fontSize: 10, background: '#FCEBEB', color: '#791F1F', fontWeight: 600, padding: '1px 6px', borderRadius: 20 }}>Vencida</span>}
                    </div>
                    {t.description && (
                      <div style={{ fontSize: 12, color: '#888780', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                    <ActionBtn onClick={() => setViendo(t)} title="Ver detalle">👁</ActionBtn>
                    <ActionBtn onClick={() => { setEditando(t); setModalOpen(true) }} title="Editar">✏️</ActionBtn>
                    <ActionBtn onClick={() => setEliminando(t)} title="Eliminar" danger>🗑</ActionBtn>
                  </div>
                </div>
                {/* Meta: estado, empresa, vence, analista */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingLeft: 32 }}>
                  <Badge value={t.status} map={STATUS_STYLE} />
                  {t.company_name && <span style={{ fontSize: 11.5, color: '#888780' }}>🏢 {t.company_name}</span>}
                  {t.due_date && <span style={{ fontSize: 11.5, color: vencida ? '#E24B4A' : '#888780' }}>📅 {new Date(t.due_date).toLocaleDateString('es-CL')}</span>}
                  {t.assigned_name?.trim() && <span style={{ fontSize: 11.5, color: '#888780' }}>👤 {t.assigned_name}</span>}
                </div>
              </div>
            )
          }

          // ── Layout de tabla para PC/tablet ────────────────────────────────
          return (
            <div key={t.id} style={{
              display: 'grid',
              gridTemplateColumns: '32px 40px 1fr 130px 160px 160px 110px 160px 96px',
              gap: 0, padding: '11px 16px',
              borderBottom: i < tasks.length - 1 ? '1px solid #f1efe8' : 'none',
              background: vencida ? '#FFFBF0' : 'transparent',
              alignItems: 'center',
            }}>

              {/* Checkbox */}
              <button onClick={() => toggleStatus(t)} title="Cambiar estado"
                style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${t.status === 'done' ? '#639922' : '#e2e0d8'}`, background: t.status === 'done' ? '#EAF3DE' : '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#639922', padding: 0 }}>
                {t.status === 'done' ? '✓' : ''}
              </button>

              {/* Prioridad dot */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div title={PRIORITY_STYLE[t.priority]?.label ?? t.priority}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_DOT[t.priority] ?? '#B4B2A9', flexShrink: 0 }} />
              </div>

              {/* Título + descripción (clic en el título → ver detalle) */}
              <div style={{ minWidth: 0, paddingRight: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.status === 'done' ? '#888780' : '#2C2C2A', textDecoration: t.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span onClick={() => setViendo(t)} title="Ver detalle" style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                    {t.title}
                  </span>
                  {vencida && <span style={{ marginLeft: 6, fontSize: 10, background: '#FCEBEB', color: '#791F1F', fontWeight: 600, padding: '1px 6px', borderRadius: 20 }}>Vencida</span>}
                </div>
                {t.description && (
                  <div style={{ fontSize: 11, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {t.description}
                  </div>
                )}
              </div>

              {/* Estado */}
              <div style={{ paddingRight: 8 }}><Badge value={t.status} map={STATUS_STYLE} /></div>

              {/* Empresa */}
              <div style={{ fontSize: 12, color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {t.company_name ?? '—'}
              </div>

              {/* Personal */}
              <div style={{ fontSize: 12, color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {t.personal_nombre ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#888780' }}>👤</span> {t.personal_nombre}
                  </span>
                ) : <span style={{ color: '#B4B2A9' }}>—</span>}
              </div>

              {/* Fecha límite */}
              <div style={{ fontSize: 12, color: vencida ? '#E24B4A' : '#888780', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {t.due_date ? new Date(t.due_date).toLocaleDateString('es-CL') : <span style={{ color: '#B4B2A9' }}>—</span>}
              </div>

              {/* Analista */}
              <div style={{ fontSize: 12, color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {t.assigned_name?.trim() || <span style={{ color: '#B4B2A9' }}>Sin asignar</span>}
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <ActionBtn onClick={() => setViendo(t)} title="Ver detalle">👁</ActionBtn>
                <ActionBtn onClick={() => { setEditando(t); setModalOpen(true) }} title="Editar">✏️</ActionBtn>
                <ActionBtn onClick={() => setEliminando(t)} title="Eliminar" danger>🗑</ActionBtn>
              </div>
            </div>
          )
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => cargarTasks(page - 1)} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
          <button onClick={() => cargarTasks(page + 1)} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
            Siguiente →
          </button>
        </div>
      )}

      {/* Modales */}
      {modalOpen && (
        <TareaModal
          tarea={editando}
          empresaActiva={empresaActiva}
          onClose={() => { setModalOpen(false); setEditando(null) }}
          onSaved={handleSaved}
        />
      )}
      {eliminando && (
        <TareaDeleteModal
          tarea={eliminando}
          onClose={() => setEliminando(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Panel de detalle (solo lectura) */}
      {viendo && (
        <TareaDetalle
          tarea={viendo}
          onClose={() => setViendo(null)}
          onEdit={(t) => { setViendo(null); setEditando(t); setModalOpen(true) }}
        />
      )}
    </div>
  )
}

// Hook de viewport: true cuando el ancho es <= bp (móvil/tablet angosto).
function useIsMobile(bp = 820) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const upd = () => setM(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [bp])
  return m
}

function ActionBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 13, opacity: 0.6 }}
      onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = danger ? '#FCEBEB' : '#f1efe8' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = 'none' }}>
      {children}
    </button>
  )
}
