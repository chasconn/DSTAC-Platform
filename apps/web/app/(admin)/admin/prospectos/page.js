'use client'

import { useState, useEffect, useMemo } from 'react'
import { api } from '../../../../lib/api'

const ESTADOS = [
  { v: 'nuevo',      label: 'Nuevo',      color: '#534AB7', bg: '#EEEDFE' },
  { v: 'contactado', label: 'Contactado', color: '#9A6700', bg: '#FAF0D7' },
  { v: 'convertido', label: 'Convertido', color: '#1F7A4D', bg: '#E4F6EC' },
  { v: 'descartado', label: 'Descartado', color: '#6B7280', bg: '#F1F1F2' },
]
const estadoMeta = (v) => ESTADOS.find(e => e.v === v) || ESTADOS[0]

function riskColor(r) {
  r = (r || '').toUpperCase()
  if (r.includes('ALTO') || r.includes('CRÍT') || r.includes('CRIT')) return '#D7263D'
  if (r.includes('MEDIO')) return '#C77514'
  if (r.includes('BAJO')) return '#1F8A5B'
  return '#6B7280'
}
const fmtFecha = (s) => { try { return new Date(s).toLocaleString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) } catch { return s || '—' } }

export default function ProspectosPage() {
  const [leads, setLeads]   = useState([])
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo]     = useState('')      // '', 'web_scan', 'cuestionario'
  const [estado, setEstado] = useState('')
  const [search, setSearch] = useState('')
  const [sel, setSel]       = useState(null)    // lead detalle (completo)
  const [toast, setToast]   = useState(null)

  useEffect(() => { fetchLeads() }, [])
  function notify(msg, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 2600) }

  async function fetchLeads() {
    setLoading(true)
    try {
      const data = await api.get('/api/admin/leads')
      setLeads(data.leads || [])
      setCounts(data.counts || [])
    } catch (e) { notify(e.message || 'Error cargando prospectos', false) }
    finally { setLoading(false) }
  }

  async function abrirDetalle(id) {
    try { const d = await api.get(`/api/admin/leads/${id}`); setSel(d) }
    catch (e) { notify(e.message || 'No se pudo abrir', false) }
  }

  async function cambiarEstado(id, nuevoEstado) {
    try {
      await api.patch(`/api/admin/leads/${id}`, { estado: nuevoEstado })
      setLeads(ls => ls.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l))
      setSel(s => s && s.id === id ? { ...s, estado: nuevoEstado } : s)
      fetchLeads() // refrescar contadores
      notify('Estado actualizado')
    } catch (e) { notify(e.message || 'No se pudo actualizar', false) }
  }

  const filtrados = useMemo(() => leads.filter(l => {
    if (tipo && l.tipo !== tipo) return false
    if (estado && l.estado !== estado) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [l.empresa, l.contacto_nombre, l.email, l.dominio].some(x => (x || '').toLowerCase().includes(q))
      if (!hay) return false
    }
    return true
  }), [leads, tipo, estado, search])

  const countOf = (v) => (counts.find(c => c.estado === v)?.n) || 0

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1A1A2E' }}>Prospectos</h1>
      <p style={{ margin: '4px 0 18px', color: '#6E6884', fontSize: 14 }}>Leads captados por el escáner web y el autodiagnóstico</p>

      {/* Contadores por estado */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        {ESTADOS.map(e => (
          <button key={e.v} onClick={() => setEstado(estado === e.v ? '' : e.v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                     border: `1px solid ${estado === e.v ? e.color : '#E6E2F0'}`, background: estado === e.v ? e.bg : '#fff' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
            <b style={{ fontSize: 16, color: '#1A1A2E' }}>{countOf(e.v)}</b>
            <span style={{ fontSize: 12, color: '#6E6884' }}>{e.label}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input placeholder="Buscar empresa, contacto, correo, dominio…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240, padding: '9px 12px', border: '1px solid #E6E2F0', borderRadius: 8, fontSize: 14 }} />
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #E6E2F0', borderRadius: 8, fontSize: 14 }}>
          <option value="">Todos los tipos</option>
          <option value="web_scan">Escáner web</option>
          <option value="cuestionario">Autodiagnóstico</option>
        </select>
        {(tipo || estado || search) && (
          <button onClick={() => { setTipo(''); setEstado(''); setSearch('') }}
            style={{ padding: '9px 14px', border: '1px solid #E6E2F0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#6E6884' }}>Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div style={{ border: '1px solid #E6E2F0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#F7F6FB', color: '#6E6884', textAlign: 'left' }}>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Empresa / Contacto</th>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Tipo</th>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Resultado</th>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6E6884' }}>Cargando…</td></tr>}
            {!loading && filtrados.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6E6884' }}>Sin prospectos.</td></tr>}
            {!loading && filtrados.map(l => {
              const em = estadoMeta(l.estado)
              return (
                <tr key={l.id} onClick={() => abrirDetalle(l.id)}
                    style={{ borderTop: '1px solid #F1EFF7', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFD'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#1A1A2E' }}>{l.empresa || l.dominio || l.contacto_nombre || '—'}</div>
                    <div style={{ color: '#6E6884', fontSize: 12 }}>{l.contacto_nombre}{l.email ? ` · ${l.email}` : ''}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: '#EEF0F4', color: '#3C3489' }}>
                      {l.tipo === 'web_scan' ? 'Escáner web' : 'Autodiagnóstico'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {l.score != null ? <b style={{ color: '#1A1A2E' }}>{l.score}{l.grade ? ` · ${l.grade}` : ''}</b> : '—'}
                    {l.risk && <span style={{ marginLeft: 8, fontSize: 11.5, fontWeight: 700, color: riskColor(l.risk) }}>{l.risk}</span>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: em.color, background: em.bg }}>{em.label}</span>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#6E6884', whiteSpace: 'nowrap' }}>{fmtFecha(l.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Panel de detalle */}
      {sel && (
        <>
          <div onClick={() => setSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,20,.35)', zIndex: 80 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 94vw)', background: '#fff', zIndex: 81, boxShadow: '-8px 0 30px rgba(0,0,0,.18)', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, color: '#1A1A2E' }}>{sel.empresa || sel.dominio || sel.contacto_nombre || 'Prospecto'}</h2>
                <div style={{ color: '#6E6884', fontSize: 13, marginTop: 2 }}>{sel.tipo === 'web_scan' ? 'Escáner web' : 'Autodiagnóstico'} · {fmtFecha(sel.created_at)}</div>
              </div>
              <button onClick={() => setSel(null)} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#6E6884' }}>×</button>
            </div>

            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {[['Contacto', sel.contacto_nombre], ['Correo', sel.email], ['Teléfono', sel.telefono], ['Dominio', sel.dominio],
                ['Resultado', sel.score != null ? `${sel.score}${sel.grade ? ' · ' + sel.grade : ''}` : null], ['Riesgo', sel.risk]]
                .filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, borderBottom: '1px solid #F1EFF7', paddingBottom: 8 }}>
                    <span style={{ color: '#6E6884' }}>{k}</span>
                    <b style={{ color: k === 'Riesgo' ? riskColor(v) : '#1A1A2E', textAlign: 'right', maxWidth: 240, wordBreak: 'break-word' }}>{v}</b>
                  </div>
                ))}
            </div>

            {/* Estado */}
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 12, color: '#6E6884', fontWeight: 600 }}>ESTADO</label>
              <select value={sel.estado} onChange={e => cambiarEstado(sel.id, e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #E6E2F0', borderRadius: 8, fontSize: 14 }}>
                {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
              </select>
            </div>

            {/* Acciones (próxima fase) */}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => notify('Generar informe: lo conectamos en el siguiente paso')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E6E2F0', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#3C3489' }}>Generar informe</button>
              <button onClick={() => notify('Convertir a cliente: lo conectamos en el siguiente paso')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Convertir a cliente</button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
                      background: toast.ok ? '#1F7A4D' : '#D7263D', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
