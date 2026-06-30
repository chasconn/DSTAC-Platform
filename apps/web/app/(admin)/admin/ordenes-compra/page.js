'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../../../../lib/api'
import { confirmDstac, alertDstac } from '../../../../components/admin/ConfirmDialog'
import FixedPortal from '../../../../components/admin/FixedPortal'

// ─── helpers ───────────────────────────────────────────────────────────────────
function clp(n) { const v = Number(n) || 0; return '$' + new Intl.NumberFormat('es-CL').format(v) }
function useIsMobile(bp = 820) {
  const [m, setM] = useState(false)
  useEffect(() => { const mq = window.matchMedia(`(max-width: ${bp}px)`); const u = () => setM(mq.matches); u(); mq.addEventListener('change', u); return () => mq.removeEventListener('change', u) }, [bp])
  return m
}

const ESTADO = {
  pendiente_factura: { label: 'Por facturar',  bg: '#FEF3E2', text: '#633806' },
  facturada:         { label: 'Facturada',      bg: '#E6F1FB', text: '#0C447C' },
  pagada:            { label: 'Pagada',         bg: '#EAF3DE', text: '#27500A' },
  anulada:           { label: 'Anulada',        bg: '#F1EFE8', text: '#888780' },
}

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }
const INP = { ...SEL, width: '100%', boxSizing: 'border-box' }
const BTN = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
const BTN2 = { ...BTN, background: '#fff', color: '#444441', border: '1px solid #e2e0d8' }

