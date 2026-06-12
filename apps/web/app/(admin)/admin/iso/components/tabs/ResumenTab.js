'use client'

function scoreColor(pct) {
  if (pct >= 76) return '#1D9E75'
  if (pct >= 51) return '#EF9F27'
  if (pct >= 26) return '#EF9F27'
  return '#E24B4A'
}

function scoreLabel(pct) {
  if (pct >= 76) return 'Alto'
  if (pct >= 51) return 'Medio'
  if (pct >= 26) return 'Bajo'
  return 'Crítico'
}

export default function ResumenTab({ domain, controls, evaluationId }) {
  if (!domain) return <div style={{ color: '#888780', fontSize: 13 }}>Sin datos del dominio.</div>

  const score       = Math.round(Number(domain.score) || 0)
  const color       = domain.color ?? scoreColor(score)
  const total       = controls.length
  const impl        = controls.filter(c => c.status === 'implementado').length
  const parcial     = controls.filter(c => c.status === 'parcial').length
  const pend        = controls.filter(c => c.status === 'pendiente').length
  const noAplica    = controls.filter(c => c.applies === 0 || c.status === 'no_aplica').length
  const conNota     = controls.filter(c => c.notes_dstac && c.notes_dstac.trim()).length
  const conEvidencia= controls.filter(c => c.evidencias_count > 0).length

  return (
    <div>
      {/* Fila de stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Implementados', value: impl,     color: '#27500A', bg: '#EAF3DE' },
          { label: 'Parciales',     value: parcial,  color: '#633806', bg: '#FAEEDA' },
          { label: 'Pendientes',    value: pend,     color: '#791F1F', bg: '#FCEBEB' },
          { label: 'No aplica',     value: noAplica, color: '#444441', bg: '#F1EFE8' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.color, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score + progreso */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>Progreso del dominio</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(score) }}>{score}%</span>
        </div>
        <div style={{ height: 10, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${color}CC, ${color})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <span style={{ background: scoreColor(score) + '22', color: scoreColor(score), fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{scoreLabel(score)}</span>
        </div>
      </div>

      {/* Top controles con más progreso */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 16 }}>Controles por estado</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {controls.slice(0, 10).map(c => {
            const cp    = Math.round(Number(c.progress) || 0)
            const cc    = scoreColor(cp)
            const isNA  = c.applies === 0 || c.status === 'no_aplica'
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: color, minWidth: 36, flexShrink: 0 }}>{c.id}</span>
                <div style={{ flex: 1, height: 6, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: isNA ? '100%' : `${cp}%`, height: '100%', background: isNA ? '#e2e0d8' : cc, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 11, color: isNA ? '#B4B2A9' : cc, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                  {isNA ? 'N/A' : `${cp}%`}
                </span>
              </div>
            )
          })}
          {controls.length > 10 && (
            <div style={{ fontSize: 12, color: '#B4B2A9', textAlign: 'center', marginTop: 4 }}>
              y {controls.length - 10} más — ve a la pestaña Controles
            </div>
          )}
        </div>
      </div>

      {/* Datos adicionales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#888780', marginBottom: 4 }}>Controles con notas DSTAC</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2C2C2A' }}>{conNota}</div>
          <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>de {total} totales</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#888780', marginBottom: 4 }}>ID de evaluación</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2C2C2A' }}>#{evaluationId ?? '—'}</div>
          <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>{total} controles en el dominio</div>
        </div>
      </div>
    </div>
  )
}
