'use client'

import { useIsMobile } from '../../../../../components/admin/FixedPortal'

// Colores de estado para badges y avatares
const ESTADO_STYLE = {
  activo:       { bg: '#EAF3DE', color: '#27500A' },
  vacaciones:   { bg: '#FAEEDA', color: '#633806' },
  inactivo:     { bg: '#F1EFE8', color: '#444441' },
  desvinculado: { bg: '#FCEBEB', color: '#791F1F' },
}

const NIVEL_STYLE = {
  alto:  { bg: '#EEEDFE', color: '#3C3489' },
  medio: { bg: '#E6F1FB', color: '#0C447C' },
  bajo:  { bg: '#F1EFE8', color: '#444441' },
}

const ESTADO_LABEL = {
  activo: 'Activo', vacaciones: 'Vacaciones',
  inactivo: 'Inactivo', desvinculado: 'Desvinculado',
}
const NIVEL_LABEL = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

function getInitials(nombre) {
  return (nombre || '')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] || { bg: '#F1EFE8', color: '#444441' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  )
}

function NivelBadge({ nivel }) {
  if (!nivel) return <span style={{ fontSize: 12, color: '#B4B2A9' }}>—</span>
  const s = NIVEL_STYLE[nivel] || { bg: '#F1EFE8', color: '#444441' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {NIVEL_LABEL[nivel] ?? nivel}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr 80px', minWidth: 820, gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[160, 120, 70, 70, 130, 90, 60].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = [
  { label: 'Nombre',       style: {} },
  { label: 'Rol',          style: {} },
  { label: 'Nivel',        style: {} },
  { label: 'Estado',       style: {} },
  { label: 'Correo',       style: {} },
  { label: 'Teléfono',     style: {} },
  { label: 'Acciones',     style: { textAlign: 'right' } },
]

export default function PersonalTabla({ personal, loading, selected, onSelect, onEdit, onDelete }) {
  const isMobile = useIsMobile()

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
        {Array.from({ length: 5 }).map((_, i) => isMobile
          ? <div key={i} style={{ height: 70, margin: 12, borderRadius: 10, background: '#f1efe8', animation: 'pulse 1.5s infinite' }} />
          : <SkeletonRow key={i} />
        )}
      </div>
    )
  }

  if (!personal.length) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '40px 16px', textAlign: 'center', color: '#888780', fontSize: 13 }}>
        No se encontró personal
      </div>
    )
  }

  // En mobile, la tabla de columnas fijas obligaba a hacer scroll lateral
  // para ver el resto de los datos. Se reemplaza por tarjetas apiladas con
  // lo esencial — el resto de los campos se ve en el panel de detalle.
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {personal.map(p => {
          const isSelected = p.id === selected?.id
          const avatarStyle = ESTADO_STYLE[p.estado] || { bg: '#F1EFE8', color: '#444441' }
          return (
            <div key={p.id} onClick={() => onSelect(p)} style={{
              background: '#fff', borderRadius: 12,
              border: `2px solid ${isSelected ? '#534AB7' : '#e2e0d8'}`,
              padding: 14, cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: avatarStyle.bg, color: avatarStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {getInitials(p.nombre)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.rol_empresarial || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <EstadoBadge estado={p.estado} />
                <NivelBadge nivel={p.nivel_responsabilidad} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                <ActionBtn title="Editar" onClick={() => onEdit(p)}><IconEdit /></ActionBtn>
                <ActionBtn title="Eliminar" onClick={() => onDelete(p)} danger><IconTrash /></ActionBtn>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflowX: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr 80px', minWidth: 820, gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c.label} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5, ...c.style }}>
            {c.label}
          </span>
        ))}
      </div>

      {personal.map(p => {
        const isSelected = p.id === selected?.id
        const avatarStyle = ESTADO_STYLE[p.estado] || { bg: '#F1EFE8', color: '#444441' }

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr 80px', minWidth: 820,
              gap: 12, padding: '10px 16px', alignItems: 'center',
              borderBottom: '1px solid #f1efe8',
              background: isSelected ? '#EEEDFE' : 'transparent',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Nombre + avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: avatarStyle.bg, color: avatarStyle.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {getInitials(p.nombre)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.nombre}
              </span>
            </div>

            {/* Rol */}
            <span style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.rol_empresarial || '—'}
            </span>

            {/* Nivel */}
            <div><NivelBadge nivel={p.nivel_responsabilidad} /></div>

            {/* Estado */}
            <div><EstadoBadge estado={p.estado} /></div>

            {/* Correo */}
            <span style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.correo || '—'}
            </span>

            {/* Teléfono */}
            <span style={{ fontSize: 12, color: '#888780' }}>{p.telefono || '—'}</span>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
              <ActionBtn title="Ver detalle" onClick={() => onSelect(p)}><IconEye /></ActionBtn>
              <ActionBtn title="Editar" onClick={() => onEdit(p)}><IconEdit /></ActionBtn>
              <ActionBtn title="Eliminar" onClick={() => onDelete(p)} danger><IconTrash /></ActionBtn>
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
    <button
      title={title}
      onClick={onClick}
      style={{ background: 'none', border: `1px solid ${danger ? '#FCEBEB' : '#e2e0d8'}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#FCEBEB' : '#f1efe8'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {children}
    </button>
  )
}

function IconEye()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconEdit() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconTrash(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> }
