'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'

const TIPOS       = ['Servidor', 'Base de datos', 'Red', 'Aplicación', 'Nube', 'Endpoint', 'Otro']
const CRITICIDADES = [
  { value: 'critica', label: 'Crítica' },
  { value: 'alta',    label: 'Alta' },
  { value: 'media',   label: 'Media' },
  { value: 'baja',    label: 'Baja' },
]
const ESTADOS = [
  { value: 'operativo',         label: 'Operativo' },
  { value: 'degradado',         label: 'Degradado' },
  { value: 'fuera_de_servicio', label: 'Fuera de servicio' },
  { value: 'en_mantencion',     label: 'En mantención' },
]
const AMBIENTES = [
  { value: 'produccion', label: 'Producción' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'testing',    label: 'Testing' },
  { value: 'staging',    label: 'Staging' },
]

function camposIniciales(activo) {
  const meta = activo?.metadata && typeof activo.metadata === 'object' ? activo.metadata : {}
  return {
    nombre:            activo?.nombre            ?? '',
    tipo:              activo?.tipo              ?? '',
    criticidad:        activo?.criticidad        ?? '',
    estado:            activo?.estado            ?? 'operativo',
    ambiente:          activo?.ambiente          ?? '',
    proveedor:         activo?.proveedor         ?? '',
    responsable_id:    activo?.responsable_id    ?? '',
    proyecto:          activo?.proyecto          ?? '',
    documentacion:     activo?.documentacion     ?? '',
    ip:                activo?.ip               ?? meta.ip               ?? '',
    sistema_operativo: activo?.sistema_operativo ?? meta.sistema_operativo ?? '',
    version:           activo?.version           ?? meta.version           ?? '',
  }
}

export default function ActivoModal({ activo, empresaSlug, onClose, onSave }) {
  const esEdicion = !!activo
  const [form, setForm]       = useState(() => camposIniciales(activo))
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const headers = empresaSlug ? { 'X-Company-Slug': empresaSlug } : {}

  // Cargar personal de la empresa para el select de responsable
  useEffect(() => {
    if (!empresaSlug) return
    api.get('/api/admin/personal', headers)
      .then(data => setPersonal(Array.isArray(data) ? data : (data.personal ?? [])))
      .catch(() => {})
  }, [empresaSlug])

  // Cerrar con Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim()) return setError('El nombre es requerido')
    if (!form.tipo)           return setError('El tipo es requerido')
    if (!form.criticidad)     return setError('La criticidad es requerida')

    setLoading(true)
    try {
      const body = {
        ...form,
        nombre:         form.nombre.trim(),
        proveedor:      form.proveedor      || undefined,
        ambiente:       form.ambiente       || undefined,
        responsable_id: form.responsable_id || undefined,
        proyecto:       form.proyecto       || undefined,
        documentacion:  form.documentacion  || undefined,
        ip:             form.ip             || undefined,
        sistema_operativo: form.sistema_operativo || undefined,
        version:        form.version        || undefined,
      }

      if (esEdicion) {
        await api.put(`/api/admin/activos/${activo.id}`, body, headers)
      } else {
        await api.post('/api/admin/activos', body, headers)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Error al guardar el activo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 14,
        width: '100%', maxWidth: 500,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #e2e0d8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>
              {esEdicion ? 'Editar activo' : 'Nuevo activo'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888780' }}>
              {esEdicion ? `Editando: ${activo.nombre}` : 'Agrega un nuevo activo al inventario'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20, lineHeight: 1, padding: 4 }}
          >×</button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          {/* Fila 1: Nombre | Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Nombre del activo *">
              <input
                autoFocus
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Servidor web principal"
                style={INPUT}
              />
            </Field>
            <Field label="Tipo *">
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={INPUT}>
                <option value="">Seleccionar…</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          {/* Fila 2: Criticidad | Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Criticidad *">
              <select value={form.criticidad} onChange={e => set('criticidad', e.target.value)} style={INPUT}>
                <option value="">Seleccionar…</option>
                {CRITICIDADES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Estado *">
              <select value={form.estado} onChange={e => set('estado', e.target.value)} style={INPUT}>
                {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Fila 3: Ambiente | Proveedor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Ambiente">
              <select value={form.ambiente} onChange={e => set('ambiente', e.target.value)} style={INPUT}>
                <option value="">Sin especificar</option>
                {AMBIENTES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="Proveedor">
              <input
                value={form.proveedor}
                onChange={e => set('proveedor', e.target.value)}
                placeholder="Ej: AWS, Dell, Microsoft"
                style={INPUT}
              />
            </Field>
          </div>

          {/* Responsable */}
          <div style={{ marginBottom: 14 }}>
            <Field label="Responsable">
              <select value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)} style={INPUT}>
                <option value="">Sin asignar</option>
                {personal.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Proyecto */}
          <div style={{ marginBottom: 14 }}>
            <Field label="Proyecto">
              <input
                value={form.proyecto}
                onChange={e => set('proyecto', e.target.value)}
                placeholder="Ej: Migración cloud 2025"
                style={INPUT}
              />
            </Field>
          </div>

          {/* Separador campos técnicos */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 14,
          }}>
            <div style={{ flex: 1, height: 1, background: '#e2e0d8' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#888780', whiteSpace: 'nowrap' }}>
              Campos técnicos (si aplica)
            </span>
            <div style={{ flex: 1, height: 1, background: '#e2e0d8' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Field label="IP">
              <input
                value={form.ip}
                onChange={e => set('ip', e.target.value)}
                placeholder="192.168.1.1"
                style={{ ...INPUT, fontFamily: 'monospace' }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Sistema operativo">
              <input
                value={form.sistema_operativo}
                onChange={e => set('sistema_operativo', e.target.value)}
                placeholder="Ubuntu 22.04"
                style={INPUT}
              />
            </Field>
            <Field label="Versión">
              <input
                value={form.version}
                onChange={e => set('version', e.target.value)}
                placeholder="22.04.3 LTS"
                style={INPUT}
              />
            </Field>
          </div>

          <div style={{
            fontSize: 11, color: '#B4B2A9', marginBottom: 16,
            padding: '8px 10px', background: '#f8f7f4', borderRadius: 7,
          }}>
            Estos campos son opcionales. Complétalos solo si aplican al activo.
          </div>

          {/* Documentación */}
          <div style={{ marginBottom: 16 }}>
            <Field label="Documentación">
              <textarea
                rows={3}
                value={form.documentacion}
                onChange={e => set('documentacion', e.target.value)}
                placeholder="Notas técnicas, links, observaciones…"
                style={{ ...INPUT, height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.5 }}
              />
            </Field>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px', background: '#FCEBEB', borderRadius: 8,
              marginBottom: 14, fontSize: 13, color: '#791F1F',
            }}>
              {error}
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', border: '1px solid #e2e0d8',
                background: '#fff', borderRadius: 8,
                fontSize: 13, cursor: 'pointer', color: '#2C2C2A',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px',
                background: loading ? '#AFA9EC' : '#534AB7',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {loading && <Spinner />}
              {loading ? 'Guardando…' : 'Guardar activo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: '#2C2C2A', marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  )
}

const INPUT = {
  width: '100%', height: 36, padding: '0 10px',
  border: '1px solid #e2e0d8', borderRadius: 8,
  fontSize: 13, color: '#2C2C2A', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}
