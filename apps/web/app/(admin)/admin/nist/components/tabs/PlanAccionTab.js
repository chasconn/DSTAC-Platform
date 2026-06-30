'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../../lib/api'
import FixedPortal from '../../../../../../components/admin/FixedPortal'
import { alertDstac } from '../../../../../../components/admin/ConfirmDialog'

const PRIORITY_MAP = {
  critica: { bg: '#FCEBEB', color: '#791F1F', label: 'Crítica'   },
  alta:    { bg: '#FAEEDA', color: '#633806', label: 'Alta'      },
  media:   { bg: '#EEEDFE', color: '#3C3489', label: 'Media'     },
  baja:    { bg: '#EAF3DE', color: '#27500A', label: 'Baja'      },
}

const STATUS_MAP = {
  pendiente:   { color: '#888780', label: 'Pendiente'   },
  en_progreso: { color: '#EF9F27', label: 'En progreso' },
  completada:  { color: '#1D9E75', label: 'Completada'  },
  cancelada:   { color: '#B4B2A9', label: 'Cancelada'   },
}

export default function PlanAccionTab({ slug, evaluationId }) {
  const headers = { 'X-Company-Slug': slug }
  const [plan,      setPlan]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [generating,setGenerating]= useState(false)
  const [editing,   setEditing]   = useState(null)
  const [toast,     setToast]     = useState(null)

  const cargar = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/nist/plan-accion', { headers })
      setPlan(data.plan ?? [])
    } catch { setPlan([]) }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { cargar() }, [cargar])

  async function generar() {
    setGenerating(true)
    try {
      const data = await apiFetch('/api/admin/nist/plan-accion/generar', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      setToast({ msg: data.message, type: 'success' })
      await cargar()
    } catch (err) {
      setToast({ msg: err.message ?? 'Error', type: 'error' })
    } finally {
      setGenerating(false)
      setTimeout(() => setToast(null), 3500)
    }
  }

  async function updateTask(id, fields) {
    try {
      await apiFetch(`/api/admin/nist/plan-accion/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      })
      await cargar()
      setEditing(null)
    } catch (err) { alertDstac(err.message, { titulo: 'Error', tipo: 'error' }) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 15, color: '#888780' }}>{plan.length} tarea{plan.length !== 1 ? 's' : ''}</div>
        <button onClick={generar} disabled={generating}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>
          {generating ? 'Generando…' : '⚡ Generar plan automático'}
        </button>
      </div>

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 12 }}>
          {toast.msg}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 15 }}>Cargando…</div>
      ) : plan.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 15 }}>
          No hay tareas en el plan de acción.<br />
          <span style={{ fontSize: 13 }}>Usa "Generar plan automático" para crear tareas desde controles pendientes.</span>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflowX: 'auto' }}>
          {/* Head */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 100px 130px 110px 70px', minWidth: 720, gap: 8, padding: '11px 16px', background: '#f8f7f4', borderBottom: '1px solid #f1efe8' }}>
            {['Control','Acción','Prioridad','Estado','Responsable','Fecha límite',''].map(h => (
              <div key={h} style={{ fontSize: 12, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</div>
            ))}
          </div>

          {plan.map((tarea, i) => {
            const pr = PRIORITY_MAP[tarea.priority ?? 'media'] ?? PRIORITY_MAP.media
            const st = STATUS_MAP[tarea.status ?? 'pendiente']  ?? STATUS_MAP.pendiente

            return (
              <div key={tarea.id} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr 90px 100px 130px 110px 70px', minWidth: 720,
                gap: 8, padding: '12px 16px', alignItems: 'center',
                borderBottom: i < plan.length - 1 ? '1px solid #f8f7f4' : 'none',
              }}>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#534AB7', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tarea.control_id}
                </span>
                <span style={{ fontSize: 13, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tarea.action}
                </span>
                <span style={{ background: pr.bg, color: pr.color, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, display: 'inline-block' }}>
                  {pr.label}
                </span>
                <select
                  value={tarea.status ?? 'pendiente'}
                  onChange={e => updateTask(tarea.id, { status: e.target.value })}
                  style={{ padding: '5px 7px', border: '1px solid #e2e0d8', borderRadius: 6, fontSize: 13, color: st.color, background: '#fff', cursor: 'pointer' }}
                >
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <span style={{ fontSize: 13, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tarea.responsible ?? '—'}
                </span>
                <span style={{ fontSize: 13, color: tarea.due_date && new Date(tarea.due_date) < new Date() ? '#E24B4A' : '#888780' }}>
                  {tarea.due_date ? new Date(tarea.due_date).toLocaleDateString('es-CL') : '—'}
                </span>
                <button onClick={() => setEditing(tarea)}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e0d8', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#888780' }}>
                  Editar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal edición rápida */}
      {editing && (
        <EditModal tarea={editing} onClose={() => setEditing(null)} onSave={fields => updateTask(editing.id, fields)} />
      )}
    </div>
  )
}

function EditModal({ tarea, onClose, onSave }) {
  const [responsible, setResponsible] = useState(tarea.responsible ?? '')
  const [due_date,    setDueDate]     = useState(tarea.due_date?.split('T')[0] ?? '')
  const [comment,     setComment]     = useState(tarea.comment_dstac ?? '')
  const [priority,    setPriority]    = useState(tarea.priority ?? 'media')
  const [saving,      setSaving]      = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ responsible, due_date: due_date || null, comment_dstac: comment, priority })
    setSaving(false)
  }

  return (
    <FixedPortal>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '26px', width: 'min(420px, 92vw)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#2C2C2A' }}>Editar tarea — {tarea.control_id}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#888780', lineHeight: 1.5 }}>{tarea.action}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, color: '#888780', display: 'block', marginBottom: 4 }}>Prioridad</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              style={{ width: '100%', padding: '8px 11px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, boxSizing: 'border-box' }}>
              {Object.entries({ critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#888780', display: 'block', marginBottom: 4 }}>Responsable</label>
            <input value={responsible} onChange={e => setResponsible(e.target.value)}
              style={{ width: '100%', padding: '8px 11px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#888780', display: 'block', marginBottom: 4 }}>Fecha límite</label>
            <input type="date" value={due_date} onChange={e => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '8px 11px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#888780', display: 'block', marginBottom: 4 }}>Comentario DSTAC</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
              style={{ width: '100%', padding: '8px 11px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 15, color: '#444441', fontWeight: 500 }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
    </FixedPortal>
  )
}
