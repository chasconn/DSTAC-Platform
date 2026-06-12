'use client'

const SEV_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F' },
  alta:    { bg: '#FAEEDA', color: '#633806' },
  media:   { bg: '#EAF3DE', color: '#27500A' },
  baja:    { bg: '#F1EFE8', color: '#444441' },
}
const ESTADO_STYLE = {
  abierto:          { bg: '#FCEBEB', color: '#791F1F' },
  en_investigacion: { bg: '#FAEEDA', color: '#633806' },
  en_respuesta:     { bg: '#EEEDFE', color: '#3C3489' },
  cerrado:          { bg: '#EAF3DE', color: '#27500A' },
  falso_positivo:   { bg: '#F1EFE8', color: '#888780' },
}
const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }
const ESTADO_LABEL = {
  abierto: 'Abierto', en_investigacion: 'En investigación',
  en_respuesta: 'En respuesta', cerrado: 'Cerrado', falso_positivo: 'Falso positivo',
}

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
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[160, 80, 90, 80, 110].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = ['Tipo / Categoría', 'Severidad', 'Estado', 'Impacto', 'Detección']

export default function ClienteIncidentesTabla({ incidentes, loading, selected, onSelect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5 }}>{c}</span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && incidentes.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin incidentes registrados</div>
          <div style={{ fontSize: 13, color: '#888780', maxWidth: 340, margin: '0 auto' }}>
            Tu analista DSTAC registrará los incidentes de seguridad de tu empresa. Si tienes dudas, contáctanos.
          </div>
        </div>
      )}

      {!loading && incidentes.map(inc => {
        const isSelected  = inc.id === selected?.id
        const esCritico   = inc.severidad === 'critica'
        let rowBg = 'transparent'
        if (isSelected)  rowBg = 'var(--brand-light, #EEEDFE)'
        else if (esCritico && inc.estado !== 'cerrado') rowBg = '#FFF5F5'

        return (
          <div
            key={inc.id}
            onClick={() => onSelect(inc)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.tipo}</div>
              {inc.categoria && <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{inc.categoria}</div>}
            </div>
            <Badge value={inc.severidad} labelMap={SEV_LABEL} styleMap={SEV_STYLE} />
            <Badge value={inc.estado}    labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
            <span style={{ fontSize: 12, color: '#888780' }}>{inc.impacto ?? '—'}</span>
            <span style={{ fontSize: 12, color: '#888780' }}>
              {inc.fecha_deteccion ? new Date(inc.fecha_deteccion).toLocaleDateString('es-CL') : '—'}
            </span>
          </div>
        )
      })}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
