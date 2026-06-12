'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'

// ── Helpers de color ──────────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 61) return '#1D9E75'
  if (pct >= 41) return '#EF9F27'
  return '#E24B4A'
}

function ScoreRing({ value = 0, size = 72, sw = 7, color }) {
  const pct    = Math.min(100, Math.max(0, Number(value) || 0))
  const r      = (size - sw) / 2
  const circ   = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const c      = color ?? scoreColor(pct)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={size/2} y={size/2 - 4} textAnchor="middle" dominantBaseline="central"
        fill="#fff" fontSize={size * 0.22} fontWeight="800" fontFamily="inherit">
        {Math.round(pct)}
      </text>
      <text x={size/2} y={size/2 + size*0.18} textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.5)" fontSize={size * 0.14} fontFamily="inherit">
        / 100
      </text>
    </svg>
  )
}

// ── Badges y mapas ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  implementado: { bg: '#EAF3DE', color: '#27500A', label: 'Implementado' },
  parcial:      { bg: '#FAEEDA', color: '#633806', label: 'Parcial'      },
  pendiente:    { bg: '#FCEBEB', color: '#791F1F', label: 'Pendiente'    },
  no_aplica:    { bg: '#F1EFE8', color: '#444441', label: 'No aplica'    },
}

const PRIORITY_MAP = {
  critica: { bg: '#FCEBEB', color: '#791F1F', label: 'Crítica' },
  alta:    { bg: '#FAEEDA', color: '#633806', label: 'Alta'    },
  media:   { bg: '#EEEDFE', color: '#3C3489', label: 'Media'   },
  baja:    { bg: '#EAF3DE', color: '#27500A', label: 'Baja'    },
}

const PLAN_STATUS_MAP = {
  pendiente:    { bg: '#FCEBEB', color: '#791F1F', label: 'Pendiente'    },
  en_progreso:  { bg: '#FAEEDA', color: '#633806', label: 'En progreso'  },
  completada:   { bg: '#EAF3DE', color: '#27500A', label: 'Completada'   },
  cancelada:    { bg: '#F1EFE8', color: '#444441', label: 'Cancelada'    },
}

const EVENT_CONFIG = {
  control_actualizado: { icon: '✓', bg: '#EAF3DE', color: '#27500A', label: 'Control actualizado' },
  evidencia_agregada:  { icon: '📎', bg: '#E6F1FB', color: '#185FA5', label: 'Evidencia agregada'  },
  evidencia_aprobada:  { icon: '✓', bg: '#EAF3DE', color: '#27500A', label: 'Evidencia aprobada'  },
  evidencia_rechazada: { icon: '✗', bg: '#FCEBEB', color: '#791F1F', label: 'Evidencia rechazada' },
  comentario_agregado: { icon: '💬', bg: '#FAEEDA', color: '#633806', label: 'Comentario'          },
  estado_cambiado:     { icon: '↻', bg: '#FAEEDA', color: '#633806', label: 'Estado cambiado'     },
  evaluacion_creada:   { icon: '★', bg: '#EEEDFE', color: '#3C3489', label: 'Evaluación creada'   },
}

function fileIcon(type) {
  if (!type) return '📄'
  if (type.includes('pdf')) return '📕'
  if (type.includes('sheet') || type.includes('excel') || type.includes('xlsx')) return '📗'
  if (type.includes('word') || type.includes('doc')) return '📘'
  if (type.includes('image') || type.includes('png') || type.includes('jpg')) return '🖼️'
  return '📎'
}

function formatBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1024/1024).toFixed(1)} MB`
}

// ── Tab: Resumen ──────────────────────────────────────────────────────────────
function ResumenTab({ fn, categories, controls }) {
  const scoreF = Math.round(Number(fn?.score) || 0)
  return (
    <div>
      {/* Descripción de la función */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '16px 20px', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#888780', lineHeight: 1.6 }}>{fn?.description}</p>
      </div>

      {/* Categorías con mini-stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(categories || []).map(cat => {
          const ctrls = controls.filter(c => c.category_id === cat.id)
          const impl  = ctrls.filter(c => c.status === 'implementado').length
          const parc  = ctrls.filter(c => c.status === 'parcial').length
          const pend  = ctrls.filter(c => c.status === 'pendiente').length
          const avg   = ctrls.length ? Math.round(ctrls.reduce((s, c) => s + (Number(c.progress) || 0), 0) / ctrls.length) : 0

          return (
            <div key={cat.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#534AB7', fontWeight: 700 }}>{cat.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginLeft: 8 }}>{cat.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(avg) }}>{avg}%</span>
              </div>
              <div style={{ height: 5, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${avg}%`, height: '100%', background: scoreColor(avg), borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#27500A' }}>{impl} implementados</span>
                <span style={{ color: '#633806' }}>{parc} parciales</span>
                <span style={{ color: '#791F1F' }}>{pend} pendientes</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: Controles (solo lectura) ─────────────────────────────────────────────
