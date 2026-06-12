'use client'

import { useState, useRef, useCallback } from 'react'
import KpiRow             from './KpiRow'
import WidgetScore        from './WidgetScore'
import WidgetIncidentes   from './WidgetIncidentes'
import WidgetNist         from './WidgetNist'
import WidgetActivosIdent from './WidgetActivosIdent'
import WidgetPersonal     from './WidgetPersonal'
import { api } from '../../../../../lib/api'

// ── Modelo de layout ──────────────────────────────────────────────────────────
// Array< WidgetId | [WidgetId, WidgetId] >
//   'nist'                 → fila completa
//   ['score','incidentes'] → par lado a lado (50/50)

const DEFAULT_LAYOUT = [
  ['score', 'incidentes'],
  'nist',
  ['activos-ident', 'personal'],
]

const WIDGET_META = {
  score:           { title: 'Security Score',        icon: 'ti-shield-check',   minH: 248 },
  incidentes:      { title: 'Incidentes recientes',  icon: 'ti-alert-triangle', minH: 280 },
  nist:            { title: 'Madurez NIST CSF',      icon: 'ti-chart-radar',    minH: 300 },
  'activos-ident': { title: 'Activos · Identidades', icon: 'ti-server',         minH: 260 },
  personal:        { title: 'Personal',              icon: 'ti-users',          minH: 260 },
}

const WIDGETS = {
  score:           (s) => <WidgetScore        stats={s} />,
  incidentes:      (s) => <WidgetIncidentes   stats={s} />,
  nist:            (s) => <WidgetNist         stats={s} />,
  'activos-ident': (s) => <WidgetActivosIdent stats={s} />,
  personal:        (s) => <WidgetPersonal     stats={s} />,
}

// Widgets permitidos por plan
const PLAN_ALLOWED = {
  pyme:        new Set(['score', 'personal', 'nist', 'activos-ident']),
  profesional: new Set(['score', 'incidentes', 'personal', 'nist', 'activos-ident']),
  enterprise:  new Set(['score', 'incidentes', 'personal', 'nist', 'activos-ident']),
}

function filterByPlan(rows, allowed) {
  return rows.flatMap(row => {
    if (Array.isArray(row)) {
      const f = row.filter(id => allowed.has(id))
      if (!f.length) return []
      return [f.length === 1 ? f[0] : f]
    }
    return allowed.has(row) ? [row] : []
  })
}

// ── Normalizar cualquier formato guardado ─────────────────────────────────────
function normalize(raw) {
  // Nuevo: { rows: [...] }
  if (Array.isArray(raw?.rows)) return raw.rows
  // Directo: [ ... ]
  if (Array.isArray(raw) && raw.length > 0) {
    if (typeof raw[0] === 'string' || Array.isArray(raw[0])) return raw
  }
  // Legacy: { col_left, col_right } → convertir a filas
  if (raw?.col_left || raw?.col_right) {
    const L = raw.col_left  ?? []
    const R = raw.col_right ?? []
    const rows = []
    for (let i = 0; i < Math.max(L.length, R.length); i++) {
      if (L[i] && R[i]) rows.push([L[i], R[i]])
      else if (L[i])    rows.push(L[i])
      else if (R[i])    rows.push(R[i])
    }
    return rows.length ? rows : DEFAULT_LAYOUT
  }
  return DEFAULT_LAYOUT
}

// ── Mutaciones puras del layout ───────────────────────────────────────────────

function removeWidget(rows, id) {
  return rows.map(row => {
    if (!Array.isArray(row)) return row === id ? null : row
    const next = row.filter(w => w !== id)
    if (next.length === 0) return null
    return next.length === 1 ? next[0] : next
  }).filter(Boolean)
}

// dropTarget:
//   { type:'zone',   idx }
//   { type:'widget', widgetId, half: 'top'|'bottom'|'left'|'right' }
function applyDrop(rows, srcId, dropTarget) {
  let next = removeWidget(rows, srcId)

  if (dropTarget.type === 'zone') {
    const idx = Math.min(dropTarget.idx, next.length)
    next.splice(idx, 0, srcId)
    return next
  }

  if (dropTarget.type === 'widget') {
    const { widgetId, half } = dropTarget
    const rowIdx = next.findIndex(r =>
      Array.isArray(r) ? r.includes(widgetId) : r === widgetId
    )
    if (rowIdx === -1) return [...next, srcId]

    const row    = next[rowIdx]
    const inPair = Array.isArray(row)

    if (half === 'top') {
      next.splice(rowIdx, 0, srcId)
    } else if (half === 'bottom') {
      next.splice(rowIdx + 1, 0, srcId)
    } else if (inPair) {
      // Sobre un par: izquierda = insertar antes de la fila, derecha = después
      if (half === 'left') next.splice(rowIdx, 0, srcId)
      else                 next.splice(rowIdx + 1, 0, srcId)
    } else {
      // Sobre widget de ancho completo: crear par
      next[rowIdx] = half === 'left' ? [srcId, widgetId] : [widgetId, srcId]
    }
    return next
  }

  return next
}

