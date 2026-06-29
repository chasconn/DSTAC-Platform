'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 76) return '#1D9E75'
  if (pct >= 26) return '#EF9F27'
  return '#E24B4A'
}

function gapLevel(pct) {
  if (pct >= 91) return { label: 'Completamente alineado', color: '#1D9E75' }
  if (pct >= 76) return { label: 'Alineamiento alto',      color: '#1D9E75' }
  if (pct >= 51) return { label: 'Alineamiento medio',     color: '#EF9F27' }
  if (pct >= 26) return { label: 'Alineamiento bajo',      color: '#EF9F27' }
  return               { label: 'Alineamiento crítico',    color: '#E24B4A' }
}

function ScoreRing({ value = 0, size = 100, sw = 9, color }) {
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
      <text x={size/2} y={size/2 + size * 0.18} textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.5)" fontSize={size * 0.14} fontFamily="inherit">
        / 100
      </text>
    </svg>
  )
}

// ── Mapas de estado ───────────────────────────────────────────────────────────
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
  pendiente:   { bg: '#FCEBEB', color: '#791F1F', label: 'Pendiente'   },
  en_progreso: { bg: '#FAEEDA', color: '#633806', label: 'En progreso' },
  completada:  { bg: '#EAF3DE', color: '#27500A', label: 'Completada'  },
  cancelada:   { bg: '#F1EFE8', color: '#444441', label: 'Cancelada'   },
}

const EVENT_CONFIG = {
  control_actualizado: { icon: '✓',  bg: '#EAF3DE', color: '#27500A', label: 'Control actualizado' },
  evidencia_agregada:  { icon: '📎', bg: '#E6F1FB', color: '#185FA5', label: 'Evidencia agregada'  },
  evidencia_aprobada:  { icon: '✓',  bg: '#EAF3DE', color: '#27500A', label: 'Evidencia aprobada'  },
  evidencia_rechazada: { icon: '✗',  bg: '#FCEBEB', color: '#791F1F', label: 'Evidencia rechazada' },
  comentario_agregado: { icon: '💬', bg: '#FAEEDA', color: '#633806', label: 'Comentario'          },
  estado_cambiado:     { icon: '↻',  bg: '#FAEEDA', color: '#633806', label: 'Estado cambiado'     },
  evaluacion_creada:   { icon: '★',  bg: '#EEEDFE', color: '#3C3489', label: 'Evaluación creada'   },
}

function fileIcon(type) {
  if (!type) return '📄'
  if (type.includes('pdf')) return '📕'
  if (type.includes('sheet') || type.includes('excel')) return '📗'
  if (type.includes('word') || type.includes('doc')) return '📘'
  if (type.includes('image')) return '🖼️'
  return '📎'
}

function formatBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

