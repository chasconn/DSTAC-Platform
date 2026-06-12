'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'

const TIPOS   = ['usuario', 'cuenta_servicio', 'api_key', 'certificado', 'grupo', 'otro']
const ESTADOS = ['activa', 'inactiva', 'comprometida', 'expirada', 'pendiente']

const TIPO_LABEL   = { usuario: 'Usuario', cuenta_servicio: 'Cuenta de servicio', api_key: 'API Key', certificado: 'Certificado', grupo: 'Grupo', otro: 'Otro' }
const ESTADO_LABEL = { activa: 'Activa', inactiva: 'Inactiva', comprometida: 'Comprometida', expirada: 'Expirada', pendiente: 'Pendiente' }

// Placeholder del valor según el tipo seleccionado
const VALOR_PLACEHOLDER = {
  usuario:         'jperez@empresa.com',
  cuenta_servicio: 'svc-deploy',
  api_key:         'pk_live_...',
  certificado:     '*.empresa.com',
  grupo:           'GRP-ADMIN',
  otro:            'Valor de la identidad',
}

const EMPTY = {
  nombre: '', identidad: '', tipo_identidad: 'usuario', origen: '',
  estado: 'activa', propietario_id: '', fecha_creacion: '',
  fecha_revision: '', fecha_expiracion: '', notas: '',
}

export default function IdentidadModal({ identidad, empresaSlug, onClose, onSave }) {
  const esEdicion = !!identidad
  const [form, setForm]       = useState(EMPTY)
  const [personal, setPersonal] = useState([])
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  // Cargar personal activo para el select de propietario
  useEffect(() => {
    if (!empresaSlug) return
    api.get('/api/admin/personal?estado=activo&limit=200', { 'X-Company-Slug': empresaSlug })
      .then(data => setPersonal(data.personal ?? []))
      .catch(() => setPersonal([]))
  }, [empresaSlug])

  useEffect(() => {
    if (identidad) {
      setForm({
        nombre:          identidad.nombre           ?? '',
        identidad:       identidad.identidad        ?? '',
        tipo_identidad:  identidad.tipo_identidad   ?? 'usuario',
        origen:          identidad.origen           ?? '',
        estado:          identidad.estado           ?? 'activa',
        propietario_id:  identidad.propietario_id   ?? '',
        fecha_creacion:  identidad.fecha_creacion   ? identidad.fecha_creacion.slice(0, 10)   : '',
        fecha_revision:  identidad.fecha_revision   ? identidad.fecha_revision.slice(0, 10)   : '',
        fecha_expiracion:identidad.fecha_expiracion ? identidad.fecha_expiracion.slice(0, 10) : '',
        notas:           identidad.notas            ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    setError('')
  }, [identidad])

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim())    { setError('El nombre es requerido'); return }
    if (!form.identidad.trim()) { setError('El valor de la identidad es requerido'); return }

    setSaving(true)
    try {
      const headers = { 'X-Company-Slug': empresaSlug }
      const body = {
        ...form,
        propietario_id:   form.propietario_id   || null,
        origen:           form.origen           || null,
        fecha_creacion:   form.fecha_creacion   || null,
        fecha_revision:   form.fecha_revision   || null,
        fecha_expiracion: form.fecha_expiracion || null,
        notas:            form.notas            || null,
      }
      if (esEdicion) {
        await api.put(`/api/admin/identidades/${identidad.id}`, body, headers)
      } else {
        await api.post('/api/admin/identidades', body, headers)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>
            {esEdicion ? 'Editar identidad' : 'Nueva identidad'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888780' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          {/* Fila 1: Nombre | Tipo */}
          <div style={grid2}>
            <Field label="Nombre descriptivo *">
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={input} placeholder="Ej: Juan Pérez AD" required />
            </Field>
            <Field label="Tipo de identidad *">
              <select value={form.tipo_identidad} onChange={e => set('tipo_identidad', e.target.value)} style={input}>
                {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </Field>
          </div>

          {/* Valor de la identidad — monospace, ancho completo */}
          <Field label="Valor de la identidad *">
            <input
              value={form.identidad}
              onChange={e => set('identidad', e.target.value)}
              style={{ ...input, fontFamily: 'monospace', fontSize: 13 }}
              placeholder={VALOR_PLACEHOLDER[form.tipo_identidad] ?? 'Valor de la identidad'}
              required
            />
          </Field>

          {/* Fila 2: Origen | Estado */}
          <div style={grid2}>
            <Field label="Origen">
              <input value={form.origen} onChange={e => set('origen', e.target.value)} style={input} placeholder="Active Directory, Google, Local…" />
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={e => set('estado', e.target.value)} style={input}>
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
            </Field>
          </div>

          {/* Propietario */}
          <Field label="Propietario">
            <select value={form.propietario_id} onChange={e => set('propietario_id', e.target.value)} style={input}>
              <option value="">Sin propietario</option>
              {personal.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.rol_empresarial ? ` — ${p.rol_empresarial}` : ''}
                </option>
              ))}
            </select>
          </Field>

          {/* Fila 3: Fechas (3 columnas) */}
          <div style={grid3}>
            <Field label="Fecha creación">
              <input type="date" value={form.fecha_creacion} onChange={e => set('fecha_creacion', e.target.value)} style={input} />
            </Field>
            <Field label="Fecha revisión">
              <input type="date" value={form.fecha_revision} onChange={e => set('fecha_revision', e.target.value)} style={input} />
            </Field>
            <Field label="Fecha expiración">
              <input type="date" value={form.fecha_expiracion} onChange={e => set('fecha_expiracion', e.target.value)} style={input} />
            </Field>
          </div>

          {/* Notas */}
          <Field label="Notas">
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
              style={{ ...input, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
              placeholder="Observaciones adicionales…" />
          </Field>

          {/* Nota informativa */}
          <div style={{ background: '#f8f7f4', border: '1px solid #e2e0d8', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#888780', lineHeight: 1.5 }}>
            El <strong style={{ color: '#2C2C2A' }}>valor de la identidad</strong> es la cuenta real (email, username, API key, etc.).
            Asegúrate de que sea exacto para poder relacionarla correctamente con los accesos.
          </div>

          {error && <p style={{ fontSize: 12, color: '#E24B4A', margin: '0 0 12px' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={btnSec}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...btnPri, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear identidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }
const input = { width: '100%', height: 36, padding: '0 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 13, color: '#2C2C2A', outline: 'none', background: '#fff', boxSizing: 'border-box' }
const btnPri = { padding: '9px 20px', background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSec = { padding: '9px 20px', background: '#fff', color: '#2C2C2A', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
