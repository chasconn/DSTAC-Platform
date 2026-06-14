'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../lib/api'
import PendientesSubnav from '../components/PendientesSubnav'

// Ícono (Tabler) y color por tipo de acción.
const ACCION_ICON = {
  crear:    { icon: 'ti-plus',          color: '#1D9E75', label: 'Creó'      },
  editar:   { icon: 'ti-pencil',        color: '#534AB7', label: 'Editó'     },
  eliminar: { icon: 'ti-trash',         color: '#E24B4A', label: 'Eliminó'   },
  login:    { icon: 'ti-login-2',       color: '#0C447C', label: 'Ingresó'   },
  exportar: { icon: 'ti-file-download', color: '#C47A1A', label: 'Exportó'   },
  otro:     { icon: 'ti-point',         color: '#888780', label: 'Acción'    },
}

// Color de fondo del badge por módulo (cae a gris si no está mapeado).
const MODULO_BADGE = {
  activos:     { bg: '#EEEDFE', color: '#3C3489' },
  personal:    { bg: '#E6F1FB', color: '#0C447C' },
  identidades: { bg: '#EAF3DE', color: '#27500A' },
  accesos:     { bg: '#FEF3E2', color: '#633806' },
  usuarios:    { bg: '#FCEBEB', color: '#791F1F' },
  clientes:    { bg: '#F1EFE8', color: '#444441' },
  pendientes:  { bg: '#E6F7F1', color: '#0F6B4F' },
  calendario:  { bg: '#F4F3FE', color: '#534AB7' },
}

// Tiempo relativo legible en español ("hace 5 min", "hace 2 h", "hace 3 días").
function tiempoRelativo(fecha) {
  const d = new Date(fecha)
  const seg = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seg < 60)      return 'hace un momento'
  if (seg < 3600)    return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400)   return `hace ${Math.floor(seg / 3600)} h`
  if (seg < 604800)  return `hace ${Math.floor(seg / 86400)} día${Math.floor(seg / 86400) > 1 ? 's' : ''}`
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SEL = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function ActividadPage() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total,   setTotal]   = useState(0)
  const [modulos, setModulos] = useState([])

  const [fModulo,  setFModulo]  = useState('')
  const [fAccion,  setFAccion]  = useState('')
  const [search,   setSearch]   = useState('')
  const [debounced, setDebounced] = useState('')
  const [exportando, setExportando] = useState(false)

  // Debounce de la búsqueda.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const cargar = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p })
      if (fModulo)   params.set('modulo', fModulo)
      if (fAccion)   params.set('accion', fAccion)
      if (debounced) params.set('search', debounced)
      const data = await apiFetch(`/api/admin/pendientes/actividad?${params}`)
      setItems(data.actividad ?? [])
      setTotalPages(data.total_pages ?? 1)
      setTotal(data.total ?? 0)
      setPage(data.page ?? p)
      if (data.modulos) setModulos(data.modulos)
    } catch {
      setItems([])
    } finally { setLoading(false) }
  }, [fModulo, fAccion, debounced])

  useEffect(() => { cargar(1) }, [cargar])

  // Exportar a CSV: recorre todas las páginas del filtro actual y arma un CSV simple.
  async function exportarCSV() {
    setExportando(true)
    try {
      const filas = []
      let p = 1, paginas = 1
      do {
        const params = new URLSearchParams({ page: p })
        if (fModulo)   params.set('modulo', fModulo)
        if (fAccion)   params.set('accion', fAccion)
        if (debounced) params.set('search', debounced)
        const data = await apiFetch(`/api/admin/pendientes/actividad?${params}`)
        paginas = data.total_pages ?? 1
        for (const it of (data.actividad ?? [])) {
          filas.push([
            new Date(it.created_at).toLocaleString('es-CL'),
            it.usuario_nombre ?? '',
            it.accion ?? '',
            it.modulo ?? '',
            (it.descripcion ?? '').replace(/"/g, '""'),
            it.company_nombre ?? '',
          ])
        }
        p++
      } while (p <= paginas)

      const encabezado = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Descripción', 'Empresa']
      const csv = [encabezado, ...filas]
        .map(row => row.map(c => `"${String(c)}"`).join(','))
        .join('\n')
      // BOM para que Excel reconozca UTF-8 (acentos correctos).
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `actividad_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExportando(false) }
  }

  const hayFiltros = fModulo || fAccion || search
  const isMobile = useIsMobile()

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '24px 28px' }}>

      <PendientesSubnav />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Actividad del sistema</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Registro de acciones realizadas en toda la plataforma
          </p>
        </div>
        <button
          onClick={exportarCSV} disabled={exportando || total === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: total === 0 ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: total === 0 ? 0.5 : 1 }}>
          <i className="ti ti-file-download" style={{ fontSize: 16 }} />
          {exportando ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en la actividad…" style={{ ...SEL, minWidth: isMobile ? 0 : 240, flex: isMobile ? '1 1 100%' : '0 1 auto' }} />
        <select value={fModulo} onChange={e => setFModulo(e.target.value)} style={SEL}>
          <option value="">Todos los módulos</option>
          {modulos.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <select value={fAccion} onChange={e => setFAccion(e.target.value)} style={SEL}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACCION_ICON).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
        </select>
        {hayFiltros && (
          <button onClick={() => { setFModulo(''); setFAccion(''); setSearch('') }}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888780' }}>
            Limpiar
          </button>
        )}
        <span style={{ fontSize: 13, color: '#888780', marginLeft: 'auto' }}>
          {total} registro{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
        {loading && <div style={{ padding: '40px 24px', textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>}

        {!loading && items.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🕓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin actividad</div>
            <div style={{ fontSize: 13, color: '#888780' }}>No hay registros que coincidan con los filtros.</div>
          </div>
        )}

        {!loading && items.map((it, i) => {
          const acc = ACCION_ICON[it.accion] ?? ACCION_ICON.otro
          const mod = MODULO_BADGE[it.modulo] ?? { bg: '#F1EFE8', color: '#444441' }
          return (
            <div key={it.id} style={{ display: 'flex', gap: 12, padding: '13px 18px', borderBottom: i < items.length - 1 ? '1px solid #f1efe8' : 'none', alignItems: 'flex-start' }}>

              {/* Ícono de acción */}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: acc.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${acc.icon}`} style={{ fontSize: 16, color: acc.color }} />
              </div>

              {/* Detalle */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#2C2C2A', marginBottom: 3 }}>
                  <strong style={{ fontWeight: 600 }}>{it.usuario_nombre ?? 'Sistema'}</strong>{' '}
                  <span style={{ color: '#444441' }}>{it.descripcion ?? acc.label.toLowerCase()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: mod.bg, color: mod.color, fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>{it.modulo}</span>
                  {it.company_nombre && <span style={{ fontSize: 11, color: '#888780' }}>· {it.company_nombre}</span>}
                  <span style={{ fontSize: 11, color: '#B4B2A9' }}>· {tiempoRelativo(it.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => cargar(page - 1)} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
          <button onClick={() => cargar(page + 1)} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

// Hook de viewport: true cuando el ancho es <= bp (móvil/tablet angosto).
function useIsMobile(bp = 820) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const upd = () => setM(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [bp])
  return m
}
