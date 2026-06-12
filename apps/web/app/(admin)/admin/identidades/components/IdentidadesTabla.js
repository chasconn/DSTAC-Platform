'use client'

const ESTADO_STYLE = {
  activa:       { bg: '#EAF3DE', color: '#27500A' },
  inactiva:     { bg: '#F1EFE8', color: '#444441' },
  comprometida: { bg: '#FCEBEB', color: '#791F1F' },
  expirada:     { bg: '#FAEEDA', color: '#633806' },
  pendiente:    { bg: '#EEEDFE', color: '#3C3489' },
}
const ESTADO_LABEL = {
  activa: 'Activa', inactiva: 'Inactiva', comprometida: 'Comprometida',
  expirada: 'Expirada', pendiente: 'Pendiente',
}

// Ícono SVG por tipo de identidad
const TIPO_ICONS = {
  usuario:         <IconUsuario />,
  cuenta_servicio: <IconRobot />,
  api_key:         <IconKey />,
  certificado:     <IconCert />,
  grupo:           <IconGrupo />,
  otro:            <IconOtro />,
}
const TIPO_LABEL = {
  usuario: 'Usuario', cuenta_servicio: 'Cuenta servicio',
  api_key: 'API Key', certificado: 'Certificado',
  grupo: 'Grupo', otro: 'Otro',
}

function getInitials(nombre) {
  return (nombre || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function ExpiracioCell({ fecha, estado }) {
  if (!fecha) return <span style={{ fontSize: 12, color: '#B4B2A9' }}>—</span>
  const d     = new Date(fecha)
  const hoy   = new Date()
  const diff  = Math.ceil((d - hoy) / (1000 * 60 * 60 * 24))
  const fmt   = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })

  if (estado === 'expirada' || diff < 0) {
    return <span style={{ fontSize: 12, color: '#E24B4A', fontWeight: 600 }}>✕ {fmt}</span>
  }
  if (diff <= 30) {
    return <span style={{ fontSize: 12, color: '#EF9F27', fontWeight: 600 }}>⏰ {fmt}</span>
  }
  return <span style={{ fontSize: 12, color: '#888780' }}>{fmt}</span>
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1fr 80px', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[180, 100, 90, 80, 120, 80, 60].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = [
  { label: 'Nombre / Identidad' },
  { label: 'Tipo' },
  { label: 'Origen' },
  { label: 'Estado' },
  { label: 'Propietario' },
  { label: 'Expira' },
  { label: 'Acciones', style: { textAlign: 'right' } },
]

export default function IdentidadesTabla({ identidades, loading, selected, onSelect, onEdit, onDelete }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1fr 80px', gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c.label} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5, ...c.style }}>
            {c.label}
          </span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && identidades.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#888780', fontSize: 13 }}>
          No se encontraron identidades
        </div>
      )}

      {!loading && identidades.map(ident => {
        const isSelected    = ident.id === selected?.id
        const esComprometida = ident.estado === 'comprometida'
        const esExpirada    = ident.estado === 'expirada'

        let rowBg = 'transparent'
        if (isSelected)     rowBg = '#EEEDFE'
        else if (esComprometida) rowBg = '#FFF5F5'
        else if (esExpirada)    rowBg = '#FFFBF0'

        return (
          <div
            key={ident.id}
            onClick={() => onSelect(ident)}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1fr 80px',
              gap: 12, padding: '10px 16px', alignItems: 'center',
              borderBottom: '1px solid #f1efe8',
              background: rowBg,
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isSelected && !esComprometida && !esExpirada) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
          >
            {/* Nombre + valor identidad */}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ color: '#888780', flexShrink: 0 }}>
                  {TIPO_ICONS[ident.tipo_identidad] || <IconOtro />}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ident.nombre}
                </span>
                {esComprometida && <span title="Comprometida" style={{ color: '#E24B4A', fontSize: 12 }}>⚠</span>}
              </div>
              <div style={{ fontSize: 11, color: '#888780', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ident.identidad}
              </div>
            </div>

            {/* Tipo */}
            <span style={{ fontSize: 12, color: '#888780' }}>{TIPO_LABEL[ident.tipo_identidad] ?? ident.tipo_identidad ?? '—'}</span>

            {/* Origen */}
            <span style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ident.origen || '—'}
            </span>

            {/* Estado */}
            <div>
              <span style={{ background: ESTADO_STYLE[ident.estado]?.bg ?? '#F1EFE8', color: ESTADO_STYLE[ident.estado]?.color ?? '#444441', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                {ESTADO_LABEL[ident.estado] ?? ident.estado}
              </span>
            </div>

            {/* Propietario */}
            {ident.propietario_nombre ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(ident.propietario_nombre)}
                </div>
                <span style={{ fontSize: 12, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ident.propietario_nombre}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#B4B2A9' }}>Sin asignar</span>
            )}

            {/* Expira */}
            <ExpiracioCell fecha={ident.fecha_expiracion} estado={ident.estado} />

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
              <ActionBtn title="Ver detalle" onClick={() => onSelect(ident)}><IconEye /></ActionBtn>
              <ActionBtn title="Editar" onClick={() => onEdit(ident)}><IconEdit /></ActionBtn>
              <ActionBtn title="Eliminar" onClick={() => onDelete(ident)} danger><IconTrash /></ActionBtn>
            </div>
          </div>
        )
      })}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  )
}

function ActionBtn({ title, onClick, danger, children }) {
  return (
    <button title={title} onClick={onClick}
      style={{ background: 'none', border: `1px solid ${danger ? '#FCEBEB' : '#e2e0d8'}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#FCEBEB' : '#f1efe8'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >{children}</button>
  )
}

// Íconos SVG inline por tipo
function IconUsuario()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> }
function IconRobot()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/><path d="M8 15h.01M16 15h.01"/></svg> }
function IconKey()      { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg> }
function IconCert()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg> }
function IconGrupo()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IconOtro()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/></svg> }
function IconEye()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconEdit()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconTrash()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> }
