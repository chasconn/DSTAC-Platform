'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'

const NAVY = '#1a1740', PURPLE = '#534AB7'
const CLP = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL')
const LIMIT = 20
const IVA_RATE = 0.19

const ESTADO_LABEL = { borrador: 'Borrador', emitida: 'Emitida', timbrada: 'Timbrada (SII)', pagada: 'Pagada', anulada: 'Anulada', rechazada: 'Rechazada' }
const ESTADO_COLOR = { borrador: '#888780', emitida: '#C98A1E', timbrada: '#3C8DBC', pagada: '#1D9E75', anulada: '#B4B2A9', rechazada: '#D8543F' }
const TIPO_DTE_LABEL = { '33': 'Factura electrónica', '39': 'Boleta electrónica', '61': 'Nota de crédito', '56': 'Nota de débito' }

const SELECT_STYLE = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }
const INPUT = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13.5, color: '#2C2C2A', outline: 'none', boxSizing: 'border-box' }

function StatCard({ label, value, sub, color = '#2C2C2A' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${PURPLE}`, padding: '14px 18px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#888780', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

function totalesDe(items) {
  const neto = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0)
  const iva = Math.round(neto * IVA_RATE)
  return { neto, iva, total: neto + iva }
}

export default function FacturacionPage() {
  const [companies, setCompanies] = useState([])
  const [stats, setStats] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [fEstado, setFEstado] = useState('')
  const [fEmpresa, setFEmpresa] = useState('')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({})
  const [items, setItems] = useState([{ descripcion: '', cantidad: 1, precio_unitario: '' }])
  const [saving, setSaving] = useState(false)
  const [eliminando, setEliminando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [emitiendo, setEmitiendo] = useState(false)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 4500) }

  useEffect(() => {
    api.get('/api/companies').then(d => setCompanies(Array.isArray(d) ? d : (d.companies ?? []))).catch(() => {})
  }, [])

  const cargarStats = useCallback(async () => {
    try { setStats(await api.get('/api/admin/facturacion/stats')) } catch {}
  }, [])

  const cargarFacturas = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (fEstado) params.set('estado', fEstado)
      if (fEmpresa) params.set('company_id', fEmpresa)
      if (search) params.set('search', search)
      const data = await api.get(`/api/admin/facturacion?${params}`)
      setFacturas(data.facturas || []); setTotal(data.total || 0); setPage(p)
    } catch { setFacturas([]) }
    finally { setLoading(false) }
  }, [fEstado, fEmpresa, search])

  useEffect(() => { cargarStats(); cargarFacturas(1) }, [cargarStats, cargarFacturas])

  function abrirNuevo() {
    setEditando(null)
    setForm({ company_id: companies[0]?.id || '', tipo_dte: '33', fecha_emision: new Date().toISOString().slice(0, 10), fecha_vencimiento: '', glosa: '', notas: '' })
    setItems([{ descripcion: '', cantidad: 1, precio_unitario: '' }])
    setModalOpen(true)
  }

  async function abrirEditar(f) {
    try {
      const data = await api.get(`/api/admin/facturacion/${f.id}`)
      setEditando(data)
      setForm({ company_id: data.company_id, tipo_dte: data.tipo_dte, fecha_emision: data.fecha_emision?.slice(0, 10), fecha_vencimiento: data.fecha_vencimiento?.slice(0, 10) || '', glosa: data.glosa || '', notas: data.notas || '' })
      setItems(data.items?.length ? data.items.map(it => ({ descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: it.precio_unitario })) : [{ descripcion: '', cantidad: 1, precio_unitario: '' }])
      setModalOpen(true)
    } catch (e) { showToast(e.message || 'No se pudo cargar la factura') }
  }

  async function abrirDetalle(f) {
    try { setDetalle(await api.get(`/api/admin/facturacion/${f.id}`)) }
    catch (e) { showToast(e.message || 'No se pudo cargar la factura') }
  }

  function actualizarItem(i, campo, valor) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it))
  }
  function agregarItem() { setItems(prev => [...prev, { descripcion: '', cantidad: 1, precio_unitario: '' }]) }
  function quitarItem(i) { setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev) }

  async function guardar() {
    const validos = items.filter(it => it.descripcion?.trim())
    if (!form.company_id || !form.fecha_emision) { showToast('Empresa y fecha de emisión son obligatorios'); return }
    if (!validos.length) { showToast('Agrega al menos una línea con descripción'); return }
    setSaving(true)
    try {
      const payload = { ...form, items: validos }
      if (editando) {
        await api.put(`/api/admin/facturacion/${editando.id}`, payload)
        showToast('Factura actualizada')
      } else {
        await api.post('/api/admin/facturacion', payload)
        showToast('Factura creada')
      }
      setModalOpen(false)
      cargarStats(); cargarFacturas(page)
    } catch (e) { showToast(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function cambiarEstado(f, estado) {
    try {
      await api.put(`/api/admin/facturacion/${f.id}/estado`, { estado })
      showToast(`Factura marcada como "${ESTADO_LABEL[estado]}"`)
      cargarStats(); cargarFacturas(page)
      if (detalle?.id === f.id) setDetalle(d => ({ ...d, estado }))
    } catch (e) { showToast(e.message || 'No se pudo actualizar el estado') }
  }

  async function emitirAlSii(f) {
    setEmitiendo(true)
    try {
      const r = await api.post(`/api/admin/facturacion/${f.id}/emitir-sii`, {})
      showToast(`Factura timbrada — folio ${r.folio ?? '—'}`)
      cargarStats(); cargarFacturas(page)
      setDetalle(null)
    } catch (e) { showToast(e.message || 'No se pudo emitir ante el SII') }
    finally { setEmitiendo(false) }
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    try {
      await api.delete(`/api/admin/facturacion/${eliminando.id}`)
      showToast('Factura eliminada')
      setEliminando(null)
      cargarStats(); cargarFacturas(page)
    } catch (e) { showToast(e.message || 'No se pudo eliminar') }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const limpiarFiltros = () => { setFEstado(''); setFEmpresa(''); setSearch('') }
  const previewTotales = totalesDe(items)

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>🧾 Facturación</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Facturas emitidas a empresas clientes · {total} registro{total !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={abrirNuevo}
          style={{ background: '#fff', color: NAVY, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          + Nueva factura
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <StatCard label="Total facturado" value={CLP(stats?.total)} sub={`${stats?.cantidad ?? 0} facturas`} />
        <StatCard label="Por pagar" value={CLP(stats?.porPagar)} sub={`${stats?.porPagarCantidad ?? 0} facturas`} color="#C98A1E" />
        <StatCard label="Pagado" value={CLP(stats?.pagado)} sub={`${stats?.pagadoCantidad ?? 0} facturas`} color="#1D9E75" />
        <StatCard label="Vencidas" value={stats?.vencidas ?? 0} color="#D8543F" />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={SELECT_STYLE}>
          <option value="">Estado</option>
          {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={fEmpresa} onChange={e => setFEmpresa(e.target.value)} style={SELECT_STYLE}>
          <option value="">Empresa</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar número, empresa, glosa…"
          style={{ flex: 1, minWidth: 200, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }} />
        {(fEstado || fEmpresa || search) && (
          <button onClick={limpiarFiltros} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>Limpiar</button>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f7f4' }}>
              {['N°', 'Empresa', 'Tipo', 'Emisión', 'Vence', 'Total', 'Estado', ''].map(h => (
                <th key={h} style={{ textAlign: h === 'Total' ? 'right' : 'left', padding: '9px 10px', fontSize: 10.5, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #e2e0d8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#B4B2A9', fontSize: 13 }}>Cargando…</td></tr>
            ) : facturas.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#B4B2A9', fontSize: 13 }}>Sin facturas registradas con estos filtros.</td></tr>
            ) : facturas.map(f => (
              <tr key={f.id} onClick={() => abrirDetalle(f)} style={{ cursor: 'pointer' }}>
                <td style={{ padding: '9px 10px', fontSize: 12.5, fontWeight: 700, color: '#2C2C2A', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{f.numero}</td>
                <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#444441', borderBottom: '1px solid #f5f4ef' }}>{f.empresa_nombre}</td>
                <td style={{ padding: '9px 10px', fontSize: 11.5, color: '#888780', borderBottom: '1px solid #f5f4ef' }}>{TIPO_DTE_LABEL[f.tipo_dte] || f.tipo_dte}</td>
                <td style={{ padding: '9px 10px', fontSize: 12, color: '#888780', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{new Date(f.fecha_emision).toLocaleDateString('es-CL')}</td>
                <td style={{ padding: '9px 10px', fontSize: 12, color: '#888780', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-CL') : '—'}</td>
                <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 700, color: '#2C2C2A', textAlign: 'right', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{CLP(f.total)}</td>
                <td style={{ padding: '9px 10px', fontSize: 12, borderBottom: '1px solid #f5f4ef' }}>
                  <span style={{ background: '#f1efe8', color: ESTADO_COLOR[f.estado], borderRadius: 999, padding: '3px 9px', fontWeight: 700, fontSize: 11 }}>{ESTADO_LABEL[f.estado]}</span>
                </td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                  {f.estado === 'borrador' && (
                    <>
                      <button onClick={() => abrirEditar(f)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 12.5, marginRight: 8 }}>Editar</button>
                      <button onClick={() => setEliminando(f)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D8543F', fontSize: 12.5 }}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => cargarFacturas(page - 1)} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>← Anterior</button>
          <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
          <button onClick={() => cargarFacturas(page + 1)} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>Siguiente →</button>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,18,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#2C2C2A', marginBottom: 16 }}>{editando ? `Editar ${editando.numero}` : 'Nueva factura'}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="Empresa *">
                <select value={form.company_id || ''} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} style={INPUT}>
                  <option value="">Selecciona…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Tipo de documento">
                <select value={form.tipo_dte || '33'} onChange={e => setForm(f => ({ ...f, tipo_dte: e.target.value }))} style={INPUT}>
                  {Object.entries(TIPO_DTE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="Fecha de emisión *"><input type="date" value={form.fecha_emision || ''} onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))} style={INPUT} /></Field>
              <Field label="Fecha de vencimiento"><input type="date" value={form.fecha_vencimiento || ''} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} style={INPUT} /></Field>
            </div>

            <Field label="Glosa"><input value={form.glosa || ''} onChange={e => setForm(f => ({ ...f, glosa: e.target.value }))} placeholder="Ej. Servicio de seguridad gestionada — junio 2026" style={INPUT} /></Field>

            <div style={{ margin: '16px 0 8px', fontSize: 12.5, fontWeight: 700, color: '#888780' }}>Líneas</div>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input value={it.descripcion} onChange={e => actualizarItem(i, 'descripcion', e.target.value)} placeholder="Descripción del servicio" style={INPUT} />
                <input type="number" min="1" value={it.cantidad} onChange={e => actualizarItem(i, 'cantidad', e.target.value)} style={INPUT} />
                <input type="number" min="0" value={it.precio_unitario} onChange={e => actualizarItem(i, 'precio_unitario', e.target.value)} placeholder="Precio" style={INPUT} />
                <button onClick={() => quitarItem(i)} title="Quitar línea" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D8543F', fontSize: 16 }}>×</button>
              </div>
            ))}
            <button onClick={agregarItem} style={{ background: 'none', border: '1px dashed #c9c6bb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#534AB7', marginBottom: 14 }}>+ Agregar línea</button>

            <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888780' }}>Neto</span><span>{CLP(previewTotales.neto)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888780' }}>IVA (19%)</span><span>{CLP(previewTotales.iva)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: 4 }}><span>Total</span><span>{CLP(previewTotales.total)}</span></div>
            </div>

            <Field label="Notas internas"><textarea value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} style={{ ...INPUT, resize: 'vertical' }} /></Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: PURPLE, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Crear factura')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalle */}
      {detalle && (
        <div onClick={() => setDetalle(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,18,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#2C2C2A' }}>{detalle.numero}</div>
              <span style={{ background: '#f1efe8', color: ESTADO_COLOR[detalle.estado], borderRadius: 999, padding: '3px 9px', fontWeight: 700, fontSize: 11 }}>{ESTADO_LABEL[detalle.estado]}</span>
            </div>
            <div style={{ fontSize: 13, color: '#888780', marginBottom: 14 }}>{detalle.empresa_nombre} · {TIPO_DTE_LABEL[detalle.tipo_dte]}</div>

            <div style={{ border: '1px solid #ECEAE3', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              {detalle.items?.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span>{it.cantidad} × {it.descripcion}</span>
                  <strong>{CLP(it.cantidad * it.precio_unitario)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #f1efe8', marginTop: 8, paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888780' }}><span>Neto</span><span>{CLP(detalle.neto)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888780' }}><span>IVA</span><span>{CLP(detalle.iva)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, marginTop: 4 }}><span>Total</span><span>{CLP(detalle.total)}</span></div>
              </div>
            </div>

            {detalle.folio && <div style={{ fontSize: 12, color: '#888780', marginBottom: 10 }}>Folio SII: <strong>{detalle.folio}</strong> · Track ID: {detalle.track_id || '—'}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              {detalle.estado === 'borrador' && (
                <button onClick={() => emitirAlSii(detalle)} disabled={emitiendo}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3C8DBC', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: emitiendo ? 0.7 : 1 }}>
                  {emitiendo ? 'Emitiendo…' : 'Emitir ante el SII'}
                </button>
              )}
              {['emitida', 'timbrada'].includes(detalle.estado) && (
                <button onClick={() => cambiarEstado(detalle, 'pagada')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Marcar pagada</button>
              )}
              {detalle.estado !== 'anulada' && detalle.estado !== 'pagada' && (
                <button onClick={() => cambiarEstado(detalle, 'anulada')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#D8543F', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Anular</button>
              )}
              <button onClick={() => setDetalle(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 13 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {eliminando && (
        <div onClick={() => setEliminando(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,18,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', marginBottom: 8 }}>¿Eliminar esta factura?</div>
            <div style={{ fontSize: 13, color: '#888780', marginBottom: 18 }}>{eliminando.numero} · {CLP(eliminando.total)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setEliminando(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={confirmarEliminar} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#D8543F', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1300 }}>{toast}</div>}
    </div>
  )
}
