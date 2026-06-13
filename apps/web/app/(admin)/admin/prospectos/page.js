'use client'

import { useState, useEffect, useMemo } from 'react'
import { api } from '../../../../lib/api'
import ClienteFormModal from '../clientes/components/ClienteFormModal'

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

// ── Generación de informe (reusa los HTML del sitio diag, servidos en /reportes) ──
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-rep="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src; s.dataset.rep = src
    s.onload = () => resolve(); s.onerror = () => reject(new Error('No se pudo cargar ' + src))
    document.head.appendChild(s)
  })
}
let _libs = null
function loadReportLibs() {
  if (!_libs) _libs = (async () => {
    await loadScript('/reportes/risk_texts.js')
    await loadScript('/reportes/report_gen.js')
    await loadScript('/reportes/diag_catalog.js')
    await loadScript('/reportes/diag_gen.js')
  })()
  return _libs
}
async function fetchTemplate() {
  const tpl = await (await fetch('/reportes/informe_template.html', { cache: 'force-cache' })).text()
  const head = (tpl.match(/<head>[\s\S]*?<\/head>/i) || [])[0] || ''
  const logo = (tpl.match(/src="(data:image\/[a-z+]+;base64,[^"]+)"/i) || [])[1] || ''
  return { head, logo }
}
function composeReportHtml(head, logo, body) {
  const h = head.replace(/<\/head>/i, '<style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}</style></head>')
  return '<!DOCTYPE html><html lang="es">' + h + '<body>' + body + '</body></html>'
}
// Vista previa in-page con zoom (idéntica a la del panel de leads)
function dstacReportPreview(html) {
  const ov = document.createElement('div')
  ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(5,5,12,.88);display:flex;flex-direction:column;padding:14px;box-sizing:border-box'
  const bar = document.createElement('div')
  bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap'
  const left = document.createElement('span'); left.style.cssText = 'color:#fff;font:600 15px system-ui'; left.textContent = 'Vista previa del informe'
  bar.appendChild(left)
  const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:8px;align-items:center'
  const zb = (t) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;width:30px;height:30px;font:600 17px system-ui;cursor:pointer;padding:0'; return b }
  const zout = zb('−'), zin = zb('+')
  const zlbl = document.createElement('button'); zlbl.title = 'Ajustar al ancho'; zlbl.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;height:30px;padding:0 10px;font:600 13px system-ui;cursor:pointer;min-width:54px'
  const zw = document.createElement('div'); zw.style.cssText = 'display:flex;gap:4px;align-items:center;margin-right:6px'; zw.append(zout, zlbl, zin)
  const dl = document.createElement('button'); dl.textContent = 'Guardar PDF'; dl.style.cssText = 'background:#7B4DFF;color:#fff;border:none;border-radius:999px;padding:10px 20px;font:600 14px system-ui;cursor:pointer'
  const cl = document.createElement('button'); cl.textContent = 'Cerrar'; cl.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:10px 16px;font:600 14px system-ui;cursor:pointer'
  btns.append(zw, dl, cl); bar.appendChild(btns); ov.appendChild(bar)
  const box = document.createElement('div'); box.style.cssText = 'flex:1;overflow:auto;background:#525659;border-radius:10px;padding:14px'
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin:0 auto;position:relative'
  const ifr = document.createElement('iframe'); ifr.style.cssText = 'width:210mm;border:0;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.5);display:block;transform-origin:top left'
  wrap.appendChild(ifr); box.appendChild(wrap); ov.appendChild(box); document.body.appendChild(ov)
  const d = ifr.contentWindow.document; d.open(); d.write(html); d.close()
  let zoom = 1, baseW = 0, baseH = 0
  const apply = () => { if (!baseW) return; ifr.style.transform = 'scale(' + zoom + ')'; wrap.style.width = (baseW * zoom) + 'px'; wrap.style.height = (baseH * zoom) + 'px'; zlbl.textContent = Math.round(zoom * 100) + '%' }
  const measure = () => { try { baseH = ifr.contentWindow.document.documentElement.scrollHeight } catch { baseH = 1188 } ; ifr.style.height = baseH + 'px'; baseW = ifr.offsetWidth || 794; apply() }
  const fit = () => { measure(); zoom = Math.max(0.5, Math.min(2, (box.clientWidth - 28) / (baseW || 794))); apply() }
  const setZ = (z) => { zoom = Math.max(0.4, Math.min(3, Math.round(z * 100) / 100)); apply() }
  ifr.onload = () => { measure(); try { ifr.contentWindow.document.fonts?.ready?.then(fit) } catch {} ; setTimeout(fit, 200) }
  setTimeout(fit, 500)
  zin.onclick = () => setZ(zoom + 0.1); zout.onclick = () => setZ(zoom - 0.1); zlbl.onclick = fit
  box.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZ(zoom + (e.deltaY < 0 ? 0.1 : -0.1)) } }, { passive: false })
  dl.onclick = () => { try { ifr.contentWindow.focus(); ifr.contentWindow.print() } catch (e) { alert('No se pudo abrir el guardado: ' + e) } }
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey) }
  const onKey = (e) => { if (e.key === 'Escape') close() }
  cl.onclick = close; ov.addEventListener('click', (e) => { if (e.target === ov) close() }); document.addEventListener('keydown', onKey)
}
const cardBtn = (primary) => ({
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
  padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
  fontWeight: primary ? 700 : 600, fontSize: 12.5, color: '#3C3489',
  border: primary ? '1.5px solid #534AB7' : '1px solid #E6E2F0',
  background: primary ? '#F4F2FE' : '#fff',
})
function IconOjo() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>) }
function IconDoc() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>) }

