'use client'

import { useState, useEffect } from 'react'
import FixedPortal from '../../../../../components/admin/FixedPortal'

export default function ActivoDeleteModal({ activo, empresaSlug, onClose, onDeleted }) {
  const [tieneAsociaciones, setTieneAsociaciones] = useState(false)
  const [countAsociaciones, setCountAsociaciones] = useState(0)
  const [confirmInput, setConfirmInput]           = useState('')
  const [loading, setLoading]                     = useState(false)
  const [error, setError]                         = useState('')

  const confirmOk = confirmInput.trim() === activo.nombre.trim()

  // Cerrar con Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleDelete() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/activos/${activo.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Company-Slug': empresaSlug },
      })

      if (res.status === 409) {
        // El activo tiene accesos vinculados — pasar al estado de confirmación extra
        const data = await res.json()
        setTieneAsociaciones(true)
        setCountAsociaciones(data.count)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al eliminar el activo')
        return
      }

      onDeleted()
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleForceDelete() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/activos/${activo.id}?force=true`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Company-Slug': empresaSlug },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al eliminar el activo')
        return
      }

      onDeleted()
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FixedPortal>
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 14,
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>

        {!tieneAsociaciones ? (
          /* ── ESTADO 1: confirmación simple ── */
          <>
            <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
              {/* Ícono advertencia naranja */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#FAEEDA', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: '#854F0B',
              }}>
                <i className="ti ti-alert-triangle" />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>
                ¿Eliminar este activo?
              </h3>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#888780', lineHeight: 1.5 }}>
                <strong style={{ color: '#2C2C2A' }}>{activo.nombre}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#B4B2A9' }}>
                Esta acción no se puede deshacer.
              </p>
            </div>

            {error && <ErrorBanner msg={error} />}

            <div style={{
              display: 'flex', gap: 8, padding: '0 24px 24px',
              justifyContent: 'flex-end',
            }}>
              <button onClick={onClose} style={btnCancelar}>Cancelar</button>
              <button onClick={handleDelete} disabled={loading} style={btnEliminar}>
                {loading ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </>
        ) : (
          /* ── ESTADO 2: tiene asociaciones, requiere escribir el nombre ── */
          <>
            <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
              {/* Ícono rojo */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#FCEBEB', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: '#791F1F',
              }}>
                <i className="ti ti-alert-circle" />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>
                Este activo tiene asociaciones
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888780', lineHeight: 1.55 }}>
                Este activo tiene{' '}
                <strong style={{ color: '#791F1F' }}>
                  {countAsociaciones} acceso{countAsociaciones !== 1 ? 's' : ''} vinculado{countAsociaciones !== 1 ? 's' : ''}
                </strong>.
                {' '}Si lo eliminas, también se eliminarán todos los accesos vinculados a este activo.
              </p>

              {/* Input de confirmación por nombre */}
              <div style={{ textAlign: 'left', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: 6 }}>
                  Escribe <strong>{activo.nombre}</strong> para confirmar:
                </label>
                <input
                  autoFocus
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  placeholder={activo.nombre}
                  style={{
                    width: '100%', height: 36, padding: '0 10px',
                    border: `1px solid ${confirmOk ? '#1D9E75' : '#e2e0d8'}`,
                    borderRadius: 8, fontSize: 13, color: '#2C2C2A',
                    outline: 'none', boxSizing: 'border-box',
                    background: confirmOk ? '#E1F5EE' : '#fff',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                />
              </div>
            </div>

            {error && <ErrorBanner msg={error} />}

            <div style={{
              display: 'flex', gap: 8, padding: '0 24px 24px',
              justifyContent: 'flex-end',
            }}>
              <button onClick={onClose} style={btnCancelar}>Cancelar</button>
              <button
                onClick={handleForceDelete}
                disabled={!confirmOk || loading}
                style={{
                  ...btnEliminar,
                  opacity: (!confirmOk || loading) ? 0.45 : 1,
                  cursor: (!confirmOk || loading) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Eliminando…' : 'Confirmar eliminación'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </FixedPortal>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div style={{
      margin: '0 24px 12px',
      padding: '8px 12px',
      background: '#FCEBEB', borderRadius: 8,
      fontSize: 13, color: '#791F1F',
    }}>
      {msg}
    </div>
  )
}

const btnCancelar = {
  padding: '8px 16px', border: '1px solid #e2e0d8',
  background: '#fff', borderRadius: 8,
  fontSize: 13, cursor: 'pointer', color: '#2C2C2A',
}

const btnEliminar = {
  padding: '8px 18px', border: 'none',
  background: '#E24B4A', color: '#fff',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
