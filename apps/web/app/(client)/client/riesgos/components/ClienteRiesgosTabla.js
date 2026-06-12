'use client'

const NIVEL_STYLE = {
  critico:   { bg: '#FCEBEB', color: '#791F1F' },
  alto:      { bg: '#FAEEDA', color: '#633806' },
  medio:     { bg: '#FEF3E2', color: '#854F0B' },
  bajo:      { bg: '#EAF3DE', color: '#27500A' },
  aceptable: { bg: '#F1EFE8', color: '#444441' },
}
const ESTADO_STYLE = {
  abierto:        { bg: '#FCEBEB', color: '#791F1F' },
  en_tratamiento: { bg: '#EEEDFE', color: '#3C3489' },
  aceptado:       { bg: '#FAEEDA', color: '#633806' },
  cerrado:        { bg: '#EAF3DE', color: '#27500A' },
}
const NIVEL_LABEL = {
  critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo', aceptable: 'Aceptable',
}
const ESTADO_LABEL = {
  abierto: 'Abierto', en_tratamiento: 'En tratamiento', aceptado: 'Aceptado', cerrado: 'Cerrado',
}
const PROB_LABEL   = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const IMPACTO_LABEL= { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

function Badge({ value, labelMap, styleMap }) {
  if (!value) return <span style={{ fontSize: 11, color: '#B4B2A9' }}>—</span>
  const s = styleMap?.[value]
  return (
    <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {labelMap?.[value] ?? value}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[160, 80, 80, 90, 110].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = ['Tipo / Categoría', 'Nivel de riesgo', 'Estado', 'Probabilidad', 'Impacto']

export default function ClienteRiesgosTabla({ riesgos, loading, selected, onSelect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5 }}>{c}</span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && riesgos.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin riesgos registrados</div>
          <div style={{ fontSize: 13, color: '#888780', maxWidth: 340, margin: '0 auto' }}>
            Tu analista DSTAC registrará los riesgos identificados en tu empresa. Si tienes dudas, contáctanos.
          </div>
        </div>
      )}

      {!loading && riesgos.map(r => {
        const isSelected = r.id === selected?.id
        const esCritico  = r.nivel_riesgo === 'critico' || r.nivel_riesgo === 'alto'
        let rowBg = 'transparent'
        if (isSelected)                              rowBg = 'var(--brand-light, #EEEDFE)'
        else if (esCritico && r.estado !== 'cerrado') rowBg = '#FFF9F0'

        return (
          <div
            key={r.id}
            onClick={() => onSelect(r)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tipo}</div>
              {r.categoria && <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{r.categoria}</div>}
            </div>
            <Badge value={r.nivel_riesgo}  labelMap={NIVEL_LABEL}  styleMap={NIVEL_STYLE}  />
            <Badge value={r.estado}        labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
            <span style={{ fontSize: 12, color: '#888780' }}>{r.probabilidad ? (PROB_LABEL[r.probabilidad] ?? r.probabilidad) : '—'}</span>
            <span style={{ fontSize: 12, color: '#888780' }}>{r.impacto ? (IMPACTO_LABEL[r.impacto] ?? r.impacto) : '—'}</span>
          </div>
        )
      })}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
