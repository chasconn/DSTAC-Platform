'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '../../../../../lib/api'
import FixedPortal from '../../../../../components/admin/FixedPortal'

const ROLES_DSTAC = [
  { value: 'admin_dstac',     label: 'Admin DSTAC'    },
  { value: 'analista_dstac',  label: 'Analista DSTAC' },
  { value: 'consultor_dstac', label: 'Consultor DSTAC' },
]
const ROLES_CLIENTE = [
  { value: 'cliente_admin',   label: 'Cliente Admin'   },
  { value: 'cliente_lectura', label: 'Cliente Lectura' },
]
const ALL_ROLES = [...ROLES_DSTAC, ...ROLES_CLIENTE]

const ES_ROL_CLIENTE = r => r === 'cliente_admin' || r === 'cliente_lectura'

const inputStyle = {
  width: '100%', padding: '8px 10px',
  border: '1px solid #e2e0d8', borderRadius: 8,
  fontSize: 13, color: '#2C2C2A', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}

export default function UsuarioModal({ usuario, onClose, onSaved }) {
  const esEdicion = !!usuario

  const [form, setForm] = useState({
    email:      usuario?.email      ?? '',
    first_name: usuario?.first_name ?? '',
    last_name:  usuario?.last_name  ?? '',
    username:   usuario?.username   ?? '',
    role:       usuario?.role       ?? '',
    company_id: usuario?.company_id ? String(usuario.company_id) : '',
    status:     usuario?.status     ?? 'active',
  })

  const [empresas, setEmpresas]             = useState([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => {
    if (!ES_ROL_CLIENTE(form.role)) {
      setEmpresas([])
      return
    }
    let cancelled = false
    setLoadingEmpresas(true)
    apiFetch('/api/admin/empresas/selector')
      .then(data => { if (!cancelled) setEmpresas(data.clientes ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingEmpresas(false) })
    return () => { cancelled = true }
  }, [form.role])

  function set(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value }
      // Limpiar empresa si el rol cambia a uno de DSTAC
      if (field === 'role' && !ES_ROL_CLIENTE(value)) {
        next.company_id = ''
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      email:      form.email,
      first_name: form.first_name,
      last_name:  form.last_name || undefined,
      role:       form.role,
      username:   form.username || undefined,
      company_id: ES_ROL_CLIENTE(form.role) && form.company_id ? Number(form.company_id) : null,
    }

    if (esEdicion) {
      delete payload.email  // email no editable
      payload.status = form.status
    }

    try {
      if (esEdicion) {
        await apiFetch(`/api/admin/usuarios/${usuario.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        onSaved()
      } else {
        const data = await apiFetch('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(payload) })
        onSaved({ ...data, email: form.email })
      }
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const requiereEmpresa = ES_ROL_CLIENTE(form.role)
  const puedeGuardar    = form.email && form.first_name && form.role && (!requiereEmpresa || form.company_id)

  return (
    <FixedPortal>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Cabecera */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>
            {esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>✕</button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Nombre *">
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="Apellido">
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {!esEdicion && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Email *">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required style={inputStyle} />
              </Field>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Username (opcional)">
              <input value={form.username} onChange={e => set('username', e.target.value)} style={inputStyle} placeholder="Sin username" />
            </Field>
            <Field label="Rol *">
              <select value={form.role} onChange={e => set('role', e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Seleccionar rol</option>
                <optgroup label="Equipo DSTAC">
                  {ROLES_DSTAC.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </optgroup>
                <optgroup label="Clientes">
                  {ROLES_CLIENTE.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </optgroup>
              </select>
            </Field>
          </div>

          {/* Select de empresa — solo visible para roles cliente */}
          {requiereEmpresa && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Empresa *">
                <select
                  value={form.company_id}
                  onChange={e => set('company_id', e.target.value)}
                  required
                  disabled={loadingEmpresas}
                  style={{ ...inputStyle, cursor: loadingEmpresas ? 'wait' : 'pointer' }}
                >
                  <option value="">{loadingEmpresas ? 'Cargando empresas…' : 'Seleccionar empresa'}</option>
                  {empresas.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}{c.plan_name ? ` — Plan ${c.plan_name}` : ''}
                    </option>
                  ))}
                </select>
                {!loadingEmpresas && empresas.length === 0 && (
                  <div style={{ fontSize: 12, color: '#888780', marginTop: 5 }}>
                    No hay empresas activas. Crea una empresa primero.
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* Estado — solo en edición */}
          {esEdicion && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Estado">
                <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </Field>
            </div>
          )}

          {/* Nota informativa */}
          {!esEdicion && (
            <div style={{ background: '#f8f7f4', border: '1px solid #e2e0d8', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#888780', lineHeight: 1.5 }}>
              Se generará una contraseña temporal y se enviará al correo del usuario.<br />
              El usuario deberá cambiarla en su primer ingreso. Expira en 48 horas.
            </div>
          )}

          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: 13, color: '#791F1F' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#444441', fontWeight: 500 }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !puedeGuardar}
              style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: puedeGuardar ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: (!puedeGuardar || loading) ? 0.5 : 1 }}>
              {loading ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Crear usuario')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </FixedPortal>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#2C2C2A', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
