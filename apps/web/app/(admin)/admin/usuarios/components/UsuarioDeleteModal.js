'use client'

import { useState } from 'react'
import { apiFetch } from '../../../../../lib/api'

export default function UsuarioDeleteModal({ usuario, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      await apiFetch(`/api/admin/usuarios/${usuario.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      setError(err.message || 'Error al eliminar')
      setLoading(false)
    }
  }

  const nombre = usuario?.first_name
    ? `${usuario.first_name} ${usuario.last_name || ''}`.trim()
    : usuario?.email

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>
            🗑
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>Eliminar usuario</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#888780', lineHeight: 1.5 }}>
            ¿Estás seguro de que quieres eliminar a <strong style={{ color: '#2C2C2A' }}>{nombre}</strong>?
            Sus sesiones activas serán invalidadas. Esta acción no se puede deshacer.
          </p>

          {error && (
            <div style={{ marginTop: 14, background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: '#791F1F' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#444441', fontWeight: 500 }}>
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#E24B4A', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
