'use client'

import { useState } from 'react'
import ControlPanel from '../panels/ControlPanel'

const STATUS_OPTS = [
  { value: '',            label: 'Todos los estados' },
  { value: 'implementado',label: 'Implementado' },
  { value: 'parcial',     label: 'Parcial' },
  { value: 'pendiente',   label: 'Pendiente' },
  { value: 'no_aplica',   label: 'No aplica' },
]

function statusBadge(status, applies) {
  if (applies === 0 || status === 'no_aplica') return { label: 'No aplica', color: '#444441', bg: '#F1EFE8' }
  if (status === 'implementado') return { label: 'Implementado', color: '#27500A', bg: '#EAF3DE' }
  if (status === 'parcial')      return { label: 'Parcial',      color: '#633806', bg: '#FAEEDA' }
  return { label: 'Pendiente', color: '#791F1F', bg: '#FCEBEB' }
}

function scoreColor(pct) {
  if (pct >= 76) return '#1D9E75'
  if (pct >= 51) return '#EF9F27'
  if (pct >= 26) return '#EF9F27'
  return '#E24B4A'
}

export default function ControlesTab({ controls, domain, slug, evaluationId, onRefresh }) {
  const [selectedId, setSelectedId] = useState(null)
  const [filter,     setFilter]     = useState('')
  const [q,          setQ]          = useState('')

  const domColor = domain?.color ?? '#3C3489'

  const filtered = controls.filter(c => {
    if (filter && c.status !== filter && !(filter === 'no_aplica' && c.applies === 0)) return false
    if (q && !c.id.toLowerCase().includes(q.toLowerCase()) && !c.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const selected = selectedId ? controls.find(c => c.id === selectedId) : null

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Lista */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar control…"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, background: '#fff' }}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, background: '#fff', cursor: 'pointer' }}>
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ fontSize: 12, color: '#888780', marginBottom: 10 }}>
          {filtered.length} control{filtered.length !== 1 ? 'es' : ''}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(c => {
            const progress = Math.round(Number(c.progress) || 0)
            const badge    = statusBadge(c.status, c.applies)
            const isActive = selectedId === c.id

            return (
              <div key={c.id}
                onClick={() => setSelectedId(isActive ? null : c.id)}
                style={{
                  background: isActive ? '#EEEDFE' : '#fff',
                  borderRadius: 10, border: `1px solid ${isActive ? '#c8c4f0' : '#e2e0d8'}`,
                  padding: '12px 16px', cursor: 'pointer', transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = '#c8c4f0'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(60,52,137,0.08)' }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#e2e0d8'; e.currentTarget.style.boxShadow = 'none' }}}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: domColor, minWidth: 44, flexShrink: 0 }}>{c.id}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ height: 4, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: scoreColor(progress), borderRadius: 99 }} />
                  </div>
                </div>
                <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                  {badge.label}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <polyline points={isActive ? '6 9 12 15 18 9' : '9 18 15 12 9 6'} />
                </svg>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 32 }}>
              Sin controles para los filtros seleccionados.
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      {selected && (
        <div style={{ width: 420, flexShrink: 0 }}>
          <ControlPanel
            control={selected}
            slug={slug}
            evaluationId={evaluationId}
            onClose={() => setSelectedId(null)}
            onSaved={() => { setSelectedId(null); onRefresh() }}
          />
        </div>
      )}
    </div>
  )
}
