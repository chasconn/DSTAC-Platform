'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../../lib/api'
import HistorialPanel from '../panels/HistorialPanel'

const EVENT_CONFIG = {
  control_actualizado: { icon: '✓', bg: '#EAF3DE', color: '#27500A', label: 'Control actualizado' },
  evidencia_agregada:  { icon: '📎', bg: '#E6F1FB', color: '#185FA5', label: 'Evidencia agregada'  },
  evidencia_aprobada:  { icon: '✓', bg: '#EAF3DE', color: '#27500A', label: 'Evidencia aprobada'  },
  evidencia_rechazada: { icon: '✗', bg: '#FCEBEB', color: '#791F1F', label: 'Evidencia rechazada' },
  comentario_agregado: { icon: '💬', bg: '#FAEEDA', color: '#633806', label: 'Comentario'          },
  estado_cambiado:     { icon: '↻', bg: '#FAEEDA', color: '#633806', label: 'Estado cambiado'     },
  evaluacion_creada:   { icon: '★', bg: '#EEEDFE', color: '#3C3489', label: 'Evaluación creada'   },
}

export default function HistorialTab({ slug, functionId }) {
  const headers = { 'X-Company-Slug': slug }
  const [historial,   setHistorial]   = useState([])
  const [stats,       setStats]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [userFilter,  setUserFilter]  = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [fnFilter,    setFnFilter]    = useState(functionId ?? '')
  const [q,           setQ]           = useState('')
  const [functions,   setFunctions]   = useState([])
  const [selected,    setSelected]    = useState(null)

  const cargar = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fnFilter)   params.set('function_id', fnFilter)
      if (userFilter) params.set('user_id', userFilter)
      if (typeFilter) params.set('event_type', typeFilter)
      if (q)          params.set('q', q)
      const data = await apiFetch(`/api/admin/nist/historial?${params}`, { headers })
      setHistorial(data.historial ?? [])
      setStats(data.stats ?? null)
    } catch { setHistorial([]) }
    finally { setLoading(false) }
  }, [slug, fnFilter, userFilter, typeFilter, q])

  useEffect(() => { cargar() }, [cargar])

  // Cargar funciones para el filtro
  useEffect(() => {
    if (!slug) return
    apiFetch('/api/admin/nist/functions', { headers })
      .then(d => setFunctions(d.functions ?? []))
      .catch(() => {})
  }, [slug])

  // Usuarios únicos para filtro
  const users = [...new Map(historial.map(h => [h.user_id, { id: h.user_id, name: `${h.user_name ?? ''} ${h.user_last ?? ''}`.trim() }])).values()]

  // Exportar como CSV
  function exportCSV() {
    const rows = [
      ['Fecha', 'Tipo', 'Control', 'Función', 'Categoría', 'Usuario', 'Antes (status)', 'Después (status)', 'Progreso', 'Comentario'],
      ...historial.map(h => {
        const prev = h.previous_data ? JSON.parse(typeof h.previous_data === 'string' ? h.previous_data : JSON.stringify(h.previous_data)) : {}
        const next = h.new_data      ? JSON.parse(typeof h.new_data === 'string'      ? h.new_data      : JSON.stringify(h.new_data))      : {}
        return [
          h.created_at ? new Date(h.created_at).toLocaleString('es-CL') : '',
          EVENT_CONFIG[h.event_type]?.label ?? h.event_type,
          h.control_id ?? '',
          h.function_id ?? '',
          h.category_name ?? '',
          `${h.user_name ?? ''} ${h.user_last ?? ''}`.trim(),
          prev.status ?? '',
          next.status ?? '',
          next.progress != null ? `${next.progress}%` : '',
          h.comment ?? '',
        ]
      })
    ]
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'historial_nist.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total eventos',     value: stats.total_eventos },
            { label: 'Cambios este mes',  value: stats.cambios_mes },
            { label: 'Controles mod.',    value: stats.controles_modificados },
            { label: 'Evidencias agr.',   value: stats.evidencias_agregadas },
            { label: 'Usuarios activos',  value: stats.usuarios_activos },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#3C3489' }}>{s.value ?? 0}</div>
              <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros + Exportar */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '10px 14px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…"
          style={{ flex: 1, minWidth: 120, padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, outline: 'none' }}
        />
        {/* Filtro Función */}
        <select value={fnFilter} onChange={e => setFnFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
          <option value="">Todas las funciones</option>
          {functions.map(f => <option key={f.id} value={f.id}>{f.id} — {f.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
          <option value="">Todos los tipos</option>
          {Object.entries(EVENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
          <option value="">Todos los usuarios</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {(q || fnFilter !== (functionId ?? '') || typeFilter || userFilter) && (
          <button onClick={() => { setQ(''); setFnFilter(functionId ?? ''); setTypeFilter(''); setUserFilter('') }}
            style={{ padding: '7px 12px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, background: '#fff', cursor: 'pointer', color: '#888780' }}>
            Limpiar
          </button>
        )}
        <button onClick={exportCSV}
          style={{ padding: '7px 16px', border: '1px solid #3C3489', borderRadius: 7, fontSize: 14, background: '#fff', cursor: 'pointer', color: '#3C3489', fontWeight: 600, marginLeft: 'auto' }}>
          Exportar CSV
        </button>
      </div>

      {/* Línea de tiempo */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 15 }}>Cargando historial…</div>
      ) : historial.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 15 }}>No hay eventos registrados</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {historial.map((ev, i) => {
            const cfg  = EVENT_CONFIG[ev.event_type] ?? EVENT_CONFIG.estado_cambiado
            const prev = ev.previous_data ? (typeof ev.previous_data === 'string' ? JSON.parse(ev.previous_data) : ev.previous_data) : null
            const next = ev.new_data      ? (typeof ev.new_data      === 'string' ? JSON.parse(ev.new_data)      : ev.new_data)      : null
            const isSelected = selected?.id === ev.id

            return (
              <div key={ev.id}
                onClick={() => setSelected(isSelected ? null : ev)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '13px 18px', background: isSelected ? '#fafaf8' : '#fff',
                  borderRadius: i === 0 ? '10px 10px 4px 4px' : i === historial.length - 1 ? '4px 4px 10px 10px' : 4,
                  border: `1px solid ${isSelected ? '#534AB7' : '#e2e0d8'}`, marginBottom: 2,
                  cursor: 'pointer', transition: 'border-color 0.12s',
                }}
              >
                {/* Ícono */}
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {cfg.icon}
                </div>

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: '#B4B2A9', flexShrink: 0, marginLeft: 8 }}>
                      {ev.created_at ? new Date(ev.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>

                  {ev.control_id && (
                    <div style={{ fontSize: 13, color: '#534AB7', fontFamily: 'monospace', marginBottom: 2 }}>{ev.control_id}</div>
                  )}

                  {prev && next && (prev.status || next.status) && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                      {prev.status && <span style={{ padding: '2px 8px', borderRadius: 20, background: '#f1efe8', color: '#888780' }}>{prev.status}</span>}
                      <span style={{ color: '#B4B2A9' }}>→</span>
                      {next.status && <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{next.status}</span>}
                    </div>
                  )}

                  {next?.progress !== undefined && (
                    <div style={{ fontSize: 12, color: '#888780' }}>Progreso: {next.progress}%</div>
                  )}

                  <div style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>
                    {ev.user_name} {ev.user_last ?? ''}
                    {ev.comment && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>"{ev.comment}"</span>}
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#B4B2A9', flexShrink: 0 }}>›</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Panel lateral */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 99 }} />
          <HistorialPanel
            evento={selected}
            allHistorial={historial}
            onClose={() => setSelected(null)}
          />
        </>
      )}
    </div>
  )
}
