'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'

const NAVY = '#1a1740', PURPLE = '#534AB7'
const CLP = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL')
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const fmtMes = (m) => { const [y, mm] = m.split('-'); return `${MESES[Number(mm) - 1]} ${y.slice(2)}` }
const PALETA = ['#534AB7', '#1D9E75', '#C98A1E', '#D8543F', '#3C8DBC', '#9B59B6', '#16A085', '#E67E22', '#7F8C8D', '#2980B9', '#E74C3C']
const SELECT_STYLE = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }
const LIMIT = 20

function StatCard({ label, value, sub, color = '#2C2C2A' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${PURPLE}`, padding: '14px 18px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Gráfico de barras: evolución mensual (SVG inline, sin librería) ─────────
function BarChartMensual({ data }) {
  if (!data?.length) return <div style={{ fontSize: 12, color: '#B4B2A9', padding: 20, textAlign: 'center' }}>Sin datos en el período</div>
  const W = 720, H = 200, padL = 50, padB = 28, padT = 14
  const max = Math.max(...data.map(d => d.total), 1)
  const bw = (W - padL - 16) / data.length
  const yScale = (v) => (H - padB - padT) * (v / max)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = H - padB - (H - padB - padT) * f
        return (
          <g key={i}>
            <line x1={padL} x2={W} y1={y} y2={y} stroke="#f1efe8" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="9" fill="#B4B2A9" textAnchor="end">{f ? CLP(Math.round(max * f)).replace('$', '') : '0'}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const h = yScale(d.total)
        const x = padL + i * bw + bw * 0.18
        const bw2 = bw * 0.64
        return (
          <g key={d.mes}>
            <rect x={x} y={H - padB - h} width={bw2} height={h} rx="3" fill={PURPLE} opacity={i === data.length - 1 ? 1 : 0.78} />
            <text x={x + bw2 / 2} y={H - padB + 14} fontSize="9.5" fill="#888780" textAnchor="middle">{fmtMes(d.mes)}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Lista de barras horizontales (categoría / persona / método) ────────────
function BarList({ data, labelKey, valueKey = 'total', max: maxOverride, colorByIndex }) {
  if (!data?.length) return <div style={{ fontSize: 12, color: '#B4B2A9', padding: 12 }}>Sin datos</div>
  const max = maxOverride || Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div>
      {data.map((d, i) => (
        <div key={d[labelKey] + i} style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#2C2C2A', marginBottom: 3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{d[labelKey]}</span>
            <strong>{CLP(d[valueKey])}</strong>
          </div>
          <div style={{ height: 8, background: '#f1efe8', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(2, (d[valueKey] / max) * 100)}%`, height: '100%', background: colorByIndex ? PALETA[i % PALETA.length] : PURPLE, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const METODO_LABEL = { transferencia: 'Transferencia', tarjeta_empresa: 'Tarjeta empresa', tarjeta_personal: 'Tarjeta personal', efectivo: 'Efectivo', otro: 'Otro' }

export default function GastosPage() {
  const [categorias, setCategorias] = useState([])
  const [metodosPago, setMetodosPago] = useState([])
  const [staff, setStaff] = useState([])
  const [stats, setStats] = useState(null)
  const [gastos, setGastos] = useState([])
  const [total, setTotal] = useState(0)
  const [suma, setSuma] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fMetodo, setFMetodo] = useState('')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [eliminando, setEliminando] = useState(null)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    api.get('/api/admin/gastos/categorias').then(d => { setCategorias(d.categorias || []); setMetodosPago(d.metodos_pago || []) }).catch(() => {})
    api.get('/api/admin/usuarios?company_id=dstac&limit=200').then(d => setStaff(d.usuarios || [])).catch(() => {})
  }, [])

  const cargarStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      setStats(await api.get(`/api/admin/gastos/stats?${params}`))
    } catch {}
  }, [desde, hasta])

  const cargarGastos = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      if (fCategoria) params.set('categoria', fCategoria)
      if (fMetodo) params.set('metodo_pago', fMetodo)
      if (search) params.set('search', search)
      const data = await api.get(`/api/admin/gastos?${params}`)
      setGastos(data.gastos || []); setTotal(data.total || 0); setSuma(data.suma || 0); setPage(p)
    } catch { setGastos([]) }
    finally { setLoading(false) }
  }, [desde, hasta, fCategoria, fMetodo, search])

  useEffect(() => { cargarStats(); cargarGastos(1) }, [cargarStats, cargarGastos])

  function abrirNuevo() {
    setEditando(null)
    setForm({ fecha: new Date().toISOString().slice(0, 10), monto: '', categoria: categorias[0] || '', proveedor: '', descripcion: '', metodo_pago: 'transferencia', realizado_por: '', pagado_por: '', comprobante: '', notas: '' })
    setModalOpen(true)
  }
  function abrirEditar(g) {
    setEditando(g)
    setForm({
      fecha: g.fecha?.slice(0, 10), monto: g.monto, categoria: g.categoria, proveedor: g.proveedor || '',
      descripcion: g.descripcion || '', metodo_pago: g.metodo_pago, realizado_por: g.realizado_por || '',
      pagado_por: g.pagado_por || '', comprobante: g.comprobante || '', notas: g.notas || '',
    })
    setModalOpen(true)
  }

  async function guardar() {
    if (!form.fecha || !form.monto || !form.categoria) { showToast('Fecha, monto y categoría son obligatorios'); return }
    setSaving(true)
    try {
      if (editando) {
        await api.put(`/api/admin/gastos/${editando.id}`, form)
        showToast('Gasto actualizado')
      } else {
        await api.post('/api/admin/gastos', form)
        showToast('Gasto registrado')
      }
      setModalOpen(false)
      cargarStats(); cargarGastos(page)
    } catch (e) { showToast(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    try {
      await api.delete(`/api/admin/gastos/${eliminando.id}`)
      showToast('Gasto eliminado')
      setEliminando(null)
      cargarStats(); cargarGastos(page)
    } catch (e) { showToast(e.message || 'No se pudo eliminar') }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const limpiarFiltros = () => { setDesde(''); setHasta(''); setFCategoria(''); setFMetodo(''); setSearch('') }

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>💸 Registro de Gastos DSTAC</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Contabilidad interna de la empresa · {total} gasto{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={abrirNuevo}
          style={{ background: '#fff', color: NAVY, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          + Registrar gasto
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <StatCard label="Total mes actual" value={CLP(stats?.totalMesActual)} color="#D8543F" />
        <StatCard label="Total año actual" value={CLP(stats?.totalAnoActual)} color="#534AB7" />
        <StatCard label="Promedio mensual (6m)" value={CLP(stats?.promedioMensual)} />
        <StatCard label="Total filtrado" value={CLP(stats?.total)} sub={`${stats?.cantidad ?? 0} movimientos`} />
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 18 }}>
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 10, fontSize: 13 }}>Evolución mensual (últimos 12 meses)</div>
          <BarChartMensual data={stats?.evolucion} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 10, fontSize: 13 }}>Por categoría</div>
          <BarList data={stats?.porCategoria?.slice(0, 8)} labelKey="categoria" colorByIndex />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 10, fontSize: 13 }}>Por quién pagó</div>
          <BarList data={stats?.porPersona?.slice(0, 6)} labelKey="nombre" />
        </div>
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 10, fontSize: 13 }}>Por método de pago</div>
          <BarList data={stats?.porMetodo?.map(m => ({ ...m, metodo: METODO_LABEL[m.metodo] || m.metodo }))} labelKey="metodo" />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={SELECT_STYLE} title="Desde" />
        <span style={{ color: '#B4B2A9', fontSize: 12 }}>—</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={SELECT_STYLE} title="Hasta" />
        <select value={fCategoria} onChange={e => setFCategoria(e.target.value)} style={SELECT_STYLE}>
          <option value="">Categoría</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fMetodo} onChange={e => setFMetodo(e.target.value)} style={SELECT_STYLE}>
          <option value="">Método de pago</option>
          {metodosPago.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor, descripción, comprobante…"
          style={{ flex: 1, minWidth: 200, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }} />
        {(desde || hasta || fCategoria || fMetodo || search) && (
          <button onClick={limpiarFiltros} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>Limpiar</button>
        )}
        <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto', fontWeight: 600 }}>Suma filtrada: {CLP(suma)}</span>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f7f4' }}>
              {['Fecha', 'Categoría', 'Proveedor / Descripción', 'Monto', 'Método', 'Realizó', 'Pagó', 'Comprobante', ''].map(h => (
                <th key={h} style={{ textAlign: h === 'Monto' ? 'right' : 'left', padding: '9px 10px', fontSize: 10.5, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #e2e0d8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#B4B2A9', fontSize: 13 }}>Cargando…</td></tr>
            ) : gastos.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#B4B2A9', fontSize: 13 }}>Sin gastos registrados con estos filtros.</td></tr>
            ) : gastos.map(g => (
              <tr key={g.id}>
                <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#2C2C2A', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{new Date(g.fecha).toLocaleDateString('es-CL')}</td>
                <td style={{ padding: '9px 10px', fontSize: 12, borderBottom: '1px solid #f5f4ef' }}><span style={{ background: '#EEEDFE', color: '#3C3489', borderRadius: 999, padding: '3px 9px', fontWeight: 600, fontSize: 11 }}>{g.categoria}</span></td>
                <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#444441', borderBottom: '1px solid #f5f4ef' }}>
                  {g.proveedor && <div style={{ fontWeight: 600 }}>{g.proveedor}</div>}
                  {g.descripcion && <div style={{ color: '#888780', fontSize: 11.5 }}>{g.descripcion}</div>}
                </td>
                <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 700, color: '#D8543F', textAlign: 'right', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{CLP(g.monto)}</td>
                <td style={{ padding: '9px 10px', fontSize: 11.5, color: '#888780', borderBottom: '1px solid #f5f4ef' }}>{METODO_LABEL[g.metodo_pago] || g.metodo_pago}</td>
                <td style={{ padding: '9px 10px', fontSize: 11.5, color: '#888780', borderBottom: '1px solid #f5f4ef' }}>{g.realizado_por_nombre?.trim() || '—'}</td>
                <td style={{ padding: '9px 10px', fontSize: 11.5, color: '#888780', borderBottom: '1px solid #f5f4ef' }}>{g.pagado_por_nombre?.trim() || '—'}</td>
                <td style={{ padding: '9px 10px', fontSize: 11.5, color: '#888780', borderBottom: '1px solid #f5f4ef' }}>{g.comprobante || '—'}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>
                  <button onClick={() => abrirEditar(g)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 12.5, marginRight: 8 }}>Editar</button>
                  <button onClick={() => setEliminando(g)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D8543F', fontSize: 12.5 }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => cargarGastos(page - 1)} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>← Anterior</button>
          <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
          <button onClick={() => cargarGastos(page + 1)} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>Siguiente →</button>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,18,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#2C2C2A', marginBottom: 16 }}>{editando ? 'Editar gasto' : 'Registrar gasto'}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="Fecha *"><input type="date" value={form.fecha || ''} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={INPUT} /></Field>
              <Field label="Monto (CLP) *"><input type="number" min="0" value={form.monto ?? ''} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" style={INPUT} /></Field>
            </div>

            <Field label="Categoría *">
              <select value={form.categoria || ''} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={INPUT}>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
              <Field label="Proveedor"><input value={form.proveedor || ''} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="Ej. AWS, Microsoft…" style={INPUT} /></Field>
              <Field label="Comprobante (N° boleta/factura)"><input value={form.comprobante || ''} onChange={e => setForm(f => ({ ...f, comprobante: e.target.value }))} style={INPUT} /></Field>
            </div>

            <Field label="Descripción"><input value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Detalle breve del gasto" style={INPUT} /></Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '12px 0' }}>
              <Field label="Método de pago">
                <select value={form.metodo_pago || ''} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))} style={INPUT}>
                  {metodosPago.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Quién realizó la compra">
                <select value={form.realizado_por || ''} onChange={e => setForm(f => ({ ...f, realizado_por: e.target.value }))} style={INPUT}>
                  <option value="">—</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}</option>)}
                </select>
              </Field>
              <Field label="Quién pagó">
                <select value={form.pagado_por || ''} onChange={e => setForm(f => ({ ...f, pagado_por: e.target.value }))} style={INPUT}>
                  <option value="">—</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Notas"><textarea value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} style={{ ...INPUT, resize: 'vertical' }} /></Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: PURPLE, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Registrar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {eliminando && (
        <div onClick={() => setEliminando(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,18,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', marginBottom: 8 }}>¿Eliminar este gasto?</div>
            <div style={{ fontSize: 13, color: '#888780', marginBottom: 18 }}>{eliminando.categoria} · {CLP(eliminando.monto)} · {new Date(eliminando.fecha).toLocaleDateString('es-CL')}</div>
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

const INPUT = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13.5, color: '#2C2C2A', outline: 'none', boxSizing: 'border-box' }

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#888780', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}
