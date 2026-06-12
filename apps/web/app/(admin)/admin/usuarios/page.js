'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import UsuariosTabla       from './components/UsuariosTabla'
import UsuarioDetalle      from './components/UsuarioDetalle'
import UsuarioModal        from './components/UsuarioModal'
import UsuarioDeleteModal  from './components/UsuarioDeleteModal'

const STATS_CONFIG = [
  { key: 'total',        label: 'Total usuarios',    borderColor: '#534AB7' },
  { key: 'clientes',     label: 'Usuarios cliente',  borderColor: '#1D9E75' },
  { key: 'equipo_dstac', label: 'Equipo DSTAC',      borderColor: '#3C3489' },
  { key: 'pendientes',   label: 'Pendientes acceso', borderColor: '#EF9F27' },
  { key: 'suspendidos',  label: 'Suspendidos',       borderColor: '#E24B4A' },
]

function StatCard({ label, value, borderColor }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${borderColor}`, padding: '14px 18px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#2C2C2A' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const SELECT_STYLE = {
  padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8',
  fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none',
}

const ROLES = [
  { value: 'super_admin',     label: 'Super Admin'     },
  { value: 'admin_dstac',     label: 'Admin DSTAC'     },
  { value: 'analista_dstac',  label: 'Analista DSTAC'  },
  { value: 'consultor_dstac', label: 'Consultor DSTAC' },
  { value: 'cliente_admin',   label: 'Cliente Admin'   },
  { value: 'cliente_lectura', label: 'Cliente Lectura' },
]

const LIMIT = 25

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState(null)

  const [search, setSearch]       = useState('')
  const [role, setRole]           = useState('')
  const [status, setStatus]       = useState('')
  const [companyId, setCompanyId] = useState('')
  const [empresas, setEmpresas]   = useState([])

  const [modalOpen, setModalOpen]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [eliminando, setEliminando]     = useState(null)
  const [resetConfirm, setResetConfirm] = useState(null)
  const [resetMsg, setResetMsg]         = useState('')
  const [devPassword, setDevPassword]   = useState(null)   // { email, password }

  useEffect(() => {
    apiFetch('/api/admin/empresas/selector')
      .then(data => setEmpresas([...(data.internas ?? []), ...(data.clientes ?? [])]))
      .catch(() => {})
  }, [])

  const cargarStats = useCallback(async () => {
    try { setStats(await apiFetch('/api/admin/usuarios/stats')) } catch {}
  }, [])

  const cargarUsuarios = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (search)    params.set('search', search)
      if (role)      params.set('role', role)
      if (status)    params.set('status', status)
      if (companyId) params.set('company_id', companyId)
      const data = await apiFetch(`/api/admin/usuarios?${params}`)
      setUsuarios(data.usuarios ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch { setUsuarios([]) }
    finally { setLoading(false) }
  }, [search, role, status, companyId])

  useEffect(() => {
    cargarStats()
    cargarUsuarios(1)
  }, [cargarStats, cargarUsuarios])

  function handleSaved(data) {
    setModalOpen(false)
    setEditando(null)
    setSelected(null)
    cargarStats()
    cargarUsuarios(1)
    if (data?._dev_password) {
      setDevPassword({ email: data.email ?? '', password: data._dev_password })
    }
  }

  function handleDeleted() {
    setEliminando(null)
    setSelected(null)
    cargarStats()
    cargarUsuarios(page)
  }

  async function handleReset(u) {
    if (!confirm(`¿Enviar nueva contraseña temporal a ${u.email}?`)) return
    try {
      const data = await apiFetch(`/api/admin/usuarios/${u.id}/reset-password`, { method: 'POST' })
      if (data?._dev_password) {
        setDevPassword({ email: u.email, password: data._dev_password })
      } else {
        setResetMsg(`Credenciales enviadas a ${u.email}`)
        setTimeout(() => setResetMsg(''), 4000)
      }
      cargarUsuarios(page)
    } catch (err) {
      alert(err.message || 'Error al reenviar')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Usuarios</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
              Gestión de accesos a la plataforma.
            </p>
          </div>
          <button
            onClick={() => { setEditando(null); setModalOpen(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <PlusIcon /> Nuevo usuario
          </button>
        </div>

        {/* Toast reset */}
        {resetMsg && (
          <div style={{ background: '#EAF3DE', border: '1px solid #A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#27500A', fontWeight: 500, marginBottom: 16 }}>
            ✓ {resetMsg}
          </div>
        )}

        {/* Banner DEV — contraseña temporal visible en entorno de desarrollo */}
        {devPassword && (
          <div style={{ background: '#FFF8E1', border: '1px solid #F9C940', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7A5000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                [DEV] Contraseña temporal
              </div>
              {devPassword.email && (
                <div style={{ fontSize: 12, color: '#7A5000', marginBottom: 6 }}>{devPassword.email}</div>
              )}
              <code style={{ fontSize: 15, fontWeight: 700, color: '#3C3489', letterSpacing: '0.12em', background: '#fff', border: '1px solid #F9C940', borderRadius: 6, padding: '4px 10px' }}>
                {devPassword.password}
              </code>
              <div style={{ fontSize: 11, color: '#B08000', marginTop: 6 }}>Solo visible en desarrollo. No aparece en producción.</div>
            </div>
            <button onClick={() => setDevPassword(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B08000', fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>
              ✕
            </button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {STATS_CONFIG.map(({ key, label, borderColor }) => (
            <StatCard key={key} label={label} value={stats?.[key]} borderColor={borderColor} />
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }}
          />
          <select value={role} onChange={e => setRole(e.target.value)} style={SELECT_STYLE}>
            <option value="">Rol</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} style={SELECT_STYLE}>
            <option value="">Estado</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
          </select>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={SELECT_STYLE}>
            <option value="">Todas las empresas</option>
            <option value="dstac">Equipo DSTAC</option>
            {empresas.filter(e => !e.is_internal).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          {(search || role || status || companyId) && (
            <button
              onClick={() => { setSearch(''); setRole(''); setStatus(''); setCompanyId('') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}
            >
              Limpiar
            </button>
          )}
          <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>
            {total} usuario{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabla */}
        <UsuariosTabla
          usuarios={usuarios}
          loading={loading}
          selected={selected}
          onSelect={u => setSelected(prev => prev?.id === u.id ? null : u)}
          onEdit={u => { setEditando(u); setModalOpen(true) }}
          onReset={handleReset}
          onDelete={u => setEliminando(u)}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => cargarUsuarios(page - 1)} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
            <button onClick={() => cargarUsuarios(page + 1)} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Panel lateral */}
      {selected && (
        <UsuarioDetalle
          usuario={selected}
          onClose={() => setSelected(null)}
          onEdit={u => { setEditando(u); setModalOpen(true) }}
          onReset={handleReset}
          onDelete={u => setEliminando(u)}
        />
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <UsuarioModal
          usuario={editando}
          onClose={() => { setModalOpen(false); setEditando(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Modal eliminar */}
      {eliminando && (
        <UsuarioDeleteModal
          usuario={eliminando}
          onClose={() => setEliminando(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
