'use client'

import { useState, useEffect } from 'react'

const ESTADO_COLOR = {
  enviado:          { bg: '#FFF6DD', color: '#C98A1E', label: 'Pendiente de tu firma' },
  firmado_cliente:  { bg: '#EEEDFE', color: '#3C3489', label: 'Firmado por ti · esperando a DSTAC' },
  completado:       { bg: '#EAF3DE', color: '#1D9E75', label: 'Firmado por ambas partes' },
  rechazado:        { bg: '#FCEBEB', color: '#D8543F', label: 'Rechazado' },
}

export default function ClienteContratosPage() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [abierto, setAbierto] = useState(null)
  const [firmando, setFirmando] = useState(false)
  const [form, setForm] = useState({ nombre: '', rut: '', cargo: '', acepto: false })
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 4500) }

  function cargar() {
    setLoading(true)
    fetch('/api/client/contratos', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setContratos(d.contratos ?? []))
      .catch(() => showToast('No se pudieron cargar tus contratos'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [])

  async function abrir(id) {
    try {
      const r = await fetch(`/api/client/contratos/${id}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setAbierto(d)
      setForm({ nombre: '', rut: '', cargo: '', acepto: false })
    } catch (e) { showToast(e.message || 'No se pudo abrir el contrato') }
  }

  async function firmar() {
    if (!form.acepto) return showToast('Debes marcar la casilla de aceptación')
    if (!form.nombre.trim() || !form.rut.trim()) return showToast('Nombre y RUT son obligatorios')
    setFirmando(true)
    try {
      const r = await fetch(`/api/client/contratos/${abierto.id}/firmar`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      showToast('Contrato firmado correctamente')
      setAbierto(null)
      cargar()
    } catch (e) { showToast(e.message || 'No se pudo firmar') }
    finally { setFirmando(false) }
  }

  const yaFirmado = !!abierto?.firma_cliente

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Contratos</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
          Contratos de prestación de servicios y autorizaciones de intervención firmados con DSTAC.
        </p>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#888780' }}>Cargando…</div>
      ) : contratos.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e0d8', padding: '60px 40px', textAlign: 'center', maxWidth: 540 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>📜</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2A', margin: '0 0 10px' }}>Aún no tienes contratos</h2>
          <p style={{ fontSize: 14, color: '#888780', lineHeight: 1.6, margin: 0 }}>
            Cuando DSTAC te envíe un contrato a firma, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700 }}>
          {contratos.map(c => {
            const e = ESTADO_COLOR[c.estado] || ESTADO_COLOR.enviado
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#2C2C2A' }}>{c.numero}</div>
                  <div style={{ fontSize: 11.5, color: '#888780' }}>{new Date(c.created_at).toLocaleDateString('es-CL')}</div>
                </div>
                <span style={{ background: e.bg, color: e.color, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{e.label}</span>
                <button onClick={() => abrir(c.id)} style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {c.firmado_cliente ? 'Ver' : 'Ver y firmar'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {abierto && (
        <div onClick={() => setAbierto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 820, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1a1740' }}>{abierto.numero}</div>
              <button onClick={() => setAbierto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888780' }}>×</button>
            </div>

            <iframe
              srcDoc={abierto.contenido_html || '<p style="font-family:sans-serif;padding:20px">Sin contenido disponible.</p>'}
              style={{ flex: 1, border: 'none', minHeight: 420 }}
              title="Contrato"
            />

            {!yaFirmado && (
              <div style={{ borderTop: '1px solid #e2e0d8', padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 10, fontSize: 14 }}>Firmar este contrato</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <input placeholder="Nombre completo" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    style={{ flex: '1 1 200px', height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13 }} />
                  <input placeholder="RUT" value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
                    style={{ flex: '1 1 140px', height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13 }} />
                  <input placeholder="Cargo" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                    style={{ flex: '1 1 160px', height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13 }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#444441', marginBottom: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.acepto} onChange={e => setForm(f => ({ ...f, acepto: e.target.checked }))} style={{ marginTop: 2 }} />
                  Declaro que cuento con las facultades suficientes para representar y obligar a mi empresa,
                  y que firmo este contrato en su nombre y representación, aceptando su contenido íntegro.
                </label>
                <button onClick={firmar} disabled={firmando}
                  style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', opacity: firmando ? 0.7 : 1 }}>
                  {firmando ? 'Firmando…' : '✓ Firmar contrato'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: '#1a1740', color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100, maxWidth: 480, textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}
