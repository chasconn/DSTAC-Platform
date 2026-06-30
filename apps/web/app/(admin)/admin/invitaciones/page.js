'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import { confirmDstac, alertDstac } from '../../../../components/admin/ConfirmDialog'

function fmt(d) { try { return new Date(d).toLocaleDateString('es-CL') } catch { return '—' } }
function expirado(d) { return d && new Date(d) < new Date() }

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function AdminInvitacionesPage() {
  const [empresas, setEmpresas]       = useState([])
  const [empresa, setEmpresa]         = useState('')
  const [data, setData]               = useState(null)
  const [loadingEq, setLoadingEq]     = useState(false)
  const [email, setEmail]             = useState('')
  const [enviando, setEnviando]       = useState(false)
  const [toast, setToast]             = useState(null)

  function showToast(msg, tipo = 'ok') { setToast({ msg, tipo }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    apiFetch('/api/admin/empresas/selector')
      .then(d => setEmpresas(d.clientes ?? []))
      .catch(() => {})
  }, [])

  const cargarEquipo = useCallback(async (cid) => {
    if (!cid) return
    setLoadingEq(true)
    try {
      const d = await apiFetch(`/api/admin/invitaciones/empresa/${cid}`)
      setData(d)
    } catch (err) { showToast(err.message || 'Error', 'error') }
    finally { setLoadingEq(false) }
  }, [])

  function handleEmpresa(cid) { setEmpresa(cid); setData(null); if (cid) cargarEquipo(cid) }

  async function invitar(e) {
    e.preventDefault()
    if (!empresa || !email.trim()) return
    setEnviando(true)
    try {
      await apiFetch('/api/admin/invitaciones', {
        method: 'POST',
        body: JSON.stringify({ company_id: empresa, email: email.trim() }),
      })
      showToast(`Invitación enviada a ${email.trim()}`)
      setEmail('')
      cargarEquipo(empresa)
    } catch (err) { showToast(err.message || 'Error al enviar', 'error') }
    finally { setEnviando(false) }
  }

  async function reenviar(id) {
    try {
      await apiFetch(`/api/admin/invitaciones/${id}/reenviar`, { method: 'POST', body: '{}' })
      showToast('Invitación reenviada')
      cargarEquipo(empresa)
    } catch (err) { showToast(err.message || 'Error', 'error') }
  }

  async function cancelar(id, correo) {
    if (!await confirmDstac(`¿Cancelar la invitación a ${correo}?`, { titulo: 'Cancelar invitación', textoConfirmar: 'Cancelar', peligro: true })) return
    try {
      await apiFetch(`/api/admin/invitaciones/${id}`, { method: 'DELETE' })
      showToast('Invitación cancelada')
      cargarEquipo(empresa)
    } catch (err) { showToast(err.message || 'Error', 'error') }
  }

  const BTN = { background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const BTN2 = { ...BTN, background: '#fff', color: '#444441', border: '1px solid #e2e0d8' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Equipo de clientes</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>Invita trabajadores a cualquier empresa cliente para que accedan a la capacitación.</p>
      </div>

      {toast && (
        <div style={{ background: toast.tipo === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.tipo === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.tipo === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      {/* Selector de empresa + invitar */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Selecciona empresa e invita</div>
        <form onSubmit={invitar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888780', marginBottom: 4 }}>EMPRESA</div>
            <select value={empresa} onChange={e => handleEmpresa(e.target.value)} style={{ ...SEL, minWidth: 220 }}>
              <option value="">— Seleccionar empresa —</option>
              {empresas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888780', marginBottom: 4 }}>CORREO DEL TRABAJADOR</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="trabajador@empresa.cl"
              style={{ ...SEL, width: '100%', boxSizing: 'border-box' }} required />
          </div>
          <button type="submit" disabled={!empresa || enviando} style={{ ...BTN, opacity: (!empresa || enviando) ? 0.6 : 1 }}>
            {enviando ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>
      </div>

      {/* Equipo de la empresa seleccionada */}
      {empresa && (
        loadingEq ? <div style={{ fontSize: 13, color: '#888780' }}>Cargando equipo…</div> :
        data && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Usuarios */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Usuarios de {data.empresa?.name} ({data.usuarios?.length ?? 0})
              </div>
              {(data.usuarios ?? []).length === 0 ? (
                <div style={{ background: '#f8f7f4', borderRadius: 12, padding: 20, fontSize: 13, color: '#888780', textAlign: 'center' }}>Sin usuarios registrados</div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px', padding: '8px 16px', background: '#f8f7f4', borderBottom: '1px solid #e2e0d8' }}>
                    {['Correo / Nombre', 'Rol', 'Último acceso', 'Estado'].map(h => (
                      <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
                    ))}
                  </div>
                  {data.usuarios.map((u, i) => (
                    <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px', padding: '10px 16px', borderBottom: i < data.usuarios.length - 1 ? '1px solid #f1efe8' : 'none', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize: 12, color: '#888780' }}>{u.email}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#444441' }}>{u.role === 'cliente_admin' ? 'Administrador' : 'Trabajador'}</div>
                      <div style={{ fontSize: 12, color: '#888780' }}>{u.last_login ? fmt(u.last_login) : 'Nunca'}</div>
                      <span style={{ background: u.status === 'active' ? '#EAF3DE' : '#F1EFE8', color: u.status === 'active' ? '#27500A' : '#888780', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, display: 'inline-block' }}>
                        {u.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invitaciones */}
            {(data.invitaciones ?? []).length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Invitaciones enviadas
                </div>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
                  {data.invitaciones.map((inv, i) => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < data.invitaciones.length - 1 ? '1px solid #f1efe8' : 'none', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{inv.email}</div>
                        <div style={{ fontSize: 12, color: '#888780' }}>Enviada {fmt(inv.created_at)} · Expira {fmt(inv.expires_at)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {inv.used_at && <span style={{ fontSize: 11, fontWeight: 600, color: '#27500A', background: '#EAF3DE', padding: '2px 8px', borderRadius: 20 }}>Usada</span>}
                        {!inv.used_at && expirado(inv.expires_at) && <span style={{ fontSize: 11, fontWeight: 600, color: '#791F1F', background: '#FCEBEB', padding: '2px 8px', borderRadius: 20 }}>Expirada</span>}
                        {!inv.used_at && <button onClick={() => reenviar(inv.id)} style={{ ...BTN2, fontSize: 12, padding: '5px 12px' }}>Reenviar</button>}
                        {!inv.used_at && <button onClick={() => cancelar(inv.id, inv.email)} style={{ ...BTN2, fontSize: 12, padding: '5px 12px', color: '#791F1F', borderColor: '#E8A6A6' }}>Cancelar</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
