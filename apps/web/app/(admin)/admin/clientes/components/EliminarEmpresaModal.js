'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'

// Acción irreversible: borra la BD operacional completa de la empresa (todos
// sus activos, identidades, personal, incidentes, diagnósticos, etc.) y el
// registro central. Por eso pide escribir el slug exacto, no solo "Cancelar/Confirmar".
export default function EliminarEmpresaModal({ empresa, onClose, onDone }) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const habilitado = confirmText.trim() === empresa.slug

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleConfirm() {
    if (!habilitado) return
    setError(''); setLoading(true)
    try {
      await api.delete(`/api/companies/${empresa.slug}`)
      onDone(empresa)
    } catch (err) {
      setError(err.message || 'Error al eliminar la empresa')
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

        <div style={{ padding: '24px 24px 16px', textAlign: 'center', borderBottom: '1px solid #f1efe8' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🗑️
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>Eliminar {empresa.name}</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#888780' }}>Esta acción es permanente y no se puede deshacer.</p>
        </div>

        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.8, marginBottom: 10 }}>
            Esto eliminará para siempre
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              'La base de datos operacional completa (activos, identidades, personal, accesos, incidentes, riesgos, diagnósticos, EDR, ISO/NIST, cotizaciones asociadas)',
              'Todos los usuarios de esta empresa pierden acceso de inmediato',
              'No queda copia recuperable desde la plataforma',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#2C2C2A' }}>
                <span style={{ fontSize: 14, lineHeight: 1.3, flexShrink: 0, color: '#C0392B' }}>•</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: 12, color: '#444441', marginBottom: 6 }}>
            Para confirmar, escribe el identificador exacto: <code style={{ background: '#F1EFE8', padding: '1px 6px', borderRadius: 4, color: '#791F1F', fontWeight: 700 }}>{empresa.slug}</code>
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={empresa.slug}
            autoFocus
            style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }}
          />

          {error && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#FCEBEB', borderRadius: 8, fontSize: 13, color: '#791F1F' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e2e0d8', background: '#fff', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#2C2C2A' }}>
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!habilitado || loading}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: (!habilitado || loading) ? 'not-allowed' : 'pointer',
              background: (!habilitado || loading) ? '#F0C4C4' : '#C0392B',
              color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  )
}
