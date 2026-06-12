'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'

const INP = { width: '100%', padding: '8px 10px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, color: '#2C2C2A', outline: 'none', boxSizing: 'border-box', background: '#fff' }

export default function TareaModal({ tarea, empresaActiva, onClose, onSaved }) {
  const esEdicion = !!tarea

  const [form, setForm] = useState({
    company_id:      String(tarea?.company_id ?? empresaActiva?.id ?? ''),
    title:           tarea?.title           ?? '',
    description:     tarea?.description     ?? '',
    priority:        tarea?.priority        ?? 'medium',
    status:          tarea?.status          ?? 'pending',
    due_date:        tarea?.due_date ? tarea.due_date.split('T')[0] : '',
    assigned_to:     String(tarea?.assigned_to ?? ''),
    personal_nombre: tarea?.personal_nombre ?? '',
  })

  const [empresas,  setEmpresas]  = useState([])   // { id, name, slug, is_internal }
  const [analistas, setAnalistas] = useState([])
  const [personal,  setPersonal]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // Carga inicial: empresas + analistas
  useEffect(() => {
    Promise.all([
      api.get('/api/admin/empresas/selector').catch(() => ({ internas: [], clientes: [] })),
      api.get('/api/admin/usuarios?role=analista_dstac&limit=50').catch(() => ({ usuarios: [] })),
    ]).then(([e, u]) => {
      const todas = [...(e.internas ?? []), ...(e.clientes ?? [])]
      setEmpresas(todas)
      setAnalistas(u.usuarios ?? [])
    })
  }, [])

  // Carga personal cuando cambia la empresa seleccionada
  useEffect(() => {
    if (!form.company_id) { setPersonal([]); return }
    const emp = empresas.find(e => String(e.id) === form.company_id)
    if (!emp?.slug) { setPersonal([]); return }

    api.get('/api/admin/personal?limit=200&estado=activo', { 'X-Company-Slug': emp.slug })
      .then(d => setPersonal(d.personal ?? []))
      .catch(() => setPersonal([]))
  }, [form.company_id, empresas])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const payload = {
      company_id:  Number(form.company_id),
      title:       form.title,
      description: form.description || undefined,
      priority:    form.priority,
      status:      form.status,
      due_date:    form.due_date    || undefined,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
    }
    try {
      if (esEdicion) {
        await api.put(`/api/pending/${tarea.id}`, payload)
      } else {
        await api.post('/api/pending', payload)
      }
      onSaved()
    } catch (err) { setError(err.message || 'Error al guardar') }
    finally { setLoading(false) }
  }

  // Separar empresas internas y clientes para optgroup
  const internas = empresas.filter(e => e.is_internal)
  const clientes = empresas.filter(e => !e.is_internal)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>
            {esEdicion ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          {/* Empresa */}
          <F label="Empresa *">
            <select value={form.company_id} onChange={e => { set('company_id', e.target.value); set('personal_nombre', '') }} required style={{ ...INP, cursor: 'pointer' }}>
              <option value="">Seleccionar empresa</option>
              {internas.length > 0 && (
                <optgroup label="DSTAC (interno)">
                  {internas.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </optgroup>
              )}
              {clientes.length > 0 && (
                <optgroup label="Clientes">
                  {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
          </F>

          {/* Personal de la empresa */}
          <F label={`Personal involucrado${personal.length > 0 ? ` (${personal.length} disponibles)` : ''}`}>
            {personal.length > 0 ? (
              <select
                value={form.personal_nombre}
                onChange={e => set('personal_nombre', e.target.value)}
                style={{ ...INP, cursor: 'pointer' }}
              >
                <option value="">Sin especificar</option>
                {personal.map(p => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}{p.rol_empresarial ? ` — ${p.rol_empresarial}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.personal_nombre}
                onChange={e => set('personal_nombre', e.target.value)}
                style={INP}
                placeholder={form.company_id ? 'Sin personal registrado — escribe un nombre' : 'Selecciona una empresa primero'}
                disabled={!form.company_id}
              />
            )}
          </F>

          {/* Título */}
          <F label="Título *">
            <input value={form.title} onChange={e => set('title', e.target.value)} required style={INP} placeholder="Ej: Revisar accesos de usuario desvinculado" />
          </F>

          {/* Descripción */}
          <F label="Descripción">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Detalles opcionales…" />
          </F>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <F label="Prioridad *">
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </F>
            <F label="Estado">
              <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En progreso</option>
                <option value="done">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </F>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <F label="Fecha límite">
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={INP} />
            </F>
            <F label="Analista asignado">
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
                <option value="">Sin asignar</option>
                {analistas.map(u => (
                  <option key={u.id} value={String(u.id)}>
                    {u.first_name} {u.last_name || ''}
                  </option>
                ))}
              </select>
            </F>
          </div>

          {error && <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: 13, color: '#791F1F' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#444441', fontWeight: 500 }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.company_id || !form.title}
              style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: (loading || !form.company_id || !form.title) ? 0.5 : 1 }}>
              {loading ? 'Guardando…' : (esEdicion ? 'Guardar' : 'Crear tarea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function F({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#2C2C2A', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
