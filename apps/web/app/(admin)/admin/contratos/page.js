'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'
import BotonInforme from '../../../../components/admin/BotonInforme'

const NAVY = '#1a1740', PURPLE = '#534AB7'
const ESTADO_COLOR = {
  borrador:         { bg: '#F1EFE8', color: '#444441', label: 'Borrador' },
  enviado:          { bg: '#FFF6DD', color: '#C98A1E', label: 'Enviado a firma' },
  firmado_cliente:  { bg: '#EEEDFE', color: '#3C3489', label: 'Firmado por el cliente' },
  completado:       { bg: '#EAF3DE', color: '#1D9E75', label: 'Completado' },
  rechazado:        { bg: '#FCEBEB', color: '#D8543F', label: 'Rechazado' },
}

// Este módulo es deliberadamente GLOBAL (no depende de "empresa activa"):
// la empresa de cada contrato se toma de la cotización elegida, para poder
// gestionar contratos de todos los clientes desde una sola pantalla.
export default function ContratosPage() {
  const [contratos, setContratos] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [datosLegales, setDatosLegales] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDatosLegales, setShowDatosLegales] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [cotizacionElegida, setCotizacionElegida] = useState('')
  const [firmando, setFirmando] = useState(null)
  const [firmaForm, setFirmaForm] = useState({ nombre: '', rut: '', cargo: '' })
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get('/api/admin/contratos'),
        api.get('/api/admin/contratos/cotizaciones-disponibles'),
        api.get('/api/admin/contratos/datos-legales'),
      ])
      setContratos(r1.contratos ?? [])
      setCotizaciones(r2.cotizaciones ?? [])
      setDatosLegales(r3)
    } catch { showToast('No se pudo cargar el módulo de contratos') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function guardarDatosLegales() {
    try {
      await api.put('/api/admin/contratos/datos-legales', datosLegales)
      showToast('Datos legales de DSTAC actualizados')
      setShowDatosLegales(false)
    } catch (e) { showToast(e.message || 'No se pudo guardar') }
  }

  async function generarContrato() {
    if (!cotizacionElegida) return showToast('Selecciona una cotización aceptada')
    setGenerando(true)
    try {
      await api.post('/api/admin/contratos', { cotizacion_id: cotizacionElegida })
      showToast('Contrato generado como borrador')
      setCotizacionElegida('')
      cargar()
    } catch (e) { showToast(e.message || 'No se pudo generar el contrato') }
    finally { setGenerando(false) }
  }

  async function enviarAFirma(id) {
    try {
      await api.post(`/api/admin/contratos/${id}/enviar`, {})
      showToast('Contrato enviado a firma')
      cargar()
    } catch (e) {
      const detalle = e.detalle?.length ? `: ${e.detalle.join(', ')}` : ''
      showToast((e.message || 'No se pudo enviar') + detalle)
    }
  }

  async function firmarDstac() {
    if (!firmaForm.nombre.trim() || !firmaForm.rut.trim()) return showToast('Nombre y RUT son obligatorios')
    try {
      await api.post(`/api/admin/contratos/${firmando}/firmar-dstac`, firmaForm)
      showToast('Firmado por DSTAC')
      setFirmando(null)
      setFirmaForm({ nombre: '', rut: '', cargo: '' })
      cargar()
    } catch (e) { showToast(e.message || 'No se pudo firmar') }
  }

  const empresas = [...new Set(contratos.map(c => c.company_name))].sort()
  const contratosFiltrados = filtroEmpresa ? contratos.filter(c => c.company_name === filtroEmpresa) : contratos

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>📜 Contratos</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Todas las empresas · autorización de intervención y firma electrónica</div>
        </div>
        <button onClick={() => setShowDatosLegales(s => !s)}
          style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ⚙️ Datos legales de DSTAC
        </button>
      </div>

      {showDatosLegales && datosLegales && (
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 4 }}>Datos legales de DSTAC</div>
          <div style={{ fontSize: 12, color: '#888780', marginBottom: 14 }}>Aparecen como "el Prestador" en todos los contratos generados.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <LegalField label="Razón social" value={datosLegales.razon_social} onChange={v => setDatosLegales(d => ({ ...d, razon_social: v }))} />
            <LegalField label="RUT" value={datosLegales.rut} onChange={v => setDatosLegales(d => ({ ...d, rut: v }))} placeholder="76.xxx.xxx-x" />
            <LegalField label="Domicilio" value={datosLegales.domicilio} onChange={v => setDatosLegales(d => ({ ...d, domicilio: v }))} full />
            <LegalField label="Representante legal" value={datosLegales.representante_legal} onChange={v => setDatosLegales(d => ({ ...d, representante_legal: v }))} />
            <LegalField label="RUT representante" value={datosLegales.representante_legal_rut} onChange={v => setDatosLegales(d => ({ ...d, representante_legal_rut: v }))} />
            <LegalField label="Cargo / personería" value={datosLegales.representante_legal_cargo} onChange={v => setDatosLegales(d => ({ ...d, representante_legal_cargo: v }))} />
          </div>
          <button onClick={guardarDatosLegales}
            style={{ marginTop: 14, background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Generar contrato desde una cotización aceptada</div>
        {cotizaciones.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780' }}>No hay cotizaciones en estado "aceptada" sin contrato todavía (de ninguna empresa).</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={cotizacionElegida} onChange={e => setCotizacionElegida(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, minWidth: 320 }}>
              <option value="">Selecciona una cotización…</option>
              {cotizaciones.map(c => <option key={c.id} value={c.id}>{c.numero} · {c.company_name} · ${Number(c.total).toLocaleString('es-CL')}</option>)}
            </select>
            <button onClick={generarContrato} disabled={generando || !cotizacionElegida}
              style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', opacity: cotizacionElegida ? 1 : 0.5 }}>
              {generando ? 'Generando…' : '+ Generar contrato'}
            </button>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: '#2C2C2A' }}>Contratos ({contratosFiltrados.length})</div>
          {empresas.length > 1 && (
            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12.5 }}>
              <option value="">Todas las empresas</option>
              {empresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: '#888780' }}>Cargando…</div>
        ) : contratosFiltrados.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780' }}>Aún no hay contratos generados.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contratosFiltrados.map(c => {
              const e = ESTADO_COLOR[c.estado] || ESTADO_COLOR.borrador
              return (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: '1px solid #ECEAE3', borderRadius: 10, padding: '10px 14px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#2C2C2A' }}>{c.numero} <span style={{ fontWeight: 400, color: '#6A675E' }}>· {c.company_name}</span></div>
                    <div style={{ fontSize: 11.5, color: '#888780' }}>{new Date(c.created_at).toLocaleDateString('es-CL')} · código {c.codigo_verificacion}</div>
                  </div>
                  <span style={{ background: e.bg, color: e.color, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>{e.label}</span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <BotonInforme tipo="contrato" slug={c.company_slug} label="Previsualizar" query={{ id: c.id }} />
                    {c.estado === 'borrador' && (
                      <button onClick={() => enviarAFirma(c.id)}
                        style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Enviar a firma
                      </button>
                    )}
                    {c.estado !== 'borrador' && !c.firmado_dstac && (
                      <button onClick={() => setFirmando(c.id)}
                        style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Firmar (DSTAC)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {firmando && (
        <div onClick={() => setFirmando(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 380 }}>
            <div style={{ fontWeight: 700, color: NAVY, marginBottom: 4 }}>Firmar por DSTAC</div>
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 14 }}>Queda registrado el hash del documento, tu usuario, IP y fecha/hora.</div>
            <FirmaInput label="Nombre" value={firmaForm.nombre} onChange={v => setFirmaForm(f => ({ ...f, nombre: v }))} />
            <FirmaInput label="RUT" value={firmaForm.rut} onChange={v => setFirmaForm(f => ({ ...f, rut: v }))} />
            <FirmaInput label="Cargo" value={firmaForm.cargo} onChange={v => setFirmaForm(f => ({ ...f, cargo: v }))} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setFirmando(null)} style={{ background: 'none', border: '1px solid #e2e0d8', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={firmarDstac} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Firmar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100, maxWidth: 480, textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}

function LegalField({ label, value, onChange, placeholder, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#2C2C2A', marginBottom: 4 }}>{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  )
}

function FirmaInput({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#2C2C2A', marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  )
}
