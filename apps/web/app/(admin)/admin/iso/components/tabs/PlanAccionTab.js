'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../../lib/api'

const PRIORITY_STYLE = {
  critica: { color: '#E24B4A', bg: '#FCEBEB', label: 'Crítica' },
  alta:    { color: '#EF9F27', bg: '#FAEEDA', label: 'Alta'    },
  media:   { color: '#639922', bg: '#EAF3DE', label: 'Media'   },
  baja:    { color: '#B4B2A9', bg: '#F1EFE8', label: 'Baja'    },
}

const STATUS_STYLE = {
  pendiente:    { color: '#791F1F', bg: '#FCEBEB', label: 'Pendiente'   },
  en_progreso:  { color: '#633806', bg: '#FAEEDA', label: 'En progreso' },
  completada:   { color: '#27500A', bg: '#EAF3DE', label: 'Completada'  },
  cancelada:    { color: '#444441', bg: '#F1EFE8', label: 'Cancelada'   },
}

export default function PlanAccionTab({ domainId, slug }) {
  const [plan,      setPlan]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [generating,setGenerating]= useState(false)
  const [toast,     setToast]     = useState(null)
  const [editId,    setEditId]    = useState(null)
  const [editData,  setEditData]  = useState({})
  const [saving,    setSaving]    = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [controls,  setControls]  = useState([])
  const [newTask,   setNewTask]   = useState({ control_id: '', action: '', priority: 'media', responsible: '', due_date: '', evidence_needed: '', comment_dstac: '' })

  const headers = { 'X-Company-Slug': slug }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [pData, cData] = await Promise.all([
        apiFetch('/api/admin/iso/plan-accion', { headers }),
        apiFetch(`/api/admin/iso/controls?domain_id=${domainId}`, { headers }),
      ])
      setPlan((pData.plan ?? []).filter(t => t.domain_id === domainId))
      setControls(cData.controls ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, domainId])

  useEffect(() => { cargar() }, [cargar])

  async function generar() {
    setGenerating(true)
    try {
      const data = await apiFetch('/api/admin/iso/plan-accion/generar', {
        method:  'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })
      showToast(data.message ?? 'Listo')
      await cargar()
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function guardarEdicion(id) {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/iso/plan-accion/${id}`, {
        method:  'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify(editData),
      })
      showToast('Tarea actualizada')
      setEditId(null)
      await cargar()
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function crearTarea() {
    if (!newTask.control_id || !newTask.action.trim()) {
      showToast('Control y acción son requeridos', 'error')
      return
    }
    setSaving(true)
    try {
      await apiFetch('/api/admin/iso/plan-accion', {
        method:  'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify(newTask),
      })
      showToast('Tarea creada')
      setShowForm(false)
      setNewTask({ control_id: '', action: '', priority: 'media', responsible: '', due_date: '', evidence_needed: '', comment_dstac: '' })
      await cargar()
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando plan…</div>

  return (
    <div>
      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
        <button onClick={generar} disabled={generating}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#3C3489', cursor: generating ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: generating ? 0.6 : 1 }}>
          {generating ? 'Generando…' : '⚡ Auto-generar tareas'}
        </button>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          + Nueva tarea
        </button>
      </div>

      {/* Formulario nueva tarea */}
      {showForm && (
        <div style={{ background: '#EEEDFE', borderRadius: 12, border: '1px solid #c8c4f0', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3C3489', marginBottom: 12 }}>Nueva tarea</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Control *</label>
              <select value={newTask.control_id} onChange={e => setNewTask(p => ({...p, control_id: e.target.value}))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c8c4f0', fontSize: 12, background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                <option value="">— Seleccionar —</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Prioridad</label>
              <select value={newTask.priority} onChange={e => setNewTask(p => ({...p, priority: e.target.value}))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c8c4f0', fontSize: 12, background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Acción *</label>
              <input value={newTask.action} onChange={e => setNewTask(p => ({...p, action: e.target.value}))}
                placeholder="Descripción de la acción…"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c8c4f0', fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Responsable</label>
              <input value={newTask.responsible} onChange={e => setNewTask(p => ({...p, responsible: e.target.value}))}
                placeholder="Nombre o cargo…"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c8c4f0', fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Fecha límite</label>
              <input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({...p, due_date: e.target.value}))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c8c4f0', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)}
              style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #c8c4f0', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 12 }}>
              Cancelar
            </button>
            <button onClick={crearTarea} disabled={saving}
              style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: '#3C3489', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creando…' : 'Crear tarea'}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 12 }}>
          {toast.msg}
        </div>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.map(t => {
          const ps    = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.media
          const ss    = STATUS_STYLE[t.status] ?? STATUS_STYLE.pendiente
          const isEdit= editId === t.id
          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ background: ps.bg, color: ps.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{ps.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.action}</div>
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>
                    {t.control_name}
                    {t.responsible ? ` · ${t.responsible}` : ''}
                    {t.due_date    ? ` · Vence: ${new Date(t.due_date).toLocaleDateString('es-CL')}` : ''}
                  </div>
                </div>
                <span style={{ background: ss.bg, color: ss.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{ss.label}</span>
                <button onClick={() => { setEditId(isEdit ? null : t.id); setEditData({ status: t.status, responsible: t.responsible ?? '', due_date: t.due_date ? t.due_date.substring(0,10) : '', comment_dstac: t.comment_dstac ?? '' }) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 12, padding: '4px 6px' }}>
                  ✏️
                </button>
              </div>

              {isEdit && (
                <div style={{ borderTop: '1px solid #f1efe8', padding: '12px 16px', background: '#f8f7f4', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#888780', display: 'block', marginBottom: 3 }}>Estado</label>
                    <select value={editData.status} onChange={e => setEditData(p => ({...p, status: e.target.value}))}
                      style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e2e0d8', fontSize: 12, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="pendiente">Pendiente</option>
                      <option value="en_progreso">En progreso</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#888780', display: 'block', marginBottom: 3 }}>Responsable</label>
                    <input value={editData.responsible} onChange={e => setEditData(p => ({...p, responsible: e.target.value}))}
                      style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e2e0d8', fontSize: 12, width: 140, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#888780', display: 'block', marginBottom: 3 }}>Fecha límite</label>
                    <input type="date" value={editData.due_date} onChange={e => setEditData(p => ({...p, due_date: e.target.value}))}
                      style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e2e0d8', fontSize: 12 }} />
                  </div>
                  <button onClick={() => guardarEdicion(t.id)} disabled={saving}
                    style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#3C3489', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, alignSelf: 'flex-end', opacity: saving ? 0.7 : 1 }}>
                    {saving ? '…' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditId(null)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 12, alignSelf: 'flex-end' }}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {plan.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 32, background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8' }}>
            Sin tareas en el plan de acción. Crea tareas manualmente o usa "Auto-generar".
          </div>
        )}
      </div>
    </div>
  )
}
