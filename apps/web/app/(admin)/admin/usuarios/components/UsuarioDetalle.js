'use client'

import FixedPortal, { useIsMobile } from '../../../../../components/admin/FixedPortal'

const ROL_STYLE = {
  super_admin:     { bg: '#FCEBEB', color: '#791F1F' },
  admin_dstac:     { bg: '#FAEEDA', color: '#633806' },
  analista_dstac:  { bg: '#EEEDFE', color: '#3C3489' },
  consultor_dstac: { bg: '#F1EFE8', color: '#444441' },
  cliente_admin:   { bg: '#EAF3DE', color: '#27500A' },
  cliente_lectura: { bg: '#E6F1FB', color: '#0C447C' },
}
const ROL_LABEL = {
  super_admin: 'Super Admin', admin_dstac: 'Admin DSTAC',
  analista_dstac: 'Analista', consultor_dstac: 'Consultor',
  cliente_admin: 'Cliente Admin', cliente_lectura: 'Cliente Lectura',
}
const STATUS_STYLE = {
  active:    { bg: '#EAF3DE', color: '#27500A' },
  inactive:  { bg: '#F1EFE8', color: '#444441' },
  suspended: { bg: '#FCEBEB', color: '#791F1F' },
}
const STATUS_LABEL = { active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido' }

function getInitials(u) {
  const n = (u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.email) || '?'
  return n.trim().split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
}

function Badge({ value, labelMap, styleMap }) {
  if (!value) return null
  const s = styleMap?.[value]
  return (
    <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
      {labelMap?.[value] ?? value}
    </span>
  )
}

function Row({ label, value, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '9px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</span>
      {children ?? <span style={{ fontSize: 13, color: value ? '#2C2C2A' : '#B4B2A9' }}>{value || '—'}</span>}
    </div>
  )
}

export default function UsuarioDetalle({ usuario, onClose, onEdit, onReset, onDelete }) {
  const isMobile = useIsMobile()
  if (!usuario) return null

  const expirado = usuario.temp_password_expires_at && new Date(usuario.temp_password_expires_at) < new Date()

  let passEstado = null
  if (usuario.must_change_password) {
    passEstado = expirado
      ? { label: '⚠ Contraseña temporal expirada', bg: '#FCEBEB', color: '#791F1F' }
      : { label: 'Pendiente de cambio',              bg: '#FAEEDA', color: '#633806' }
  } else {
    passEstado = { label: '✓ Contraseña establecida', bg: '#EAF3DE', color: '#27500A' }
  }

  const nombre = usuario.first_name
    ? `${usuario.first_name} ${usuario.last_name || ''}`.trim()
    : usuario.email

  return (
    <FixedPortal active={isMobile}>
    <aside className="detail-side-panel" style={{ width: 280, minWidth: 280, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(usuario)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{nombre}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{usuario.company_name ?? 'DSTAC'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        <Badge value={usuario.role} labelMap={ROL_LABEL} styleMap={ROL_STYLE} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>

        <SectionTitle>Acceso</SectionTitle>
        <Row label="Email">
          <a href={`mailto:${usuario.email}`} style={{ fontSize: 13, color: '#534AB7', textDecoration: 'none', wordBreak: 'break-all' }}>{usuario.email}</a>
        </Row>
        <Row label="Usuario" value={usuario.username} />
        <Row label="Estado">
          <Badge value={usuario.status} labelMap={STATUS_LABEL} styleMap={STATUS_STYLE} />
        </Row>
        {usuario.company_name && <Row label="Empresa" value={usuario.company_name} />}

        <SectionTitle>Estado de contraseña</SectionTitle>
        <div style={{ background: passEstado.bg, color: passEstado.color, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, marginTop: 6 }}>
          {passEstado.label}
        </div>
        {usuario.must_change_password && usuario.temp_password_expires_at && (
          <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>
            Expira: {new Date(usuario.temp_password_expires_at).toLocaleString('es-CL')}
          </div>
        )}

        <SectionTitle>Auditoría</SectionTitle>
        <Row label="Creado" value={usuario.created_at ? new Date(usuario.created_at).toLocaleDateString('es-CL') : '—'} />
        <Row label="Último login" value={usuario.last_login ? new Date(usuario.last_login).toLocaleString('es-CL') : 'Nunca'} />

      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => onEdit(usuario)}
          style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Editar usuario
        </button>
        <button
          onClick={() => onReset(usuario)}
          style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#444441', fontWeight: 500 }}
        >
          Reenviar credenciales
        </button>
        <button
          onClick={() => onDelete(usuario)}
          style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #FCEBEB', background: '#FCEBEB', cursor: 'pointer', fontSize: 13, color: '#791F1F', fontWeight: 500 }}
        >
          Eliminar usuario
        </button>
      </div>
    </aside>
    </FixedPortal>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 0 4px' }}>
      {children}
    </div>
  )
}
