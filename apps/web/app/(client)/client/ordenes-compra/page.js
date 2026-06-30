'use client'

import { useState, useEffect } from 'react'

function clp(n) { const v = Number(n) || 0; return '$' + new Intl.NumberFormat('es-CL').format(v) }

const ESTADO_COLOR = {
  pendiente_factura: { bg: '#FFF6DD', color: '#C98A1E' },
  facturada:          { bg: '#EEEDFE', color: '#3C3489' },
  pagada:             { bg: '#EAF3DE', color: '#1D9E75' },
  anulada:            { bg: '#FCEBEB', color: '#D8543F' },
}

export default function ClienteOrdenesCompraPage() {
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ numero_oc: '', monto_total: '', notas: '' })
  const [archivo, setArchivo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 4500) }

  function cargar() {
    setLoading(true)
    fetch('/api/client/ordenes-compra', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setOrdenes(d.ordenes ?? []))
      .catch(() => showToast('No se pudieron cargar tus órdenes de compra'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [])

  async function subir(e) {
    e.preventDefault()
    if (!form.numero_oc.trim()) return showToast('Ingresa el número de OC')
    if (!archivo) return showToast('Debes adjuntar el PDF de la OC')
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('numero_oc', form.numero_oc.trim())
      if (form.monto_total) fd.append('monto_total', form.monto_total)
      if (form.notas) fd.append('notas', form.notas)
      fd.append('archivo_oc', archivo)
      const r = await fetch('/api/client/ordenes-compra', { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'No se pudo subir la OC')
      showToast('Orden de compra recibida correctamente')
      setModalOpen(false)
      setForm({ numero_oc: '', monto_total: '', notas: '' })
      setArchivo(null)
      cargar()
    } catch (e) { showToast(e.message || 'Error al subir') }
    finally { setSubiendo(false) }
  }

  const INP = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13 }
  const label = { fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 4, display: 'block' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Órdenes de Compra</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Sube aquí la orden de compra que generes para DSTAC — la usamos para emitir tu factura.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Subir orden de compra
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#888780' }}>Cargando…</div>
      ) : ordenes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e0d8', padding: '60px 40px', textAlign: 'center', maxWidth: 540 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>🧾</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2A', margin: '0 0 10px' }}>Aún no has subido órdenes de compra</h2>
          <p style={{ fontSize: 14, color: '#888780', lineHeight: 1.6, margin: 0 }}>
            Cuando generes una OC para DSTAC, súbela aquí para que podamos facturarte.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700 }}>
          {ordenes.map(o => {
            const e = ESTADO_COLOR[o.estado] || ESTADO_COLOR.pendiente_factura
            return (
              <div key={o.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#2C2C2A' }}>{o.numero_oc}</div>
                  <div style={{ fontSize: 11.5, color: '#888780' }}>
                    {new Date(o.created_at).toLocaleDateString('es-CL')}
                    {o.monto_total ? ` · ${clp(o.monto_total)}` : ''}
                    {o.numero_factura ? ` · Factura ${o.numero_factura}` : ''}
                  </div>
                </div>
                <span style={{ background: e.bg, color: e.color, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{o.estado_label}</span>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1740' }}>Subir orden de compra</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888780' }}>×</button>
            </div>
            <form onSubmit={subir} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={label}>N° de Orden de Compra *</label>
                <input value={form.numero_oc} onChange={e => setForm(f => ({ ...f, numero_oc: e.target.value }))} placeholder="Ej: OC-2026-001234" style={INP} required />
              </div>
              <div>
                <label style={label}>Monto total (CLP, opcional)</label>
                <input type="number" min="0" value={form.monto_total} onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))} placeholder="0" style={INP} />
              </div>
              <div>
                <label style={label}>PDF de la orden de compra *</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setArchivo(e.target.files[0] || null)} style={{ fontSize: 13 }} required />
                {archivo && <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>✓ {archivo.name}</div>}
              </div>
              <div>
                <label style={label}>Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Información adicional para DSTAC" style={{ ...INP, height: 'auto', minHeight: 70, padding: 10, resize: 'vertical' }} />
              </div>
              <button type="submit" disabled={subiendo} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', opacity: subiendo ? 0.7 : 1 }}>
                {subiendo ? 'Subiendo…' : '✓ Enviar a DSTAC'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: '#1a1740', color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100, maxWidth: 480, textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}
