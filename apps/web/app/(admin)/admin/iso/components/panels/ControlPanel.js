'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '../../../../../../lib/api'

const STATUS_OPTIONS = [
  { value: 'pendiente',    label: 'Pendiente',    color: '#791F1F', bg: '#FCEBEB' },
  { value: 'parcial',      label: 'Parcial',      color: '#633806', bg: '#FAEEDA' },
  { value: 'implementado', label: 'Implementado', color: '#27500A', bg: '#EAF3DE' },
  { value: 'no_aplica',    label: 'No aplica',    color: '#444441', bg: '#F1EFE8' },
]

export default function ControlPanel({ control, slug, evaluationId, onClose, onSaved }) {
  const [status,        setStatus]        = useState(control.status      ?? 'pendiente')
  const [progress,      setProgress]      = useState(Math.round(Number(control.progress) || 0))
  const [applies,       setApplies]       = useState(control.applies !== 0)
  const [nonApplyReason,setNonApplyReason]= useState(control.non_apply_reason ?? '')
  const [notes,         setNotes]         = useState(control.notes_dstac ?? '')
  const [comment,       setComment]       = useState('')
  const [checklist,     setChecklist]     = useState(() => {
    try { return JSON.parse(control.checklist_items ?? '{}') } catch { return {} }
  })
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)
  const [section, setSection] = useState('control')

  useEffect(() => {
    setStatus(control.status ?? 'pendiente')
    setProgress(Math.round(Number(control.progress) || 0))
    setApplies(control.applies !== 0)
    setNonApplyReason(control.non_apply_reason ?? '')
    setNotes(control.notes_dstac ?? '')
    setComment('')
    try { setChecklist(JSON.parse(control.checklist_items ?? '{}')) } catch { setChecklist({}) }
  }, [control.id])

  const headers = { 'X-Company-Slug': slug, 'Content-Type': 'application/json' }

  async function guardar() {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/iso/assessments/${control.id}`, {
        method:  'PUT',
        headers,
        body: JSON.stringify({
          status:           applies ? status : 'no_aplica',
          progress:         applies ? progress : 0,
          applies:          applies ? 1 : 0,
          non_apply_reason: applies ? null : nonApplyReason,
          checklist_items:  Object.keys(checklist).length ? checklist : null,
          notes_dstac:      notes || null,
          comment:          comment || null,
        }),
      })
      setToast({ msg: 'Guardado', type: 'success' })
      setTimeout(() => { setToast(null); onSaved() }, 1200)
    } catch (err) {
      setToast({ msg: err.message ?? 'Error', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  let checklistItems = []
  try { checklistItems = JSON.parse(control.checklist ?? '[]') } catch {}

  const doneCount = checklistItems.length ? checklistItems.filter((_, i) => checklist[i]).length : 0
  const computedProgress = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : progress

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', overflow: 'hidden', position: 'sticky', top: 20 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1efe8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#3C3489', letterSpacing: 0.5, marginBottom: 4 }}>{control.id}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.4 }}>{control.name}</div>
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 18, padding: '0 0 0 8px', flexShrink: 0, lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Tabs internos */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f1efe8' }}>
        {[
          { id: 'control',  label: 'Control' },
          { id: 'checklist', label: `Lista (${doneCount}/${checklistItems.length})` },
          { id: 'notas',    label: 'Notas' },
        ].map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            style={{
              flex: 1, padding: '10px 8px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: section === t.id ? 700 : 400,
              color: section === t.id ? '#3C3489' : '#888780',
              borderBottom: `2px solid ${section === t.id ? '#3C3489' : 'transparent'}`,
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 20px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>

        {/* Sección control */}
        {section === 'control' && (
          <>
            {/* Descripción */}
            {control.description && (
              <div style={{ fontSize: 12, color: '#888780', lineHeight: 1.6, marginBottom: 16, padding: '10px 12px', background: '#f8f7f4', borderRadius: 8 }}>
                {control.description}
              </div>
            )}

            {/* ¿Aplica? */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={applies} onChange={e => setApplies(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3C3489' }} />
                <span style={{ fontWeight: 600, color: '#2C2C2A' }}>Este control aplica</span>
              </label>
              {!applies && (
                <textarea
                  value={nonApplyReason}
                  onChange={e => setNonApplyReason(e.target.value)}
                  placeholder="Razón de no aplicabilidad…"
                  rows={2}
                  style={{ width: '100%', marginTop: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              )}
            </div>

            {applies && (
              <>
                {/* Status */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888780', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.filter(o => o.value !== 'no_aplica').map(o => (
                      <button key={o.value} onClick={() => {
                        setStatus(o.value)
                        if (o.value === 'implementado') setProgress(100)
                        else if (o.value === 'pendiente') setProgress(0)
                      }}
                        style={{
                          padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 700,
                          background: status === o.value ? o.bg : '#f8f7f4',
                          color: status === o.value ? o.color : '#888780',
                          outline: status === o.value ? `2px solid ${o.color}40` : 'none',
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5 }}>Progreso</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>
                      {checklistItems.length ? computedProgress : progress}%
                    </span>
                  </div>
                  {!checklistItems.length && (
                    <input type="range" min={0} max={100} step={5} value={progress}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setProgress(v)
                        if (v === 100) setStatus('implementado')
                        else if (v > 0) setStatus('parcial')
                        else setStatus('pendiente')
                      }}
                      style={{ width: '100%', accentColor: '#3C3489', cursor: 'pointer' }}
                    />
                  )}
                  {checklistItems.length > 0 && (
                    <div style={{ height: 6, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${computedProgress}%`, height: '100%', background: '#3C3489', borderRadius: 99, transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Fuente de datos */}
            {control.data_source && (
              <div style={{ fontSize: 11, color: '#888780', marginBottom: 12, padding: '6px 10px', background: '#EEEDFE', borderRadius: 6 }}>
                <strong>Fuente:</strong> {control.data_source}
              </div>
            )}

            {/* Comentario de cambio */}
            <div style={{ marginBottom: 4 }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Comentario del cambio (opcional)…"
                rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </>
        )}

        {/* Sección checklist */}
        {section === 'checklist' && (
          <>
            {checklistItems.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 24 }}>
                Este control no tiene checklist definido.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: '#888780', marginBottom: 12 }}>
                  {doneCount} de {checklistItems.length} ítems completados
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {checklistItems.map((item, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: checklist[i] ? '#EAF3DE' : '#f8f7f4', transition: 'background 0.12s' }}>
                      <input type="checkbox" checked={!!checklist[i]}
                        onChange={e => setChecklist(prev => ({ ...prev, [i]: e.target.checked }))}
                        style={{ marginTop: 1, width: 14, height: 14, cursor: 'pointer', accentColor: '#1D9E75', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 12, color: checklist[i] ? '#27500A' : '#2C2C2A', lineHeight: 1.5, textDecoration: checklist[i] ? 'line-through' : 'none' }}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Sección notas */}
        {section === 'notas' && (
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas internas DSTAC sobre este control…"
            rows={10}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
        )}
      </div>

      {/* Footer con acciones */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #f1efe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {toast ? (
          <span style={{ fontSize: 12, color: toast.type === 'error' ? '#E24B4A' : '#1D9E75', fontWeight: 600 }}>{toast.msg}</span>
        ) : (
          <span style={{ fontSize: 12, color: '#B4B2A9' }}>
            {control.updated_by_name ? `Actualizado por ${control.updated_by_name}` : 'Sin cambios guardados'}
          </span>
        )}
        <button onClick={guardar} disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
