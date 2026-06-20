'use client'

const SEV_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F' },
  alta:    { bg: '#FAEEDA', color: '#633806' },
  media:   { bg: '#EAF3DE', color: '#27500A' },
  baja:    { bg: '#F1EFE8', color: '#444441' },
}
const ESTADO_STYLE = {
  abierto:          { bg: '#FCEBEB', color: '#791F1F' },
  en_investigacion: { bg: '#FAEEDA', color: '#633806' },
  en_respuesta:     { bg: '#EEEDFE', color: '#3C3489' },
  cerrado:          { bg: '#EAF3DE', color: '#27500A' },
  falso_positivo:   { bg: '#F1EFE8', color: '#888780' },
}
const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }
const ESTADO_LABEL = {
  abierto: 'Abierto', en_investigacion: 'En investigación',
  en_respuesta: 'En respuesta', cerrado: 'Cerrado', falso_positivo: 'Falso positivo',
}

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

export default function IncidenteDetalle({ incidente, onClose, onEdit, onDelete }) {
  if (!incidente) return null

  return (
    <aside className="detail-side-panel" style={{ width: 300, minWidth: 300, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0, overflowY: 'auto' }}>

      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{incidente.tipo}</div>
            {incidente.categoria && <div style={{ fontSize: 12, color: '#888780', marginTop: 3 }}>{incidente.categoria}</div>}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge value={incidente.severidad} labelMap={SEV_LABEL} styleMap={SEV_STYLE} />
          <Badge value={incidente.estado}    labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
          {incidente.requiere_notificacion_legal ? (
            <span style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>Notif. legal</span>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <Row label="Responsable"  value={incidente.responsable} />
        <Row label="Proyecto"     value={incidente.proyecto} />
        <Row label="Activo"       value={incidente.activo_nombre} />
        {incidente.cvss != null && <Row label="CVSS" value={`${incidente.cvss} / 10`} />}
        {incidente.impacto && <Row label="Impacto" value={incidente.impacto} />}
        <Row
          label="Detección"
          value={incidente.fecha_deteccion ? new Date(incidente.fecha_deteccion).toLocaleString('es-CL') : null}
        />
        {incidente.fecha_respuesta && (
          <Row label="Respuesta" value={new Date(incidente.fecha_respuesta).toLocaleString('es-CL')} />
        )}
        {incidente.tiempo_resolucion != null && (
          <Row label="Tiempo resolución" value={`${incidente.tiempo_resolucion} min`} />
        )}

        {incidente.descripcion && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Descripción</span>
            <p style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{incidente.descripcion}</p>
          </div>
        )}

        {incidente.causa_raiz && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Causa raíz</span>
            <p style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{incidente.causa_raiz}</p>
          </div>
        )}

        {incidente.vulnerabilidades && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Vulnerabilidades</span>
            <p style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{incidente.vulnerabilidades}</p>
          </div>
        )}

        <div style={{ padding: '8px 0', fontSize: 11, color: '#B4B2A9' }}>
          Registrado: {incidente.created_at ? new Date(incidente.created_at).toLocaleDateString('es-CL') : '—'}
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => onEdit(incidente)}
          style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Editar incidente
        </button>
        <button onClick={() => onDelete(incidente)}
          style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #E8A6A6', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#791F1F', fontWeight: 500 }}>
          Eliminar
        </button>
      </div>
    </aside>
  )
}
