'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../../lib/api'

const EVENT_STYLE = {
  control_actualizado: { label: 'Control actualizado', color: '#3C3489', bg: '#EEEDFE',  icon: '✏️' },
  estado_cambiado:     { label: 'Estado cambiado',     color: '#185FA5', bg: '#E6F1FB',  icon: '🔄' },
  evidencia_agregada:  { label: 'Evidencia agregada',  color: '#0F6E56', bg: '#E1F5EE',  icon: '📎' },
  evidencia_aprobada:  { label: 'Evidencia aprobada',  color: '#27500A', bg: '#EAF3DE',  icon: '✅' },
  evidencia_rechazada: { label: 'Evidencia rechazada', color: '#791F1F', bg: '#FCEBEB',  icon: '❌' },
  riesgo_agregado:     { label: 'Riesgo agregado',     color: '#633806', bg: '#FAEEDA',  icon: '⚠️' },
  riesgo_actualizado:  { label: 'Riesgo actualizado',  color: '#633806', bg: '#FAEEDA',  icon: '⚠️' },
  politica_guardada:   { label: 'Política guardada',   color: '#0F6E56', bg: '#E1F5EE',  icon: '📋' },
  evaluacion_creada:   { label: 'Evaluación creada',   color: '#3C3489', bg: '#EEEDFE',  icon: '🆕' },
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

export default function HistorialTab({ domainId, slug }) {
  const [historial, setHistorial] = useState([])
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [filterType,setFilterType]= useState('')
  const [q,         setQ]         = useState('')

  const headers = { 'X-Company-Slug': slug }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/admin/iso/historial?domain_id=${domainId}${filterType ? `&event_type=${filterType}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
      const data = await apiFetch(url, { headers })
      setHistorial(data.historial ?? [])
      setStats(data.stats ?? null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, domainId, filterType, q])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando historial…</div>

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total eventos',        value: stats.total_eventos         || 0 },
            { label: 'Este mes',             value: stats.cambios_mes            || 0 },
            { label: 'Controles modificados',value: stats.controles_modificados  || 0 },
            { label: 'Evidencias subidas',   value: stats.evidencias_agregadas   || 0 },
          ].map(s => (
            <div key={s.label} style={{ background: '#f8f7f4', borderRadius: 10, padding: '10px 16px', minWidth: 100 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2C2C2A', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar control…"
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, minWidth: 160, fontFamily: 'inherit' }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
          <option value="">Todos los eventos</option>
          {Object.entries(EVENT_STYLE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {historial.map((h, i) => {
          const ev = EVENT_STYLE[h.event_type] ?? { label: h.event_type, color: '#888780', bg: '#f8f7f4', icon: '•' }
          return (
            <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {/* Línea vertical */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: ev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {ev.icon}
                </div>
                {i < historial.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: '#f1efe8', marginTop: 4 }} />
                )}
              </div>

              {/* Contenido */}
              <div style={{ flex: 1, background: '#fff', borderRadius: 9, border: '1px solid #e2e0d8', padding: '10px 14px', marginBottom: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ background: ev.bg, color: ev.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{ev.label}</span>
                  <span style={{ fontSize: 11, color: '#B4B2A9' }}>{formatDate(h.created_at)}</span>
                </div>
                {h.control_name && (
                  <div style={{ fontSize: 12, color: '#2C2C2A', fontWeight: 600, marginBottom: 2 }}>
                    <span style={{ color: '#3C3489' }}>{h.control_id}</span> — {h.control_name}
                  </div>
                )}
                {h.comment && <div style={{ fontSize: 12, color: '#888780', fontStyle: 'italic' }}>"{h.comment}"</div>}
                {h.user_name && <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 4 }}>{h.user_name} {h.user_last ?? ''}</div>}
              </div>
            </div>
          )
        })}
        {historial.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 32, background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8' }}>
            Sin eventos registrados en el historial.
          </div>
        )}
      </div>
    </div>
  )
}