export default function ProspectosPage() {
  const [leads, setLeads]   = useState([])
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo]     = useState('')      // '', 'web_scan', 'cuestionario'
  const [estado, setEstado] = useState('')
  const [search, setSearch] = useState('')
  const [sel, setSel]       = useState(null)    // lead detalle (completo)
  const [convirtiendo, setConvirtiendo] = useState(null) // lead que se está convirtiendo en cliente
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

  // Tras crear la empresa desde el modal: enlazar el prospecto y marcarlo convertido.
  async function onClienteCreado(empresa) {
    const lead = convirtiendo
    try {
      if (lead) {
        await api.patch(`/api/admin/leads/${lead.id}`, { estado: 'convertido', company_id: empresa.id })
      }
    } catch (e) {
      // La empresa ya se creó; no bloqueamos por el enlace del prospecto.
      notify('Empresa creada, pero no se pudo marcar el prospecto: ' + (e.message || ''), false)
    }
    setConvirtiendo(null)
    setSel(null)
    fetchLeads()
    notify(`Empresa "${empresa.name}" creada y prospecto convertido`)
  }

  async function generarInforme(lead, locked = false) {
    try {
      notify('Generando informe…')
      await loadReportLibs()
      const { head, logo } = await fetchTemplate()
      let body
      if (lead.tipo === 'web_scan') {
        const d = lead.data || {}
        const S = {
          domain: lead.dominio || '—', fecha: fmtFecha(lead.created_at),
          grade: d.grade ?? lead.grade, score: d.score ?? lead.score, risk: d.risk ?? lead.risk,
          caption: d.caption, ssl: d.ssl || {}, checks: d.allHeaderChecks || [], email: d.email || {},
        }
        if (typeof window.buildReportBody !== 'function') throw new Error('No se cargó el generador del informe')
        body = window.buildReportBody(S, logo, { locked })
      } else {
        const d = lead.data || {}
        const clientData = { nombre_empresa: lead.empresa, nombre_responsable: lead.contacto_nombre }
        if (typeof window.buildDiagData !== 'function') throw new Error('No se cargó el generador del diagnóstico')
        const D = window.buildDiagData(d.respuestas || {}, clientData, window.DIAG_BLOCKS, window.DIAG_RISK_LEVELS, null)
        body = window.buildDiagBody(D, logo)
      }
      dstacReportPreview(composeReportHtml(head, logo, body))
    } catch (e) { notify(e.message || 'No se pudo generar el informe', false) }
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

            {/* Informes */}
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 12, color: '#6E6884', fontWeight: 600 }}>INFORMES</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {sel.tipo === 'web_scan' ? (
                  <>
                    <button onClick={() => generarInforme(sel, true)} title="Como lo ve el prospecto (remediación bloqueada)" style={cardBtn(false)}>
                      <IconOjo /> Vista del cliente
                    </button>
                    <button onClick={() => generarInforme(sel, false)} title="Informe completo con remediación (entregable)" style={cardBtn(true)}>
                      <IconDoc /> Informe completo
                    </button>
                  </>
                ) : (
                  <button onClick={() => generarInforme(sel, false)} title="Informe del autodiagnóstico" style={cardBtn(true)}>
                    <IconDoc /> Informe del diagnóstico
                  </button>
                )}
              </div>
            </div>

            {/* Convertir a cliente */}
            {sel.estado === 'convertido' && sel.company_id ? (
              <div style={{ width: '100%', marginTop: 14, padding: '11px', borderRadius: 8, background: '#E4F6EC', color: '#1F7A4D', fontWeight: 600, fontSize: 13.5, textAlign: 'center' }}>
                ✓ Ya convertido en cliente
              </div>
            ) : (
              <button onClick={() => setConvirtiendo(sel)}
                style={{ width: '100%', marginTop: 14, padding: '11px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Convertir a cliente</button>
            )}
          </div>
        </>
      )}

      {/* Modal para crear la empresa a partir del prospecto */}
      {convirtiendo && (
        <ClienteFormModal
          initial={{
            name:          convirtiendo.empresa || convirtiendo.dominio || convirtiendo.contacto_nombre || '',
            billing_email: convirtiendo.email || '',
            contact_phone: convirtiendo.telefono || '',
          }}
          onClose={() => setConvirtiendo(null)}
          onCreated={onClienteCreado}
        />
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
