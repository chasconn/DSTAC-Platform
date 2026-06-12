'use client'

const ROL_STYLE = {
  super_admin:     { bg: '#FCEBEB', color: '#791F1F' },
  admin_dstac:     { bg: '#FAEEDA', color: '#633806' },
  analista_dstac:  { bg: '#EEEDFE', color: '#3C3489' },
  consultor_dstac: { bg: '#F1EFE8', color: '#444441' },
  cliente_admin:   { bg: '#EAF3DE', color: '#27500A' },
  cliente_lectura: { bg: '#E6F1FB', color: '#0C447C' },
}

const ROL_LABEL = {
  super_admin:     'Super Admin',
  admin_dstac:     'Admin DSTAC',
  analista_dstac:  'Analista',
  consultor_dstac: 'Consultor',
  cliente_admin:   'Cliente Admin',
  cliente_lectura: 'Cliente',
}

const STATUS_STYLE = {
  active:    { bg: '#EAF3DE', color: '#27500A' },
  inactive:  { bg: '#F1EFE8', color: '#444441' },
  suspended: { bg: '#FCEBEB', color: '#791F1F' },
  blocked:   { bg: '#FCEBEB', color: '#791F1F' },
}
const STATUS_LABEL = { active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', blocked: 'Bloqueado' }

function Badge({ value, labelMap, styleMap, size = 11 }) {
  if (!value) return <span style={{ fontSize: size, color: '#B4B2A9' }}>—</span>
  const s = styleMap?.[value]
  return (
    <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: size, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {labelMap?.[value] ?? value}
    </span>
  )
}

function getInitials(u) {
  const n = (u.first_name ? u.first_name + ' ' + (u.last_name || '') : u.email) || '?'
  return n.trim().split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
}

function PendienteChip({ user }) {
  if (!user.must_change_password) return null
  const expirado = user.temp_password_expires_at && new Date(user.temp_password_expires_at) < new Date()
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap',
      background: expirado ? '#FCEBEB' : '#FAEEDA',
      color:      expirado ? '#791F1F' : '#633806',
    }}>
      {expirado ? 'Pass expirada' : 'Debe cambiar'}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 80px', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[160, 120, 90, 70, 90, 70, 50].map((w, i) => (
        <div key={i} style={{ height: 13, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

const COLS = ['Usuario', 'Empresa', 'Rol', 'Estado', 'Pendiente', 'Creado', 'Acciones']

export default function UsuariosTabla({ usuarios, loading, selected, onSelect, onEdit, onReset, onDelete }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 80px', gap: 12, padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #e2e0d8' }}>
        {COLS.map(c => (
          <span key={c} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5 }}>{c}</span>
        ))}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && usuarios.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin usuarios</div>
          <div style={{ fontSize: 13, color: '#888780' }}>Crea el primer usuario con el botón "Nuevo usuario".</div>
        </div>
      )}

      {!loading && usuarios.map(u => {
        const isSelected = u.id === selected?.id
        return (
          <div
            key={u.id}
            onClick={() => onSelect(u)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 80px', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8', background: isSelected ? '#EEEDFE' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#EEEDFE' : 'transparent' }}
          >
            {/* Usuario */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {getInitials(u)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email}
                </div>
                {u.first_name && (
                  <div style={{ fontSize: 11, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                )}
              </div>
            </div>

            {/* Empresa */}
            <span style={{ fontSize: 12, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.company_name ?? <span style={{ color: '#B4B2A9' }}>DSTAC</span>}
            </span>

            {/* Rol */}
            <Badge value={u.role} labelMap={ROL_LABEL} styleMap={ROL_STYLE} />

            {/* Estado */}
            <Badge value={u.status} labelMap={STATUS_LABEL} styleMap={STATUS_STYLE} />

            {/* Pendiente */}
            <PendienteChip user={u} />

            {/* Creado */}
            <span style={{ fontSize: 11, color: '#888780', whiteSpace: 'nowrap' }}>
              {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CL') : '—'}
            </span>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              <ActionBtn title="Editar" onClick={() => onEdit(u)} color="#534AB7">
                <PencilIcon />
              </ActionBtn>
              <ActionBtn title="Reenviar credenciales" onClick={() => onReset(u)} color="#854F0B">
                <MailIcon />
              </ActionBtn>
              <ActionBtn title="Eliminar" onClick={() => onDelete(u)} color="#E24B4A">
                <TrashIcon />
              </ActionBtn>
            </div>
          </div>
        )
      })}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

function ActionBtn({ onClick, title, color, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, color: '#888780', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = color }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888780' }}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function MailIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