function ControlesTab({ controls, categories }) {
  const [q,          setQ]          = useState('')
  const [catFilter,  setCatFilter]  = useState('')
  const [statusFilter,setStatusFilter] = useState('')
  const [expanded,   setExpanded]   = useState(null)

  const filtered = (controls || []).filter(c => {
    if (catFilter    && c.category_id !== catFilter) return false
    if (statusFilter && c.status !== statusFilter)   return false
    if (q) {
      const lq = q.toLowerCase()
      if (!c.id.toLowerCase().includes(lq) && !c.name.toLowerCase().includes(lq)) return false
    }
    return true
  })

  return (
    <div>
      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '10px 14px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar control…"
          style={{ flex: 1, minWidth: 120, padding: '6px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, outline: 'none' }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, background: '#fff', color: '#2C2C2A' }}>
          <option value="">Todas las categorías</option>
          {(categories || []).map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, background: '#fff', color: '#2C2C2A' }}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 12, color: '#888780', marginBottom: 10 }}>{filtered.length} controles</div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map(ctrl => {
          const st  = STATUS_MAP[ctrl.status ?? 'pendiente'] ?? STATUS_MAP.pendiente
          const pct = Number(ctrl.progress) || 0
          const isOpen = expanded === ctrl.id
          return (
            <div key={ctrl.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
              <div
                onClick={() => setExpanded(isOpen ? null : ctrl.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#534AB7', fontWeight: 700, minWidth: 70 }}>{ctrl.id}</span>
                <span style={{ flex: 1, fontSize: 12, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctrl.name}</span>
                <div style={{ width: 70, flexShrink: 0 }}>
                  <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: scoreColor(pct), borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#888780' }}>{pct}%</span>
                </div>
                <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{st.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <polyline points={isOpen ? '18 15 12 9 6 15' : '9 18 15 12 9 6'} />
                </svg>
              </div>
              {isOpen && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f1efe8' }}>
                  <p style={{ margin: '10px 0 8px', fontSize: 12, color: '#888780', lineHeight: 1.6 }}>{ctrl.description}</p>
                  {ctrl.notes_dstac && (
                    <div style={{ background: '#EEEDFE', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#3C3489' }}>
                      <b>Nota DSTAC:</b> {ctrl.notes_dstac}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>No hay controles con los filtros seleccionados</div>
        )}
      </div>
    </div>
  )
}

// ── Tab: Evidencias (solo lectura) ────────────────────────────────────────────
function EvidenciasTab({ evaluationId, functionId }) {
  const [evidencias, setEvidencias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [stFilter,   setStFilter]   = useState('')

  useEffect(() => {
    if (!functionId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (functionId) params.set('function_id', functionId)
    if (stFilter)   params.set('status', stFilter)
    apiFetch(`/api/client/nist/evidencias?${params}`)
      .then(d => setEvidencias(d.evidencias ?? []))
      .catch(() => setEvidencias([]))
      .finally(() => setLoading(false))
  }, [functionId, stFilter])

  const total     = evidencias.length
  const aprobadas = evidencias.filter(e => e.status === 'aprobada').length
  const pendientes= evidencias.filter(e => e.status === 'pendiente').length
  const rechazadas= evidencias.filter(e => e.status === 'rechazada').length

  const STATUS_LABELS = { pendiente: { bg: '#FAEEDA', color: '#633806', label: 'Pendiente' }, aprobada: { bg: '#EAF3DE', color: '#27500A', label: 'Aprobada' }, rechazada: { bg: '#FCEBEB', color: '#791F1F', label: 'Rechazada' } }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[{ l: 'Total', v: total, c: '#534AB7' }, { l: 'Aprobadas', v: aprobadas, c: '#27500A' }, { l: 'Pendientes', v: pendientes, c: '#633806' }, { l: 'Rechazadas', v: rechazadas, c: '#791F1F' }].map(s => (
          <div key={s.l} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <select value={stFilter} onChange={e => setStFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, background: '#fff', color: '#2C2C2A' }}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>Cargando evidencias…</div>
      ) : evidencias.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>No hay evidencias para esta función</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {evidencias.map(ev => {
            const st = STATUS_LABELS[ev.status] ?? STATUS_LABELS.pendiente
            return (
              <div key={ev.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{fileIcon(ev.file_type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.original_name}</div>
                    <div style={{ fontSize: 10, color: '#888780' }}>{ev.control_id} · {formatBytes(ev.file_size)}</div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888780' }}>{ev.uploaded_by_name ?? 'DSTAC'} · {ev.created_at ? new Date(ev.created_at).toLocaleDateString('es-CL') : ''}</div>
                {ev.comments && <div style={{ marginTop: 6, fontSize: 11, color: '#888780', fontStyle: 'italic' }}>"{ev.comments}"</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab: Plan de acción (solo lectura) ────────────────────────────────────────
function PlanAccionTab({ evaluationId, functionId }) {
  const [plan,    setPlan]    = useState([])
  const [loading, setLoading] = useState(true)
  const [stFilter,setStFilter]= useState('')

  useEffect(() => {
    if (!functionId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (functionId) params.set('function_id', functionId)
    if (stFilter)   params.set('status', stFilter)
    apiFetch(`/api/client/nist/plan-accion?${params}`)
      .then(d => setPlan(d.plan ?? []))
      .catch(() => setPlan([]))
      .finally(() => setLoading(false))
  }, [functionId, stFilter])

  const pend = plan.filter(p => p.status === 'pendiente').length
  const prog = plan.filter(p => p.status === 'en_progreso').length
  const comp = plan.filter(p => p.status === 'completada').length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[{ l: 'Total', v: plan.length, c: '#534AB7' }, { l: 'Pendiente', v: pend, c: '#791F1F' }, { l: 'En progreso', v: prog, c: '#633806' }, { l: 'Completadas', v: comp, c: '#27500A' }].map(s => (
          <div key={s.l} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <select value={stFilter} onChange={e => setStFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, background: '#fff', color: '#2C2C2A' }}>
          <option value="">Todos los estados</option>
          {Object.entries(PLAN_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>Cargando plan…</div>
      ) : plan.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>No hay acciones en el plan para esta función</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 100px 100px 110px', gap: 12, padding: '10px 16px', background: '#f8f7f4', borderBottom: '1px solid #f1efe8' }}>
            {['Control', 'Acción', 'Prioridad', 'Estado', 'Responsable', 'Fecha límite'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</div>
            ))}
          </div>
          {plan.map((item, i) => {
            const pr = PRIORITY_MAP[item.priority]  ?? PRIORITY_MAP.media
            const st = PLAN_STATUS_MAP[item.status] ?? PLAN_STATUS_MAP.pendiente
            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 100px 100px 110px', gap: 12, padding: '12px 16px', alignItems: 'start', borderBottom: i < plan.length - 1 ? '1px solid #f8f7f4' : 'none' }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#534AB7', fontWeight: 700 }}>{item.control_id}</span>
                <span style={{ fontSize: 12, color: '#2C2C2A', lineHeight: 1.5 }}>{item.action}</span>
                <span style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, display: 'inline-block' }}>{pr.label}</span>
                <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, display: 'inline-block' }}>{st.label}</span>
                <span style={{ fontSize: 11, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.responsible ?? '—'}</span>
                <span style={{ fontSize: 11, color: item.due_date ? '#2C2C2A' : '#B4B2A9' }}>
                  {item.due_date ? new Date(item.due_date).toLocaleDateString('es-CL') : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab: Historial (solo lectura) ─────────────────────────────────────────────
function HistorialTab({ functionId }) {
  const [historial, setHistorial] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [typeFilter,setTypeFilter]= useState('')

  useEffect(() => {
    if (!functionId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (functionId) params.set('function_id', functionId)
    if (typeFilter) params.set('event_type', typeFilter)
    apiFetch(`/api/client/nist/historial?${params}`)
      .then(d => setHistorial(d.historial ?? []))
      .catch(() => setHistorial([]))
      .finally(() => setLoading(false))
  }, [functionId, typeFilter])

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, background: '#fff', color: '#2C2C2A' }}>
          <option value="">Todos los tipos</option>
          {Object.entries(EVENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>Cargando historial…</div>
      ) : historial.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>No hay eventos registrados</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {historial.map((ev, i) => {
            const cfg  = EVENT_CONFIG[ev.event_type] ?? EVENT_CONFIG.estado_cambiado
            const prev = ev.previous_data ? (typeof ev.previous_data === 'string' ? JSON.parse(ev.previous_data) : ev.previous_data) : null
            const next = ev.new_data      ? (typeof ev.new_data      === 'string' ? JSON.parse(ev.new_data)      : ev.new_data)      : null
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: '#fff', borderRadius: i === 0 ? '10px 10px 4px 4px' : i === historial.length - 1 ? '4px 4px 10px 10px' : 4, border: '1px solid #e2e0d8', marginBottom: 2 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A' }}>{cfg.label}</div>
                    <div style={{ fontSize: 10, color: '#B4B2A9' }}>
                      {ev.created_at ? new Date(ev.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                  {ev.control_id && <div style={{ fontSize: 11, color: '#534AB7', fontFamily: 'monospace', marginBottom: 2 }}>{ev.control_id}</div>}
                  {prev && next && (prev.status || next.status) && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, marginBottom: 4 }}>
                      {prev.status && <span style={{ padding: '1px 7px', borderRadius: 20, background: '#f1efe8', color: '#888780' }}>{prev.status}</span>}
                      <span style={{ color: '#B4B2A9' }}>→</span>
                      {next.status && <span style={{ padding: '1px 7px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{next.status}</span>}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#888780' }}>{ev.user_name} {ev.user_last ?? ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',   label: 'Resumen'        },
  { id: 'controles', label: 'Controles'      },
  { id: 'evidencias',label: 'Evidencias'     },
  { id: 'plan',      label: 'Plan de acción' },
  { id: 'historial', label: 'Historial'      },
]

export default function ClientNistPage() {
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [activeFn,   setActiveFn]   = useState(null)
  const [controls,   setControls]   = useState([])
  const [categories, setCategories] = useState([])
  const [loadingFn,  setLoadingFn]  = useState(false)
  const [tab,        setTab]        = useState('resumen')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/client/nist/stats')
      setStats(data)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function verFuncion(fn) {
    if (activeFn?.id === fn.id) { setActiveFn(null); setControls([]); setCategories([]); return }
    setActiveFn(fn)
    setTab('resumen')
    setLoadingFn(true)
    try {
      const data = await apiFetch(`/api/client/nist/controls/${fn.id}`)
      setControls(data.controls ?? [])
      setCategories(data.categories ?? [])
    } catch { setControls([]); setCategories([]) }
    finally { setLoadingFn(false) }
  }

  const scoreTotal = Math.round(Number(stats?.score_total) || 0)

  return (
    <div style={{ padding: 28 }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>NIST CSF 2.0</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>Postura de ciberseguridad según el NIST Cybersecurity Framework</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888780', fontSize: 13 }}>Cargando…</div>
      ) : !stats?.evaluation_id ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ color: '#888780', fontSize: 13 }}>No hay evaluación NIST disponible aún. El equipo DSTAC la generará próximamente.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Columna izquierda */}
          <div>
            {/* Score general */}
            <div style={{ background: '#3C3489', borderRadius: 14, padding: '24px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#CECBF6', marginBottom: 16 }}>Madurez NIST CSF</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <ScoreRing value={scoreTotal} size={110} sw={9} />
              </div>
              <div style={{ fontSize: 12, color: '#AFA9EC' }}>
                {scoreTotal >= 81 ? 'Nivel Excelente' : scoreTotal >= 61 ? 'Nivel Alto' : scoreTotal >= 41 ? 'Nivel Medio' : scoreTotal >= 21 ? 'Nivel Bajo' : 'Nivel Crítico'}
              </div>
              {stats.evaluated_at && (
                <div style={{ fontSize: 11, color: '#7F77DD', marginTop: 8 }}>
                  Actualizado: {new Date(stats.evaluated_at).toLocaleDateString('es-CL')}
                </div>
              )}
            </div>

            {/* Mini anillos por función */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>Por función</div>
              {(stats.functions ?? []).map(fn => (
                <div key={fn.id}
                  onClick={() => verFuncion(fn)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer', padding: '4px 6px', borderRadius: 8, background: activeFn?.id === fn.id ? 'rgba(83,74,183,0.07)' : 'transparent', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (activeFn?.id !== fn.id) e.currentTarget.style.background = '#fafaf8' }}
                  onMouseLeave={e => { if (activeFn?.id !== fn.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: fn.color ?? '#3C3489', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#2C2C2A', fontWeight: activeFn?.id === fn.id ? 600 : 400 }}>{fn.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(Math.round(Number(fn.score) || 0)) }}>
                    {Math.round(Number(fn.score) || 0)}%
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round">
                    <polyline points={activeFn?.id === fn.id ? '18 15 12 9 6 15' : '9 18 15 12 9 6'} />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha */}
          <div>
            {!activeFn ? (
              /* Vista general: cards de funciones */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(stats.functions ?? []).map(fn => {
                  const score = Math.round(Number(fn.score) || 0)
                  return (
                    <div key={fn.id}
                      onClick={() => verFuncion(fn)}
                      style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: (fn.color ?? '#3C3489') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: fn.color ?? '#3C3489' }}>{score}%</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ background: (fn.color ?? '#3C3489') + '22', color: fn.color ?? '#3C3489', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{fn.id}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{fn.name}</span>
                        </div>
                        <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#888780', flexShrink: 0 }}>
                        <span style={{ color: '#27500A' }}>{fn.implementados ?? 0} impl.</span>
                        <span style={{ color: '#633806' }}>{fn.parciales ?? 0} parc.</span>
                        <span style={{ color: '#791F1F' }}>{fn.pendientes ?? 0} pend.</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Vista de función con tabs */
              <div>
                {/* Header función */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => { setActiveFn(null); setControls([]); setCategories([]) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 12, fontWeight: 600, padding: '0 8px 0 0', flexShrink: 0 }}>
                    ← Volver
                  </button>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: (activeFn.color ?? '#3C3489') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: activeFn.color ?? '#3C3489' }}>{Math.round(Number(activeFn.score) || 0)}%</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: (activeFn.color ?? '#3C3489') + '22', color: activeFn.color ?? '#3C3489', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{activeFn.id}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A' }}>{activeFn.name}</span>
                    </div>
                    <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ width: `${Math.round(Number(activeFn.score) || 0)}%`, height: '100%', background: scoreColor(Math.round(Number(activeFn.score) || 0)), borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888780', flexShrink: 0 }}>
                    {activeFn.implementados ?? 0} impl. · {activeFn.parciales ?? 0} parc. · {activeFn.pendientes ?? 0} pend.
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid #e2e0d8', paddingBottom: 0 }}>
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? '#3C3489' : '#888780', borderBottom: `2px solid ${tab === t.id ? '#3C3489' : 'transparent'}`, marginBottom: -1, transition: 'color 0.12s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Contenido del tab */}
                {loadingFn ? (
                  <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando…</div>
                ) : (
                  <>
                    {tab === 'resumen'    && <ResumenTab    fn={activeFn} categories={categories} controls={controls} />}
                    {tab === 'controles'  && <ControlesTab  controls={controls} categories={categories} />}
                    {tab === 'evidencias' && <EvidenciasTab functionId={activeFn.id} />}
                    {tab === 'plan'       && <PlanAccionTab functionId={activeFn.id} />}
                    {tab === 'historial'  && <HistorialTab  functionId={activeFn.id} />}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
