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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</span>
      {children ?? <span style={{ fontSize: 13, color: value ? '#2C2C2A' : '#B4B2A9' }}>{value || '—'}</span>}
    </div>
  )
}

export default function ClientePersonalDetalle({ persona, onClose }) {
  if (!persona) return null

  const estadoStyle = ESTADO_STYLE[persona.estado] ?? { bg: '#F1EFE8', color: '#444441' }
  const esDesvinculado = persona.estado === 'desvinculado'

  return (
    <aside className="detail-side-panel" style={{ width: 280, minWidth: 280, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {esDesvinculado && (
        <div style={{ background: '#FCEBEB', borderBottom: '1px solid #E8A6A6', padding: '8px 14px', fontSize: 12, color: '#791F1F', fontWeight: 500 }}>
          ⚠️ Persona desvinculada — verifica que sus accesos estén revocados.
        </div>
      )}

      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: estadoStyle.bg, color: estadoStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(persona.nombre)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{persona.nombre}</div>
              <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{persona.rol_empresarial || 'Sin rol asignado'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <Badge value={persona.estado}               labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
          <Badge value={persona.nivel_responsabilidad} labelMap={NIVEL_LABEL}  styleMap={NIVEL_STYLE} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 0 4px' }}>
          Información de contacto
        </div>

        <Row label="Correo">
          {persona.correo
            ? <a href={`mailto:${persona.correo}`} style={{ fontSize: 13, color: 'var(--brand-color, #3C3489)', textDecoration: 'none', wordBreak: 'break-all' }}>{persona.correo}</a>
            : <span style={{ fontSize: 13, color: '#B4B2A9' }}>—</span>
          }
        </Row>
        <Row label="Teléfono" value={persona.telefono} />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 0 4px' }}>
          Información laboral
        </div>

        <Row label="Rol empresarial"        value={persona.rol_empresarial} />
        <Row label="Nivel de responsabilidad" value={persona.nivel_responsabilidad ? (NIVEL_LABEL[persona.nivel_responsabilidad] ?? persona.nivel_responsabilidad) : null} />
        <Row label="Fecha de ingreso"        value={persona.fecha_ingreso ? new Date(persona.fecha_ingreso).toLocaleDateString('es-CL') : null} />

        <div style={{ padding: '10px 0', fontSize: 11, color: '#B4B2A9' }}>
          Registrado: {persona.created_at ? new Date(persona.created_at).toLocaleDateString('es-CL') : '—'}
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0d8' }}>
        <button onClick={onClose} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#444441', fontWeight: 500 }}>
          Cerrar
        </button>
      </div>
    </aside>
  )
}
