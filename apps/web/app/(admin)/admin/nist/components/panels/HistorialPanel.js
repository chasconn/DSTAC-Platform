'use client'

import { useMemo } from 'react'

const EVENT_CONFIG = {
  control_actualizado: { icon: '✓', bg: '#EAF3DE', color: '#27500A', label: 'Control actualizado' },
  evidencia_agregada:  { icon: '📎', bg: '#E6F1FB', color: '#185FA5', label: 'Evidencia agregada'  },
  evidencia_aprobada:  { icon: '✓', bg: '#EAF3DE', color: '#27500A', label: 'Evidencia aprobada'  },
  evidencia_rechazada: { icon: '✗', bg: '#FCEBEB', color: '#791F1F', label: 'Evidencia rechazada' },
  comentario_agregado: { icon: '💬', bg: '#FAEEDA', color: '#633806', label: 'Comentario agregado' },
  estado_cambiado:     { icon: '↻', bg: '#FAEEDA', color: '#633806', label: 'Estado cambiado'     },
  evaluacion_creada:   { icon: '★', bg: '#EEEDFE', color: '#3C3489', label: 'Evaluación creada'   },
}

const STATUS_LABELS = {
  pendiente:    { bg: '#FCEBEB', color: '#791F1F', label: 'Pendiente'    },
  parcial:      { bg: '#FAEEDA', color: '#633806', label: 'Parcial'      },
  implementado: { bg: '#EAF3DE', color: '#27500A', label: 'Implementado' },
  no_aplica:    { bg: '#F1EFE8', color: '#444441', label: 'No aplica'    },
}

function StatusBadge({ val }) {
  const s = STATUS_LABELS[val]
  if (!s) return <span style={{ fontSize: 10, color: '#888780' }}>{val ?? '—'}</span>
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
      {s.label}
    </span>
  )
}

// Mini sparkline SVG
function Sparkline({ points, width = 200, height = 40 }) {
  if (!points || points.length < 2) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#B4B2A9' }}>Sin datos de evolución</div>
  }
  const maxVal  = Math.max(...points.map(p => p.y), 1)
  const minVal  = 0
  const range   = maxVal - minVal || 1
  const pad     = 4
  const w       = width  - pad * 2
  const h       = height - pad * 2
  const pts     = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * w
    const y = pad + h - ((p.y - minVal) / range) * h
    return `${x},${y}`
  })
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke="#534AB7" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const x = pad + (i / (points.length - 1)) * w
        const y = pad + h - ((p.y - minVal) / range) * h
        return <circle key={i} cx={x} cy={y} r={3} fill="#3C3489" />
      })}
    </svg>
  )
}

export default function HistorialPanel({ evento, allHistorial = [], onClose }) {
  const cfg = EVENT_CONFIG[evento.event_type] ?? EVENT_CONFIG.estado_cambiado

  const prev = useMemo(() => {
    if (!evento.previous_data) return null
    return typeof evento.previous_data === 'string' ? JSON.parse(evento.previous_data) : evento.previous_data
  }, [evento.previous_data])

  const next = useMemo(() => {
    if (!evento.new_data) return null
    return typeof evento.new_data === 'string' ? JSON.parse(evento.new_data) : evento.new_data
  }, [evento.new_data])

  // Actividad por usuario (cuenta de eventos)
  const userActivity = useMemo(() => {
    const counts = {}
    allHistorial.forEach(h => {
      const name = `${h.user_name ?? ''} ${h.user_last ?? ''}`.trim() || 'Sistema'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [allHistorial])

  const maxActivity = userActivity[0]?.[1] || 1

  // Evolución de progreso en el control (si los eventos tienen progress)
  const sparkPoints = useMemo(() => {
    const controlEvents = allHistorial
      .filter(h => h.control_id === evento.control_id && h.new_data)
      .map(h => {
        const d = typeof h.new_data === 'string' ? JSON.parse(h.new_data) : h.new_data
        return { y: Number(d?.progress ?? 0), date: h.created_at }
      })
      .reverse()
    return controlEvents.length >= 2 ? controlEvents : []
  }, [allHistorial, evento.control_id])

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column', zIndex: 100, overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1efe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A' }}>{cfg.label}</div>
            <div style={{ fontSize: 11, color: '#888780' }}>
              {evento.created_at ? new Date(evento.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Control */}
        {evento.control_id && (
          <div style={{ background: '#fafaf8', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Control</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#534AB7', fontWeight: 700 }}>{evento.control_id}</div>
            <div style={{ fontSize: 12, color: '#2C2C2A', marginTop: 2 }}>{evento.control_name}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{evento.category_name}</div>
          </div>
        )}

        {/* Usuario */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(83,74,183,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#534AB7' }}>
            {(evento.user_name?.[0] ?? 'D').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A' }}>{`${evento.user_name ?? ''} ${evento.user_last ?? ''}`.trim() || 'Sistema'}</div>
            <div style={{ fontSize: 11, color: '#888780' }}>{evento.user_role}</div>
          </div>
        </div>

        {/* Antes → Después */}
        {(prev || next) && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>Cambio registrado</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, background: '#fafaf8', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#888780', marginBottom: 6, fontWeight: 600 }}>ANTES</div>
                {prev?.status && <div style={{ marginBottom: 4 }}><StatusBadge val={prev.status} /></div>}
                {prev?.progress != null && (
                  <div style={{ fontSize: 12, color: '#2C2C2A' }}>Progreso: <b>{prev.progress}%</b></div>
                )}
                {prev?.notes_dstac && (
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 4, fontStyle: 'italic' }}>"{prev.notes_dstac}"</div>
                )}
                {!prev?.status && !prev?.progress && !prev?.notes_dstac && (
                  <div style={{ fontSize: 11, color: '#B4B2A9' }}>Sin estado previo</div>
                )}
              </div>
              <div style={{ fontSize: 18, color: '#B4B2A9' }}>→</div>
              <div style={{ flex: 1, background: '#f0f8f4', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#888780', marginBottom: 6, fontWeight: 600 }}>DESPUÉS</div>
                {next?.status && <div style={{ marginBottom: 4 }}><StatusBadge val={next.status} /></div>}
                {next?.progress != null && (
                  <div style={{ fontSize: 12, color: '#2C2C2A' }}>Progreso: <b>{next.progress}%</b></div>
                )}
                {!next?.status && !next?.progress && (
                  <div style={{ fontSize: 11, color: '#B4B2A9' }}>Sin datos</div>
                )}
              </div>
            </div>
            {evento.comment && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#FAEEDA', borderRadius: 7, fontSize: 11, color: '#633806' }}>
                💬 {evento.comment}
              </div>
            )}
          </div>
        )}

        {/* Evolución del control */}
        {sparkPoints.length >= 2 && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 10 }}>Evolución de progreso</div>
            <Sparkline points={sparkPoints} width={340} height={48} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: '#B4B2A9' }}>{sparkPoints[0]?.y}%</span>
              <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 700 }}>{sparkPoints[sparkPoints.length - 1]?.y}%</span>
            </div>
          </div>
        )}

        {/* Actividad por usuario */}
        {userActivity.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 10 }}>Actividad del equipo</div>
            {userActivity.map(([name, count]) => (
              <div key={name} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#2C2C2A' }}>{name}</span>
                  <span style={{ fontSize: 11, color: '#534AB7', fontWeight: 700 }}>{count} evento{count > 1 ? 's' : ''}</span>
                </div>
                <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(count / maxActivity) * 100}%`, height: '100%', background: '#534AB7', borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
