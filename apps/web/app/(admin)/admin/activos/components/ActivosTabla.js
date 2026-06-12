'use client'

// Badges: criticidad
const CRIT = {
  critica: { bg: '#FCEBEB', color: '#791F1F', label: 'Crítica' },
  alta:    { bg: '#FAEEDA', color: '#633806', label: 'Alta' },
  media:   { bg: '#EAF3DE', color: '#27500A', label: 'Media' },
  baja:    { bg: '#F1EFE8', color: '#444441', label: 'Baja' },
}

// Badges: estado
const ESTADO = {
  operativo:         { bg: '#EAF3DE', color: '#27500A', label: 'Operativo' },
  degradado:         { bg: '#FAEEDA', color: '#633806', label: 'Degradado' },
  fuera_de_servicio: { bg: '#FCEBEB', color: '#791F1F', label: 'Fuera de servicio' },
  en_mantencion:     { bg: '#EEEDFE', color: '#3C3489', label: 'En mantención' },
}

// Badges: ambiente
const AMBIENTE = {
  produccion:  { bg: '#EEEDFE', color: '#3C3489', label: 'Producción' },
  desarrollo:  { bg: '#EAF3DE', color: '#27500A', label: 'Desarrollo' },
  testing:     { bg: '#F1EFE8', color: '#444441', label: 'Testing' },
  staging:     { bg: '#FAEEDA', color: '#633806', label: 'Staging' },
}

function Badge({ map, value }) {
  if (!value) return <span style={{ color: '#B4B2A9', fontSize: 12 }}>—</span>
  const cfg = map[value] ?? { bg: '#F1EFE8', color: '#444441', label: value }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

const COL = '2fr 1fr 1fr 1fr 1fr 1fr 88px'

const TH_STYLE = {
  padding: '10px 14px', fontSize: 11, fontWeight: 600,
  color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em',
  textAlign: 'left', userSelect: 'none',
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COL,
      alignItems: 'center', padding: '12px 14px',
      borderBottom: '1px solid #f1efe8',
    }}>
      {[160, 70, 80, 80, 100, 90, 60].map((w, i) => (
        <div key={i}>
          <div style={{
            height: 12, width: w, borderRadius: 6,
            background: '#f1efe8',
            animation: 'pulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.07}s`,
          }} />
        </div>
      ))}
    </div>
  )
}

export default function ActivosTabla({ activos, loading, selected, onSelect, onEdit, onDelete }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e0d8',
      borderRadius: 10, overflow: 'hidden',
    }}>

      {/* Cabecera */}
      <div style={{
        display: 'grid', gridTemplateColumns: COL,
        background: '#fafaf8', borderBottom: '1px solid #e2e0d8',
      }}>
        {['Nombre / Tipo', 'Criticidad', 'Estado', 'Ambiente', 'Proveedor', 'Responsable', ''].map((h, i) => (
          <div key={i} style={TH_STYLE}>{h}</div>
        ))}
      </div>

      {/* Skeleton */}
      {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

      {/* Vacío */}
      {!loading && activos.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#B4B2A9', fontSize: 13 }}>
          No se encontraron activos con los filtros actuales.
        </div>
      )}

      {/* Filas */}
      {!loading && activos.map(activo => {
        const isSelected = selected?.id === activo.id
        return (
          <div
            key={activo.id}
            onClick={() => onSelect(activo)}
            style={{
              display: 'grid', gridTemplateColumns: COL,
              alignItems: 'center', padding: '11px 14px',
              borderBottom: '1px solid #f1efe8',
              background: isSelected ? '#EEEDFE' : '#fff',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafaf8' }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
          >
            {/* Nombre + tipo */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 2 }}>
                {activo.nombre}
              </div>
              <div style={{ fontSize: 11, color: '#888780' }}>{activo.tipo}</div>
            </div>

            {/* Criticidad */}
            <div><Badge map={CRIT}    value={activo.criticidad} /></div>

            {/* Estado */}
            <div><Badge map={ESTADO}  value={activo.estado} /></div>

            {/* Ambiente */}
            <div><Badge map={AMBIENTE} value={activo.ambiente} /></div>

            {/* Proveedor */}
            <div style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activo.proveedor || '—'}
            </div>

            {/* Responsable */}
            <div style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activo.responsable_nombre || '—'}
            </div>

            {/* Acciones */}
            <div
              style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}
              onClick={e => e.stopPropagation()}
            >
              <ActionBtn title="Ver detalle" color="#534AB7" onClick={() => onSelect(activo)}>
                <i className="ti ti-eye" />
              </ActionBtn>
              <ActionBtn title="Editar" color="#534AB7" onClick={() => onEdit(activo)}>
                <i className="ti ti-pencil" />
              </ActionBtn>
              <ActionBtn title="Eliminar" color="#E24B4A" onClick={() => onDelete(activo)} danger>
                <i className="ti ti-trash" />
              </ActionBtn>
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}

function ActionBtn({ children, title, color, danger, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: 6,
        border: '1px solid #e2e0d8', background: '#fff',
        color: '#888780', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = color
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.background = danger ? '#FCEBEB' : '#EEEDFE'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = '#888780'
        e.currentTarget.style.borderColor = '#e2e0d8'
        e.currentTarget.style.background = '#fff'
      }}
    >
      {children}
    </button>
  )
}