// ─── Formulario de nueva / edición de OC ──────────────────────────────────────
function OcModal({ onClose, onSaved }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [form, setForm] = useState({
    numero_oc: '', empresa: '', rut: '', contacto: '',
    cotizacion_id: '', monto_neto: '', monto_total: '',
    fecha_recepcion: new Date().toISOString().slice(0, 10),
    notas: '',
  })
  const [archivoOc, setArchivoOc] = useState(null)
  const [archivoCot, setArchivoCot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/api/admin/cotizaciones?estado=aceptada')
      .then(d => setCotizaciones(d.cotizaciones ?? []))
      .catch(() => {})
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function autoRellenar(cotId) {
    set('cotizacion_id', cotId)
    if (!cotId) return
    const cot = cotizaciones.find(c => String(c.id) === String(cotId))
    if (!cot) return
    if (cot.cliente_empresa && !form.empresa) set('empresa', cot.cliente_empresa)
    if (cot.total) {
      // total cotización = con IVA, neto = sin IVA (total / 1.19 redondeado)
      set('monto_total', String(cot.total))
      set('monto_neto', String(Math.round(cot.total / 1.19)))
    }
  }

  async function guardar(e) {
    e.preventDefault()
    setError(null)
    if (!form.numero_oc.trim()) { setError('El número de OC es obligatorio'); return }
    if (!form.empresa.trim()) { setError('La empresa es obligatoria'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v) })
      if (archivoOc) fd.append('archivo_oc', archivoOc)
      if (archivoCot) fd.append('archivo_cotizacion', archivoCot)
      const r = await fetch('/api/admin/ordenes-compra', { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Error al guardar')
      onSaved()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(20,18,40,0.38)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1200, padding: 16,
  }
  const card = {
    background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560,
    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  }
  const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const label = { fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 4, display: 'block' }
  const fileStyle = { fontSize: 12, color: '#888780', marginTop: 4 }

  return (
    <FixedPortal>
      <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2C2C2A' }}>Registrar Orden de Compra</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888780', lineHeight: 1 }}>×</button>
          </div>
          {error && <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#791F1F', marginBottom: 14 }}>{error}</div>}
          <form onSubmit={guardar}>
            <div style={{ display: 'grid', gap: 14 }}>

              {/* Vincular cotización */}
              <div>
                <label style={label}>Cotización DSTAC vinculada <span style={{ color: '#888780', fontWeight: 400 }}>(opcional)</span></label>
                <select value={form.cotizacion_id} onChange={e => autoRellenar(e.target.value)} style={INP}>
                  <option value="">— Sin cotización vinculada —</option>
                  {cotizaciones.map(c => (
                    <option key={c.id} value={c.id}>{c.numero} · {c.cliente_empresa || c.company_name || '—'}</option>
                  ))}
                </select>
                <div style={fileStyle}>Solo muestra cotizaciones en estado "Aceptada"</div>
              </div>

              {/* Número OC */}
              <div>
                <label style={label}>N° de Orden de Compra del cliente *</label>
                <input value={form.numero_oc} onChange={e => set('numero_oc', e.target.value)} placeholder="Ej: OC-2026-001234" style={INP} required />
              </div>

              {/* Empresa y RUT */}
              <div style={row}>
                <div>
                  <label style={label}>Empresa *</label>
                  <input value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Razón social" style={INP} required />
                </div>
                <div>
                  <label style={label}>RUT</label>
                  <input value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="76.123.456-7" style={INP} />
                </div>
              </div>

              {/* Contacto y fecha */}
              <div style={row}>
                <div>
                  <label style={label}>Contacto</label>
                  <input value={form.contacto} onChange={e => set('contacto', e.target.value)} placeholder="Nombre o cargo" style={INP} />
                </div>
                <div>
                  <label style={label}>Fecha de recepción</label>
                  <input type="date" value={form.fecha_recepcion} onChange={e => set('fecha_recepcion', e.target.value)} style={INP} />
                </div>
              </div>

              {/* Montos */}
              <div style={row}>
                <div>
                  <label style={label}>Monto neto (CLP, sin IVA)</label>
                  <input type="number" value={form.monto_neto} onChange={e => set('monto_neto', e.target.value)} placeholder="0" style={INP} min="0" />
                </div>
                <div>
                  <label style={label}>Monto total (CLP, con IVA)</label>
                  <input type="number" value={form.monto_total} onChange={e => set('monto_total', e.target.value)} placeholder="0" style={INP} min="0" />
                </div>
              </div>

              {/* Archivos */}
              <div style={{ background: '#f8f7f4', borderRadius: 10, padding: 14, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#444441', marginBottom: -4 }}>Documentos adjuntos</div>
                <div>
                  <label style={label}>PDF de la OC del cliente</label>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setArchivoOc(e.target.files[0] || null)} style={{ fontSize: 13 }} />
                  {archivoOc && <div style={fileStyle}>✓ {archivoOc.name}</div>}
                </div>
                <div>
                  <label style={label}>PDF de tu cotización DSTAC</label>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setArchivoCot(e.target.files[0] || null)} style={{ fontSize: 13 }} />
                  {archivoCot && <div style={fileStyle}>✓ {archivoCot.name}</div>}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label style={label}>Notas internas</label>
                <textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, condiciones de pago, etc." style={{ ...INP, resize: 'vertical', minHeight: 72 }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button type="button" onClick={onClose} style={BTN2}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ ...BTN, opacity: saving ? 0.7 : 1 }}>{saving ? 'Guardando…' : 'Registrar OC'}</button>
            </div>
          </form>
        </div>
      </div>
    </FixedPortal>
  )
}

// ─── Panel lateral de detalle ──────────────────────────────────────────────────
function OcDetalle({ oc, onClose, onActualizado }) {
  const [editEstado, setEditEstado] = useState(oc.estado)
  const [numFactura, setNumFactura] = useState(oc.numero_factura || '')
  const [fechaFactura, setFechaFactura] = useState(oc.fecha_factura ? oc.fecha_factura.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const isMobile = useIsMobile()

  async function guardarCambios() {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/ordenes-compra/${oc.id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: editEstado, numero_factura: numFactura, fecha_factura: fechaFactura }),
      })
      onActualizado()
    } catch (err) {
      await alertDstac(err.message || 'Error al guardar', { tipo: 'error' })
    } finally { setSaving(false) }
  }

  async function eliminar() {
    if (!await confirmDstac(`¿Eliminar la OC ${oc.numero_oc}?`, { titulo: 'Eliminar OC', textoConfirmar: 'Eliminar', peligro: true })) return
    try {
      await apiFetch(`/api/admin/ordenes-compra/${oc.id}`, { method: 'DELETE' })
      onActualizado()
      onClose()
    } catch (err) { await alertDstac(err.message || 'Error', { tipo: 'error' }) }
  }

  function abrirArchivo(tipo) {
    window.open(`/api/admin/ordenes-compra/${oc.id}/archivo/${tipo}`, '_blank')
  }

  const panel = {
    position: isMobile ? 'fixed' : 'relative',
    inset: isMobile ? 0 : 'auto',
    background: '#fff',
    borderLeft: isMobile ? 'none' : '1px solid #e2e0d8',
    borderRadius: isMobile ? 0 : '12px 0 0 12px',
    padding: 24,
    width: isMobile ? '100%' : 380,
    overflowY: 'auto',
    zIndex: isMobile ? 1100 : 'auto',
    display: 'flex', flexDirection: 'column', gap: 16,
    boxShadow: isMobile ? 'none' : '-4px 0 20px rgba(0,0,0,0.06)',
  }

  const est = ESTADO[oc.estado] || ESTADO.pendiente_factura
  const label = { fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 3, display: 'block' }
  const val = { fontSize: 14, color: '#2C2C2A' }

  return (
    <FixedPortal active={isMobile}>
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5 }}>OC del cliente</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#2C2C2A', marginTop: 2 }}>{oc.numero_oc}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ background: est.bg, color: est.text, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{est.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        {/* Datos principales */}
        <div style={{ display: 'grid', gap: 10 }}>
          <div><span style={label}>Empresa</span><span style={val}>{oc.empresa}</span></div>
          {oc.rut && <div><span style={label}>RUT</span><span style={val}>{oc.rut}</span></div>}
          {oc.contacto && <div><span style={label}>Contacto</span><span style={val}>{oc.contacto}</span></div>}
          {oc.cotizacion_numero && (
            <div><span style={label}>Cotización DSTAC</span><span style={{ ...val, color: '#3C3489', fontWeight: 600 }}>{oc.cotizacion_numero}</span></div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {oc.monto_neto && <div><span style={label}>Neto</span><span style={val}>{clp(oc.monto_neto)}</span></div>}
            {oc.monto_total && <div><span style={label}>Total c/IVA</span><span style={{ ...val, fontWeight: 700 }}>{clp(oc.monto_total)}</span></div>}
          </div>
          <div><span style={label}>Fecha recepción</span><span style={val}>{oc.fecha_recepcion ? oc.fecha_recepcion.slice(0, 10) : '—'}</span></div>
          {oc.notas && <div><span style={label}>Notas</span><span style={{ ...val, whiteSpace: 'pre-wrap', fontSize: 13 }}>{oc.notas}</span></div>}
        </div>

        {/* Documentos */}
        <div style={{ background: '#f8f7f4', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444441', marginBottom: 10 }}>Documentos</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => abrirArchivo('oc')} disabled={!oc.tiene_archivo_oc}
              style={{ ...BTN2, fontSize: 12, padding: '6px 12px', opacity: oc.tiene_archivo_oc ? 1 : 0.4, cursor: oc.tiene_archivo_oc ? 'pointer' : 'not-allowed' }}>
              📄 OC del cliente
            </button>
            <button onClick={() => abrirArchivo('cotizacion')} disabled={!oc.tiene_archivo_cotizacion}
              style={{ ...BTN2, fontSize: 12, padding: '6px 12px', opacity: oc.tiene_archivo_cotizacion ? 1 : 0.4, cursor: oc.tiene_archivo_cotizacion ? 'pointer' : 'not-allowed' }}>
              📋 Cotización DSTAC
            </button>
          </div>
        </div>

        {/* Actualizar estado y factura */}
        <div style={{ background: '#f8f7f4', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444441' }}>Facturación</div>
          <div>
            <label style={label}>Estado</label>
            <select value={editEstado} onChange={e => setEditEstado(e.target.value)} style={{ ...INP }}>
              {Object.entries(ESTADO).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>N° de Factura emitida</label>
            <input value={numFactura} onChange={e => setNumFactura(e.target.value)} placeholder="Ej: 000123" style={INP} />
          </div>
          <div>
            <label style={label}>Fecha de factura</label>
            <input type="date" value={fechaFactura} onChange={e => setFechaFactura(e.target.value)} style={INP} />
          </div>
          <button onClick={guardarCambios} disabled={saving} style={{ ...BTN, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        <button onClick={eliminar} style={{ ...BTN2, color: '#791F1F', borderColor: '#E8A6A6', fontSize: 12 }}>
          Eliminar OC
        </button>
      </div>
    </FixedPortal>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function OrdenesCompraPage() {
  const isMobile = useIsMobile()
  const [ordenes, setOrdenes] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [estado, setEstado] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viendo, setViendo] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 400); return () => clearTimeout(t) }, [search])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (estado) p.set('estado', estado)
      if (debounced) p.set('search', debounced)
      const [list, st] = await Promise.all([
        apiFetch(`/api/admin/ordenes-compra?${p}`),
        apiFetch('/api/admin/ordenes-compra/stats'),
      ])
      setOrdenes(list.ordenes ?? [])
      setStats(st)
    } catch (err) { showToast(err.message || 'Error al cargar', 'error') }
    finally { setLoading(false) }
  }, [estado, debounced])
  useEffect(() => { cargar() }, [cargar])

  async function abrirDetalle(id) {
    try {
      const full = await apiFetch(`/api/admin/ordenes-compra/${id}`)
      setViendo(full)
    } catch (err) { showToast(err.message || 'No se pudo abrir', 'error') }
  }

  function handleSaved() { setModalOpen(false); showToast('OC registrada'); cargar() }
  function handleActualizado() { showToast('Actualizado'); cargar(); setViendo(null) }

  const stCards = [
    { label: 'Total OC', value: stats?.total, color: '#534AB7' },
    { label: 'Por facturar', value: stats?.pendientes, color: '#633806' },
    { label: 'Facturadas', value: stats?.facturadas, color: '#0C447C' },
    { label: 'Pagadas', value: stats?.pagadas, color: '#27500A' },
    { label: 'Por facturar $', value: stats != null ? clp(stats.monto_por_facturar) : '—', color: '#E07A18', wide: true },
    { label: 'Total cobrado $', value: stats != null ? clp(stats.monto_cobrado) : '—', color: '#3C3489', wide: true },
  ]

  const mainStyle = {
    display: 'flex',
    height: '100%',
    position: 'relative',
  }

  return (
    <div style={mainStyle}>
      <div style={{ flex: 1, padding: isMobile ? '14px 12px' : '24px 28px', overflowY: 'auto', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Órdenes de Compra</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>OC recibidas de clientes para facturación</p>
          </div>
          <button onClick={() => setModalOpen(true)} style={BTN}>+ Registrar OC</button>
        </div>

        {toast && (
          <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
            {toast.msg}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? 8 : 10, marginBottom: 18 }}>
          {stCards.map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${s.color}`, padding: isMobile ? '10px 12px' : '14px 18px' }}>
              <div style={{ fontSize: s.wide ? (isMobile ? 16 : 20) : (isMobile ? 20 : 26), fontWeight: 700, color: '#2C2C2A' }}>{s.value ?? '—'}</div>
              <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OC, empresa, factura…" style={{ ...SEL, minWidth: 220, flex: '0 1 auto' }} />
          <select value={estado} onChange={e => setEstado(e.target.value)} style={SEL}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>{ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''}</span>
        </div>

        {/* Lista */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 140px 120px 40px', padding: '9px 16px', background: '#f8f7f4', borderBottom: '1px solid #e2e0d8' }}>
              {['N° OC', 'Empresa', 'Estado', 'Total', 'Factura', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
              ))}
            </div>
          )}

          {loading && <div style={{ padding: 40, textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>}

          {!loading && ordenes.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin órdenes de compra</div>
              <div style={{ fontSize: 13, color: '#888780' }}>Cuando un cliente te envíe una OC, regístrala aquí.</div>
            </div>
          )}

          {!loading && ordenes.map((o, i) => {
            const est = ESTADO[o.estado] || ESTADO.pendiente_factura
            const borde = i < ordenes.length - 1 ? '1px solid #f1efe8' : 'none'
            if (isMobile) {
              return (
                <div key={o.id} onClick={() => abrirDetalle(o.id)} style={{ padding: '12px 14px', borderBottom: borde, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#3C3489' }}>{o.numero_oc}</span>
                    <span style={{ background: est.bg, color: est.text, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{est.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4 }}>{o.empresa}</div>
                  {o.monto_total && <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginTop: 2 }}>{clp(o.monto_total)}</div>}
                  {o.numero_factura && <div style={{ fontSize: 12, color: '#0C447C', marginTop: 2 }}>Factura: {o.numero_factura}</div>}
                </div>
              )
            }
            return (
              <div key={o.id} onClick={() => abrirDetalle(o.id)}
                style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 140px 120px 40px', padding: '11px 16px', borderBottom: borde, alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFAFD'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3C3489' }}>{o.numero_oc}</div>
                <div style={{ fontSize: 13, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {o.empresa}
                  {o.cotizacion_numero && <span style={{ color: '#888780', fontSize: 12 }}> · {o.cotizacion_numero}</span>}
                </div>
                <div><span style={{ background: est.bg, color: est.text, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>{est.label}</span></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>{o.monto_total ? clp(o.monto_total) : '—'}</div>
                <div style={{ fontSize: 12, color: '#0C447C' }}>{o.numero_factura || '—'}</div>
                <div style={{ color: '#B4B2A9', textAlign: 'right' }}>›</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel lateral */}
      {viendo && (
        <OcDetalle oc={viendo} onClose={() => setViendo(null)} onActualizado={handleActualizado} />
      )}

      {/* Modal nueva OC */}
      {modalOpen && <OcModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </div>
  )
}
