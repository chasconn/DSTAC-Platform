'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../../lib/api'
import { StatusBadge, PlanBadge, getInitials } from './badges'

const THEMES = [
  { id: 'purple', color: '#534AB7', light: '#EEEDFE', text: '#3C3489' },
  { id: 'blue',   color: '#185FA5', light: '#E6F1FB', text: '#0C447C' },
  { id: 'green',  color: '#0F6E56', light: '#E1F5EE', text: '#085041' },
  { id: 'amber',  color: '#854F0B', light: '#FAEEDA', text: '#633806' },
  { id: 'pink',   color: '#993556', light: '#FBEAF0', text: '#72243E' },
  { id: 'gray',   color: '#5F5E5A', light: '#F1EFE8', text: '#444441' },
]

const PLANES  = [{ value: 1, label: 'PYME' }, { value: 2, label: 'Profesional' }, { value: 3, label: 'Enterprise' }]
const ESTADOS = [{ value: 'active', label: 'Activo' }, { value: 'setup', label: 'Setup' }, { value: 'suspended', label: 'Suspendido' }]
export default function ClienteDetailPanel({ empresa, onClose, onUpdated, onSuspender }) {
  const router = useRouter()
  const [tab, setTab]       = useState('info')
  const [stats, setStats]   = useState(null)
  const [nist, setNist]     = useState(null)
  const [editForm, setEditForm]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  function handleOperar() {
    localStorage.setItem('empresa_activa', JSON.stringify({
      id:   empresa.id,
      name: empresa.name,
      slug: empresa.slug,
      plan: empresa.plan_display ?? empresa.plan_name ?? empresa.plan ?? null,
    }))
    window.dispatchEvent(new Event('empresa_activa_changed'))
    router.push('/admin/activos')
  }

  // Cargar stats y detalle al abrir
  useEffect(() => {
    setTab('info')
    setStats(null)
    setNist(null)
    setError('')
    fetchStats()
    initEditForm()
  }, [empresa.slug])

  async function fetchStats() {
    try {
      const data = await api.get(`/api/companies/${empresa.slug}/stats`)
      setStats(data)
    } catch { /* stats opcionales — no bloquear el panel */ }
  }

  async function fetchNist() {
    if (nist) return
    try {
      const data = await api.get('/api/admin/nist/stats', { 'X-Company-Slug': empresa.slug })
      setNist(data)
    } catch { setNist({ functions: [] }) }
  }

  function abrirNist() {
    localStorage.setItem('empresa_activa', JSON.stringify({
      id: empresa.id, name: empresa.name, slug: empresa.slug,
    }))
    window.dispatchEvent(new Event('empresa_activa_changed'))
    router.push('/admin/nist')
  }

  function initEditForm() {
    setEditForm({
      name:          empresa.name          || '',
      rut:             empresa.rut             || '',
      contacto_nombre: empresa.contacto_nombre || '',
      billing_email: empresa.billing_email || '',
      contact_phone: empresa.contact_phone || '',
      plan_id:       empresa.plan_id       || 1,
      status:        empresa.status        || 'active',
      max_users:     empresa.max_users     || 5,
      theme:         THEMES.find(t => t.color === empresa.theme_color) || THEMES[0],
    })
  }

  function handleTabChange(t) {
    setTab(t)
    if (t === 'nist') fetchNist()
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.put(`/api/companies/${empresa.slug}`, {
        name:          editForm.name,
        rut:             editForm.rut || undefined,
        contacto_nombre: editForm.contacto_nombre || undefined,
        billing_email: editForm.billing_email || undefined,
        contact_phone: editForm.contact_phone || undefined,
        plan_id:       editForm.plan_id,
        max_users:     editForm.max_users,
        theme_color:   editForm.theme.color,
        theme_light:   editForm.theme.light,
        theme_mid:     editForm.theme.color,
      })
      onUpdated({ ...empresa, ...editForm, theme_color: editForm.theme.color, theme_light: editForm.theme.light })
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const fecha = empresa.created_at
    ? new Date(empresa.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div style={{
      width: 296, minWidth: 296, background: '#fff',
      borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      animation: 'slideIn 0.2s ease',
    }}>

      {/* Header del panel */}
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: empresa.theme_color || '#3C3489',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 700,
            }}>
              {getInitials(empresa.name)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.2 }}>{empresa.name}</div>
              <div style={{ fontSize: 11, color: '#888780' }}>{empresa.slug}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: 2 }}>×</button>
        </div>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[['info', 'Info'], ['edit', 'Editar'], ['nist', 'NIST']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === key ? '#3C3489' : '#888780',
                borderBottom: `2px solid ${tab === key ? '#3C3489' : 'transparent'}`,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ── PESTAÑA INFO ── */}
        {tab === 'info' && (
          <>
            {/* Stats grid 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Score',      value: stats?.score      ?? '—', color: '#3C3489' },
                { label: 'Incidentes', value: stats?.incidentes ?? '—', color: stats?.incidentes > 0 ? '#E24B4A' : '#2C2C2A' },
                { label: 'Activos',    value: stats?.activos    ?? '—', color: '#2C2C2A' },
                { label: 'Usuarios',   value: stats?.usuarios   ?? '—', color: '#2C2C2A' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Información */}
            <Section title="Información">
              <InfoRow label="Plan"    value={<PlanBadge plan={empresa.plan_name} />} />
              <InfoRow label="Estado"  value={<StatusBadge status={empresa.status} />} />
              <InfoRow label="Creado"  value={fecha} />
              <InfoRow label="RUT"      value={empresa.rut || '—'} />
              <InfoRow label="Contacto" value={empresa.contacto_nombre || '—'} />
              <InfoRow label="Email"   value={empresa.billing_email || '—'} />
              <InfoRow label="Teléfono" value={empresa.contact_phone || '—'} />
              <InfoRow label="Máx. usuarios" value={empresa.max_users} />
            </Section>

            {/* BD operacional */}
            <Section title="BD operacional">
              <code style={{ fontSize: 11, color: '#3C3489', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {`db_dstac_op_${empresa.slug?.replace(/-/g, '_')}`}
              </code>
            </Section>

            {/* Tema */}
            <Section title="Tema del portal">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {THEMES.map(t => (
                  <div
                    key={t.id}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', background: t.color,
                      outline: empresa.theme_color === t.color ? `3px solid ${t.color}` : '3px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── PESTAÑA EDITAR ── */}
        {tab === 'edit' && editForm && (
          <form onSubmit={handleSaveEdit}>
            <EditField label="Nombre">
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputSm} required />
            </EditField>
            <EditField label="RUT">
              <input value={editForm.rut} onChange={e => setEditForm(f => ({ ...f, rut: e.target.value }))} placeholder="76.543.210-9" style={inputSm} />
            </EditField>
            <EditField label="Persona de contacto">
              <input value={editForm.contacto_nombre} onChange={e => setEditForm(f => ({ ...f, contacto_nombre: e.target.value }))} placeholder="Nombre y cargo" style={inputSm} />
            </EditField>
            <EditField label="Email de facturación">
              <input type="email" value={editForm.billing_email} onChange={e => setEditForm(f => ({ ...f, billing_email: e.target.value }))} style={inputSm} />
            </EditField>
            <EditField label="Teléfono">
              <input value={editForm.contact_phone} onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))} style={inputSm} />
            </EditField>
            <EditField label="Plan">
              <select value={editForm.plan_id} onChange={e => setEditForm(f => ({ ...f, plan_id: parseInt(e.target.value) }))} style={inputSm}>
                {PLANES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </EditField>
            <EditField label="Estado">
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} style={inputSm}>
                {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </EditField>
            <EditField label="Máx. usuarios">
              <input type="number" min={1} value={editForm.max_users} onChange={e => setEditForm(f => ({ ...f, max_users: parseInt(e.target.value) || 1 }))} style={{ ...inputSm, width: 80 }} />
            </EditField>
            <EditField label="Tema">
              <div style={{ display: 'flex', gap: 6 }}>
                {THEMES.map(t => (
                  <button key={t.id} type="button" onClick={() => setEditForm(f => ({ ...f, theme: t }))}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: t.color, border: 'none', cursor: 'pointer', outline: editForm.theme.id === t.id ? `3px solid ${t.color}` : '3px solid transparent', outlineOffset: 2 }} />
                ))}
              </div>
            </EditField>

            {error && <div style={{ fontSize: 12, color: '#E24B4A', marginBottom: 10 }}>{error}</div>}

            <button type="submit" disabled={saving}
              style={{ width: '100%', padding: '9px 0', background: saving ? '#AFA9EC' : '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving && <Spinner />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        )}

        {/* ── PESTAÑA NIST ── */}
        {tab === 'nist' && (
          <div>
            {!nist && (
              <div style={{ fontSize: 13, color: '#888780', textAlign: 'center', padding: 20 }}>Cargando...</div>
            )}
            {nist && (
              <>
                {/* Score total */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#3C3489', lineHeight: 1 }}>
                    {Math.round(Number(nist.score_total) || 0)}
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#888780' }}>%</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>Madurez NIST CSF</div>
                </div>

                {/* Barras por función */}
                {(nist.functions ?? []).map(fn => {
                  const score = Math.round(Number(fn.score) || 0)
                  const color = fn.color ?? '#3C3489'
                  return (
                    <div key={fn.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A' }}>{fn.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}%</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e0d8', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: '#27500A' }}>✓ {fn.implementados ?? 0}</span>
                        <span style={{ fontSize: 10, color: '#EF9F27' }}>◐ {fn.parciales ?? 0}</span>
                        <span style={{ fontSize: 10, color: '#E24B4A' }}>○ {fn.pendientes ?? 0}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Sin evaluación */}
                {(nist.functions ?? []).length === 0 && (
                  <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '16px 0' }}>
                    Sin evaluación activa
                  </div>
                )}

                {/* Botón abrir módulo */}
                <button
                  onClick={abrirNist}
                  style={{ width: '100%', marginTop: 16, padding: '9px 0', background: '#EEEDFE', color: '#3C3489', border: '1px solid #AFA9EC', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Abrir módulo NIST →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Acciones fijas en el fondo */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={handleOperar}
          disabled={empresa.status !== 'active'}
          title={empresa.status !== 'active' ? 'La empresa debe estar activa' : `Operar como ${empresa.name}`}
          style={{ padding: '8px 0', background: empresa.status === 'active' ? '#534AB7' : '#f1efe8', color: empresa.status === 'active' ? '#fff' : '#B4B2A9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: empresa.status === 'active' ? 'pointer' : 'not-allowed' }}
        >
          Operar como empresa
        </button>
        {empresa.status !== 'suspended' ? (
          <button
            onClick={() => onSuspender(empresa)}
            style={{ padding: '8px 0', background: '#fff', color: '#EF9F27', border: '1px solid #EF9F27', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Suspender acceso
          </button>
        ) : (
          <button
            onClick={() => onSuspender(empresa)}
            style={{ padding: '8px 0', background: '#fff', color: '#639922', border: '1px solid #639922', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Reactivar acceso
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.8, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 12, color: '#888780' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#2C2C2A', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function EditField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#2C2C2A', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

const inputSm = {
  width: '100%', height: 32, padding: '0 8px',
  border: '1px solid #e2e0d8', borderRadius: 6,
  fontSize: 12, color: '#2C2C2A', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}
