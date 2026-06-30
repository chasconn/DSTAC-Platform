'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'
import BotonInforme from '../../../../components/admin/BotonInforme'
import { confirmDstac, alertDstac } from '../../../../components/admin/ConfirmDialog'
import { NIVEL, ESTADO, CATEGORIA } from './components/constants'
import RiesgosStats  from './components/RiesgosStats'
import MatrizRiesgos from './components/MatrizRiesgos'
import RiesgosTabla  from './components/RiesgosTabla'
import RiesgoDetalle from './components/RiesgoDetalle'
import RiesgoModal   from './components/RiesgoModal'
import ImportarExcelModal from '../../../../components/admin/ImportarExcelModal'

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function RiesgosPage() {
  const isMobile = useIsMobile()

  const [empresas, setEmpresas]           = useState({ internas: [], clientes: [] })
  const [empresaActiva, setEmpresaActiva] = useState(null)

  const [riesgos, setRiesgos] = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fEstado, setFEstado]       = useState('')
  const [fNivel, setFNivel]         = useState('')
  const [celda, setCelda]           = useState(null)

  const [activos, setActivos]         = useState([])
  const [isoControls, setIsoControls] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)
  const [editando, setEditando]   = useState(null)
  const [viendo, setViendo]       = useState(null)   // riesgo completo (detalle)
  const [toast, setToast]         = useState(null)

  const slug = empresaActiva?.slug ?? null
  const headers = slug ? { 'X-Company-Slug': slug } : {}
  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 400); return () => clearTimeout(t) }, [search])

  // Empresa activa desde localStorage (+ sincronizar con el sidebar)
  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
    const sync = () => { const u = localStorage.getItem('empresa_activa'); setEmpresaActiva(u ? JSON.parse(u) : null) }
    window.addEventListener('empresa_activa_changed', sync)
    return () => window.removeEventListener('empresa_activa_changed', sync)
  }, [])

  useEffect(() => {
    apiFetch('/api/admin/empresas/selector')
      .then(d => setEmpresas({ internas: d.internas ?? [], clientes: d.clientes ?? [] }))
      .catch(() => {})
  }, [])

  // Catálogos para el modal (activos del tenant + controles ISO) — al cambiar de empresa
  useEffect(() => {
    if (!slug) return
    apiFetch('/api/admin/activos?limit=500', { headers: { 'X-Company-Slug': slug } })
      .then(d => setActivos(d.activos ?? [])).catch(() => setActivos([]))
    apiFetch('/api/admin/riesgos/iso-controls', { headers: { 'X-Company-Slug': slug } })
      .then(d => setIsoControls(d.controles ?? [])).catch(() => setIsoControls([]))
  }, [slug])

  const cargar = useCallback(async () => {
    if (!slug) { setLoading(false); return }
    setLoading(true)
    try {
      const p = new URLSearchParams({ limit: 300 })
      if (fCategoria) p.set('categoria', fCategoria)
      if (fEstado)    p.set('estado', fEstado)
      if (fNivel)     p.set('nivel_categoria', fNivel)
      if (debounced)  p.set('search', debounced)
      const h = { 'X-Company-Slug': slug }
      const [list, st] = await Promise.all([
        apiFetch(`/api/admin/riesgos?${p}`, { headers: h }),
        apiFetch('/api/admin/riesgos/stats', { headers: h }),
      ])
      setRiesgos(list.riesgos ?? [])
      setStats(st)
    } catch (err) { showToast(err.message || 'Error al cargar', 'error') }
    finally { setLoading(false) }
  }, [slug, fCategoria, fEstado, fNivel, debounced])

  useEffect(() => { cargar() }, [cargar])

  function seleccionarEmpresa(s) {
    const all = [...empresas.internas, ...empresas.clientes]
    const emp = all.find(e => e.slug === s)
    if (!emp) return
    const val = { id: emp.id, name: emp.name, slug: emp.slug }
    localStorage.setItem('empresa_activa', JSON.stringify(val))
    window.dispatchEvent(new Event('empresa_activa_changed'))
    setEmpresaActiva(val)
  }

  async function abrirDetalle(r) {
    try { const full = await apiFetch(`/api/admin/riesgos/${r.id}`, { headers }); setViendo(full) }
    catch (err) { showToast(err.message || 'No se pudo abrir', 'error') }
  }

  async function eliminar(r) {
    if (!await confirmDstac(`¿Eliminar el riesgo "${r.nombre}"?`, { titulo: 'Eliminar riesgo', textoConfirmar: 'Eliminar', peligro: true })) return
    try { await apiFetch(`/api/admin/riesgos/${r.id}`, { method: 'DELETE', headers }); setViendo(null); showToast('Riesgo eliminado'); cargar() }
    catch (err) { showToast(err.message || 'Error', 'error') }
  }

  async function cambiarEstado(id, estado) {
    try {
      await apiFetch(`/api/admin/riesgos/${id}`, { method: 'PUT', headers, body: JSON.stringify({ estado }) })
      showToast('Estado actualizado'); cargar()
      const full = await apiFetch(`/api/admin/riesgos/${id}`, { headers }); setViendo(full)
    } catch (err) { showToast(err.message || 'Error', 'error') }
  }

  async function guardarNotas(id, notas_dstac) {
    try {
      await apiFetch(`/api/admin/riesgos/${id}`, { method: 'PUT', headers, body: JSON.stringify({ notas_dstac }) })
      showToast('Notas guardadas')
      setViendo(v => v && v.id === id ? { ...v, notas_dstac } : v)
    } catch (err) { showToast(err.message || 'Error', 'error') }
  }

  async function generarPDF(r) {
    try {
      const res = await apiFetch(`/api/admin/riesgos/${r.id}/generar-pdf`, { method: 'POST', headers })
      if (res.pdf_base64) abrirPdf(res.pdf_base64, res.filename || `Informe_Riesgo_${r.id}.pdf`)
      showToast(res.message || 'Informe generado ✓')
      cargar()
    } catch (err) { showToast(err.message || 'No se pudo generar el PDF', 'error') }
  }

  function handleSaved() {
    setModalOpen(false); setEditando(null)
    showToast(editando ? 'Riesgo actualizado' : 'Riesgo creado'); cargar()
  }

  // La celda de la matriz filtra la lista del lado del cliente
  const visibles = celda ? riesgos.filter(r => r.probabilidad === celda.prob && r.impacto === celda.imp) : riesgos
  const hayFiltros = fCategoria || fEstado || fNivel || search || celda

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Riesgos</h1> <BotonInforme tipo="riesgos" slug={slug} />
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>{empresaActiva ? `Gestión de riesgos · ${empresaActiva.name}` : 'Selecciona una empresa'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={slug ?? ''} onChange={e => seleccionarEmpresa(e.target.value)} style={{ ...SEL, minWidth: 200, color: slug ? '#2C2C2A' : '#888780' }}>
            <option value="">Selecciona empresa…</option>
            {empresas.internas.length > 0 && <optgroup label="DSTAC (interno)">{empresas.internas.map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}</optgroup>}
            {empresas.clientes.length > 0 && <optgroup label="Clientes">{empresas.clientes.map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}</optgroup>}
          </select>
          <button onClick={() => setImportarOpen(true)} disabled={!slug}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: slug ? '#444441' : '#B4B2A9', cursor: slug ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}>
            <i className="ti ti-file-spreadsheet" /> Importar Excel
          </button>
          <button onClick={() => { setEditando(null); setModalOpen(true) }} disabled={!slug}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: slug ? '#3C3489' : '#cfcdc4', color: '#fff', cursor: slug ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}>+ Nuevo riesgo</button>
        </div>
      </div>

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>{toast.msg}</div>
      )}

      {!slug ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '48px', textAlign: 'center', color: '#888780', fontSize: 14 }}>
          Selecciona una empresa para gestionar sus riesgos.
        </div>
      ) : (
        <>
          <RiesgosStats stats={stats} isMobile={isMobile} />

          {/* Matriz + filtros */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 360px) 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
            <MatrizRiesgos matriz={stats?.matriz ?? []} celda={celda} onCeldaClick={setCelda} />
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar riesgo…" style={{ ...SEL, minWidth: 180, flex: '1 1 auto' }} />
                <select value={fNivel} onChange={e => setFNivel(e.target.value)} style={SEL}><option value="">Nivel</option>{Object.entries(NIVEL).map(([k, n]) => <option key={k} value={k}>{n.label}</option>)}</select>
                <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={SEL}><option value="">Estado</option>{Object.entries(ESTADO).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>
                <select value={fCategoria} onChange={e => setFCategoria(e.target.value)} style={SEL}><option value="">Categoría</option>{Object.entries(CATEGORIA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                {hayFiltros && <button onClick={() => { setFCategoria(''); setFEstado(''); setFNivel(''); setSearch(''); setCelda(null) }} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>Limpiar</button>}
                <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>{visibles.length} riesgo{visibles.length !== 1 ? 's' : ''}</span>
              </div>
              <RiesgosTabla riesgos={visibles} loading={loading} isMobile={isMobile} onVer={abrirDetalle} onEditar={r => { setEditando(r); setModalOpen(true) }} onEliminar={eliminar} />
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <RiesgoModal riesgo={editando} slug={slug} activos={activos} isoControls={isoControls}
          onClose={() => { setModalOpen(false); setEditando(null) }} onSaved={handleSaved} />
      )}
      {importarOpen && (
        <ImportarExcelModal modulo="riesgos" empresaSlug={slug}
          onClose={() => setImportarOpen(false)} onImportado={cargar} />
      )}
      {viendo && (
        <RiesgoDetalle riesgo={viendo} isoControls={isoControls}
          onClose={() => setViendo(null)}
          onEditar={r => { setViendo(null); setEditando(r); setModalOpen(true) }}
          onGenerarPDF={generarPDF} onCambiarEstado={cambiarEstado} onGuardarNotas={guardarNotas} />
      )}
    </div>
  )
}

