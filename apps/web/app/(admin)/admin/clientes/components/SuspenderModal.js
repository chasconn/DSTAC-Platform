'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'

const EFECTOS_SUSPENDER = [
  { icon: '🔒', text: 'Todos los usuarios quedan bloqueados en el login' },
  { icon: '💾', text: 'Los datos operacionales se conservan intactos' },
  { icon: '↩️', text: 'Puedes reactivar el acceso en cualquier momento' },
  { icon: '⚠️', text: 'El cliente verá "Cuenta suspendida" al intentar ingresar' },
]

const EFECTOS_REACTIVAR = [
  { icon: '✅', text: 'Todos los usuarios podrán ingresar nuevamente' },
  { icon: '📂', text: 'Los datos operacionales se mantienen tal como estaban' },
  { icon: '🔔', text: 'El cliente recupera acceso inmediato a su portal' },
]

export default function SuspenderModal({ empresa, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const esSuspender  = empresa.status !== 'suspended'
  const nuevoStatus  = esSuspender ? 'suspended' : 'active'
  const efectos      = esSuspender ? EFECTOS_SUSPENDER : EFECTOS_REACTIVAR

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      await api.patch(`/api/companies/${empresa.slug}/status`, { status: nuevoStatus })
      onDone({ ...empresa, status: nuevoStatus })
    } catch (err) {
      setError(err.message || 'Error al cambiar el estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        {/* Header con ícono */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center', borderBottom: '1px solid #f1efe8' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
            background: esSuspender ? '#FEF3E2' : '#EAF3DE',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
          }}>
            {esSuspender ? '⏸' : '▶'}
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>
            {esSuspender ? `Suspender acceso a ${empresa.name}` : `Reactivar acceso a ${empresa.name}`}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#888780' }}>
            {esSuspender
              ? 'Esta acción bloqueará el acceso al portal de este cliente.'
              : 'Esta acción restaurará el acceso al portal de este cliente.'}
          </p>
        </div>

        {/* Efectos */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.8, marginBottom: 10 }}>
            Qué ocurre al {esSuspender ? 'suspender' : 'reactivar'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {efectos.map((ef, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#2C2C2A' }}>
                <span style={{ fontSize: 15, lineHeight: 1.3, flexShrink: 0 }}>{ef.icon}</span>
                <span>{ef.text}</span>
              </div>
            ))}
          </div>

          {/* Nota técnica */}
          <div style={{ marginTop: 14, padding: '8px 12px', background: '#f8f7f4', borderRadius: 8, fontSize: 11, color: '#888780' }}>
            Campo <code style={{ fontFamily: 'monospace', color: '#534AB7' }}>status</code> cambiará
            de <strong>{empresa.status}</strong> a <strong>{nuevoStatus}</strong>
          </div>

          {error && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#FCEBEB', borderRadius: 8, fontSize: 13, color: '#791F1F' }}>
              {error}
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid #e2e0d8', background: '#fff', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#2C2C2A' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#ccc' : esSuspender ? '#E24B4A' : '#639922',
              color: '#fff',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {loading && <Spinner />}
            {loading ? 'Procesando...' : esSuspender ? 'Sí, suspender acceso' : 'Sí, reactivar acceso'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}
