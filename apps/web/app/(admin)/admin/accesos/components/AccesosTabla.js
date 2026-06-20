'use client'

const NIVEL_STYLE = {
  root:          { bg: '#FCEBEB', color: '#791F1F' },
  administrador: { bg: '#FAEEDA', color: '#633806' },
  escritura:     { bg: '#EEEDFE', color: '#3C3489' },
  lectura:       { bg: '#EAF3DE', color: '#27500A' },
  otro:          { bg: '#F1EFE8', color: '#444441' },
}
const CRIT_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F' },
  alta:    { bg: '#FAEEDA', color: '#633806' },
  media:   { bg: '#EAF3DE', color: '#27500A' },
  baja:    { bg: '#F1EFE8', color: '#444441' },
}
const ESTADO_STYLE = {
  activo:             { bg: '#EAF3DE', color: '#27500A' },
  expirado:           { bg: '#FCEBEB', color: '#791F1F' },
  suspendido:         { bg: '#FAEEDA', color: '#633806' },
  pendiente_revision: { bg: '#EEEDFE', color: '#3C3489' },
  inactivo:           { bg: '#F1EFE8', color: '#444441' },
}
const NIVEL_LABEL  = { root: 'Root', administrador: 'Administrador', escritura: 'Escritura', lectura: 'Lectura', otro: 'Otro' }
const ESTADO_LABEL = { activo: 'Activo', expirado: 'Expirado', suspendido: 'Suspendido', pendiente_revision: 'P. Revisión', inactivo: 'Inactivo' }
const CRIT_LABEL   = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }

function getInitials(nombre) {
  return (nombre || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function ExpiraCell({ fecha, estado }) {
  if (!fecha) return <span style={{ fontSize: 12, color: '#B4B2A9' }}>—</span>
  const d    = new Date(fecha)
  const hoy  = new Date()
  const diff = Math.ceil((d - hoy) / (1000 * 60 * 60 * 24))
  const fmt  = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })

  if (estado === 'expirado' || diff < 0) {
    return <span style={{ fontSize: 12, color: '#E24B4A', fontWeight: 600, textDecoration: 'line-through' }}>{fmt}</span>
  }
  if (diff <= 30) {
    return <span style={{ fontSize: 12, color: '#EF9F27', fontWeight: 600 }}>⏰ {fmt}</span>
  }
  return <span style={{ fontSize: 12, color: '#888780' }}>{fmt}</span>
}

function Badge({ label, style }) {
  if (!label) return <span style={{ fontSize: 12, color: '#B4B2A9' }}>—</span>
  return <span style={{ background: style?.bg ?? '#F1EFE8', color: style?.color ?? '#444441', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{label}</span>
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 1fr 1fr 80px', minWidth: 820, gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[200, 140, 80, 80, 80, 80, 60].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = [
  { label: 'Identidad / Propietario' },
  { label: 'Activo' },
  { label: 'Nivel' },
  { label: 'Criticidad' },
  { label: 'Estado' },
  { label: 'Expira' },
  { label: 'Acciones', style: { textAlign: 'right' } },
]

export default function AccesosTabla({ accesos, loading, selected, onSelect, onEdit, onDelete }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflowX: 'auto' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 1fr 1fr 80px', minWidth: 820, gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c.label} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5, ...c.style }}>
            {c.label}
          </span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && accesos.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#888780', fontSize: 13 }}>
          No se encontraron accesos
        </div>
      )}

      {!loading && accesos.map(ac => {
        const isSelected  = ac.id === selected?.id
        const esExpirado  = ac.estado === 'expirado'
        const esRootActivo = ac.nivel_acceso === 'root' && ac.estado === 'activo'

        let rowBg = 'transparent'
        if (isSelected)       rowBg = '#EEEDFE'
        else if (esExpirado)  rowBg = '#FFF5F5'
        else if (esRootActivo) rowBg = '#FFFBF0'

        return (
          <div
            key={ac.id}
            onClick={() => onSelect(ac)}
            style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 1fr 1fr 80px', minWidth: 820, gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8', background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (!isSelected && !esExpirado && !esRootActivo) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
          >
            {/* Identidad / Propietario — dos líneas */}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ac.identidad_valor}
              </div>
              <div style={{ fontSize: 11, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {ac.propietario_nombre
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: '#EEEDFE', color: '#3C3489', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{getInitials(ac.propietario_nombre)}</span>
                      {ac.propietario_nombre}
                    </span>
                  : <span style={{ color: '#B4B2A9' }}>Sin propietario</span>
                }
              </div>
            </div>

            {/* Activo — dos líneas */}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ac.activo_nombre}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{ac.activo_tipo ?? '—'}</div>
            </div>

            {/* Nivel */}
            <Badge label={NIVEL_LABEL[ac.nivel_acceso] ?? ac.nivel_acceso} style={NIVEL_STYLE[ac.nivel_acceso]} />

            {/* Criticidad */}
            <Badge label={ac.criticidad ? CRIT_LABEL[ac.criticidad] : null} style={CRIT_STYLE[ac.criticidad]} />

            {/* Estado */}
            <Badge label={ESTADO_LABEL[ac.estado] ?? ac.estado} style={ESTADO_STYLE[ac.estado]} />

            {/* Expira */}
            <ExpiraCell fecha={ac.fecha_expiracion} estado={ac.estado} />

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
              <Btn title="Ver detalle" onClick={() => onSelect(ac)}><IconEye /></Btn>
              <Btn title="Editar" onClick={() => onEdit(ac)}><IconEdit /></Btn>
              <Btn title="Eliminar" onClick={() => onDelete(ac)} danger><IconTrash /></Btn>
            </div>
          </div>
        )
      })}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

function Btn({ title, onClick, danger, children }) {
  return (
    <button title={title} onClick={onClick}
      style={{ background: 'none', border: `1px solid ${danger ? '#FCEBEB' : '#e2e0d8'}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#FCEBEB' : '#f1efe8'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >{children}</button>
  )
}

function IconEye()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconEdit()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconTrash() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> }
