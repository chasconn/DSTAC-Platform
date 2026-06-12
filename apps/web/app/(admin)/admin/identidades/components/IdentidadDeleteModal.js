'use client'

import { useState } from 'react'
import { api } from '../../../../../lib/api'

export default function IdentidadDeleteModal({ identidad, empresaSlug, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [fase, setFase]               = useState('simple')
  const [accesosCount, setAccesosCount] = useState(0)

  const headers = { 'X-Company-Slug': empresaSlug }

  async function handleDelete() {
    setError('')
    setLoading(true)
    try {
      await api.delete(`/api/admin/identidades/${identidad.id}`, headers)
      onDeleted()
    } catch (err) {
      if (err.error === 'tiene_asociaciones') {
        setAccesosCount(err.count ?? 0)
        setFase('force')
      } else {
        setError(err.message || 'Error al eliminar')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForceDelete() {
    setError('')
    setLoading(true)
    try {
      await api.delete(`/api/admin/identidades/${identidad.id}?force=true`, headers)
      onDeleted()
    } catch (err) {
      setError(err.message || 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  const confirmOk = confirmText.trim().toLowerCase() === identidad.nombre.trim().toLowerCase()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', padding: 24 }}>

        {fase === 'simple' ? (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>Eliminar identidad</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888780' }}>
              ¿Estás seguro de que quieres eliminar <strong style={{ color: '#2C2C2A' }}>{identidad.nombre}</strong>?
              Esta acción no se puede deshacer.
            </p>
            {error && <p style={{ fontSize: 12, color: '#E24B4A', marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={onClose} style={btnSec}>Cancelar</button>
              <button onClick={handleDelete} disabled={loading} style={{ ...btnDanger, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#E24B4A' }}>Tiene accesos asociados</h2>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888780' }}>
              Esta identidad tiene <strong style={{ color: '#2C2C2A' }}>{accesosCount} acceso{accesosCount !== 1 ? 's' : ''}</strong> vinculado{accesosCount !== 1 ? 's' : ''}.
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888780' }}>
              Si la eliminas, <strong style={{ color: '#2C2C2A' }}>los accesos también se eliminarán</strong>.
              Para confirmar, escribe el nombre de la identidad:
            </p>
            <input
              type="text"
              placeholder={identidad.nombre}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            {error && <p style={{ fontSize: 12, color: '#E24B4A', marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={onClose} style={btnSec}>Cancelar</button>
              <button onClick={handleForceDelete} disabled={!confirmOk || loading}
                style={{ ...btnDanger, opacity: (!confirmOk || loading) ? 0.4 : 1, cursor: (!confirmOk || loading) ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Eliminando…' : 'Confirmar eliminación'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const btnSec    = { padding: '9px 18px', background: '#fff', color: '#2C2C2A', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
const btnDanger = { padding: '9px 18px', background: '#E24B4A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
