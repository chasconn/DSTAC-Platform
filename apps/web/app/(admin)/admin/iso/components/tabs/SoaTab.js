'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../../lib/api'

function statusBadge(status, applies) {
  if (applies === 0) return { label: 'No aplica', color: '#444441', bg: '#F1EFE8' }
  if (status === 'implementado') return { label: 'Implementado', color: '#27500A', bg: '#EAF3DE' }
  if (status === 'parcial')      return { label: 'Parcial',      color: '#633806', bg: '#FAEEDA' }
  return { label: 'Pendiente', color: '#791F1F', bg: '#FCEBEB' }
}

export default function SoaTab({ domainId, slug, evaluationId, onRefresh }) {
  const [controls, setControls] = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState({})
  const [toast,    setToast]    = useState(null)
  const [editId,   setEditId]   = useState(null)
  const [reason,   setReason]   = useState('')

  const headers = { 'X-Company-Slug': slug }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/admin/iso/soa`, { headers })
      const domControls = (data.soa ?? []).filter(c => c.domain_id === domainId)
      setControls(domControls)
      setStats(data.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, domainId])

  useEffect(() => { cargar() }, [cargar])

  async function toggleApplies(control) {
    const newApplies = control.applies === 0 ? 1 : 0
    setSaving(prev => ({ ...prev, [control.id]: true }))
    try {
      await apiFetch(`/api/admin/iso/soa/${control.id}`, {
        method:  'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applies: newApplies, non_apply_reason: newApplies ? null : (reason || null) }),
      })
      await cargar()
      if (onRefresh) onRefresh()
      showToast(newApplies ? 'Control activado' : 'Marcado como no aplica')
      setEditId(null)
      setReason('')
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally {
      setSaving(prev => ({ ...prev, [control.id]: false }))
    }
  }

  async function saveReason(control) {
    setSaving(prev => ({ ...prev, [control.id]: true }))
    try {
      await apiFetch(`/api/admin/iso/soa/${control.id}`, {
        method:  'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applies: 0, non_apply_reason: reason }),
      })
      await cargar()
      showToast('Razón guardada')
      setEditId(null)
      setReason('')
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally {
      setSaving(prev => ({ ...prev, [control.id]: false }))
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando SoA…</div>

  const aplican  = controls.filter(c => c.applies !== 0).length
  const noAplica = controls.filter(c => c.applies === 0).length

  return (
    <div>
      {/* Stats SoA */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total controles', value: controls.length, color: '#2C2C2A', bg: '#f8f7f4' },
          { label: 'Aplican',         value: aplican,          color: '#27500A', bg: '#EAF3DE' },
          { label: 'No aplican',      value: noAplica,         color: '#444441', bg: '#F1EFE8' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 18px', minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 12 }}>
          {toast.msg}
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e2e0d8' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, width: 60 }}>ID</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5 }}>Control</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, width: 80 }}>Aplica</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, width: 140 }}>Estado</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5 }}>Justificación</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c, idx) => {
              const badge   = statusBadge(c.status, c.applies)
              const isEdit  = editId === c.id
              const isSaving= saving[c.id]
              return (
                <>
                  <tr key={c.id} style={{ borderBottom: idx < controls.length - 1 ? '1px solid #f1efe8' : 'none', background: c.applies === 0 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '10px 16px', fontSize: 11, fontWeight: 800, color: '#3C3489' }}>{c.id}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#2C2C2A' }}>{c.name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isSaving ? 'wait' : 'pointer', position: 'relative' }}>
                        <div onClick={() => {
                          if (c.applies === 0) toggleApplies(c)
                          else { setEditId(isEdit ? null : c.id); setReason(c.non_apply_reason ?? '') }
                        }}
                          style={{
                            width: 36, height: 20, borderRadius: 10,
                            background: c.applies !== 0 ? '#1D9E75' : '#e2e0d8',
                            position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                          }}>
                          <div style={{
                            position: 'absolute', top: 2, left: c.applies !== 0 ? 18 : 2,
                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                          }} />
                        </div>
                      </label>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#888780', fontStyle: c.non_apply_reason ? 'normal' : 'italic' }}>
                      {c.non_apply_reason || (c.applies === 0 ? '—' : '')}
                    </td>
                  </tr>
                  {isEdit && (
                    <tr key={`${c.id}-edit`} style={{ background: '#FAEEDA', borderBottom: '1px solid #e2e0d8' }}>
                      <td colSpan={5} style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#633806', marginBottom: 8 }}>
                          Marcar "{c.name}" como no aplica. Ingresa la justificación:
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Razón de exclusión…"
                            style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid #EF9F27', fontSize: 12, fontFamily: 'inherit' }}
                          />
                          <button onClick={() => saveReason(c)} disabled={isSaving}
                            style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#EF9F27', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            Confirmar
                          </button>
                          <button onClick={() => { setEditId(null); setReason('') }}
                            style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 12 }}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
