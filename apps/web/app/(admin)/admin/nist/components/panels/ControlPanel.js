'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '../../../../../../lib/api'
import FixedPortal from '../../../../../../components/admin/FixedPortal'
import { alertDstac } from '../../../../../../components/admin/ConfirmDialog'

const STATUS_OPTIONS = [
  { value: 'pendiente',    label: 'Pendiente',    bg: '#FCEBEB', color: '#791F1F' },
  { value: 'parcial',      label: 'Parcial',      bg: '#FAEEDA', color: '#633806' },
  { value: 'implementado', label: 'Implementado', bg: '#EAF3DE', color: '#27500A' },
  { value: 'no_aplica',    label: 'No aplica',    bg: '#F1EFE8', color: '#444441' },
]

const SOURCE_ICONS = {
  activos:      { label: 'Activos',      path: '/admin/activos'     },
  personal:     { label: 'Personal',     path: '/admin/personal'    },
  identidades:  { label: 'Identidades',  path: '/admin/identidades' },
  accesos:      { label: 'Accesos',      path: '/admin/accesos'     },
  incidentes:   { label: 'Incidentes',   path: '/admin/incidentes'  },
  documentos:   { label: 'Documentos',   path: '/admin/documentos'  },
}

export default function ControlPanel({ control, slug, evaluationId, onClose, onSaved }) {
  const headers = { 'X-Company-Slug': slug }

  const [status,    setStatus]    = useState(control.status    ?? 'pendiente')
  const [notes,     setNotes]     = useState(control.notes_dstac ?? '')
  const [checklist, setChecklist] = useState(() => {
    if (control.checklist_items && typeof control.checklist_items === 'object') {
      return control.checklist_items
    }
    if (control.checklist) {
      const items = typeof control.checklist === 'string' ? JSON.parse(control.checklist) : control.checklist
      const obj = {}
      for (const item of items) obj[item] = false
      return obj
    }
    return {}
  })
  const [current,   setCurrent]   = useState(control.current_value ?? 0)
  const [max,       setMax]       = useState(control.max_value ?? 0)
  const [saving,    setSaving]    = useState(false)
  const [connData,  setConnData]  = useState([])
  const [evidences, setEvidences] = useState([])

  // Calcular progress desde checklist
  const items    = Object.keys(checklist)
  const done     = items.filter(k => checklist[k]).length
  const progress = items.length ? Math.round((done / items.length) * 100) : 0

  // Cargar datos conectados según data_source
  useEffect(() => {
    const sources = (control.data_source || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!sources.length || !slug) return
    const src = sources[0]
    apiFetch(`/api/admin/nist/data/${src}`, { headers })
      .then(data => {
        const key = src
        setConnData((data[key] || []).slice(0, 5))
      })
      .catch(() => {})
  }, [control.id, slug])

  // Cargar evidencias del control
  useEffect(() => {
    if (!slug) return
    apiFetch(`/api/admin/nist/evidencias?control_id=${control.id}`, { headers })
      .then(data => setEvidences((data.evidencias || []).slice(0, 3)))
      .catch(() => {})
  }, [control.id, slug])

  function toggleCheck(item) {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/nist/assessments/${control.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          checklist_items: checklist,
          notes_dstac: notes,
          current_value: Number(current),
          max_value: Number(max),
        })
      })
      onSaved?.()
    } catch (err) {
      alertDstac(err.message || 'Error al guardar', { titulo: 'Error', tipo: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const statusInfo = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0]
  const sources    = (control.data_source || '').split(',').map(s => s.trim()).filter(Boolean)

  return (
    <FixedPortal>
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 'min(480px, 94vw)', height: '100vh',
      background: '#fff', borderLeft: '1px solid #e2e0d8',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1efe8', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#534AB7', fontFamily: 'monospace' }}>{control.id}</span>
            <span style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
              {statusInfo.label}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.4 }}>{control.name}</h3>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

        {/* Descripción */}
        <p style={{ fontSize: 14, color: '#888780', lineHeight: 1.6, margin: '0 0 18px' }}>{control.description}</p>

        {/* Progreso */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Progreso del control</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: progress >= 61 ? '#1D9E75' : progress >= 41 ? '#EF9F27' : '#E24B4A' }}>{progress}%</span>
          </div>
          <div style={{ height: 7, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress >= 61 ? '#1D9E75' : progress >= 41 ? '#EF9F27' : '#E24B4A', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
          {max > 0 && (
            <div style={{ fontSize: 13, color: '#888780', marginTop: 4 }}>
              {current}/{max} documentados
            </div>
          )}
        </div>

        {/* Cantidades (opcional) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 13, color: '#888780', display: 'block', marginBottom: 4 }}>Cantidad actual</label>
            <input type="number" min="0" value={current}
              onChange={e => setCurrent(e.target.value)}
              style={{ width: '100%', padding: '7px 9px', border: '1px solid #e2e0d8', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#888780', display: 'block', marginBottom: 4 }}>Total</label>
            <input type="number" min="0" value={max}
              onChange={e => setMax(e.target.value)}
              style={{ width: '100%', padding: '7px 9px', border: '1px solid #e2e0d8', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Estado manual */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: '#888780', display: 'block', marginBottom: 6 }}>Estado del control</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setStatus(opt.value)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.12s',
                  background: status === opt.value ? opt.bg : '#f8f7f4',
                  color: status === opt.value ? opt.color : '#888780',
                  border: `1.5px solid ${status === opt.value ? opt.color + '44' : '#e2e0d8'}`,
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Origen de datos */}
        {sources.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: '#888780', marginBottom: 6 }}>Origen de datos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sources.map(src => {
                const info = SOURCE_ICONS[src]
                if (!info) return null
                return (
                  <a key={src} href={info.path}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, background: '#EEEDFE', color: '#3C3489', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    {info.label} →
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Checklist */}
        {items.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 8 }}>Checklist de evaluación</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {items.map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!checklist[item]} onChange={() => toggleCheck(item)}
                    style={{ marginTop: 2, accentColor: '#3C3489', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 14, color: checklist[item] ? '#2C2C2A' : '#888780', lineHeight: 1.5 }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Datos conectados */}
        {connData.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 8 }}>
              {sources[0] && SOURCE_ICONS[sources[0]]?.label} asociados
            </div>
            <div style={{ border: '1px solid #f1efe8', borderRadius: 8, overflow: 'hidden' }}>
              {connData.map((item, i) => (
                <div key={item.id} style={{
                  padding: '9px 14px', fontSize: 14, borderBottom: i < connData.length - 1 ? '1px solid #f1efe8' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nombre ?? item.name ?? item.identidad ?? `#${item.id}`}
                  </span>
                  {(item.criticidad || item.estado || item.status) && (
                    <span style={{ fontSize: 12, color: '#888780', flexShrink: 0, marginLeft: 8 }}>
                      {item.criticidad ?? item.estado ?? item.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidencias mini */}
        {evidences.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 8 }}>Evidencias</div>
            {evidences.map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f1efe8', fontSize: 14 }}>
                <span style={{ color: '#534AB7', fontSize: 18 }}>📎</span>
                <span style={{ flex: 1, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.original_name}</span>
                <span style={{ fontSize: 12, color: '#888780', flexShrink: 0 }}>{ev.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notas DSTAC */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: 6 }}>Notas DSTAC</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones del analista…"
            rows={3}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', color: '#2C2C2A' }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid #f1efe8', display: 'flex', gap: 8 }}>
        <button onClick={onClose}
          style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#444441', fontWeight: 500 }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
    </FixedPortal>
  )
}
