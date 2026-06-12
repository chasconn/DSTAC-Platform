'use client'
import { useState } from 'react'
import { api } from '../../../../../lib/api'

export default function AccesoDeleteModal({ acceso, empresaSlug, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleDelete() {
    setLoading(true); setError('')
    try {
      await api.delete(`/api/admin/accesos/${acceso.id}`, { 'X-Company-Slug': empresaSlug })
      onDeleted()
    } catch (err) {
      setError(err.message || 'Error al eliminar')
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A' }}>Eliminar acceso</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Esta acción no se puede deshacer</div>
          </div>
        </div>

        <div style={{ background: '#fafaf8', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#2C2C2A' }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{acceso.identidad_valor}</div>
          <div style={{ color: '#888780', fontSize: 11, marginTop: 2 }}>→ {acceso.activo_nombre}</div>
        </div>

        <p style={{ fontSize: 13, color: '#444441', margin: '0 0 20px' }}>
          ¿Confirmas que deseas eliminar este registro de acceso?
        </p>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '8px 12px', borderRadius: 7, fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding: '8px 22px', borderRadius: 7, border: 'none', background: '#E24B4A', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
