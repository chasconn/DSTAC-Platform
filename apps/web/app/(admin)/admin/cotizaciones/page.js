'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import { clp, ESTADO } from './components/format'
import CotizacionModal   from './components/CotizacionModal'
import CotizacionDetalle from './components/CotizacionDetalle'
import CatalogoModal     from './components/CatalogoModal'

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function CotizacionesPage() {
  const isMobile = useIsMobile()
  const [cotizaciones, setCotizaciones] = useState([])
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [estado, setEstado] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  const [catalogo, setCatalogo]   = useState([])
  const [companies, setCompanies] = useState([])
  const [leads, setLeads]         = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState(null)
  const [viendo, setViendo]       = useState(null)
  const [catOpen, setCatOpen]     = useState(false)
  const [toast, setToast]         = useState(null)

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 400); return () => clearTimeout(t) }, [search])

  const cargarCatalogo = useCallback(() => {
    apiFetch('/api/admin/cotizaciones/catalogo').then(d => setCatalogo(d.catalogo ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    cargarCatalogo()
    apiFetch('/api/companies').then(d => setCompanies(Array.isArray(d) ? d : (d.companies ?? []))).catch(() => {})
    apiFetch('/api/admin/leads').then(d => setLeads(d.leads ?? [])).catch(() => {})
  }, [cargarCatalogo])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (estado) p.set('estado', estado)
      if (debounced) p.set('search', debounced)
      const [list, st] = await Promise.all([
        apiFetch(`/api/admin/cotizaciones?${p}`),
        apiFetch('/api/admin/cotizaciones/stats'),
      ])
      setCotizaciones(list.cotizaciones ?? [])
      setStats(st)
    } catch (err) { showToast(err.message || 'Error al cargar', 'error') }
    finally { setLoading(false) }
  }, [estado, debounced])
  useEffect(() => { cargar() }, [cargar])

  async function abrirDetalle(id) {
    try { const full = await apiFetch(`/api/admin/cotizaciones/${id}`); setViendo(full) }
    catch (err) { showToast(err.message || 'No se pudo abrir', 'error') }
  }
  async function cambiarEstado(id, est) {
    try { await apiFetch(`/api/admin/cotizaciones/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: est }) }); showToast('Estado actualizado'); cargar(); setViendo(v => v && v.id === id ? { ...v, estado: est } : v) }
    catch (err) { showToast(err.message || 'Error', 'error') }
  }
  async function eliminar(cot) {
    if (!confirm(`¿Eliminar la cotización ${cot.numero}?`)) return
    try { await apiFetch(`/api/admin/cotizaciones/${cot.id}`, { method: 'DELETE' }); setViendo(null); showToast('Cotización eliminada'); cargar() }
    catch (err) { showToast(err.message || 'Error', 'error') }
  }
  function handleSaved() { setModalOpen(false); setEditando(null); showToast(editando ? 'Cotización actualizada' : 'Cotización creada'); cargar() }

  const stCards = [
    { label: 'Total', value: stats?.total, color: '#534AB7' },
    { label: 'Borradores', value: stats?.borradores, color: '#888780' },
    { label: 'Enviadas', value: stats?.enviadas, color: '#0C447C' },
    { label: 'Aceptadas', value: stats?.aceptadas, color: '#1D9E75' },
    { label: 'Monto aceptado', value: stats != null ? clp(stats.monto_aceptado) : '—', color: '#3C3489', wide: true },
  ]

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Cotizaciones</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>Propuestas comerciales a clientes y prospectos</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setCatOpen(true)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Catálogo</button>
          <button onClick={() => { setEditando(null); setModalOpen(true) }} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Nueva cotización</button>
        </div>
      </div>

      {toast && <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>{toast.msg}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 10, marginBottom: 18 }}>
        {stCards.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${s.color}`, padding: isMobile ? '10px 12px' : '14px 18px', gridColumn: s.wide && isMobile ? '1 / -1' : 'auto' }}>
            <div style={{ fontSize: s.wide ? (isMobile ? 18 : 22) : (isMobile ? 20 : 26), fontWeight: 700, color: '#2C2C2A' }}>{s.value ?? '—'}</div>
            <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar número o cliente…" style={{ ...SEL, minWidth: 220, flex: '0 1 auto' }} />
        <select value={estado} onChange={e => setEstado(e.target.value)} style={SEL}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>{cotizaciones.length} cotización{cotizaciones.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px 130px 40px', padding: '9px 16px', background: '#f8f7f4', borderBottom: '1px solid #e2e0d8' }}>
            {['Número', 'Cliente', 'Estado', 'Total', ''].map((h, i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>)}
          </div>
        )}
        {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>}
        {!loading && cotizaciones.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin cotizaciones</div>
            <div style={{ fontSize: 13, color: '#888780' }}>Crea la primera con "Nueva cotización".</div>
          </div>
        )}
        {!loading && cotizaciones.map((c, i) => {
          const est = ESTADO[c.estado] || ESTADO.borrador
          const borde = i < cotizaciones.length - 1 ? '1px solid #f1efe8' : 'none'
          if (isMobile) {
            return (
              <div key={c.id} onClick={() => abrirDetalle(c.id)} style={{ padding: '12px 14px', borderBottom: borde, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#3C3489' }}>{c.numero}</span>
                  <span style={{ background: est.bg, color: est.text, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{est.label}</span>
                </div>
                <div style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4 }}>{c.cliente_empresa || c.company_name || '—'}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginTop: 2 }}>{clp(c.total)}</div>
              </div>
            )
          }
          return (
            <div key={c.id} onClick={() => abrirDetalle(c.id)} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px 130px 40px', padding: '11px 16px', borderBottom: borde, alignItems: 'center', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAFD'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3C3489' }}>{c.numero}</div>
              <div style={{ fontSize: 13, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{c.cliente_empresa || c.company_name || '—'}{c.cliente_contacto && <span style={{ color: '#888780' }}> · {c.cliente_contacto}</span>}</div>
              <div><span style={{ background: est.bg, color: est.text, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>{est.label}</span></div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>{clp(c.total)}</div>
              <div style={{ color: '#B4B2A9', textAlign: 'right' }}>›</div>
            </div>
          )
        })}
      </div>

      {modalOpen && <CotizacionModal cotizacion={editando} companies={companies} leads={leads} catalogo={catalogo} onClose={() => { setModalOpen(false); setEditando(null) }} onSaved={handleSaved} />}
      {viendo && <CotizacionDetalle cot={viendo} onClose={() => setViendo(null)} onEditar={c => { setViendo(null); apiFetch(`/api/admin/cotizaciones/${c.id}`).then(full => { setEditando(full); setModalOpen(true) }) }} onEliminar={eliminar} onCambiarEstado={cambiarEstado} onEnviada={() => { cargar(); setViendo(v => v && { ...v, estado: v.estado === 'borrador' ? 'enviada' : v.estado }) }} />}
      {catOpen && <CatalogoModal onClose={() => setCatOpen(false)} onChanged={cargarCatalogo} />}
    </div>
  )
}

function useIsMobile(bp = 820) {
  const [m, setM] = useState(false)
  useEffect(() => { const mq = window.matchMedia(`(max-width: ${bp}px)`); const u = () => setM(mq.matches); u(); mq.addEventListener('change', u); return () => mq.removeEventListener('change', u) }, [bp])
  return m
}
