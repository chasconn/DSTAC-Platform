'use client'

const NIVEL_STYLE = {
  lectura:       { bg: '#EAF3DE', color: '#27500A' },
  escritura:     { bg: '#EEEDFE', color: '#3C3489' },
  administrador: { bg: '#FAEEDA', color: '#633806' },
  root:          { bg: '#FCEBEB', color: '#791F1F' },
}
const NIVEL_LABEL = { lectura: 'Lectura', escritura: 'Escritura', administrador: 'Administrador', root: 'Root' }

const ESTADO_STYLE = {
  activo:              { bg: '#EAF3DE', color: '#27500A' },
  inactivo:            { bg: '#F1EFE8', color: '#444441' },
  suspendido:          { bg: '#FAEEDA', color: '#633806' },
  expirado:            { bg: '#FCEBEB', color: '#791F1F' },
  pendiente_revision:  { bg: '#EEEDFE', color: '#3C3489' },
}
const ESTADO_LABEL = {
  activo: 'Activo', inactivo: 'Inactivo', suspendido: 'Suspendido',
  expirado: 'Expirado', pendiente_revision: 'Pend. revisión',
}

const CRIT_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F' },
  alta:    { bg: '#FAEEDA', color: '#633806' },
  media:   { bg: '#EAF3DE', color: '#27500A' },
  baja:    { bg: '#F1EFE8', color: '#444441' },
}
const CRIT_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }

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
  const vencida = estado === 'expirado' || dias < 0
  return (
    <span style={{ fontSize: 12, color: vencida ? '#791F1F' : dias <= 30 ? '#633806' : '#2C2C2A', textDecoration: vencida ? 'line-through' : 'none' }}>
      {vencida ? '⛔ ' : dias <= 30 ? '⏰ ' : ''}
      {new Date(fecha).toLocaleDateString('es-CL')}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[160, 140, 90, 80, 80, 90].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = ['Identidad / Propietario', 'Activo', 'Nivel', 'Criticidad', 'Estado', 'Expira']

export default function ClienteAccesosTabla({ accesos, loading, selected, onSelect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5 }}>{c}</span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && accesos.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin accesos registrados</div>
          <div style={{ fontSize: 13, color: '#888780', maxWidth: 340, margin: '0 auto' }}>
            Tu analista DSTAC cargará el inventario de accesos de tu empresa. Si tienes dudas, contáctanos.
          </div>
        </div>
      )}

      {!loading && accesos.map(ac => {
        const isSelected = ac.id === selected?.id
        const esRootActivo = ac.nivel_acceso === 'root' && ac.estado === 'activo'
        const esExpirado   = ac.estado === 'expirado'
        let rowBg = 'transparent'
        if (isSelected)        rowBg = 'var(--brand-light, #EEEDFE)'
        else if (esExpirado)   rowBg = '#FEF5F5'
        else if (esRootActivo) rowBg = '#FFFBF0'

        return (
          <div
            key={ac.id}
            onClick={() => onSelect(ac)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (!isSelected && !esExpirado && !esRootActivo) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ac.identidad_nombre}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ac.propietario_nombre || ac.identidad_valor}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ac.activo_nombre}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{ac.activo_tipo}</div>
            </div>
            <Badge value={ac.nivel_acceso} labelMap={NIVEL_LABEL} styleMap={NIVEL_STYLE} />
            <Badge value={ac.criticidad}   labelMap={CRIT_LABEL}  styleMap={CRIT_STYLE} />
            <Badge value={ac.estado}       labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
            <ExpiraCell fecha={ac.fecha_expiracion} estado={ac.estado} />
          </div>
        )
      })}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
