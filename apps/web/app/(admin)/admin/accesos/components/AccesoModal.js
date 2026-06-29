'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'
import FixedPortal from '../../../../../components/admin/FixedPortal'

const NIVELES  = ['lectura', 'escritura', 'administrador', 'root', 'otro']
const ESTADOS  = ['activo', 'inactivo', 'suspendido', 'pendiente_revision']
const ENTORNOS = ['produccion', 'desarrollo', 'testing', 'staging', 'otro']
const CRITS    = ['critica', 'alta', 'media', 'baja']

const NIVEL_LABEL   = { lectura: 'Lectura', escritura: 'Escritura', administrador: 'Administrador', root: 'Root', otro: 'Otro' }
const ESTADO_LABEL  = { activo: 'Activo', inactivo: 'Inactivo', suspendido: 'Suspendido', pendiente_revision: 'Pendiente revisión' }
const ENTORNO_LABEL = { produccion: 'Producción', desarrollo: 'Desarrollo', testing: 'Testing', staging: 'Staging', otro: 'Otro' }
const CRIT_LABEL    = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }

const EMPTY = {
  identidad_id: '', activo_id: '', nivel_acceso: 'lectura', criticidad: '', entorno: '',
  estado: 'activo', fecha_otorgamiento: '', fecha_expiracion: '', quien_autorizo: '', justificacion: '',
}

