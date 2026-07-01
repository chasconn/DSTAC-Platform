'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../../lib/api'
import { confirmDstac } from '../../../../components/admin/ConfirmDialog'
import WikiViewer from '../../../../components/admin/wiki/WikiViewer'
import WikiEditorForm from '../../../../components/admin/wiki/WikiEditorForm'
import WikiImportModal from '../../../../components/admin/wiki/WikiImportModal'
import { slugify } from '../../../../components/admin/wiki/wikiSlug'

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

// Componente aislado para leer query params — Suspense requerido por Next.js 14
function SearchParamsHandler({ onAbrirNota }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const id = searchParams.get('nota')
    if (id) {
      onAbrirNota(Number(id))
      router.replace('/admin/wiki')
    }
  }, [searchParams])

  return null
}

export default function WikiPage() {
  const isMobile = useIsMobile()

  const [notas, setNotas]       = useState([])
  const [carpetas, setCarpetas] = useState([])
  const [loading, setLoading]   = useState(true)

  const [search, setSearch]         = useState('')
  const [debounced, setDebounced]   = useState('')
  const [filtro, setFiltro]         = useState('todas') // todas | mias | equipo
  const [carpetaSel, setCarpetaSel] = useState('')

  const [notaActiva, setNotaActiva] = useState(null) // detalle completo
  const [modo, setModo] = useState('viendo') // viendo | creando | editando
  const [importOpen, setImportOpen] = useState(false)
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t) }, [search])

  const cargarLista = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (debounced) p.set('search', debounced)
      if (filtro === 'mias')   p.set('mias', '1')
      if (filtro === 'equipo') p.set('equipo', '1')
      if (carpetaSel) p.set('carpeta', carpetaSel)
      const [list, cs] = await Promise.all([
        apiFetch(`/api/admin/wiki?${p}`),
        apiFetch('/api/admin/wiki/carpetas'),
      ])
      setNotas(list)
      setCarpetas(cs)
    } catch (err) { showToast(err.message || 'Error al cargar', 'error') }
    finally { setLoading(false) }
  }, [debounced, filtro, carpetaSel])

  useEffect(() => { cargarLista() }, [cargarLista])

  async function abrirNota(id) {
    try {
      const full = await apiFetch(`/api/admin/wiki/${id}`)
      setNotaActiva(full)
      setModo('viendo')
    } catch (err) { showToast(err.message || 'No se pudo abrir la nota', 'error') }
  }

  // Clic en un [[wikilink]] dentro del contenido, o en un backlink/enlace saliente.
  function irAWikilink(titulo) {
    const slug = slugify(titulo)
    const match = notas.find(n => n.slug === slug)
    if (match) { abrirNota(match.id); return }
    // No estaba en la lista cargada (filtro activo, o >200 notas) — búsqueda puntual
    apiFetch(`/api/admin/wiki?search=${encodeURIComponent(titulo)}`)
      .then(res => {
        const m = res.find(n => n.slug === slug)
        if (m) abrirNota(m.id)
        else showToast(`No se encontró la nota "${titulo}"`, 'error')
      })
      .catch(() => showToast(`No se encontró la nota "${titulo}"`, 'error'))
  }

  function nuevaNota() {
    setNotaActiva(null)
    setModo('creando')
  }

  async function guardarNota(datos) {
    if (modo === 'creando') {
      const res = await apiFetch('/api/admin/wiki', { method: 'POST', body: JSON.stringify(datos) })
      showToast(res.reclamada ? 'Nota completada ✓' : 'Nota creada ✓')
      await cargarLista()
      await abrirNota(res.id)
    } else {
      await apiFetch(`/api/admin/wiki/${notaActiva.id}`, { method: 'PUT', body: JSON.stringify(datos) })
      showToast('Nota actualizada ✓')
      await cargarLista()
      await abrirNota(notaActiva.id)
    }
  }

  async function eliminarNota() {
    if (!notaActiva) return
    if (!await confirmDstac(`¿Eliminar la nota "${notaActiva.titulo}"? Los enlaces desde otras notas quedarán rotos.`, { titulo: 'Eliminar nota', textoConfirmar: 'Eliminar', peligro: true })) return
    try {
      await apiFetch(`/api/admin/wiki/${notaActiva.id}`, { method: 'DELETE' })
      showToast('Nota eliminada')
      setNotaActiva(null); setModo('viendo')
      cargarLista()
    } catch (err) { showToast(err.message || 'Error al eliminar', 'error') }
  }

  async function subirAdjunto(file) {
    if (!notaActiva?.id) return
    setSubiendoAdjunto(true)
    try {
      const fd = new FormData()
      fd.append('archivo', file)
      const r = await fetch(`/api/admin/wiki/${notaActiva.id}/attachments`, { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Error al subir el adjunto')
      showToast('Adjunto subido ✓')
      await abrirNota(notaActiva.id)
    } catch (err) { showToast(err.message || 'Error al subir el adjunto', 'error') }
    finally { setSubiendoAdjunto(false) }
  }

  function abrirAdjunto(a) { window.open(`/api/admin/wiki/attachments/${a.id}`, '_blank') }

  async function eliminarAdjunto(a) {
    if (!await confirmDstac(`¿Eliminar el adjunto "${a.filename}"?`, { titulo: 'Eliminar adjunto', textoConfirmar: 'Eliminar', peligro: true })) return
    try {
      await apiFetch(`/api/admin/wiki/attachments/${a.id}`, { method: 'DELETE' })
      showToast('Adjunto eliminado')
      await abrirNota(notaActiva.id)
    } catch (err) { showToast(err.message || 'Error al eliminar', 'error') }
  }

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '24px 28px', height: 'calc(100vh - 0px)', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={null}>
        <SearchParamsHandler onAbrirNota={abrirNota} />
      </Suspense>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Wiki interna</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>Notas del equipo con enlaces entre ellas — {notas.length} nota{notas.length !== 1 ? 's' : ''} visible{notas.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/wiki/grafo" style={{ ...SEL, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#444441', fontWeight: 600 }}>
            🕸️ Ver grafo
          </Link>
          <button onClick={() => setImportOpen(true)} style={{ ...SEL, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#444441', fontWeight: 600 }}>
            📥 Importar .md
          </button>
          <button onClick={nuevaNota} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Nueva nota</button>
        </div>
      </div>

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 12 }}>{toast.msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Sidebar de notas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en la wiki…" style={{ ...SEL, width: '100%' }} />

          <div style={{ display: 'flex', gap: 4 }}>
            {[['todas', 'Todas'], ['mias', 'Mías'], ['equipo', 'Equipo']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)}
                style={{ flex: 1, padding: '6px 4px', borderRadius: 7, border: 'none', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  background: filtro === v ? '#3C3489' : '#faf9f6', color: filtro === v ? '#fff' : '#888780' }}>
                {l}
              </button>
            ))}
          </div>

          {carpetas.length > 0 && (
            <select value={carpetaSel} onChange={e => setCarpetaSel(e.target.value)} style={SEL}>
              <option value="">Todas las carpetas</option>
              {carpetas.map(c => <option key={c.carpeta} value={c.carpeta}>{c.carpeta} ({c.n})</option>)}
            </select>
          )}

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e0d8', borderRadius: 10, background: '#fff' }}>
            {loading ? (
              <div style={{ padding: 16, fontSize: 12.5, color: '#888780' }}>Cargando…</div>
            ) : notas.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12.5, color: '#888780' }}>Sin notas todavía. Crea la primera.</div>
            ) : (
              notas.map(n => (
                <div key={n.id} onClick={() => abrirNota(n.id)}
                  style={{
                    padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1efe9',
                    background: notaActiva?.id === n.id ? '#F4F2FF' : 'transparent',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: n.es_fantasma ? '#B4B2A9' : '#2C2C2A', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {n.es_fantasma ? '👻' : (n.visibilidad === 'equipo' ? '👥' : '🔒')} {n.titulo}
                  </div>
                  {n.carpeta && <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>📁 {n.carpeta}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contenido: viewer / editor */}
        <div style={{ background: '#fff', border: '1px solid #e2e0d8', borderRadius: 12, padding: 22, minHeight: 0, overflow: 'hidden' }}>
          {modo === 'creando' && (
            <WikiEditorForm nota={null} notasDisponibles={notas} onCancelar={() => setModo('viendo')} onGuardar={guardarNota} />
          )}
          {modo === 'editando' && notaActiva && (
            <WikiEditorForm nota={notaActiva} notasDisponibles={notas} onCancelar={() => setModo('viendo')} onGuardar={guardarNota}
              onSubirAdjunto={subirAdjunto} subiendoAdjunto={subiendoAdjunto} />
          )}
          {modo === 'viendo' && notaActiva && (
            <WikiViewer nota={notaActiva} onWikiLinkClick={irAWikilink}
              onEditar={() => setModo('editando')} onEliminar={eliminarNota}
              onAbrirAdjunto={abrirAdjunto} onEliminarAdjunto={eliminarAdjunto} />
          )}
          {modo === 'viendo' && !notaActiva && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#888780' }}>
              <div style={{ fontSize: 40 }}>📓</div>
              <div style={{ fontSize: 14 }}>Selecciona una nota o crea una nueva.</div>
            </div>
          )}
        </div>
      </div>

      {importOpen && (
        <WikiImportModal onClose={() => setImportOpen(false)} onImportado={cargarLista} />
      )}
    </div>
  )
}

function useIsMobile(bp = 900) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const upd = () => setM(mq.matches); upd()
    mq.addEventListener('change', upd); return () => mq.removeEventListener('change', upd)
  }, [bp])
  return m
}