// ── Tab: Resumen ──────────────────────────────────────────────────────────────
function ResumenTab({ domain, controls }) {
  const impl = controls.filter(c => c.status === 'implementado').length
  const parc = controls.filter(c => c.status === 'parcial').length
  const pend = controls.filter(c => c.status === 'pendiente').length
  const na   = controls.filter(c => c.status === 'no_aplica' || c.applies === 0).length

  return (
    <div>
      {domain?.description && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#888780', lineHeight: 1.6 }}>{domain.description}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Implementados', v: impl, color: '#27500A', bg: '#EAF3DE' },
          { label: 'Parciales',     v: parc, color: '#633806', bg: '#FAEEDA' },
          { label: 'Pendientes',    v: pend, color: '#791F1F', bg: '#FCEBEB' },
          { label: 'No aplica',     v: na,   color: '#444441', bg: '#F1EFE8' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: s.color, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {controls.map(ctrl => {
          const st  = STATUS_MAP[ctrl.status ?? 'pendiente'] ?? STATUS_MAP.pendiente
          const pct = Number(ctrl.progress) || 0
          return (
            <div key={ctrl.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: domain?.color ?? '#534AB7', fontWeight: 700, flexShrink: 0 }}>{ctrl.id}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctrl.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(pct) }}>{pct}%</span>
                  <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>{st.label}</span>
                </div>
              </div>
              <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: scoreColor(pct), borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: Controles ────────────────────────────────────────────────────────────
function ControlesTab({ controls, domainColor }) {
  const [q,           setQ]            = useState('')
  const [statusFilter,setStatusFilter] = useState('')
  const [expanded,    setExpanded]     = useState(null)

  const filtered = (controls || []).filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (q) {
      const lq = q.toLowerCase()
      if (!c.id.toLowerCase().includes(lq) && !c.name.toLowerCase().includes(lq)) return false
    }
    return true
  })

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '10px 14px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar control…"
          style={{ flex: 1, minWidth: 120, padding: '6px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, outline: 'none' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 12, background: '#fff', color: '#2C2C2A' }}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 12, color: '#888780', marginBottom: 10 }}>{filtered.length} controles</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map(ctrl => {
          const st     = STATUS_MAP[ctrl.status ?? 'pendiente'] ?? STATUS_MAP.pendiente
          const pct    = Number(ctrl.progress) || 0
          const isOpen = expanded === ctrl.id
          return (
            <div key={ctrl.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
              <div onClick={() => setExpanded(isOpen ? null : ctrl.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: domainColor ?? '#534AB7', fontWeight: 700, minWidth: 56 }}>{ctrl.id}</span>
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
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: '#888780', lineHeight: 1.6 }}>{ctrl.description}</p>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>
            No hay controles con los filtros seleccionados
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab: Evidencias ───────────────────────────────────────────────────────────
function EvidenciasTab({ domainId }) {
  const [evidencias, setEvidencias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [stFilter,   setStFilter]   = useState('')

  useEffect(() => {
    if (!domainId) return
    setLoading(true)
    const params = new URLSearchParams({ domain_id: domainId })
    if (stFilter) params.set('status', stFilter)
    apiFetch(`/api/client/iso/evidencias?${params}`)
      .then(d => setEvidencias(d.evidencias ?? []))
      .catch(() => setEvidencias([]))
      .finally(() => setLoading(false))
  }, [domainId, stFilter])

  const aprobadas = evidencias.filter(e => e.status === 'aprobada').length
  const pendientes = evidencias.filter(e => e.status === 'pendiente').length
  const rechazadas = evidencias.filter(e => e.status === 'rechazada').length

  const STATUS_LABELS = {
    aprobada:  { bg: '#EAF3DE', color: '#27500A', label: 'Aprobada'  },
    pendiente: { bg: '#FAEEDA', color: '#633806', label: 'Pendiente' },
    rechazada: { bg: '#FCEBEB', color: '#791F1F', label: 'Rechazada' },
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { l: 'Total',     v: evidencias.length, c: '#534AB7' },
          { l: 'Aprobadas', v: aprobadas,          c: '#27500A' },
          { l: 'Pendientes',v: pendientes,          c: '#633806' },
          { l: 'Rechazadas',v: rechazadas,          c: '#791F1F' },
        ].map(s => (
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
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>No hay evidencias para este dominio</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {evidencias.map(ev => {
            const st = STATUS_LABELS[ev.status] ?? STATUS_LABELS.aprobada
            return (
              <div key={ev.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{fileIcon(ev.file_type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.original_name}
                    </div>
                    <div style={{ fontSize: 10, color: '#888780' }}>{ev.control_id} · {formatBytes(ev.file_size)}</div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#888780' }}>
                  {ev.uploaded_by_name ?? 'DSTAC'} · {ev.created_at ? new Date(ev.created_at).toLocaleDateString('es-CL') : ''}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab: Plan de acción ───────────────────────────────────────────────────────
function PlanAccionTab({ domainId }) {
  const [plan,    setPlan]    = useState([])
  const [loading, setLoading] = useState(true)
  const [stFilter,setStFilter]= useState('')

  useEffect(() => {
    if (!domainId) return
    setLoading(true)
    apiFetch(`/api/client/iso/plan-accion?domain_id=${domainId}`)
      .then(d => setPlan(d.plan ?? []))
      .catch(() => setPlan([]))
      .finally(() => setLoading(false))
  }, [domainId])

  const filtered = stFilter ? plan.filter(p => p.status === stFilter) : plan
  const pend = plan.filter(p => p.status === 'pendiente').length
  const prog = plan.filter(p => p.status === 'en_progreso').length
  const comp = plan.filter(p => p.status === 'completada').length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { l: 'Total',      v: plan.length, c: '#534AB7' },
          { l: 'Pendiente',  v: pend,        c: '#791F1F' },
          { l: 'En progreso',v: prog,        c: '#633806' },
          { l: 'Completadas',v: comp,        c: '#27500A' },
        ].map(s => (
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
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>
          No hay acciones en el plan para este dominio
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 100px 100px 110px', gap: 12, padding: '10px 16px', background: '#f8f7f4', borderBottom: '1px solid #f1efe8' }}>
            {['Control', 'Acción', 'Prioridad', 'Estado', 'Responsable', 'Fecha límite'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</div>
            ))}
          </div>
          {filtered.map((item, i) => {
            const pr = PRIORITY_MAP[item.priority]  ?? PRIORITY_MAP.media
            const st = PLAN_STATUS_MAP[item.status] ?? PLAN_STATUS_MAP.pendiente
            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 100px 100px 110px', gap: 12, padding: '12px 16px', alignItems: 'start', borderBottom: i < filtered.length - 1 ? '1px solid #f8f7f4' : 'none' }}>
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

// ── Tab: Historial ────────────────────────────────────────────────────────────
function HistorialTab({ domainId }) {
  const [historial, setHistorial] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [typeFilter,setTypeFilter]= useState('')

  useEffect(() => {
    if (!domainId) return
    setLoading(true)
    apiFetch(`/api/client/iso/historial?domain_id=${domainId}`)
      .then(d => setHistorial(d.historial ?? []))
      .catch(() => setHistorial([]))
      .finally(() => setLoading(false))
  }, [domainId])

  const filtered = typeFilter ? historial.filter(h => h.event_type === typeFilter) : historial

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
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 32, fontSize: 13 }}>
          No hay eventos registrados para este dominio
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.event_type] ?? EVENT_CONFIG.estado_cambiado
            return (
              <div key={ev.id} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: '#fff',
                borderRadius: i === 0 ? '10px 10px 4px 4px' : i === filtered.length - 1 ? '4px 4px 10px 10px' : 4,
                border: '1px solid #e2e0d8', marginBottom: 2,
              }}>
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
                  <div style={{ fontSize: 11, color: '#888780' }}>{ev.user_name}</div>
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

export default function ClientIsoPage() {
  const [stats,        setStats]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [activeDomain, setActiveDomain] = useState(null)
  const [controls,     setControls]     = useState([])
  const [loadingDom,   setLoadingDom]   = useState(false)
  const [tab,          setTab]          = useState('resumen')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/client/iso/stats')
      setStats(data)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function verDominio(domain) {
    if (activeDomain?.id === domain.id) {
      setActiveDomain(null); setControls([]); return
    }
    setActiveDomain(domain)
    setTab('resumen')
    setLoadingDom(true)
    try {
      const data = await apiFetch(`/api/client/iso/controls/${domain.id}`)
      setControls(data.controls ?? [])
    } catch { setControls([]) }
    finally { setLoadingDom(false) }
  }

  const scoreTotal = Math.round(Number(stats?.score_total) || 0)
  const level      = gapLevel(scoreTotal)

  return (
    <div style={{ padding: 28 }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>ISO 27001:2022</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
          Postura de alineamiento según el Annexo A — evaluación vigente
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888780', fontSize: 13 }}>Cargando…</div>
      ) : !stats?.evaluation_id ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
          <p style={{ color: '#888780', fontSize: 13 }}>
            No hay evaluación ISO 27001 disponible aún. El equipo DSTAC la generará próximamente.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Columna izquierda */}
          <div>
            {/* Score card */}
            <div style={{ background: '#0F6E56', borderRadius: 14, padding: '24px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
                Madurez ISO 27001:2022
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <ScoreRing value={scoreTotal} size={110} sw={9} color={level.color} />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{level.label}</div>
              {stats.evaluated_at && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>
                  Actualizado: {new Date(stats.evaluated_at).toLocaleDateString('es-CL')}
                </div>
              )}
            </div>

            {/* Lista de dominios clickables */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>Por dominio</div>
              {(stats.domains ?? []).map(d => {
                const ds = Math.round(Number(d.score) || 0)
                const dc = d.color ?? scoreColor(ds)
                return (
                  <div key={d.id}
                    onClick={() => verDominio(d)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer', padding: '4px 6px', borderRadius: 8, background: activeDomain?.id === d.id ? 'rgba(15,110,86,0.07)' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (activeDomain?.id !== d.id) e.currentTarget.style.background = '#fafaf8' }}
                    onMouseLeave={e => { if (activeDomain?.id !== d.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dc, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: '#2C2C2A', fontWeight: activeDomain?.id === d.id ? 600 : 400 }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(ds) }}>{ds}%</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round">
                      <polyline points={activeDomain?.id === d.id ? '18 15 12 9 6 15' : '9 18 15 12 9 6'} />
                    </svg>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Columna derecha */}
          <div>
            {!activeDomain ? (
              /* Vista general: domain cards */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(stats.domains ?? []).map(d => {
                  const ds = Math.round(Number(d.score) || 0)
                  const dc = d.color ?? scoreColor(ds)
                  return (
                    <div key={d.id}
                      onClick={() => verDominio(d)}
                      style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: dc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: dc }}>{d.id}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                        <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${ds}%`, height: '100%', background: scoreColor(ds), borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#888780', flexShrink: 0 }}>
                        <span style={{ color: '#27500A' }}>{d.implementados ?? 0} impl.</span>
                        <span style={{ color: '#633806' }}>{d.parciales    ?? 0} parc.</span>
                        <span style={{ color: '#791F1F' }}>{d.pendientes   ?? 0} pend.</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Vista de dominio con tabs */
              <div>
                {/* Header dominio */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => { setActiveDomain(null); setControls([]) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 12, fontWeight: 600, padding: '0 8px 0 0', flexShrink: 0 }}>
                    ← Volver
                  </button>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: (activeDomain.color ?? '#0F6E56') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: activeDomain.color ?? '#0F6E56' }}>{activeDomain.id}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeDomain.name}</div>
                    <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ width: `${Math.round(Number(activeDomain.score) || 0)}%`, height: '100%', background: scoreColor(Math.round(Number(activeDomain.score) || 0)), borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888780', flexShrink: 0 }}>
                    {activeDomain.implementados ?? 0} impl. · {activeDomain.parciales ?? 0} parc. · {activeDomain.pendientes ?? 0} pend.
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid #e2e0d8' }}>
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? '#3C3489' : '#888780', borderBottom: `2px solid ${tab === t.id ? '#3C3489' : 'transparent'}`, marginBottom: -1, transition: 'color 0.12s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Contenido del tab */}
                {loadingDom ? (
                  <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando…</div>
                ) : (
                  <>
                    {tab === 'resumen'    && <ResumenTab    domain={activeDomain} controls={controls} />}
                    {tab === 'controles'  && <ControlesTab  controls={controls} domainColor={activeDomain.color} />}
                    {tab === 'evidencias' && <EvidenciasTab domainId={activeDomain.id} />}
                    {tab === 'plan'       && <PlanAccionTab domainId={activeDomain.id} />}
                    {tab === 'historial'  && <HistorialTab  domainId={activeDomain.id} />}
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