export default function AccesoModal({ acceso, empresaSlug, onClose, onSave }) {
  const esEdicion = !!acceso
  const [form, setForm]               = useState(EMPTY)
  const [identidades, setIdentidades] = useState([])
  const [activos, setActivos]         = useState([])
  const [searchId, setSearchId]       = useState('')
  const [searchAc, setSearchAc]       = useState('')
  const [error, setError]             = useState('')
  const [saving, setSaving]           = useState(false)

  // Cargar identidades activas y activos
  useEffect(() => {
    if (!empresaSlug) return
    api.get('/api/admin/identidades?estado=activa&limit=500', { 'X-Company-Slug': empresaSlug })
      .then(d => setIdentidades(d.identidades ?? []))
      .catch(() => setIdentidades([]))

    api.get('/api/admin/activos?limit=500', { 'X-Company-Slug': empresaSlug })
      .then(d => setActivos(d.activos ?? []))
      .catch(() => setActivos([]))
  }, [empresaSlug])

  // Rellenar form al editar
  useEffect(() => {
    if (acceso) {
      setForm({
        identidad_id:     String(acceso.identidad_id ?? acceso.identidad_id ?? ''),
        activo_id:        String(acceso.activo_id ?? ''),
        nivel_acceso:     acceso.nivel_acceso    ?? 'lectura',
        criticidad:       acceso.criticidad      ?? '',
        entorno:          acceso.entorno         ?? '',
        estado:           acceso.estado          ?? 'activo',
        fecha_otorgamiento: acceso.fecha_otorgamiento ? acceso.fecha_otorgamiento.slice(0, 10) : '',
        fecha_expiracion:   acceso.fecha_expiracion   ? acceso.fecha_expiracion.slice(0, 10)   : '',
        quien_autorizo:   acceso.quien_autorizo   ?? '',
        justificacion:    acceso.justificacion    ?? '',
      })
    }
  }, [acceso])

  // Auto-herencia de criticidad desde el activo seleccionado (solo al crear)
  useEffect(() => {
    if (esEdicion || !form.activo_id) return
    const activo = activos.find(a => String(a.id) === String(form.activo_id))
    if (activo?.criticidad) {
      setForm(prev => ({ ...prev, criticidad: activo.criticidad }))
    }
  }, [form.activo_id, activos, esEdicion])

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.identidad_id) return setError('Selecciona una identidad')
    if (!form.activo_id)    return setError('Selecciona un activo')
    if (!form.nivel_acceso) return setError('El nivel de acceso es requerido')

    setSaving(true); setError('')
    try {
      const body = {
        ...form,
        identidad_id: Number(form.identidad_id),
        activo_id:    Number(form.activo_id),
        criticidad:       form.criticidad       || null,
        entorno:          form.entorno          || null,
        fecha_otorgamiento: form.fecha_otorgamiento || null,
        fecha_expiracion:   form.fecha_expiracion   || null,
        quien_autorizo:   form.quien_autorizo   || null,
        justificacion:    form.justificacion    || null,
      }
      if (esEdicion) {
        await api.put(`/api/admin/accesos/${acceso.id}`, body, { 'X-Company-Slug': empresaSlug })
      } else {
        await api.post('/api/admin/accesos', body, { 'X-Company-Slug': empresaSlug })
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const idsFiltradas = identidades.filter(i => {
    const q = searchId.toLowerCase()
    return !q || i.nombre.toLowerCase().includes(q) || i.identidad.toLowerCase().includes(q)
  })
  const activosFiltrados = activos.filter(a => {
    const q = searchAc.toLowerCase()
    return !q || a.nombre.toLowerCase().includes(q) || (a.tipo ?? '').toLowerCase().includes(q)
  })

  return (
    <FixedPortal>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>
            {esEdicion ? 'Editar acceso' : 'Nuevo acceso'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Identidad */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Identidad *</label>
            <input type="text" placeholder="Buscar identidad…" value={searchId} onChange={e => setSearchId(e.target.value)}
              style={{ ...inputStyle, marginBottom: 4, fontSize: 12, background: '#fafaf8' }} />
            <select value={form.identidad_id} onChange={e => set('identidad_id', e.target.value)} required style={{ ...inputStyle, height: 90 }} size={4}>
              <option value="">— Seleccionar identidad —</option>
              {idsFiltradas.map(i => (
                <option key={i.id} value={i.id}>{i.nombre} ({i.identidad})</option>
              ))}
            </select>
          </div>

          {/* Activo */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Activo *</label>
            <input type="text" placeholder="Buscar activo…" value={searchAc} onChange={e => setSearchAc(e.target.value)}
              style={{ ...inputStyle, marginBottom: 4, fontSize: 12, background: '#fafaf8' }} />
            <select value={form.activo_id} onChange={e => set('activo_id', e.target.value)} required style={{ ...inputStyle, height: 90 }} size={4}>
              <option value="">— Seleccionar activo —</option>
              {activosFiltrados.map(a => (
                <option key={a.id} value={a.id}>{a.nombre} ({a.tipo ?? 'activo'})</option>
              ))}
            </select>
          </div>

          {/* Nivel + Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nivel de acceso *</label>
              <select value={form.nivel_acceso} onChange={e => set('nivel_acceso', e.target.value)} required style={inputStyle}>
                {NIVELES.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)} style={inputStyle}>
                {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Criticidad + Entorno */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Criticidad {!esEdicion && form.activo_id && <span style={{ color: '#B4B2A9', fontSize: 10 }}>(heredada del activo)</span>}</label>
              <select value={form.criticidad} onChange={e => set('criticidad', e.target.value)} style={inputStyle}>
                <option value="">— Sin especificar —</option>
                {CRITS.map(c => <option key={c} value={c}>{CRIT_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Entorno</label>
              <select value={form.entorno} onChange={e => set('entorno', e.target.value)} style={inputStyle}>
                <option value="">— Sin especificar —</option>
                {ENTORNOS.map(en => <option key={en} value={en}>{ENTORNO_LABEL[en]}</option>)}
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Fecha otorgamiento</label>
              <input type="date" value={form.fecha_otorgamiento} onChange={e => set('fecha_otorgamiento', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fecha expiración</label>
              <input type="date" value={form.fecha_expiracion} onChange={e => set('fecha_expiracion', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Quien autorizó */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Autorizado por</label>
            <input type="text" value={form.quien_autorizo} onChange={e => set('quien_autorizo', e.target.value)}
              placeholder="Nombre o cargo" style={inputStyle} />
          </div>

          {/* Justificación */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Justificación</label>
            <textarea value={form.justificacion} onChange={e => set('justificacion', e.target.value)}
              placeholder="Razón del acceso…" rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {error && <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '8px 12px', borderRadius: 7, fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 22px', borderRadius: 7, border: 'none', background: '#3C3489', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear acceso'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </FixedPortal>
  )
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 5 }
const inputStyle  = { width: '100%', padding: '8px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 13, color: '#2C2C2A', outline: 'none', background: '#fff', boxSizing: 'border-box' }
