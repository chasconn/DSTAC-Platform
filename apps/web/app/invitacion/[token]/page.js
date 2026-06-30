'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const INP = { width: '100%', boxSizing: 'border-box', height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 14, outline: 'none', fontFamily: 'inherit' }

export default function AceptarInvitacionPage() {
  const { token } = useParams()
  const router    = useRouter()

  const [info, setInfo]       = useState(null)   // { email, company_name }
  const [estado, setEstado]   = useState('cargando') // cargando | formulario | enviando | ok | error
  const [error, setError]     = useState(null)
  const [form, setForm]       = useState({ nombre: '', apellido: '', password: '', confirm: '' })

  useEffect(() => {
    fetch(`/api/invitacion/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setEstado('error') }
        else { setInfo(d); setEstado('formulario') }
      })
      .catch(() => { setError('No se pudo conectar con el servidor'); setEstado('error') })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setError(null)
    setEstado('enviando')
    try {
      const r = await fetch(`/api/invitacion/${token}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, apellido: form.apellido, password: form.password }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Error al crear la cuenta'); setEstado('formulario') }
      else { setEstado('ok') }
    } catch { setError('No se pudo conectar con el servidor'); setEstado('formulario') }
  }

  const card = {
    background: '#fff', borderRadius: 16, padding: '36px 32px',
    border: '1px solid #e2e0d8', width: '100%', maxWidth: 440,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{ background: '#3C3489', display: 'inline-block', padding: '8px 18px', borderRadius: 8, marginBottom: 12 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: 1 }}>DSTAC</span>
        </div>
      </div>

      {estado === 'cargando' && (
        <div style={card}>
          <p style={{ textAlign: 'center', color: '#888780', fontSize: 14 }}>Validando invitación…</p>
        </div>
      )}

      {estado === 'error' && (
        <div style={card}>
          <div style={{ textAlign: 'center', fontSize: 36, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#2C2C2A', textAlign: 'center' }}>Invitación no válida</h2>
          <p style={{ fontSize: 14, color: '#888780', textAlign: 'center', lineHeight: 1.6 }}>{error}</p>
          <p style={{ fontSize: 13, color: '#888780', textAlign: 'center', marginTop: 16 }}>Contacta a tu administrador o escríbenos a <strong>contacto@dstac.cl</strong></p>
        </div>
      )}

      {(estado === 'formulario' || estado === 'enviando') && info && (
        <div style={card}>
          <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#2C2C2A' }}>Crea tu cuenta</h1>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888780', lineHeight: 1.6 }}>
            Invitado por <strong>{info.company_name}</strong> · {info.email}
          </p>
          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#791F1F', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', display: 'block', marginBottom: 4 }}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Tu nombre" style={INP} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', display: 'block', marginBottom: 4 }}>Apellido</label>
                <input value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} placeholder="Tu apellido" style={INP} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', display: 'block', marginBottom: 4 }}>Correo electrónico</label>
              <input value={info.email} disabled style={{ ...INP, background: '#f8f7f4', color: '#888780' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', display: 'block', marginBottom: 4 }}>Contraseña * (mín. 8 caracteres)</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Contraseña" style={INP} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', display: 'block', marginBottom: 4 }}>Confirmar contraseña *</label>
              <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repite tu contraseña" style={INP} required />
            </div>
            <button type="submit" disabled={estado === 'enviando'}
              style={{ background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4, opacity: estado === 'enviando' ? 0.7 : 1 }}>
              {estado === 'enviando' ? 'Creando cuenta…' : 'Crear mi cuenta →'}
            </button>
          </form>
        </div>
      )}

      {estado === 'ok' && (
        <div style={card}>
          <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 16 }}>🛡️</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#2C2C2A', textAlign: 'center' }}>Cuenta creada</h2>
          <p style={{ fontSize: 14, color: '#444441', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
            Tu acceso está listo. Inicia sesión para completar tu capacitación de ciberseguridad.
          </p>
          <button onClick={() => router.push('/login')}
            style={{ width: '100%', background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Ir al inicio de sesión →
          </button>
        </div>
      )}

      <p style={{ marginTop: 28, fontSize: 11, color: '#B4B2A9' }}>DSTAC Security · www.dstac.cl</p>
    </div>
  )
}
