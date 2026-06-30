'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../../../lib/api'
import FixedPortal from '../../../../components/admin/FixedPortal'
import { confirmDstac } from '../../../../components/admin/ConfirmDialog'

const NAVY = '#1a1740', PURPLE = '#534AB7'

const CAMPANAS = {
  'exponor-2026': { label: 'Exponor 2026', subtitulo: 'Seguimiento a contactos conocidos en la feria — envía uno por uno.' },
  'pymes-chile':  { label: 'Prospección pymes Chile', subtitulo: 'Busca empresas por rubro/ciudad y envía a los candidatos que apruebes.' },
}

function fechaHora(d) {
  if (!d) return '—'
  let date = new Date(d)
  if (isNaN(date.getTime())) date = new Date(String(d).replace(' ', 'T') + 'Z')
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Las fotos de camara de celular pesan varios MB -- se redimensionan y
// recomprimen en el propio navegador antes de subirlas (mas rapido en la red
// del evento y evita pasarse del limite de tamaño del servidor).
function fileToDataUrlComprimido(file, maxDim = 1400, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim }
        else if (height >= width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// El correo mide 660px de ancho fijo (es HTML de email, no responsive). Si el
// contenedor es mas angosto, en vez de mostrar scroll horizontal con texto
// cortado, se escala visualmente el iframe completo para que entre.
function EmailPreviewFrame({ html, alto = 720 }) {
  const ANCHO_EMAIL = 660
  const contenedorRef = useRef(null)
  const [escala, setEscala] = useState(1)

  useEffect(() => {
    const el = contenedorRef.current
    if (!el) return
    function actualizar(ancho) {
      setEscala(Math.min(1, (ancho || ANCHO_EMAIL) / ANCHO_EMAIL))
    }
    actualizar(el.offsetWidth)
    // ResizeObserver detecta cambios de ancho por reflow del grid/flex, no solo
    // por resize de la ventana (importante en celular: rotar, cambiar de
    // columna a 1-columna, etc. no siempre dispara un evento "resize").
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) actualizar(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={contenedorRef} style={{ width: '100%', height: alto * escala, overflow: 'hidden', border: '1px solid #ECEAE3', borderRadius: 8 }}>
      <iframe srcDoc={html} title="Vista previa del correo"
        style={{ width: ANCHO_EMAIL, height: alto, border: 'none', transform: `scale(${escala})`, transformOrigin: 'top left' }} />
    </div>
  )
}

export default function MarketingPage() {
  const [campana, setCampana] = useState('exponor-2026')

  const [empresa, setEmpresa] = useState('')
  const [nombre, setNombre]   = useState('')
  const [email, setEmail]     = useState('')
  const [candidatoId, setCandidatoId] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState('')

  const [envios, setEnvios] = useState([])
  const [loadingEnvios, setLoadingEnvios] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [verCorreoHtml, setVerCorreoHtml] = useState(null) // null = cerrado

  const [escaneando, setEscaneando] = useState(false)
  const [textoOcr, setTextoOcr] = useState('')
  const fileInputRef = useRef(null)

  const [rubro, setRubro] = useState('')
  const [ciudad, setCiudad] = useState('Antofagasta')
  const [buscando, setBuscando] = useState(false)
  const [candidatos, setCandidatos] = useState([])
  const [loadingCandidatos, setLoadingCandidatos] = useState(false)
  const [filtroCandidato, setFiltroCandidato] = useState('todos') // todos | con_correo | sin_correo
  const [descartandoSinCorreo, setDescartandoSinCorreo] = useState(false)
  const [cantidadMasiva, setCantidadMasiva] = useState(30)
  const [envioMasivoActivo, setEnvioMasivoActivo] = useState(false)
  const [progresoMasivo, setProgresoMasivo] = useState({ actual: 0, total: 0 })
  const detenerMasivoRef = useRef(false)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  function limpiarFormulario() {
    setEmpresa(''); setNombre(''); setEmail(''); setPreviewHtml(''); setTextoOcr(''); setCandidatoId(null)
  }

  useEffect(() => { limpiarFormulario() }, [campana])

  const cargarEnvios = useCallback(async () => {
    setLoadingEnvios(true)
    try {
      const params = new URLSearchParams({ campana })
      if (filtroTexto.trim()) params.set('q', filtroTexto.trim())
      if (filtroEstado) params.set('estado', filtroEstado)
      const r = await api.get(`/api/admin/marketing/envios?${params.toString()}`)
      setEnvios(r.envios ?? [])
    } catch { showToast('No se pudo cargar el historial') }
    finally { setLoadingEnvios(false) }
  }, [campana, filtroTexto, filtroEstado])

  useEffect(() => {
    const t = setTimeout(cargarEnvios, 300)
    return () => clearTimeout(t)
  }, [cargarEnvios])

  const cargarCandidatos = useCallback(async () => {
    if (campana !== 'pymes-chile') return
    setLoadingCandidatos(true)
    try {
      const r = await api.get('/api/admin/marketing/candidatos?campana=pymes-chile&estado=pendiente')
      setCandidatos(r.candidatos ?? [])
    } catch { showToast('No se pudo cargar la lista de candidatos') }
    finally { setLoadingCandidatos(false) }
  }, [campana])

  useEffect(() => { cargarCandidatos() }, [cargarCandidatos])

  async function generarPreview() {
    setLoadingPreview(true)
    try {
      const r = await api.post('/api/admin/marketing/preview', { empresa, nombre, campana })
      setPreviewHtml(r.html)
    } catch (e) { showToast(e.message || 'No se pudo generar la vista previa') }
    finally { setLoadingPreview(false) }
  }

  useEffect(() => {
    if (!empresa && !nombre) { setPreviewHtml(''); return }
    const t = setTimeout(generarPreview, 500)
    return () => clearTimeout(t)
  }, [empresa, nombre, campana])

  async function enviar() {
    const nombreRequerido = campana === 'exponor-2026'
    if (!empresa.trim() || !email.trim() || (nombreRequerido && !nombre.trim())) {
      showToast(nombreRequerido ? 'Completa empresa, nombre y correo' : 'Completa empresa y correo'); return
    }
    setEnviando(true)
    try {
      await api.post('/api/admin/marketing/enviar', { empresa, nombre, email, campana, candidatoId })
      showToast(`Correo enviado a ${email}`)
      limpiarFormulario()
      cargarEnvios()
      cargarCandidatos()
    } catch (e) { showToast(e.message || 'No se pudo enviar el correo') }
    finally { setEnviando(false) }
  }

  async function onFotoTarjeta(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setEscaneando(true)
    try {
      const dataUrl = await fileToDataUrlComprimido(file)
      const r = await api.post('/api/admin/marketing/escanear-tarjeta', { imageDataUrl: dataUrl })
      if (r.sugerido?.empresa) setEmpresa(r.sugerido.empresa)
      if (r.sugerido?.nombre)  setNombre(r.sugerido.nombre)
      if (r.sugerido?.email)   setEmail(r.sugerido.email)
      setTextoOcr(r.textoCompleto || '')
      showToast('Tarjeta leída — revisa los datos antes de enviar')
    } catch (e) { showToast(e.message || 'No se pudo leer la tarjeta') }
    finally { setEscaneando(false) }
  }

  async function buscarEmpresas() {
    if (!rubro.trim() || !ciudad.trim()) { showToast('Completa rubro y ciudad'); return }
    setBuscando(true)
    try {
      const r = await api.post('/api/admin/marketing/candidatos/buscar', { rubro, ciudad })
      showToast(`${r.encontrados} encontradas, ${r.nuevos} nuevas en la lista`)
      cargarCandidatos()
    } catch (e) { showToast(e.message || 'No se pudo buscar') }
    finally { setBuscando(false) }
  }

  function usarCandidato(c) {
    setEmpresa(c.empresa)
    setNombre('')
    setEmail(c.email_sugerido || '')
    setCandidatoId(c.id)
    showToast(c.email_sugerido ? 'Candidato cargado — revisa antes de enviar' : 'Sin correo detectado — complétalo a mano')
  }

  async function descartarCandidato(id) {
    try { await api.post(`/api/admin/marketing/candidatos/${id}/descartar`); cargarCandidatos() }
    catch (e) { showToast(e.message || 'No se pudo descartar') }
  }

  // Envio rapido directo desde la lista, sin pasar por el formulario. Pide
  // confirmacion (no hay vista previa aqui) para no perder el "siempre revisa
  // antes de enviar" por completo.
  async function enviarRapido(c) {
    if (!c.email_sugerido) { showToast('Este candidato no tiene correo — usa "Usar" y complétalo a mano'); return }
    if (!await confirmDstac(`¿Enviar correo a ${c.email_sugerido} (${c.empresa})?`, { titulo: 'Enviar correo', textoConfirmar: 'Enviar' })) return
    try {
      await api.post('/api/admin/marketing/enviar', {
        empresa: c.empresa, nombre: '', email: c.email_sugerido, campana: 'pymes-chile', candidatoId: c.id,
      })
      showToast(`Correo enviado a ${c.email_sugerido}`)
      cargarCandidatos()
      cargarEnvios()
    } catch (e) { showToast(e.message || 'No se pudo enviar el correo') }
  }

  const sinCorreoCount = candidatos.filter(c => !c.email_sugerido).length
  const conCorreoCount = candidatos.filter(c => !!c.email_sugerido).length
  const candidatosFiltrados = candidatos.filter(c => {
    if (filtroCandidato === 'con_correo') return !!c.email_sugerido
    if (filtroCandidato === 'sin_correo') return !c.email_sugerido
    return true
  })

  async function descartarSinCorreo() {
    if (sinCorreoCount === 0) { showToast('No hay candidatos sin correo para descartar'); return }
    if (!await confirmDstac(`¿Descartar los ${sinCorreoCount} candidatos pendientes que no tienen correo detectado? Esta acción no se puede deshacer.`, { titulo: 'Descartar candidatos', textoConfirmar: 'Descartar', peligro: true })) return
    setDescartandoSinCorreo(true)
    try {
      const r = await api.post('/api/admin/marketing/candidatos/descartar-sin-correo', { campana: 'pymes-chile' })
      showToast(`${r.descartados} candidatos descartados`)
      cargarCandidatos()
    } catch (e) { showToast(e.message || 'No se pudo descartar') }
    finally { setDescartandoSinCorreo(false) }
  }

  // Envio masivo "1 a 1": reutiliza el mismo endpoint /enviar de un envio
  // individual, en una secuencia con pausa entre cada uno (no es un blast) y
  // se puede detener a mitad de camino. La cantidad es configurable a
  // proposito -- no se manda a todos los pendientes de una sola vez, para no
  // quemar la reputacion de envio del dominio (ver conversacion sobre ritmo
  // diario recomendado).
  async function enviarMasivo() {
    const candidatosConCorreo = candidatosFiltrados.filter(c => !!c.email_sugerido)
    const n = Math.min(Number(cantidadMasiva) || 0, candidatosConCorreo.length)
    if (n <= 0) { showToast('No hay candidatos con correo para enviar en el filtro actual'); return }
    if (!await confirmDstac(`¿Enviar a los próximos ${n} candidatos con correo, de a 1 (con pausa entre cada envío)? Puedes detenerlo a mitad de camino.`, { titulo: 'Envío masivo', textoConfirmar: 'Enviar' })) return

    detenerMasivoRef.current = false
    setEnvioMasivoActivo(true)
    setProgresoMasivo({ actual: 0, total: n })

    let enviados = 0, fallidos = 0
    for (let i = 0; i < n; i++) {
      if (detenerMasivoRef.current) break
      const c = candidatosConCorreo[i]
      try {
        await api.post('/api/admin/marketing/enviar', {
          empresa: c.empresa, nombre: '', email: c.email_sugerido, campana: 'pymes-chile', candidatoId: c.id,
        })
        enviados++
      } catch {
        fallidos++
      }
      setProgresoMasivo({ actual: i + 1, total: n })
      if (i < n - 1 && !detenerMasivoRef.current) await new Promise(r => setTimeout(r, 2500))
    }

    setEnvioMasivoActivo(false)
    showToast(detenerMasivoRef.current
      ? `Detenido — ${enviados} enviados, ${fallidos} fallidos`
      : `Envío masivo terminado — ${enviados} enviados, ${fallidos} fallidos`)
    cargarCandidatos()
    cargarEnvios()
  }

  function detenerEnvioMasivo() { detenerMasivoRef.current = true }

  async function verCorreo(id) {
    try {
      const r = await api.get(`/api/admin/marketing/envios/${id}/html?campana=${campana}`)
      setVerCorreoHtml(r.html || '<p>Sin contenido guardado.</p>')
    } catch (e) { showToast(e.message || 'No se pudo cargar el correo') }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>📧 Marketing</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{CAMPANAS[campana].subtitulo}</div>
          </div>
          <select value={campana} onChange={e => setCampana(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,.4)', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {Object.entries(CAMPANAS).map(([k, v]) => <option key={k} value={k} style={{ color: '#000' }}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Busqueda de candidatos (solo pymes-chile) */}
      {campana === 'pymes-chile' && (
        <div style={{ marginTop: 20, background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', marginBottom: 4 }}>🔎 Buscar empresas</div>
          <div style={{ fontSize: 12, color: '#8A877E', marginBottom: 14 }}>
            Busca por rubro y ciudad. Solo se usa el correo de contacto que la propia empresa publicó en su sitio web.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <input value={rubro} onChange={e => setRubro(e.target.value)} placeholder="Rubro (ej: ferreterías)"
              style={{ flex: '1 1 200px', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 14, boxSizing: 'border-box' }} />
            <input value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Ciudad (ej: Antofagasta)"
              style={{ flex: '1 1 200px', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 14, boxSizing: 'border-box' }} />
            <button onClick={buscarEmpresas} disabled={buscando}
              style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 999, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8A877E' }}>
              Candidatos pendientes ({candidatosFiltrados.length} / {candidatos.length})
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={filtroCandidato} onChange={e => setFiltroCandidato(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 12.5 }}>
                <option value="todos">Todos</option>
                <option value="con_correo">Con correo ({conCorreoCount})</option>
                <option value="sin_correo">Sin correo ({sinCorreoCount})</option>
              </select>
              <button onClick={descartarSinCorreo} disabled={descartandoSinCorreo || sinCorreoCount === 0}
                style={{ background: 'none', border: '1px solid #ECEAE3', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: sinCorreoCount === 0 ? 'not-allowed' : 'pointer', color: '#B23B3B', fontWeight: 700 }}>
                {descartandoSinCorreo ? 'Descartando…' : `🗑️ Descartar sin correo (${sinCorreoCount})`}
              </button>
            </div>
          </div>

          {/* Envio masivo 1 a 1 */}
          <div style={{ background: '#F7F6F2', border: '1px solid #ECEAE3', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: '#6A675E' }}>Enviar a los próximos</span>
              <input type="number" min={1} max={conCorreoCount || 1} value={cantidadMasiva}
                onChange={e => setCantidadMasiva(e.target.value)} disabled={envioMasivoActivo}
                style={{ width: 64, padding: '6px 8px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 13, textAlign: 'center' }} />
              <span style={{ fontSize: 12.5, color: '#6A675E' }}>candidatos con correo, de a 1 (con pausa entre cada uno)</span>
              {!envioMasivoActivo ? (
                <button onClick={enviarMasivo} disabled={conCorreoCount === 0}
                  style={{ background: '#1d7a3f', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 700, cursor: conCorreoCount === 0 ? 'not-allowed' : 'pointer' }}>
                  🚀 Enviar masivo
                </button>
              ) : (
                <button onClick={detenerEnvioMasivo}
                  style={{ background: '#B23B3B', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  ⏹ Detener
                </button>
              )}
            </div>
            {envioMasivoActivo && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 6, background: '#ECEAE3', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: PURPLE, width: `${progresoMasivo.total ? (progresoMasivo.actual / progresoMasivo.total * 100) : 0}%`, transition: 'width .2s' }} />
                </div>
                <div style={{ fontSize: 11.5, color: '#8A877E', marginTop: 4 }}>Enviando {progresoMasivo.actual} / {progresoMasivo.total}…</div>
              </div>
            )}
          </div>

          {loadingCandidatos ? (
            <div style={{ color: '#8A877E', fontSize: 13 }}>Cargando…</div>
          ) : candidatosFiltrados.length === 0 ? (
            <div style={{ color: '#8A877E', fontSize: 13 }}>
              {candidatos.length === 0 ? 'Sin candidatos todavía — busca por rubro y ciudad arriba.' : 'Ningún candidato coincide con el filtro.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {candidatosFiltrados.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: '1px solid #ECEAE3', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ minWidth: 0, flex: '1 1 200px', overflowWrap: 'break-word' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#2C2C2A' }}>{c.empresa}</div>
                    <div style={{ fontSize: 12, color: c.email_sugerido ? '#6A675E' : '#B23B3B' }}>
                      {c.email_sugerido || 'Sin correo detectado'} · {c.rubro} · {c.ciudad}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => usarCandidato(c)}
                      style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Usar
                    </button>
                    <button onClick={() => enviarRapido(c)} disabled={!c.email_sugerido}
                      style={{ background: c.email_sugerido ? '#1d7a3f' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: c.email_sugerido ? 'pointer' : 'not-allowed' }}>
                      ✉️ Enviar
                    </button>
                    <button onClick={() => descartarCandidato(c.id)}
                      style={{ background: 'none', border: '1px solid #ECEAE3', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#8A877E' }}>
                      Descartar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginTop: 20, alignItems: 'start' }}>
        {/* Formulario */}
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A' }}>
              {candidatoId ? 'Contacto desde candidato' : 'Nuevo contacto'}
            </div>
            {campana === 'exponor-2026' && (
              <>
                <button onClick={() => fileInputRef.current?.click()} disabled={escaneando}
                  style={{ background: '#F7F6F2', color: NAVY, border: '1px solid #ECEAE3', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {escaneando ? 'Leyendo…' : '📷 Escanear tarjeta'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFotoTarjeta} />
              </>
            )}
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Empresa</label>
          <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ej: Minera Los Andes"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>
            Nombre del contacto{campana === 'pymes-chile' ? ' (opcional)' : ''}
          </label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María Pérez"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#8A877E', display: 'block', marginBottom: 4 }}>Correo</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@empresa.cl" type="email"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ECEAE3', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />

          {textoOcr && (
            <details style={{ marginBottom: 14, fontSize: 11.5, color: '#8A877E' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Texto leído de la tarjeta (revisa si algo quedó mal)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#F7F6F2', padding: 8, borderRadius: 6, marginTop: 6 }}>{textoOcr}</pre>
            </details>
          )}

          <button onClick={enviar} disabled={enviando}
            style={{ width: '100%', background: PURPLE, color: '#fff', border: 'none', borderRadius: 999, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {enviando ? 'Enviando…' : '✉️ Enviar correo'}
          </button>
          <div style={{ fontSize: 11.5, color: '#8A877E', marginTop: 10, lineHeight: 1.5 }}>
            {campana === 'exponor-2026'
              ? 'La vista previa se actualiza automáticamente. "Escanear tarjeta" usa la cámara del celular y completa los campos — siempre revisa antes de enviar.'
              : 'Usa un candidato de la lista de arriba o completa los datos a mano. Siempre revisa antes de enviar.'}
          </div>
        </div>

        {/* Vista previa */}
        <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8A877E', marginBottom: 10 }}>
            {loadingPreview ? 'Actualizando vista previa…' : 'Vista previa del correo'}
          </div>
          {previewHtml ? (
            <EmailPreviewFrame html={previewHtml} alto={720} />
          ) : (
            <div style={{ height: 720, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A877E', fontSize: 13 }}>
              Escribe el nombre de la empresa o del contacto para ver la vista previa.
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A' }}>
            Historial · {CAMPANAS[campana].label} ({envios.filter(e => e.estado === 'enviado').length} enviados)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Buscar empresa, contacto o correo…"
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 13, flex: '1 1 200px', minWidth: 160, boxSizing: 'border-box' }} />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #ECEAE3', fontSize: 13 }}>
              <option value="">Todos los estados</option>
              <option value="enviado">Enviado</option>
              <option value="error">Error</option>
            </select>
            <a href={`/api/admin/marketing/envios/export?campana=${campana}`} target="_blank" rel="noopener noreferrer"
              style={{ background: '#F7F6F2', color: NAVY, border: '1px solid #ECEAE3', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              ⬇️ Exportar a Excel
            </a>
          </div>
        </div>

        {loadingEnvios ? (
          <div style={{ color: '#8A877E', fontSize: 13 }}>Cargando…</div>
        ) : envios.length === 0 ? (
          <div style={{ color: '#8A877E', fontSize: 13 }}>No hay envíos que coincidan con el filtro.</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#8A877E', borderBottom: '1px solid #ECEAE3' }}>
                <th style={{ padding: '6px 8px' }}>Empresa</th>
                <th style={{ padding: '6px 8px' }}>Contacto</th>
                <th style={{ padding: '6px 8px' }}>Correo</th>
                <th style={{ padding: '6px 8px' }}>Estado</th>
                <th style={{ padding: '6px 8px' }}>Fecha</th>
                <th style={{ padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {envios.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #F4F3EE' }}>
                  <td style={{ padding: '8px' }}>{e.empresa}</td>
                  <td style={{ padding: '8px' }}>{e.contacto_nombre}</td>
                  <td style={{ padding: '8px', color: '#6A675E' }}>{e.contacto_email}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      color: e.estado === 'enviado' ? '#27500A' : '#791F1F',
                      background: e.estado === 'enviado' ? '#EAF3DE' : '#FCEBEB',
                    }}>{e.estado === 'enviado' ? 'Enviado' : 'Error'}</span>
                  </td>
                  <td style={{ padding: '8px', color: '#8A877E' }}>{fechaHora(e.created_at)}</td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => verCorreo(e.id)}
                      style={{ background: 'none', border: '1px solid #ECEAE3', borderRadius: 8, padding: '4px 10px', fontSize: 11.5, cursor: 'pointer', color: PURPLE, fontWeight: 700 }}>
                      Ver correo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal "Ver correo" */}
      {verCorreoHtml !== null && (
        <FixedPortal>
        <div onClick={() => setVerCorreoHtml(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: NAVY }}>Correo enviado</div>
              <button onClick={() => setVerCorreoHtml(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <EmailPreviewFrame html={verCorreoHtml} alto={600} />
          </div>
        </div>
        </FixedPortal>
      )}

      {toast && <FixedPortal><div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div></FixedPortal>}
    </div>
  )
}
