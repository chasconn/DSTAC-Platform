'use client'

import { useState, useEffect } from 'react'
import { saveUserDisplay, getRedirectPath } from '../../../lib/auth'

const REQUISITOS = [
  { id: 'length',   label: 'Mínimo 8 caracteres',          test: p => p.length >= 8            },
  { id: 'upper',    label: 'Al menos una mayúscula',        test: p => /[A-Z]/.test(p)          },
  { id: 'number',   label: 'Al menos un número',            test: p => /[0-9]/.test(p)          },
  { id: 'symbol',   label: 'Al menos un símbolo (!@#$%^&*)', test: p => /[!@#$%^&*]/.test(p)   },
]

export default function ChangePasswordPage() {
  const [changeToken, setChangeToken] = useState(null)
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [errores, setErrores]         = useState([])

  useEffect(() => {
    const token = sessionStorage.getItem('change_token')
    if (!token) {
      window.location.href = '/login'
      return
    }
    setChangeToken(token)
  }, [])

  const requisitos = REQUISITOS.map(r => ({ ...r, ok: r.test(password) }))
  const todoOk     = requisitos.every(r => r.ok)
  const coinciden  = password === confirm && confirm.length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!todoOk || !coinciden) return

    setError('')
    setErrores([])
    setLoading(true)

    try {
      // Usar el mismo hostname del browser para que la cookie quede en el dominio correcto.
      // Si el browser está en 127.0.0.1:3000 y el fetch va a localhost:3001, la cookie queda
      // en "localhost" y Next.js no la ve cuando carga /client/dashboard desde 127.0.0.1.
      const apiBase = process.env.NEXT_PUBLIC_API_URL
        || `${window.location.protocol}//${window.location.hostname}:3001`

      const res = await fetch(`${apiBase}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_token: changeToken, new_password: password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errores) setErrores(data.errores)
        else setErrores([data.error ?? 'Error al cambiar contraseña'])
        return
      }

      sessionStorage.removeItem('change_token')
      saveUserDisplay({ role: data.role, first_name: data.first_name ?? null })
      window.location.href = getRedirectPath(data.role)
    } catch {
      setErrores(['Error de conexión. Intenta nuevamente.'])
    } finally {
      setLoading(false)
    }
  }

  if (!changeToken) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:flex-col"
        style={{ width: '50%', background: '#26215C', flexDirection: 'column', justifyContent: 'space-between', padding: '48px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: 2 }}>DSTAC</span>
        <div>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Establece tu<br />contraseña
          </h1>
          <p style={{ color: '#AFA9EC', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            Tu cuenta fue creada con una contraseña temporal.<br />
            Elige una contraseña personal segura para continuar.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REQUISITOS.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7F77DD', flexShrink: 0 }} />
                <span style={{ color: '#CECBF6', fontSize: 14 }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#534AB7', fontSize: 12 }}>© 2026 DSTAC — Todos los derechos reservados</p>
      </div>

      {/* Panel derecho */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2C2C2A', margin: '0 0 4px' }}>Nueva contraseña</h2>
            <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
              Elige una contraseña que no hayas usado antes.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Campo contraseña */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2C2C2A', marginBottom: 6 }}>
                Nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => (e.target.style.borderColor = '#3C3489')}
                  onBlur={e => (e.target.style.borderColor = '#e2e0d8')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 13, padding: 2 }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Indicador de fortaleza */}
            {password.length > 0 && (
              <div style={{ marginBottom: 16, background: '#f8f7f4', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {requisitos.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: r.ok ? '#639922' : '#B4B2A9', fontSize: 14, lineHeight: 1 }}>
                      {r.ok ? '✓' : '○'}
                    </span>
                    <span style={{ color: r.ok ? '#2C2C2A' : '#888780', fontWeight: r.ok ? 500 : 400 }}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmar contraseña */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2C2C2A', marginBottom: 6 }}>
                Confirmar contraseña
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  borderColor: confirm.length > 0 ? (coinciden ? '#639922' : '#E24B4A') : '#e2e0d8',
                }}
                onFocus={e => { if (!confirm.length) e.target.style.borderColor = '#3C3489' }}
                onBlur={e => { if (!confirm.length) e.target.style.borderColor = '#e2e0d8' }}
              />
              {confirm.length > 0 && !coinciden && (
                <p style={{ fontSize: 12, color: '#E24B4A', marginTop: 4 }}>Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Errores del servidor */}
            {(error || errores.length > 0) && (
              <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
                {error || errores.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !todoOk || !coinciden}
              style={{
                width: '100%', padding: '11px 0',
                background: '#3C3489', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: (loading || !todoOk || !coinciden) ? 0.45 : 1,
                cursor: (loading || !todoOk || !coinciden) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {loading
                ? <><Spinner /> Guardando...</>
                : 'Establecer contraseña'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: '#B4B2A9', textAlign: 'center' }}>
            ¿Necesitas ayuda? Contacta a tu administrador DSTAC.
          </p>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite', display: 'inline', marginRight: 6 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  border: '1px solid #e2e0d8', borderRadius: 8,
  fontSize: 14, color: '#2C2C2A', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
  background: '#fff',
}
