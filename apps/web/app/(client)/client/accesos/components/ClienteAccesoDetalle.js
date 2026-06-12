'use client'

const NIVEL_STYLE = {
  lectura:       { bg: '#EAF3DE', color: '#27500A' },
  escritura:     { bg: '#EEEDFE', color: '#3C3489' },
  administrador: { bg: '#FAEEDA', color: '#633806' },
  root:          { bg: '#FCEBEB', color: '#791F1F' },
}
const NIVEL_LABEL = { lectura: 'Lectura', escritura: 'Escritura', administrador: 'Administrador', root: 'Root' }

const ESTADO_STYLE = {
  activo:             { bg: '#EAF3DE', color: '#27500A' },
  inactivo:           { bg: '#F1EFE8', color: '#444441' },
  suspendido:         { bg: '#FAEEDA', color: '#633806' },
  expirado:           { bg: '#FCEBEB', color: '#791F1F' },
  pendiente_revision: { bg: '#EEEDFE', color: '#3C3489' },
}
const ESTADO_LABEL = {
  activo: 'Activo', inactivo: 'Inactivo', suspendido: 'Suspendido',
  expirado: 'Expirado', pendiente_revision: 'Pendiente revisión',
}

const CRIT_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F' },
  alta:    { bg: '#FAEEDA', color: '#633806' },
  media:   { bg: '#EAF3DE', color: '#27500A' },
  baja:    { bg: '#F1EFE8', color: '#444441' },
}
const CRIT_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }

const AMBIENTE_LABEL = { produccion: 'Producción', desarrollo: 'Desarrollo', testing: 'Testing', staging: 'Staging' }

function Badge({ value, labelMap, styleMap }) {
  if (!value) return <span style={{ color: '#B4B2A9' }}>—</span>
  const s = styleMap?.[value]
  return (
    <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
      {labelMap?.[value] ?? value}
    </span>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: value ? '#2C2C2A' : '#B4B2A9' }}>{value || '—'}</span>
    </div>
  )
}

function formatFecha(f) {
  if (!f) return null
  return new Date(f).toLocaleDateString('es-CL')
}

export default function ClienteAccesoDetalle({ acceso, onClose }) {
  if (!acceso) return null

  const esExpirado   = acceso.estado === 'expirado'
  const esRootActivo = acceso.nivel_acceso === 'root' && acceso.estado === 'activo'

  return (
    <aside style={{ width: 280, minWidth: 280, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {esExpirado && (
        <div style={{ background: '#FCEBEB', borderBottom: '1px solid #E8A6A6', padding: '8px 14px', fontSize: 12, color: '#791F1F', fontWeight: 500 }}>
          ⛔ Acceso expirado. Contacta a tu analista DSTAC.
        </div>
      )}
      {!esExpirado && esRootActivo && (
        <div style={{ background: '#FAEEDA', borderBottom: '1px solid #F8D57A', padding: '8px 14px', fontSize: 12, color: '#633806', fontWeight: 500 }}>
          ⚠️ Acceso Root activo. Requiere revisión periódica.
        </div>
      )}

      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{acceso.identidad_nombre}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 3 }}>→ {acceso.activo_nombre}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge value={acceso.nivel_acceso} labelMap={NIVEL_LABEL} styleMap={NIVEL_STYLE} />
          <Badge value={acceso.estado}       labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <Row label="Criticidad"    value={acceso.criticidad ? (CRIT_LABEL[acceso.criticidad] ?? acceso.criticidad) : null} />
        <Row label="Entorno"       value={acceso.entorno ? (AMBIENTE_LABEL[acceso.entorno] ?? acceso.entorno) : null} />
        <Row label="Propietario"   value={acceso.propietario_nombre} />
        <Row label="Tipo activo"   value={acceso.activo_tipo} />
        <Row label="Otorgado"      value={formatFecha(acceso.fecha_otorgamiento)} />
        <Row label="Expira"        value={formatFecha(acceso.fecha_expiracion)} />
        <Row label="Autorizado por" value={acceso.quien_autorizo} />

        {acceso.justificacion && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Justificación</span>
            <p style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{acceso.justificacion}</p>
          </div>
        )}

        <div style={{ padding: '8px 0', fontSize: 11, color: '#B4B2A9' }}>
          Registrado: {acceso.created_at ? new Date(acceso.created_at).toLocaleDateString('es-CL') : '—'}
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
