'use client'

const ESTADO_STYLE = {
  activo:       { bg: '#EAF3DE', color: '#27500A' },
  vacaciones:   { bg: '#FAEEDA', color: '#633806' },
  inactivo:     { bg: '#F1EFE8', color: '#444441' },
  desvinculado: { bg: '#FCEBEB', color: '#791F1F' },
}
const ESTADO_LABEL = {
  activo: 'Activo', vacaciones: 'Vacaciones', inactivo: 'Inactivo', desvinculado: 'Desvinculado',
}

const NIVEL_STYLE = {
  alto:  { bg: '#EEEDFE', color: '#3C3489' },
  medio: { bg: '#E6F1FB', color: '#0C447C' },
  bajo:  { bg: '#F1EFE8', color: '#444441' },
}
const NIVEL_LABEL = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

function getInitials(nombre) {
  return (nombre || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function Avatar({ nombre, estado }) {
  const s = ESTADO_STYLE[estado] ?? { bg: '#F1EFE8', color: '#444441' }
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {getInitials(nombre)}
    </div>
  )
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
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[180, 140, 80, 80, 160, 90].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = ['Nombre', 'Rol', 'Nivel', 'Estado', 'Correo', 'Teléfono']

export default function ClientePersonalTabla({ personal, loading, selected, onSelect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr', gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5 }}>{c}</span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && personal.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin personal registrado</div>
          <div style={{ fontSize: 13, color: '#888780', maxWidth: 340, margin: '0 auto' }}>
            Tu analista DSTAC cargará el directorio de personal de tu empresa. Si tienes dudas, contáctanos.
          </div>
        </div>
      )}

      {!loading && personal.map(p => {
        const isSelected      = p.id === selected?.id
        const esDesvinculado  = p.estado === 'desvinculado'
        let rowBg = 'transparent'
        if (isSelected)        rowBg = 'var(--brand-light, #EEEDFE)'
        else if (esDesvinculado) rowBg = '#FEF5F5'

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (!isSelected && !esDesvinculado) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <Avatar nombre={p.nombre} estado={p.estado} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
            </div>
            <span style={{ fontSize: 12, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.rol_empresarial || '—'}</span>
            <Badge value={p.nivel_responsabilidad} labelMap={NIVEL_LABEL} styleMap={NIVEL_STYLE} />
            <Badge value={p.estado} labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
            <span style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.correo || '—'}</span>
            <span style={{ fontSize: 12, color: '#888780' }}>{p.telefono || '—'}</span>
          </div>
        )
      })}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
