'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'

const THEMES = [
  { id: 'purple', color: '#534AB7', light: '#EEEDFE', text: '#3C3489' },
  { id: 'blue',   color: '#185FA5', light: '#E6F1FB', text: '#0C447C' },
  { id: 'green',  color: '#0F6E56', light: '#E1F5EE', text: '#085041' },
  { id: 'amber',  color: '#854F0B', light: '#FAEEDA', text: '#633806' },
  { id: 'pink',   color: '#993556', light: '#FBEAF0', text: '#72243E' },
  { id: 'gray',   color: '#5F5E5A', light: '#F1EFE8', text: '#444441' },
]

const PLANES = [
  { value: 1, label: 'PYME' },
  { value: 2, label: 'Profesional' },
  { value: 3, label: 'Enterprise' },
]

function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function ClienteFormModal({ onClose, onCreated, initial }) {
  // `initial` permite pre-llenar el formulario (ej. al convertir un prospecto en cliente).
  const nombreInicial = initial?.name?.trim() || ''
  const [form, setForm] = useState({
    name:          nombreInicial,
    slug:          nombreInicial ? generarSlug(nombreInicial) : '',
    plan_id:       1,
    max_users:     5,
    rut:             initial?.rut || '',
    contacto_nombre: initial?.contacto_nombre || '',
    billing_email: initial?.billing_email || '',
    contact_phone: initial?.contact_phone || '',
    domicilio:                 initial?.domicilio || '',
    representante_legal:       initial?.representante_legal || '',
    representante_legal_rut:   initial?.representante_legal_rut || '',
    representante_legal_cargo: initial?.representante_legal_cargo || '',
    theme:         THEMES[0],
  })
  const [slugEditado, setSlugEditado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [buscandoRut, setBuscandoRut] = useState(false)
  const [rutInfo, setRutInfo] = useState('')

  const dbPreview = form.slug ? `db_dstac_op_${form.slug.replace(/-/g, '_')}` : '—'

  function handleNombre(val) {
    const next = { ...form, name: val }
    if (!slugEditado) next.slug = generarSlug(val)
    setForm(next)
  }

  function handleSlug(val) {
    // Solo permitir caracteres válidos mientras escribe
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, slug: clean }))
    setSlugEditado(true)
  }

  // Autocompleta razón social al salir del campo RUT, buscando en la copia
  // local (gratuita) del Registro de Empresas y Sociedades. Si no aparece, no
  // pasa nada: el formulario sigue permitiendo llenado manual como siempre.
  async function buscarPorRut() {
    const rut = form.rut.trim()
    if (!rut) { setRutInfo(''); return }
    setBuscandoRut(true); setRutInfo('')
    try {
      const reg = await api.get(`/api/companies/buscar-rut/${encodeURIComponent(rut)}`)
      if (reg.razon_social && !form.name.trim()) handleNombre(reg.razon_social)
      setRutInfo(`✓ ${reg.razon_social}${reg.comuna ? ` · ${reg.comuna}` : ''} (Registro de Empresas y Sociedades)`)
    } catch {
      setRutInfo('No encontrado en el registro gratuito — puedes completar los datos a mano.')
    } finally {
      setBuscandoRut(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim())  return setError('El nombre es requerido')
    if (!form.slug.trim())  return setError('El slug es requerido')
    if (!/^[a-z0-9-]+$/.test(form.slug)) return setError('Slug inválido: solo letras minúsculas, números y guiones')

    setLoading(true)
    try {
      const data = await api.post('/api/companies', {
        name:          form.name.trim(),
        slug:          form.slug.trim(),
        plan_id:       form.plan_id,
        max_users:     form.max_users,
        rut:             form.rut || undefined,
        contacto_nombre: form.contacto_nombre || undefined,
        billing_email: form.billing_email || undefined,
        contact_phone: form.contact_phone || undefined,
        domicilio:                 form.domicilio || undefined,
        representante_legal:       form.representante_legal || undefined,
        representante_legal_rut:   form.representante_legal_rut || undefined,
        representante_legal_cargo: form.representante_legal_cargo || undefined,
        theme_color:   form.theme.color,
        theme_light:   form.theme.light,
        theme_mid:     form.theme.color,
      })
      onCreated(data)
    } catch (err) {
      setError(err.message || 'Error al crear la empresa')
    } finally {
      setLoading(false)
    }
  }

  // Cerrar con Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e0d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>{initial ? 'Convertir prospecto en cliente' : 'Nueva empresa'}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888780' }}>{initial ? 'Revisa los datos y crea la empresa — el prospecto se marcará como convertido' : 'Se provisionará la BD operacional automáticamente'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          {/* Nombre */}
          <Field label="Nombre de la empresa *">
            <input
              autoFocus
              value={form.name}
              onChange={e => handleNombre(e.target.value)}
              placeholder="Ej: Acme Corporación"
              style={inputStyle}
            />
          </Field>

          {/* Slug */}
          <Field label="Slug *" hint="Identificador único, solo letras minúsculas, números y guiones">
            <input
              value={form.slug}
              onChange={e => handleSlug(e.target.value)}
              placeholder="ej: acme-corp"
              style={inputStyle}
            />
          </Field>

          {/* Preview BD */}
          <div style={{ marginBottom: 16, padding: '10px 12px', background: '#f8f7f4', borderRadius: 8, border: '1px solid #e2e0d8' }}>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 3 }}>Base de datos operacional</div>
            <code style={{ fontSize: 12, color: '#3C3489', fontFamily: 'monospace' }}>{dbPreview}</code>
          </div>

          {/* Plan */}
          <Field label="Plan">
            <select
              value={form.plan_id}
              onChange={e => setForm(f => ({ ...f, plan_id: parseInt(e.target.value) }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {PLANES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>

          {/* Máx. usuarios */}
          <Field label="Máx. usuarios">
            <input
              type="number"
              min={1}
              max={999}
              value={form.max_users}
              onChange={e => setForm(f => ({ ...f, max_users: parseInt(e.target.value) || 1 }))}
              style={{ ...inputStyle, width: 100 }}
            />
          </Field>

          {/* Email facturación */}
          <Field label="Email de facturación">
            <input
              type="email"
              value={form.billing_email}
              onChange={e => setForm(f => ({ ...f, billing_email: e.target.value }))}
              placeholder="facturacion@empresa.cl"
              style={inputStyle}
            />
          </Field>

          {/* Teléfono */}
          <Field label="Teléfono de contacto">
            <input
              type="tel"
              value={form.contact_phone}
              onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
              placeholder="+56 9 1234 5678"
              style={inputStyle}
            />
          </Field>

          {/* RUT */}
          <Field label="RUT de la empresa" hint="Al salir del campo, busca la razón social en el Registro de Empresas y Sociedades (gratuito)">
            <input
              value={form.rut}
              onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
              onBlur={buscarPorRut}
              placeholder="76.543.210-9"
              style={inputStyle}
            />
            {buscandoRut && <div style={{ fontSize: 11.5, color: '#888780', marginTop: 5 }}>Buscando…</div>}
            {!buscandoRut && rutInfo && (
              <div style={{ fontSize: 11.5, color: rutInfo.startsWith('✓') ? '#1D9E75' : '#888780', marginTop: 5 }}>{rutInfo}</div>
            )}
          </Field>

          {/* Contacto */}
          <Field label="Persona de contacto">
            <input
              value={form.contacto_nombre}
              onChange={e => setForm(f => ({ ...f, contacto_nombre: e.target.value }))}
              placeholder="Nombre y cargo"
              style={inputStyle}
            />
          </Field>

          {/* Datos legales para contratos */}
          <Field label="Domicilio" hint="Para contratos y autorizaciones de intervención">
            <input
              value={form.domicilio}
              onChange={e => setForm(f => ({ ...f, domicilio: e.target.value }))}
              placeholder="Av. Ejemplo 1234, of. 56, Antofagasta"
              style={inputStyle}
            />
          </Field>
          <Field label="Representante legal" hint="Nombre de quien tiene poder para firmar contratos por la empresa">
            <input
              value={form.representante_legal}
              onChange={e => setForm(f => ({ ...f, representante_legal: e.target.value }))}
              placeholder="Nombre completo"
              style={inputStyle}
            />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="RUT del representante">
                <input
                  value={form.representante_legal_rut}
                  onChange={e => setForm(f => ({ ...f, representante_legal_rut: e.target.value }))}
                  placeholder="12.345.678-9"
                  style={inputStyle}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Cargo">
                <input
                  value={form.representante_legal_cargo}
                  onChange={e => setForm(f => ({ ...f, representante_legal_cargo: e.target.value }))}
                  placeholder="Gerente General"
                  style={inputStyle}
                />
              </Field>
            </div>
          </div>

          {/* Tema del portal */}
          <Field label="Tema del portal cliente">
            <div style={{ display: 'flex', gap: 8 }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, theme: t }))}
                  title={t.id}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: t.color, border: 'none', cursor: 'pointer',
                    outline: form.theme.id === t.id ? `3px solid ${t.color}` : '3px solid transparent',
                    outlineOffset: 2, transition: 'outline 0.15s',
                  }}
                />
              ))}
            </div>
          </Field>

          {/* Nota informativa */}
          <div style={{ padding: '10px 12px', background: '#EEEDFE', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#3C3489' }}>
            Al crear la empresa se generará automáticamente la BD operacional con todas las tablas del sistema.
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '8px 12px', background: '#FCEBEB', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#791F1F' }}>
              {error}
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', border: '1px solid #e2e0d8', background: '#fff', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#2C2C2A' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '8px 18px', background: loading ? '#AFA9EC' : '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {loading && <Spinner />}
              {loading ? 'Creando...' : 'Crear empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 5 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#888780', marginLeft: 4 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

const inputStyle = {
  width: '100%', height: 36, padding: '0 10px',
  border: '1px solid #e2e0d8', borderRadius: 8,
  fontSize: 13, color: '#2C2C2A', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}
