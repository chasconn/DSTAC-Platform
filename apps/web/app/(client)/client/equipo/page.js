'use client'

import { useState, useEffect } from 'react'
import { confirmDstac, alertDstac } from '../../../../components/admin/ConfirmDialog'

function fmt(d) { try { return new Date(d).toLocaleDateString('es-CL') } catch { return '—' } }
function expirado(d) { return d && new Date(d) < new Date() }

export default function ClienteEquipoPage() {
  const [data, setData]       = useState({ usuarios: [], invitaciones: [] })
  const [loading, setLoading] = useState(true)
  const [email, setEmail]     = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast]     = useState(null)

  function showToast(msg, tipo = 'ok') { setToast({ msg, tipo }); setTimeout(() => setToast(null), 4000) }

  function cargar() {
    setLoading(true)
    fetch('/api/client/equipo', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setData({ usuarios: d.usuarios ?? [], invitaciones: d.invitaciones ?? [] }))
      .catch(() => showToast('No se pudo cargar el equipo', 'error'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [])

  async function invitar(e) {
    e.preventDefault()
    if (!email.trim()) return
    setEnviando(true)
    try {
      const r = await fetch('/api/client/equipo/invitar', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      showToast(`Invitación enviada a ${email.trim()}`)
      setEmail('')
      cargar()
    } catch (err) { showToast(err.message || 'Error al enviar', 'error') }
    finally { setEnviando(false) }
  }

  async function cancelarInvitacion(id, correo) {
    if (!await confirmDstac(`¿Cancelar la invitación a ${correo}?`, { titulo: 'Cancelar invitación', textoConfirmar: 'Cancelar invitación', peligro: true })) return
    try {
      await fetch(`/api/client/equipo/invitaciones/${id}`, { method: 'DELETE', credentials: 'include' })
      showToast('Invitación cancelada')
      cargar()
    } catch { showToast('Error al cancelar', 'error') }
  }

  async function toggleEstado(u) {
    const nuevoEstado = u.status === 'active' ? 'inactive' : 'active'
    const accion = nuevoEstado === 'inactive' ? 'desactivar' : 'activar'
    if (!await confirmDstac(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${u.email}?`, { titulo: `${accion.charAt(0).toUpperCase() + accion.slice(1)} trabajador`, textoConfirmar: accion.charAt(0).toUpperCase() + accion.slice(1), peligro: nuevoEstado === 'inactive' })) return
    try {
      await fetch(`/api/client/equipo/usuarios/${u.id}/estado`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      showToast(`Usuario ${nuevoEstado === 'active' ? 'activado' : 'desactivado'}`)
      cargar()
    } catch { showToast('Error al actualizar', 'error') }
  }

  const INP = { flex: 1, height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 28, maxWidth: 740 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Mi equipo</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
          Invita a tus trabajadores para que accedan a la capacitación de ciberseguridad.
        </p>
      </div>

      {toast && (
        <div style={{ background: toast.tipo === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.tipo === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.tipo === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      {/* Formulario de invitación */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Invitar trabajador</div>
        <form onSubmit={invitar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@empresa.cl" style={INP} required />
          <button type="submit" disabled={enviando}
            style={{ background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 38, opacity: enviando ? 0.7 : 1 }}>
            {enviando ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>
        <p style={{ fontSize: 12, color: '#888780', marginTop: 8 }}>
          El trabajador recibirá un correo con un link para crear su contraseña. El acceso expira en 72 h si no lo activa.
        </p>
      </div>

      {loading ? <div style={{ fontSize: 13, color: '#888780' }}>Cargando…</div> : (
        <>
          {/* Usuarios activos */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Trabajadores activos ({data.usuarios.length})
            </div>
            {data.usuarios.length === 0 ? (
              <div style={{ background: '#f8f7f4', borderRadius: 12, padding: '24px', textAlign: 'center', fontSize: 13, color: '#888780' }}>
                Aún no hay trabajadores. Envía la primera invitación.
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
                {data.usuarios.map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < data.usuarios.length - 1 ? '1px solid #f1efe8' : 'none', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{u.first_name} {u.last_name}</div>
                      <div style={{ fontSize: 12, color: '#888780' }}>{u.email} · Último acceso: {u.last_login ? fmt(u.last_login) : 'Nunca'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ background: u.status === 'active' ? '#EAF3DE' : '#F1EFE8', color: u.status === 'active' ? '#27500A' : '#888780', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                        {u.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                      <button onClick={() => toggleEstado(u)} style={{ background: 'none', border: '1px solid #e2e0d8', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#444441' }}>
                        {u.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invitaciones pendientes */}
          {data.invitaciones.filter(i => !i.used_at).length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Invitaciones pendientes
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
                {data.invitaciones.filter(i => !i.used_at).map((inv, i, arr) => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f1efe8' : 'none', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{inv.email}</div>
                      <div style={{ fontSize: 12, color: '#888780' }}>Enviada {fmt(inv.created_at)} · Expira {fmt(inv.expires_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {expirado(inv.expires_at) && <span style={{ fontSize: 11, fontWeight: 600, color: '#791F1F', background: '#FCEBEB', padding: '2px 8px', borderRadius: 20 }}>Expirada</span>}
                      <button onClick={() => cancelarInvitacion(inv.id, inv.email)} style={{ background: 'none', border: '1px solid #e2e0d8', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#791F1F' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
