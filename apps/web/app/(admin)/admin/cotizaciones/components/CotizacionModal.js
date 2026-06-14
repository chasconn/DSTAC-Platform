'use client'

// Crear/editar cotización: cliente (cliente/prospecto/manual) + líneas (catálogo o libres)
// + cálculo Neto/IVA/Total en vivo. Guarda contra /api/admin/cotizaciones.
import { useState } from 'react'
import { apiFetch } from '../../../../../lib/api'
import { clp, totales, TIPO_LINEA } from './format'

const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#888780', display: 'block', marginBottom: 5 }

export default function CotizacionModal({ cotizacion, companies = [], leads = [], catalogo = [], onClose, onSaved }) {
  const ed = !!cotizacion
  const [f, setF] = useState({
    estado:           cotizacion?.estado ?? 'borrador',
    company_id:       cotizacion?.company_id ?? '',
    lead_id:          cotizacion?.lead_id ?? '',
    cliente_empresa:  cotizacion?.cliente_empresa ?? '',
    cliente_rut:      cotizacion?.cliente_rut ?? '',
    cliente_contacto: cotizacion?.cliente_contacto ?? '',
    cliente_email:    cotizacion?.cliente_email ?? '',
    cliente_telefono: cotizacion?.cliente_telefono ?? '',
    fecha:            cotizacion?.fecha ? String(cotizacion.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10),
    validez_dias:     cotizacion?.validez_dias ?? 15,
    forma_pago:       cotizacion?.forma_pago ?? '',
    plazo_ejecucion:  cotizacion?.plazo_ejecucion ?? '',
    notas:            cotizacion?.notas ?? '',
  })
  const [items, setItems] = useState(
    (cotizacion?.items || []).map(it => ({ servicio: it.servicio, detalle: it.detalle || '', tipo: it.tipo, cantidad: it.cantidad, precio_unitario: it.precio_unitario }))
  )
  const [agregar, setAgregar] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const t = totales(items)

  // Vincular datos desde un cliente/prospecto existente
  function vincular(valor) {
    if (!valor) { set('company_id', ''); set('lead_id', ''); return }
    const [kind, id] = valor.split(':')
    if (kind === 'company') {
      const c = companies.find(x => String(x.id) === id)
      if (c) setF(p => ({ ...p, company_id: c.id, lead_id: '', cliente_empresa: c.name, cliente_email: c.billing_email || p.cliente_email }))
    } else {
      const l = leads.find(x => String(x.id) === id)
      if (l) setF(p => ({ ...p, lead_id: l.id, company_id: '', cliente_empresa: l.empresa || l.dominio || p.cliente_empresa, cliente_contacto: l.contacto_nombre || p.cliente_contacto, cliente_email: l.email || p.cliente_email, cliente_telefono: l.telefono || p.cliente_telefono }))
    }
  }

  function setItem(i, k, v) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it)) }
  function quitar(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function lineaLibre() { setItems(prev => [...prev, { servicio: '', detalle: '', tipo: 'unico', cantidad: 1, precio_unitario: 0 }]) }
  function agregarCatalogo(id) {
    const c = catalogo.find(x => String(x.id) === id); if (!c) return
    setItems(prev => [...prev, { servicio: c.nombre, detalle: c.detalle || '', tipo: c.tipo, cantidad: 1, precio_unitario: c.precio_sugerido || 0 }])
    setAgregar('')
  }

  async function guardar() {
    if (!f.cliente_empresa.trim() && !f.company_id && !f.lead_id) { setError('Indica el cliente'); return }
    if (items.length === 0) { setError('Agrega al menos una línea'); return }
    setSaving(true); setError('')
    const body = { ...f, company_id: f.company_id || null, lead_id: f.lead_id || null, validez_dias: Number(f.validez_dias) || 15, items }
    try {
      if (ed) await apiFetch(`/api/admin/cotizaciones/${cotizacion.id}`, { method: 'PUT', body: JSON.stringify(body) })
      else    await apiFetch('/api/admin/cotizaciones', { method: 'POST', body: JSON.stringify(body) })
      onSaved()
    } catch (err) { setError(err.message || 'Error al guardar'); setSaving(false) }
  }

  const vinc = f.company_id ? `company:${f.company_id}` : (f.lead_id ? `lead:${f.lead_id}` : '')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,33,92,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 10px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>{ed ? `Editar cotización ${cotizacion.numero}` : 'Nueva cotización'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#888780', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 12, padding: '8px 12px', borderRadius: 8 }}>{error}</div>}

          {/* Vincular */}
          <div>
            <label style={lbl}>Cargar datos de un cliente o prospecto (opcional)</label>
            <select value={vinc} onChange={e => vincular(e.target.value)} style={inp}>
              <option value="">— Escribir manualmente —</option>
              {companies.length > 0 && <optgroup label="Clientes">{companies.map(c => <option key={`c${c.id}`} value={`company:${c.id}`}>{c.name}</option>)}</optgroup>}
              {leads.length > 0 && <optgroup label="Prospectos">{leads.map(l => <option key={`l${l.id}`} value={`lead:${l.id}`}>{l.empresa || l.dominio || l.contacto_nombre || `Lead #${l.id}`}</option>)}</optgroup>}
            </select>
          </div>

          {/* Datos del cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Empresa / razón social *</label><input value={f.cliente_empresa} onChange={e => set('cliente_empresa', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>RUT</label><input value={f.cliente_rut} onChange={e => set('cliente_rut', e.target.value)} placeholder="00.000.000-0" style={inp} /></div>
            <div><label style={lbl}>Contacto</label><input value={f.cliente_contacto} onChange={e => set('cliente_contacto', e.target.value)} placeholder="Nombre y cargo" style={inp} /></div>
            <div><label style={lbl}>Correo</label><input value={f.cliente_email} onChange={e => set('cliente_email', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Teléfono</label><input value={f.cliente_telefono} onChange={e => set('cliente_telefono', e.target.value)} style={inp} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Fecha</label><input type="date" value={f.fecha} onChange={e => set('fecha', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Validez (días)</label><input type="number" min="1" value={f.validez_dias} onChange={e => set('validez_dias', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Estado</label>
              <select value={f.estado} onChange={e => set('estado', e.target.value)} style={inp}>
                <option value="borrador">Borrador</option><option value="enviada">Enviada</option>
                <option value="aceptada">Aceptada</option><option value="rechazada">Rechazada</option><option value="vencida">Vencida</option>
              </select>
            </div>
          </div>

          {/* Líneas */}
          <div style={{ borderTop: '1px solid #f1efe8', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>Servicios cotizados</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={agregar} onChange={e => agregarCatalogo(e.target.value)} style={{ ...inp, width: 'auto', fontSize: 12 }}>
                  <option value="">+ Del catálogo…</option>
                  {catalogo.map(c => <option key={c.id} value={c.id}>{c.nivel ? `[${c.nivel}] ` : ''}{c.nombre}</option>)}
                </select>
                <button onClick={lineaLibre} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#3C3489' }}>+ Línea libre</button>
              </div>
            </div>

            {items.length === 0 && <div style={{ fontSize: 12.5, color: '#B4B2A9', padding: '12px 0' }}>Agrega servicios desde el catálogo o como línea libre.</div>}

            {items.map((it, i) => {
              const sub = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)
              return (
                <div key={i} style={{ background: '#FAFAF8', border: '1px solid #f1efe8', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <input value={it.servicio} onChange={e => setItem(i, 'servicio', e.target.value)} placeholder="Servicio" style={{ ...inp, flex: 1, fontWeight: 600 }} />
                    <button onClick={() => quitar(i)} title="Quitar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', fontSize: 16, padding: '4px 6px' }}>🗑</button>
                  </div>
                  <input value={it.detalle} onChange={e => setItem(i, 'detalle', e.target.value)} placeholder="Detalle / descripción" style={{ ...inp, marginTop: 6, fontSize: 12 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr 1fr', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <select value={it.tipo} onChange={e => setItem(i, 'tipo', e.target.value)} style={{ ...inp, fontSize: 12 }}>
                      <option value="unico">Único</option><option value="mensual">Mensual</option>
                    </select>
                    <input type="number" min="1" value={it.cantidad} onChange={e => setItem(i, 'cantidad', e.target.value)} style={{ ...inp, fontSize: 12 }} title="Cantidad" />
                    <input type="number" min="0" value={it.precio_unitario} onChange={e => setItem(i, 'precio_unitario', e.target.value)} placeholder="Precio unit." style={{ ...inp, fontSize: 12 }} />
                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>{clp(sub)}</div>
                  </div>
                </div>
              )
            })}

            {/* Totales */}
            <div style={{ marginLeft: 'auto', width: 240, marginTop: 8 }}>
              <Row l="Neto" v={clp(t.neto)} />
              <Row l="IVA (19%)" v={clp(t.iva)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #3C3489', marginTop: 4, paddingTop: 8, fontSize: 16, fontWeight: 700, color: '#3C3489' }}>
                <span>Total</span><span>{clp(t.total)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid #f1efe8', paddingTop: 12 }}>
            <div><label style={lbl}>Forma de pago</label><input value={f.forma_pago} onChange={e => set('forma_pago', e.target.value)} placeholder="Ej. 50% anticipo, 50% contra entrega" style={inp} /></div>
            <div><label style={lbl}>Plazo de ejecución</label><input value={f.plazo_ejecucion} onChange={e => set('plazo_ejecucion', e.target.value)} placeholder="Ej. 3 semanas" style={inp} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Notas</label><textarea value={f.notas} onChange={e => set('notas', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e0d8', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: '#fff' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{saving ? 'Guardando…' : 'Guardar cotización'}</button>
        </div>
      </div>
    </div>
  )
}

function Row({ l, v }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#444441' }}><span>{l}</span><span>{v}</span></div>
}
