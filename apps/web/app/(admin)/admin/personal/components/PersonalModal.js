'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'

const ESTADOS = ['activo', 'inactivo', 'vacaciones', 'desvinculado']
const NIVELES = ['alto', 'medio', 'bajo']

const ESTADO_LABEL = { activo: 'Activo', inactivo: 'Inactivo', vacaciones: 'Vacaciones', desvinculado: 'Desvinculado' }
const NIVEL_LABEL  = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

const EMPTY = {
  nombre: '', rol_empresarial: '', nivel_responsabilidad: '',
  estado: 'activo', fecha_ingreso: '', correo: '', telefono: '',
}

export default function PersonalModal({ persona, empresaSlug, empresaNombre, onClose, onSave }) {
  const esEdicion = !!persona
  const [form, setForm]     = useState(EMPTY)
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (persona) {
      setForm({
        nombre:               persona.nombre               ?? '',
        rol_empresarial:      persona.rol_empresarial      ?? '',
        nivel_responsabilidad:persona.nivel_responsabilidad ?? '',
        estado:               persona.estado               ?? 'activo',
        fecha_ingreso:        persona.fecha_ingreso        ? persona.fecha_ingreso.slice(0, 10) : '',
        correo:               persona.correo               ?? '',
        telefono:             persona.telefono             ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    setError('')
  }, [persona])

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }

    setSaving(true)
    try {
      const headers = { 'X-Company-Slug': empresaSlug }
      const body = {
        ...form,
        fecha_ingreso:        form.fecha_ingreso        || null,
        nivel_responsabilidad:form.nivel_responsabilidad || null,
        rol_empresarial:      form.rol_empresarial       || null,
        correo:               form.correo                || null,
        telefono:             form.telefono              || null,
      }

      if (esEdicion) {
        await api.put(`/api/admin/personal/${persona.id}`, body, headers)
      } else {
        await api.post('/api/admin/personal', body, headers)
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
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>
              {esEdicion ? 'Editar persona' : 'Nueva persona'}
            </h2>
            {empresaNombre && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888780' }}>{empresaNombre}</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888780' }}>×</button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          {/* Fila 1: Nombre | Rol */}
          <div style={grid2}>
            <Field label="Nombre completo *">
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} placeholder="Ej: María González" required />
            </Field>
            <Field label="Rol empresarial">
              <input value={form.rol_empresarial} onChange={e => set('rol_empresarial', e.target.value)} style={inputStyle} placeholder="Ej: Gerente TI" />
            </Field>
          </div>

          {/* Fila 2: Nivel | Estado */}
          <div style={grid2}>
            <Field label="Nivel de responsabilidad">
              <select value={form.nivel_responsabilidad} onChange={e => set('nivel_responsabilidad', e.target.value)} style={inputStyle}>
                <option value="">Sin especificar</option>
                {NIVELES.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={e => set('estado', e.target.value)} style={inputStyle}>
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
            </Field>
          </div>

          {/* Fila 3: Correo | Teléfono */}
          <div style={grid2}>
            <Field label="Correo electrónico">
              <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} style={inputStyle} placeholder="correo@empresa.cl" />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} style={inputStyle} placeholder="+56 9 1234 5678" />
            </Field>
          </div>

          {/* Fecha de ingreso */}
          <Field label="Fecha de ingreso">
            <input type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} style={{ ...inputStyle, maxWidth: 200 }} />
          </Field>

          {/* Nota informativa */}
          <div style={{ background: '#f8f7f4', border: '1px solid #e2e0d8', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#888780', lineHeight: 1.5 }}>
            Este registro representa a un trabajador de <strong style={{ color: '#2C2C2A' }}>{empresaNombre || 'la empresa'}</strong>.
            {' '}No tendrá acceso a la plataforma. Para dar acceso al portal, ir a{' '}
            <a href="/admin/usuarios" style={{ color: '#534AB7' }}>Usuarios → Nuevo usuario cliente</a>.
          </div>

          {error && <p style={{ fontSize: 12, color: '#E24B4A', margin: '0 0 12px' }}>{error}</p>}

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={btnSecundario}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...btnPrimario, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear persona'}
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

const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }
const inputStyle = { width: '100%', height: 36, padding: '0 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 13, color: '#2C2C2A', outline: 'none', background: '#fff', boxSizing: 'border-box' }
const btnPrimario   = { padding: '9px 20px', background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSecundario = { padding: '9px 20px', background: '#fff', color: '#2C2C2A', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