// ── Detectar zona del cursor dentro del widget ────────────────────────────────
// inPair: solo top/bottom (no crear triple-par)
// solo: 4 zonas — top/bottom insertan fila, left/right crean par
function getDropHalf(e, inPair) {
  const r    = e.currentTarget.getBoundingClientRect()
  const relY = (e.clientY - r.top)  / r.height
  const relX = (e.clientX - r.left) / r.width

  if (inPair) return relY < 0.5 ? 'top' : 'bottom'
  if (relY < 0.22) return 'top'
  if (relY > 0.78) return 'bottom'
  return relX < 0.5 ? 'left' : 'right'
}

// ── Estilos de indicador visual según half ────────────────────────────────────
function dropIndicatorStyle(half) {
  const c = '#534AB7'
  if (half === 'top')    return { boxShadow: `inset 0  3px 0 ${c}` }
  if (half === 'bottom') return { boxShadow: `inset 0 -3px 0 ${c}` }
  if (half === 'left')   return { boxShadow: `inset  3px 0 0 ${c}` }
  if (half === 'right')  return { boxShadow: `inset -3px 0 0 ${c}` }
  return {}
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DashboardLayout({ stats, initialLayout }) {
  const [layout,    setLayout]    = useState(() => normalize(initialLayout))
  const [dragState, setDragState] = useState(null)
  // dragState: null | { srcId: string, target: DropTarget | null }

  const saveTimer = useRef(null)

  const persist = useCallback((rows) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.post('/api/client/dashboard/layout', { layout: { rows } }).catch(() => {})
    }, 800)
  }, [])

  // Filtrar layout según plan e inyectar widgets que aún no están posicionados
  const plan = stats?.empresa?.plan ?? 'pyme'
  const allowed = PLAN_ALLOWED[plan] ?? PLAN_ALLOWED.pyme
  const rawVisible  = filterByPlan(layout, allowed)
  const presentIds  = new Set(rawVisible.flatMap(r => Array.isArray(r) ? r : [r]))
  const missing     = [...allowed].filter(id => !presentIds.has(id) && WIDGET_META[id])
  const visibleLayout = missing.length === 0 ? rawVisible : [...rawVisible, ...missing]

  function handleDrop(srcId, target) {
    const next = applyDrop(visibleLayout, srcId, target)
    setLayout(next)
    persist(next)
    setDragState(null)
  }

  // ── Render de una zona de inserción entre filas ───────────────────────────
  function renderZone(idx) {
    const active = dragState?.srcId && dragState?.target?.type === 'zone'
                   && dragState.target.idx === idx
    return (
      <div
        key={`z${idx}`}
        onDragOver={e => {
          e.preventDefault()
          e.stopPropagation()
          if (!dragState?.srcId) return
          setDragState(prev =>
            prev?.target?.type === 'zone' && prev.target.idx === idx
              ? prev
              : { ...prev, target: { type: 'zone', idx } }
          )
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget))
            setDragState(prev => prev?.srcId ? { ...prev, target: null } : null)
        }}
        onDrop={e => {
          e.preventDefault()
          e.stopPropagation()
          const srcId = e.dataTransfer.getData('text/plain')
          if (srcId) handleDrop(srcId, { type: 'zone', idx })
        }}
        style={{
          height:       active ? 48 : 8,
          borderRadius: 6,
          background:   active ? 'rgba(83,74,183,0.08)' : 'transparent',
          border:       `1.5px dashed ${active ? 'rgba(83,74,183,0.4)' : 'transparent'}`,
          display:      'flex', alignItems: 'center', justifyContent: 'center',
          transition:   'height 0.15s, background 0.15s',
          flexShrink:   0,
        }}
      >
        {active && (
          <span style={{
            fontSize: 11, color: '#534AB7',
            pointerEvents: 'none', userSelect: 'none',
          }}>
            Colocar aquí
          </span>
        )}
      </div>
    )
  }

  // ── Render de una tarjeta individual ─────────────────────────────────────
  function renderCard(id, inPair) {
    const meta       = WIDGET_META[id] ?? { title: id, icon: 'ti-widget', minH: 200 }
    const isDragging = dragState?.srcId === id
    const tgt        = dragState?.target
    const isTarget   = !isDragging && tgt?.type === 'widget' && tgt.widgetId === id
    const indStyle   = isTarget ? dropIndicatorStyle(tgt.half) : {}

    return (
      <div
        key={id}
        draggable
        onDragStart={e => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', id)
          setDragState({ srcId: id, target: null })
          // Capturar el nodo ANTES del setTimeout — React anula e.currentTarget después del handler
          const el = e.currentTarget
          setTimeout(() => { if (el) el.style.opacity = '0.35' }, 0)
        }}
        onDragEnd={e => {
          e.currentTarget.style.opacity = ''
          setDragState(null)
        }}
        onDragOver={e => {
          e.preventDefault()
          e.stopPropagation()
          if (!dragState?.srcId || dragState.srcId === id) return
          const half = getDropHalf(e, inPair)
          setDragState(prev =>
            prev?.target?.type === 'widget'
            && prev.target.widgetId === id
            && prev.target.half === half
              ? prev
              : { ...prev, target: { type: 'widget', widgetId: id, half } }
          )
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget))
            setDragState(prev => prev?.srcId ? { ...prev, target: null } : null)
        }}
        onDrop={e => {
          e.preventDefault()
          e.stopPropagation()
          const srcId = e.dataTransfer.getData('text/plain')
          if (!srcId || srcId === id) { setDragState(null); return }
          handleDrop(srcId, { type: 'widget', widgetId: id, half: getDropHalf(e, inPair) })
        }}
        className="widget"
        style={{
          flex:             inPair ? '1 1 0' : undefined,
          minWidth:         inPair ? 0 : undefined,
          minHeight:        meta.minH,
          opacity:          isDragging ? 0.35 : 1,
          transition:       'opacity 0.15s, box-shadow 0.1s',
          overflow:         'hidden',
          display:          'grid',
          gridTemplateRows: '30px 1fr',
          ...indStyle,
        }}
      >
        {/* Header */}
        <div className="widget-header" style={{ cursor: 'grab', userSelect: 'none' }}>
          <span className="widget-header-title">
            <i className={`ti ${meta.icon}`} />
            {meta.title}
          </span>
          <i className="ti ti-grip-horizontal widget-grip" />
        </div>

        {/* Contenido */}
        {WIDGETS[id]
          ? WIDGETS[id](stats)
          : <div style={{ padding: 14, color: '#534AB7', fontSize: 12 }}>Widget {id}</div>
        }
      </div>
    )
  }

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <div className="dashboard-bg" style={{ minHeight: '100%' }}>

      {/* Topbar */}
      <div className="client-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
          <i className="ti ti-shield-half" style={{ fontSize: 16, color: '#6155BD' }} />
          <span style={{ fontSize: 13, color: '#6155BD' }}>Panel</span>
          <span style={{ fontSize: 13, color: '#534AB7' }}>/</span>
          <span style={{ fontSize: 13, color: '#1a1740', fontWeight: 500 }}>
            Dashboard de seguridad
          </span>
          {stats && (
            <span style={{ fontSize: 12, color: '#534AB7', marginLeft: 4 }}>
              · Actualizado ahora
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 12, padding: '3px 9px', borderRadius: 6,
            background: 'rgba(83,74,183,0.08)', color: '#4A43A8',
            border: '0.5px solid rgba(83,74,183,0.2)',
          }}>
            Mi empresa
          </span>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6155BD', padding: 2, display: 'flex', alignItems: 'center',
          }}>
            <i className="ti ti-bell" style={{ fontSize: 15 }} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ padding: '16px 20px 12px' }}>
        <KpiRow stats={stats} />
      </div>

      {/* Widgets */}
      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column' }}>
        {renderZone(0)}
        {visibleLayout.map((row, rowIdx) => (
          <div key={rowIdx}>
            {Array.isArray(row) ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                {renderCard(row[0], true)}
                {renderCard(row[1], true)}
              </div>
            ) : (
              renderCard(row, false)
            )}
            {renderZone(rowIdx + 1)}
          </div>
        ))}
      </div>

    </div>
  )
}