// Abre un PDF (base64) en un visor superpuesto, con botón de descarga.
// El iframe del blob usa el visor PDF del navegador (zoom/imprimir incluidos).
function abrirPdf(b64, filename = 'Informe.pdf') {
  try {
    const bin = atob(b64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }))
    const ov = document.createElement('div')
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(5,5,12,.88);display:flex;flex-direction:column;padding:14px;box-sizing:border-box'
    const bar = document.createElement('div'); bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap'
    const t = document.createElement('span'); t.style.cssText = 'color:#fff;font:600 15px system-ui'; t.textContent = 'Informe del riesgo'
    const btns = document.createElement('div'); btns.style.cssText = 'display:flex;align-items:center;gap:8px'
    const dl = document.createElement('a'); dl.textContent = 'Descargar'; dl.href = url; dl.download = filename; dl.style.cssText = 'background:#534AB7;color:#fff;border-radius:999px;padding:9px 18px;font:600 13px system-ui;cursor:pointer;text-decoration:none'
    const cl = document.createElement('button'); cl.textContent = 'Cerrar'; cl.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:9px 16px;font:600 13px system-ui;cursor:pointer'
    btns.append(dl, cl); bar.append(t, btns); ov.appendChild(bar)
    const ifr = document.createElement('iframe'); ifr.src = url; ifr.style.cssText = 'flex:1;border:0;border-radius:10px;background:#fff'
    ov.appendChild(ifr); document.body.appendChild(ov)
    const close = () => { ov.remove(); URL.revokeObjectURL(url); document.removeEventListener('keydown', k) }
    const k = (e) => { if (e.key === 'Escape') close() }
    cl.onclick = close; ov.addEventListener('click', e => { if (e.target === ov) close() }); document.addEventListener('keydown', k)
  } catch (e) { alertDstac('No se pudo abrir el PDF: ' + e, { titulo: 'Error', tipo: 'error' }) }
}

function useIsMobile(bp = 820) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const upd = () => setM(mq.matches); upd()
    mq.addEventListener('change', upd); return () => mq.removeEventListener('change', upd)
  }, [bp])
  return m
}
