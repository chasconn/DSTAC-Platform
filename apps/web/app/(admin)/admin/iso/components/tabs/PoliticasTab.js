'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../../lib/api'

const STATUS_STYLE = {
  lista:        { label: 'Lista',         color: '#27500A', bg: '#EAF3DE' },
  borrador:     { label: 'Borrador',      color: '#633806', bg: '#FAEEDA' },
  sin_politica: { label: 'Sin política',  color: '#791F1F', bg: '#FCEBEB' },
}

export default function PoliticasTab({ domainId, slug }) {
  const [politicas, setPoliticas] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [content,   setContent]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)

  const headers = { 'X-Company-Slug': slug }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/iso/politicas', { headers })
      const filtered = (data.politicas ?? []).filter(p => p.domain_id === domainId)
      setPoliticas(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, domainId])

  useEffect(() => { cargar() }, [cargar])

  function seleccionar(p) {
    setSelected(p)
    setContent(p.policy_content ?? p.policy_template ?? '')
  }

  async function guardar() {
    if (!selected) return
    setSaving(true)
    try {
      await apiFetch(`/api/admin/iso/politicas/${selected.id}`, {
        method:  'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ policy_content: content }),
      })
      showToast('Política guardada')
      await cargar()
      const updated = politicas.find(p => p.id === selected.id)
      if (updated) setSelected({ ...updated, policy_content: content, politica_status: 'lista' })
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

  if (loading) return <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando políticas…</div>

  if (politicas.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8' }}>
        No hay controles con plantilla de política en este dominio.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Lista */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#888780', marginBottom: 10 }}>
          {politicas.length} política{politicas.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {politicas.map(p => {
            const style   = STATUS_STYLE[p.politica_status] ?? STATUS_STYLE.sin_politica
            const isActive= selected?.id === p.id
            return (
              <div key={p.id} onClick={() => seleccionar(p)}
                style={{
                  background: isActive ? '#EEEDFE' : '#fff',
                  borderRadius: 9, border: `1px solid ${isActive ? '#c8c4f0' : '#e2e0d8'}`,
                  padding: '10px 14px', cursor: 'pointer', transition: 'all 0.12s',
                }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#3C3489', marginBottom: 3 }}>{p.id}</div>
                <div style={{ fontSize: 12, color: '#2C2C2A', marginBottom: 6, lineHeight: 1.4 }}>{p.name}</div>
                <span style={{ background: style.bg, color: style.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {style.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div style={{ flex: 1 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1efe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#3C3489' }}>{selected.id}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginLeft: 8 }}>{selected.name}</span>
              </div>
              <button onClick={() => setContent(selected.policy_template ?? '')}
                style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#f8f7f4', color: '#888780', cursor: 'pointer', fontSize: 11 }}>
                Restaurar plantilla
              </button>
            </div>

            {toast && (
              <div style={{ margin: '12px 20px 0', background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500 }}>
                {toast.msg}
              </div>
            )}

            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 14, marginBottom: 6 }}>
                Edita el contenido de la política. Los textos entre [corchetes] son valores a personalizar.
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={20}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e0d8',
                  fontSize: 13, lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box',
                  fontFamily: 'inherit', color: '#2C2C2A',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button onClick={guardar} disabled={saving}
                  style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando…' : 'Guardar política'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, textAlign: 'center', padding: '60px 20px', color: '#888780', fontSize: 13 }}>
          Selecciona una política de la lista para editarla.
        </div>
      )}
    </div>
  )
}
