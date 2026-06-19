'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'

const NAVY = '#1a1740', PURPLE = '#534AB7'
const ESTADO = { borrador: { label: 'Borrador', bg: '#F1EFE8', text: '#444441' }, enviada: { label: 'Enviada', bg: '#E6F1FB', text: '#0C447C' } }
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function PhishingPage() {
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [campanas, setCampanas] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [personal, setPersonal] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [showNueva, setShowNueva] = useState(false)
  const [toast, setToast] = useState('')
  const [enviando, setEnviando] = useState(null)
  const [creando, setCreando] = useState(false)

  const [f, setF] = useState({ nombre: '', plantilla_id: '', personal_ids: [] })

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    if (raw) { try { setEmpresaActiva(JSON.parse(raw)) } catch {} }
  }, [])

  const slug = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const cargarCampanas = useCallback(async () => {
    if (!slug) return
    try { const r = await api.get('/api/admin/phishing', headers); setCampanas(r.campanas ?? []) }
    catch { showToast('No se pudo cargar las campañas') }
  }, [slug])
  useEffect(() => { cargarCampanas() }, [cargarCampanas])

  useEffect(() => {
    if (!slug) return
    api.get('/api/admin/phishing/plantillas', headers).then(r => setPlantillas(r.plantillas ?? [])).catch(() => {})
    api.get('/api/admin/personal?estado=activo&limit=500', headers).then(r => setPersonal(r.personal ?? [])).catch(() => {})
  }, [slug])

  function togglePersona(id) {
    setF(p => ({ ...p, personal_ids: p.personal_ids.includes(id) ? p.personal_ids.filter(x => x !== id) : [...p.personal_ids, id] }))
  }

  async function crearCampana() {
    if (!f.nombre.trim()) return showToast('Indica un nombre para la campaña')
    if (!f.plantilla_id) return showToast('Elige una plantilla')
    if (!f.personal_ids.length) return showToast('Selecciona al menos una persona')
    setCreando(true)
    try {
      await api.post('/api/admin/phishing', f, headers)
      showToast('Campaña creada como borrador')
      setShowNueva(false); setF({ nombre: '', plantilla_id: '', personal_ids: [] })
      cargarCampanas()
    } catch (e) { showToast(e.message || 'Error al crear la campaña') }
    finally { setCreando(false) }
  }

  async function enviarCampana(id) {
    setEnviando(id)
    try {
      const r = await api.post(`/api/admin/phishing/${id}/enviar`, {}, headers)
      showToast(`Enviada: ${r.enviados} correo(s)${r.errores ? ` · ${r.errores} con error` : ''}`)
      cargarCampanas()
      if (detalle?.id === id) abrirDetalle(id)
    } catch (e) { showToast(e.message || 'Error al enviar') }
    finally { setEnviando(null) }
  }

  async function eliminarCampana(id) {
    if (!confirm('¿Eliminar esta campaña y sus destinatarios?')) return
    try { await api.delete(`/api/admin/phishing/${id}`, headers); showToast('Campaña eliminada'); setDetalle(null); cargarCampanas() }
    catch (e) { showToast(e.message || 'Error al eliminar') }
  }

  async function abrirDetalle(id) {
    try { const d = await api.get(`/api/admin/phishing/${id}`, headers); setDetalle(d) }
    catch (e) { showToast(e.message || 'No se pudo cargar el detalle') }
  }

  if (!slug) return <div style={{ padding: 24 }}>Selecciona una empresa para gestionar sus simulaciones de phishing.</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>🎣 Simulación de Phishing</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{empresaActiva?.name} · concientización del personal</div>
        </div>
        <button onClick={() => setShowNueva(s => !s)}
          style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {showNueva ? 'Cancelar' : '+ Nueva campaña'}
        </button>
      </div>

      {showNueva && (
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Nueva campaña</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888780', display: 'block', marginBottom: 5 }}>Nombre de la campaña</label>
              <input value={f.nombre} onChange={e => setF(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Q1 2026 - Phishing general"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888780', display: 'block', marginBottom: 5 }}>Plantilla</label>
              <select value={f.plantilla_id} onChange={e => setF(p => ({ ...p, plantilla_id: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 14 }}>
                <option value="">— Elige una plantilla —</option>
                {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#888780', display: 'block', marginBottom: 5 }}>
            Destinatarios ({f.personal_ids.length} seleccionados)
          </label>
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e0d8', borderRadius: 8, padding: 8 }}>
            {personal.length === 0 && <div style={{ fontSize: 12.5, color: '#888780', padding: 8 }}>No hay personal activo con correo registrado en esta empresa.</div>}
            {personal.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.personal_ids.includes(p.id)} onChange={() => togglePersona(p.id)} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{p.nombre}</div>
                  <div style={{ fontSize: 11.5, color: '#888780' }}>{p.correo || 'sin correo'}{p.rol_empresarial ? ` · ${p.rol_empresarial}` : ''}</div>
                </div>
              </label>
            ))}
          </div>

          <button onClick={crearCampana} disabled={creando}
            style={{ marginTop: 14, background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>
            {creando ? 'Creando…' : 'Crear campaña (borrador)'}
          </button>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18 }}>
        <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Campañas · {empresaActiva?.name}</div>
        {campanas.length === 0
          ? <div style={{ fontSize: 13, color: '#888780' }}>Aún no hay campañas de phishing para esta empresa.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f7f4' }}>
                  <th style={th}>Nombre</th>
                  <th style={th}>Estado</th>
                  <th style={{ ...th, textAlign: 'center' }}>Enviados</th>
                  <th style={{ ...th, textAlign: 'center' }}>Abiertos</th>
                  <th style={{ ...th, textAlign: 'center' }}>Clics</th>
                  <th style={th}>Creada</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {campanas.map(c => (
                  <tr key={c.id} onClick={() => abrirDetalle(c.id)} style={{ cursor: 'pointer' }}>
                    <td style={td}>{c.nombre}</td>
                    <td style={td}><span style={{ background: ESTADO[c.estado]?.bg, color: ESTADO[c.estado]?.text, borderRadius: 999, padding: '3px 10px', fontWeight: 600, fontSize: 11.5 }}>{ESTADO[c.estado]?.label}</span></td>
                    <td style={{ ...td, textAlign: 'center' }}>{c.enviados}/{c.total}</td>
                    <td style={{ ...td, textAlign: 'center', color: c.abiertos > 0 ? '#C98A1E' : '#B4B2A9', fontWeight: 600 }}>{c.abiertos}</td>
                    <td style={{ ...td, textAlign: 'center', color: c.clics > 0 ? '#C0392B' : '#B4B2A9', fontWeight: 700 }}>{c.clics}</td>
                    <td style={td}>{fmt(c.created_at)}</td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.estado === 'borrador' && (
                          <button onClick={() => enviarCampana(c.id)} disabled={enviando === c.id}
                            style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                            {enviando === c.id ? 'Enviando…' : '✉ Enviar'}
                          </button>
                        )}
                        <button onClick={() => eliminarCampana(c.id)}
                          style={{ background: '#FCEBEB', color: '#C0392B', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {detalle && (
        <>
          <div onClick={() => setDetalle(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,20,.35)', zIndex: 80 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 96vw)', background: '#fff', zIndex: 81, boxShadow: '-8px 0 30px rgba(0,0,0,.18)', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>{detalle.nombre}</h2>
              <button onClick={() => setDetalle(null)} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#888780', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, color: '#888780', marginTop: 4, marginBottom: 16 }}>
              Plantilla: {plantillas.find(p => p.id === detalle.plantilla_id)?.nombre || detalle.plantilla_id}
            </div>
            {detalle.destinatarios.map(d => (
              <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{d.nombre || d.correo}</div>
                <div style={{ fontSize: 11.5, color: '#888780' }}>{d.correo}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                  <span style={{ color: d.enviado_at ? '#1D9E75' : '#B4B2A9' }}>{d.enviado_at ? '✓ Enviado' : 'Pendiente'}</span>
                  <span style={{ color: d.abierto_at ? '#C98A1E' : '#B4B2A9' }}>{d.abierto_at ? '✓ Abierto' : 'No abierto'}</span>
                  <span style={{ color: d.clic_at ? '#C0392B' : '#B4B2A9', fontWeight: d.clic_at ? 700 : 400 }}>{d.clic_at ? '✓ Clic' : 'Sin clic'}</span>
                </div>
                {d.error && <div style={{ fontSize: 11, color: '#C0392B', marginTop: 2 }}>Error: {d.error}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div>}
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e0d8' }
const td = { padding: '8px 10px', fontSize: 13, color: '#2C2C2A', borderBottom: '1px solid #f5f4ef' }
