'use client'

import NistScoreRing from '../NistScoreRing'

function scoreColor(pct) {
  if (pct >= 61) return '#1D9E75'
  if (pct >= 41) return '#EF9F27'
  return '#E24B4A'
}

function StatusBadge({ status }) {
  const map = {
    implementado: { bg: '#EAF3DE', color: '#27500A', label: 'Implementado' },
    parcial:      { bg: '#FAEEDA', color: '#633806', label: 'Parcial'      },
    pendiente:    { bg: '#FCEBEB', color: '#791F1F', label: 'Pendiente'    },
    no_aplica:    { bg: '#F1EFE8', color: '#444441', label: 'No aplica'    },
  }
  const s = map[status] ?? map.pendiente
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
      {s.label}
    </span>
  )
}

export default function ResumenTab({ fn, categories, controls, evaluationId }) {
  if (!fn) return null

  const catMap = {}
  for (const cat of (categories || [])) {
    catMap[cat.id] = { ...cat, controls: [] }
  }
  for (const ctrl of (controls || [])) {
    if (catMap[ctrl.category_id]) {
      catMap[ctrl.category_id].controls.push(ctrl)
    }
  }

  return (
    <div>
      {/* Score de función */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
        <NistScoreRing value={Math.round(Number(fn.score) || 0)} size={88} strokeWidth={8} />
        <div>
          <div style={{ fontSize: 13, color: '#888780', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Madurez de la función</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: scoreColor(Math.round(Number(fn.score) || 0)), lineHeight: 1 }}>
            {Math.round(Number(fn.score) || 0)}%
          </div>
          <div style={{ fontSize: 15, color: '#2C2C2A', marginTop: 4, fontWeight: 600 }}>{fn.name}</div>
          <div style={{ fontSize: 14, color: '#888780', marginTop: 2 }}>{fn.description}</div>
        </div>
      </div>

      {/* Por categoría */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.values(catMap).map(cat => {
          const catControls = cat.controls
          const applicable  = catControls.filter(c => c.status !== 'no_aplica')
          const catScore    = applicable.length
            ? Math.round(applicable.reduce((s, c) => s + (Number(c.progress) || 0), 0) / applicable.length)
            : 0

          const impl = catControls.filter(c => c.status === 'implementado').length
          const parc = catControls.filter(c => c.status === 'parcial').length
          const pend = catControls.filter(c => c.status === 'pendiente').length

          return (
            <div key={cat.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: fn.color, marginBottom: 2 }}>{cat.id}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2A' }}>{cat.name}</div>
                  <div style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>{catControls.length} controles</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: scoreColor(catScore) }}>{catScore}%</div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div style={{ height: 6, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${catScore}%`, height: '100%', background: scoreColor(catScore), borderRadius: 99 }} />
              </div>

              {/* Mini stats */}
              <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
                {impl > 0 && <span style={{ color: '#27500A' }}>✓ {impl} implementados</span>}
                {parc > 0 && <span style={{ color: '#633806' }}>◑ {parc} parciales</span>}
                {pend > 0 && <span style={{ color: '#791F1F' }}>○ {pend} pendientes</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
