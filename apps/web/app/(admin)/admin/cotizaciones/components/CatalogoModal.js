'use client'

// Gestión del catálogo de servicios reutilizables (para armar cotizaciones rápido).
import { useState } from 'react'
import { apiFetch } from '../../../../../lib/api'
import { clp } from './format'

const inp = { padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12.5, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function CatalogoModal({ catalogo = [], onClose, onChanged }) {
  const [nuevo, setNuevo] = useState({ nombre: '', detalle: '', tipo: 'unico', nivel: '', precio_sugerido: '' })
  const [busy, setBusy] = useState(false)

  async function agregar() {
    if (!nuevo.nombre.trim()) return
    setBusy(true)
    try { await apiFetch('/api/admin/cotizaciones/catalogo', { method: 'POST', body: JSON.stringify({ ...nuevo, orden: (catalogo.at(-1)?.orden ?? catalogo.length) + 1 }) }); setNuevo({ nombre: '', detalle: '', tipo: 'unico', nivel: '', precio_sugerido: '' }); onChanged() }
    finally { setBusy(false) }
  }
  async function actualizarPrecio(id, precio_sugerido) {
    try { await apiFetch(`/api/admin/cotizaciones/catalogo/${id}`, { method: 'PUT', body: JSON.stringify({ precio_sugerido }) }); onChanged() } catch {}
  }
  async function eliminar(id) {
    if (!confirm('¿Eliminar este servicio del catálogo?')) return
    try { await apiFetch(`/api/admin/cotizaciones/catalogo/${id}`, { method: 'DELETE' }); onChanged() } catch {}
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,33,92,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>Catálogo de servicios</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#888780', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '16px 22px' }}>
          {/* Agregar */}
          <div style={{ background: '#FAFAF8', border: '1px solid #f1efe8', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888780', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Agregar servicio</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} placeholder="Nombre del servicio" style={{ ...inp, flex: '2 1 200px' }} />
              <input value={nuevo.nivel} onChange={e => setNuevo(n => ({ ...n, nivel: e.target.value }))} placeholder="Nivel (N1, 2A…)" style={{ ...inp, flex: '1 1 90px', maxWidth: 110 }} />
              <select value={nuevo.tipo} onChange={e => setNuevo(n => ({ ...n, tipo: e.target.value }))} style={inp}><option value="unico">Único</option><option value="mensual">Mensual</option></select>
              <input type="number" value={nuevo.precio_sugerido} onChange={e => setNuevo(n => ({ ...n, precio_sugerido: e.target.value }))} placeholder="Precio sug." style={{ ...inp, flex: '1 1 100px', maxWidth: 130 }} />
            </div>
            <input value={nuevo.detalle} onChange={e => setNuevo(n => ({ ...n, detalle: e.target.value }))} placeholder="Detalle (opcional)" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginTop: 8 }} />
            <button onClick={agregar} disabled={busy || !nuevo.nombre.trim()} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Agregar</button>
          </div>

          {/* Lista */}
          {catalogo.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderBottom: '1px solid #f1efe8' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{c.nivel && <span style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, marginRight: 6 }}>{c.nivel}</span>}{c.nombre}</div>
                {c.detalle && <div style={{ fontSize: 11.5, color: '#888780', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.detalle}</div>}
              </div>
              <span style={{ fontSize: 11, color: '#888780' }}>{c.tipo === 'mensual' ? 'Mensual' : 'Único'}</span>
              <input type="number" defaultValue={c.precio_sugerido ?? ''} onBlur={e => { const v = e.target.value; if (String(v) !== String(c.precio_sugerido ?? '')) actualizarPrecio(c.id, v) }} placeholder="—" title="Precio sugerido" style={{ ...inp, width: 110, textAlign: 'right' }} />
              <button onClick={() => eliminar(c.id)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', fontSize: 14 }}>🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
