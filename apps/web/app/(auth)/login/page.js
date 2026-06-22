'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '../../../lib/api'
import { saveUserDisplay, getRedirectPath } from '../../../lib/auth'
import NetworkBackground from '../../../components/NetworkBackground'

const STEPS = { CREDENTIALS: 1, MFA: 2, SUCCESS: 3 }

const CHECKS = ['Usuario', 'Contraseña', 'Empresa', 'Permisos', 'MFA']

export default function LoginPage() {
  const [step, setStep]             = useState(STEPS.CREDENTIALS)
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [tempToken, setTempToken]   = useState(null)
  const [mfaDigits, setMfaDigits]   = useState(['', '', '', '', '', ''])
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [checksVisible, setChecksVisible]   = useState([])
  const inputsRef = useRef([])

  // Countdown para reenviar
  useEffect(() => {
    if (step !== STEPS.MFA) return
    setResendCooldown(60)
    const iv = setInterval(() => {
      setResendCooldown(c => (c <= 1 ? (clearInterval(iv), 0) : c - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [step])

  // Animación de checkmarks en paso 3
  useEffect(() => {
    if (step !== STEPS.SUCCESS) return
    setChecksVisible([])
    CHECKS.forEach((_, i) => {
      setTimeout(() => setChecksVisible(prev => [...prev, i]), i * 220)
    })
  }, [step])

  // ─── Paso 1: credenciales ──────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/api/auth/login', { email, password })
      setTempToken(data.temp_token)
      setStep(STEPS.MFA)
    } catch (err) {
      setError(err.message || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  // ─── Paso 2: MFA ──────────────────────────────────────────────────────────
  function handleMfaInput(index, value) {
    if (!/^\d?$/.test(value)) return
    const next = [...mfaDigits]
    next[index] = value
    setMfaDigits(next)
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
  }

  function handleMfaKeyDown(index, e) {
    if (e.key === 'Backspace' && !mfaDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handleMfaPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setMfaDigits(pasted.split(''))
      inputsRef.current[5]?.focus()
    }
  }

  async function handleVerifyMfa(e) {
    e.preventDefault()
    const codigo = mfaDigits.join('')
    if (codigo.length < 6) return
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/api/auth/verify-mfa', { temp_token: tempToken, codigo })

      // El usuario debe cambiar su contraseña temporal antes de acceder
      if (data.requires_password_change) {
        sessionStorage.setItem('change_token', data.change_token)
        window.location.href = '/change-password'
        return
      }

      // Guardar datos de display (NO el token — ese está en la cookie HttpOnly)
      saveUserDisplay({ email, role: data.role, first_name: null })
      setStep(STEPS.SUCCESS)
      // Redirigir tras la animación de éxito
      setTimeout(() => {
        window.location.href = getRedirectPath(data.role)
      }, CHECKS.length * 220 + 600)
    } catch (err) {
      if (err.message === 'contrasena_expirada') {
        setError('Tu contraseña temporal expiró. Contacta a tu administrador para recibir una nueva.')
      } else {
        setError(err.message || 'Código incorrecto')
      }
      setMfaDigits(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/api/auth/login', { email, password })
      setTempToken(data.temp_token)
      setResendCooldown(60)
      setMfaDigits(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } catch (err) {
      setError('No se pudo reenviar el código. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  // Fondo animado a pantalla completa (sin breakpoints que lo oculten en
  // tablet) con la tarjeta de login centrada encima — reemplaza el panel
  // lateral que antes solo se veía en desktop (≥1024px).
  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: '#13102b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <NetworkBackground />

      <div style={{ position: 'relative', width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, padding: '36px 38px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1c1c22', marginBottom: 20 }}>
            DSTAC <span style={{ color: '#534AB7' }}>SECURITY</span>
          </div>

          {/* Indicador de progreso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 36 }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600,
                  background: step > n ? '#639922' : step === n ? '#3C3489' : '#f1efe8',
                  color: step >= n ? '#fff' : '#B4B2A9',
                  transition: 'background 0.3s'
                }}>
                  {step > n ? '✓' : n}
                </div>
                {n < 3 && (
                  <div style={{ width: 28, height: 2, background: step > n ? '#639922' : '#e2e0d8', borderRadius: 99, transition: 'background 0.3s' }} />
                )}
              </div>
            ))}
            <span style={{ marginLeft: 8, fontSize: 13, color: '#888780' }}>
              {step === STEPS.CREDENTIALS ? 'Credenciales' : step === STEPS.MFA ? 'Verificación' : 'Acceso concedido'}
            </span>
          </div>

          {/* ── PASO 1: Credenciales ──────────────────────────────────── */}
          {step === STEPS.CREDENTIALS && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2C2C2A', margin: '0 0 4px' }}>Bienvenido</h2>
              <p style={{ fontSize: 13, color: '#888780', marginBottom: 28 }}>Ingresa con tu cuenta DSTAC</p>

              <form onSubmit={handleLogin}>
                <Field label="Correo o usuario">
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#3C3489')}
                    onBlur={e => (e.target.style.borderColor = '#e2e0d8')}
                  />
                </Field>

                <Field label="Contraseña">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#3C3489')}
                    onBlur={e => (e.target.style.borderColor = '#e2e0d8')}
                  />
                </Field>

                {error && <ErrorMsg>{error}</ErrorMsg>}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  style={{
                    ...btnPrimary,
                    opacity: (loading || !email.trim() || !password.trim()) ? 0.5 : 1,
                    cursor: (loading || !email.trim() || !password.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? <><Spinner /> Verificando...</> : 'Continuar'}
                </button>
              </form>
            </>
          )}

          {/* ── PASO 2: MFA ───────────────────────────────────────────── */}
          {step === STEPS.MFA && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2C2C2A', margin: '0 0 4px' }}>Verificación</h2>
              <p style={{ fontSize: 13, color: '#888780', marginBottom: 4 }}>
                Código enviado a tu correo · Expira en 5 minutos
              </p>
              <p style={{ fontSize: 12, color: '#B4B2A9', marginBottom: 24 }}>
                Revisa también la carpeta de spam
              </p>

              <form onSubmit={handleVerifyMfa}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={handleMfaPaste}>
                  {mfaDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => (inputsRef.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      autoFocus={i === 0}
                      onChange={e => handleMfaInput(i, e.target.value)}
                      onKeyDown={e => handleMfaKeyDown(i, e)}
                      style={{
                        width: 46, height: 56, textAlign: 'center',
                        fontSize: 22, fontWeight: 700, borderRadius: 10,
                        border: `2px solid ${d ? '#3C3489' : '#e2e0d8'}`,
                        background: d ? '#EEEDFE' : '#fff',
                        color: '#2C2C2A', outline: 'none',
                        transition: 'border-color 0.15s, background 0.15s'
                      }}
                    />
                  ))}
                </div>

                {error && <ErrorMsg>{error}</ErrorMsg>}

                <button
                  type="submit"
                  disabled={loading || mfaDigits.join('').length < 6}
                  style={{
                    ...btnPrimary,
                    opacity: (loading || mfaDigits.join('').length < 6) ? 0.5 : 1,
                    cursor: (loading || mfaDigits.join('').length < 6) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? <><Spinner /> Verificando...</> : 'Confirmar acceso'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setStep(STEPS.CREDENTIALS); setError(''); setMfaDigits(['','','','','','']) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888780' }}
                  >
                    ← Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    style={{
                      background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      fontSize: 13, color: resendCooldown > 0 ? '#B4B2A9' : '#534AB7',
                      fontWeight: 500
                    }}
                  >
                    {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── PASO 3: Éxito ─────────────────────────────────────────── */}
          {step === STEPS.SUCCESS && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#EAF3DE', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px', fontSize: 28
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', marginBottom: 8 }}>Acceso concedido</h2>
              <p style={{ fontSize: 13, color: '#888780', marginBottom: 28 }}>Redirigiendo a tu panel...</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                {CHECKS.map((label, i) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: checksVisible.includes(i) ? '#EAF3DE' : '#f8f7f4',
                    transition: 'background 0.3s',
                    opacity: checksVisible.includes(i) ? 1 : 0.4,
                  }}>
                    <span style={{ fontSize: 16, color: checksVisible.includes(i) ? '#639922' : '#B4B2A9' }}>
                      {checksVisible.includes(i) ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

      </div>
    </div>
  )
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2C2C2A', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorMsg({ children }) {
  return (
    <div style={{ fontSize: 13, color: '#E24B4A', background: '#FCEBEB', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
      {children}
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
  background: '#fff'
}

const btnPrimary = {
  width: '100%', padding: '11px 0',
  background: '#3C3489', color: '#fff',
  border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'opacity 0.15s',
  marginTop: 4
}
