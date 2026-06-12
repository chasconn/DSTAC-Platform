'use client'

const ESTADO_STYLE = {
  activa:       { bg: '#EAF3DE', color: '#27500A' },
  inactiva:     { bg: '#F1EFE8', color: '#444441' },
  comprometida: { bg: '#FCEBEB', color: '#791F1F' },
  expirada:     { bg: '#FAEEDA', color: '#633806' },
}
const ESTADO_LABEL = { activa: 'Activa', inactiva: 'Inactiva', comprometida: 'Comprometida', expirada: 'Expirada' }
const TIPO_LABEL = {
  usuario:         'Usuario',
  cuenta_servicio: 'Cuenta servicio',
  api_key:         'API Key',
  certificado:     'Certificado',
  otro:            'Otro',
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

function ExpiraCell({ fecha, estado }) {
  if (!fecha) return <span style={{ fontSize: 12, color: '#B4B2A9' }}>—</span>
  const dias = Math.ceil((new Date(fecha) - new Date()) / 86400000)
  const vencida = estado === 'expirada' || dias < 0
  return (
    <span style={{ fontSize: 12, color: vencida ? '#791F1F' : dias <= 30 ? '#633806' : '#2C2C2A', textDecoration: vencida ? 'line-through' : 'none' }}>
      {vencida ? '⛔ ' : dias <= 30 ? '⏰ ' : ''}
      {new Date(fecha).toLocaleDateString('es-CL')}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[180, 100, 80, 120, 90].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = ['Nombre / Identidad', 'Tipo', 'Estado', 'Propietario', 'Expira']

export default function ClienteIdentidadesTabla({ identidades, loading, selected, onSelect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5 }}>{c}</span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && identidades.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🪪</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin identidades registradas</div>
          <div style={{ fontSize: 13, color: '#888780', maxWidth: 340, margin: '0 auto' }}>
            Tu analista DSTAC cargará el inventario de identidades de tu empresa. Si tienes dudas, contáctanos.
          </div>
        </div>
      )}

      {!loading && identidades.map(id => {
        const isSelected = id.id === selected?.id
        const esComprometida = id.estado === 'comprometida'
        let rowBg = 'transparent'
        if (isSelected)          rowBg = 'var(--brand-light, #EEEDFE)'
        else if (esComprometida) rowBg = '#FEF5F5'

        return (
          <div
            key={id.id}
            onClick={() => onSelect(id)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (!isSelected && !esComprometida) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id.nombre}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id.identidad}</div>
            </div>
            <Badge value={id.tipo_identidad} labelMap={TIPO_LABEL} />
            <Badge value={id.estado} labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
            <span style={{ fontSize: 12, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id.propietario_nombre || '—'}</span>
            <ExpiraCell fecha={id.fecha_expiracion} estado={id.estado} />
          </div>
        )
      })}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
