'use client'

import { useState, useMemo } from 'react'
import ControlPanel from '../panels/ControlPanel'

const STATUS_MAP = {
  pendiente:    { dot: '#E24B4A', bg: '#FCEBEB', color: '#791F1F', label: 'Pendiente'    },
  parcial:      { dot: '#EF9F27', bg: '#FAEEDA', color: '#633806', label: 'Parcial'      },
  implementado: { dot: '#1D9E75', bg: '#EAF3DE', color: '#27500A', label: 'Implementado' },
  no_aplica:    { dot: '#B4B2A9', bg: '#F1EFE8', color: '#444441', label: 'No aplica'    },
}

const SOURCE_LABELS = {
  activos: 'Activos', personal: 'Personal', identidades: 'Identidades',
  accesos: 'Accesos', incidentes: 'Incidentes', documentos: 'Documentos',
}

export default function ControlesTab({ controls, categories, fn, slug, evaluationId, onRefresh }) {
  const [q,           setQ]           = useState('')
  const [catFilter,   setCatFilter]   = useState('')
  const [statusFilter,setStatusFilter]= useState('')
  const [sourceFilter,setSourceFilter]= useState('')
  const [selected,    setSelected]    = useState(null)

  const filtered = useMemo(() => {
    return (controls || []).filter(c => {
      if (catFilter    && c.category_id !== catFilter)                              return false
      if (statusFilter && c.status !== statusFilter)                                return false
      if (sourceFilter && !(c.data_source || '').includes(sourceFilter))            return false
      if (q) {
        const lq = q.toLowerCase()
        if (!c.id.toLowerCase().includes(lq) && !c.name.toLowerCase().includes(lq)) return false
      }
      return true
    })
  }, [controls, q, catFilter, statusFilter, sourceFilter])

  const allStatuses = ['pendiente','parcial','implementado','no_aplica']
  const allSources  = [...new Set((controls || []).flatMap(c =>
    (c.data_source || '').split(',').map(s => s.trim()).filter(Boolean)
  ))]

  return (
    <div>
      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar control…"
          style={{ flex: 1, minWidth: 160, padding: '8px 12px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, outline: 'none' }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
          <option value="">Todas las categorías</option>
          {(categories || []).map(cat => (
            <option key={cat.id} value={cat.id}>{cat.id} — {cat.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
          <option value="">Todos los estados</option>
          {allStatuses.map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
        </select>
        {allSources.length > 1 && (
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, color: '#2C2C2A', background: '#fff' }}>
            <option value="">Todos los orígenes</option>
            {allSources.map(s => <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>)}
          </select>
        )}
        {(q || catFilter || statusFilter || sourceFilter) && (
          <button onClick={() => { setQ(''); setCatFilter(''); setStatusFilter(''); setSourceFilter('') }}
            style={{ padding: '8px 14px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 14, background: '#fff', cursor: 'pointer', color: '#888780' }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Contador */}
      <div style={{ fontSize: 14, color: '#888780', marginBottom: 12 }}>
        {filtered.length} control{filtered.length !== 1 ? 'es' : ''}
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 130px 120px 130px 110px 20px', gap: 14, padding: '12px 20px', borderBottom: '1px solid #f1efe8', background: '#f8f7f4' }}>
          {['ID', 'Control', 'Estado', 'Progreso', 'Cantidad', 'Origen', ''].map(h => (
            <div key={h} style={{ fontSize: 12, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#888780', fontSize: 15 }}>
            No hay controles con los filtros seleccionados
          </div>
        )}

        {filtered.map((ctrl, i) => {
          const st      = STATUS_MAP[ctrl.status ?? 'pendiente'] ?? STATUS_MAP.pendiente
          const pct     = Number(ctrl.progress) || 0
          const sources = (ctrl.data_source || '').split(',').map(s => s.trim()).filter(Boolean)

          return (
            <div
              key={ctrl.id}
              onClick={() => setSelected(ctrl)}
              style={{
                display: 'grid', gridTemplateColumns: '100px 1fr 130px 120px 130px 110px 20px',
                gap: 14, padding: '14px 20px', alignItems: 'center', cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? '1px solid #f8f7f4' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* ID */}
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#534AB7', fontWeight: 700 }}>{ctrl.id}</span>

              {/* Nombre */}
              <span style={{ fontSize: 14, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ctrl.name}
              </span>

              {/* Estado */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>{st.label}</span>
              </span>

              {/* Progreso */}
              <div>
                <div style={{ height: 6, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 61 ? '#1D9E75' : pct >= 41 ? '#EF9F27' : '#E24B4A', borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, color: '#888780' }}>{pct}%</span>
              </div>

              {/* Cantidad */}
              <span style={{ fontSize: 13, color: '#2C2C2A', whiteSpace: 'nowrap' }}>
                {ctrl.current_value > 0 || ctrl.max_value > 0
                  ? <>{ctrl.current_value ?? 0}<span style={{ color: '#B4B2A9' }}>/{ctrl.max_value ?? 0}</span> <span style={{ fontSize: 12, color: '#888780' }}>{sources[0] ? (SOURCE_LABELS[sources[0]] ?? sources[0]).toLowerCase() : ''}</span></>
                  : <span style={{ color: '#B4B2A9' }}>—</span>
                }
              </span>

              {/* Origen */}
              <span style={{ fontSize: 12, color: '#534AB7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sources.map(s => SOURCE_LABELS[s] ?? s).join(', ')}
              </span>

              {/* Flecha */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          )
        })}
      </div>

      {/* Panel lateral */}
      {selected && (
        <ControlPanel
          control={selected}
          slug={slug}
          evaluationId={evaluationId}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); onRefresh?.() }}
        />
      )}
    </div>
  )
}
