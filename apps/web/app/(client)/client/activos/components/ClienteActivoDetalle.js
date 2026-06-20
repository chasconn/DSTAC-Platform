'use client'

const CRIT_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F' },
  alta:    { bg: '#FAEEDA', color: '#633806' },
  media:   { bg: '#EAF3DE', color: '#27500A' },
  baja:    { bg: '#F1EFE8', color: '#444441' },
}
const ESTADO_STYLE = {
  operativo:        { bg: '#EAF3DE', color: '#27500A' },
  degradado:        { bg: '#FAEEDA', color: '#633806' },
  fuera_de_servicio:{ bg: '#FCEBEB', color: '#791F1F' },
  en_mantencion:    { bg: '#EEEDFE', color: '#3C3489' },
}
const CRIT_LABEL   = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }
const ESTADO_LABEL = { operativo: 'Operativo', degradado: 'Degradado', fuera_de_servicio: 'Fuera de servicio', en_mantencion: 'En mantención' }
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

export default function ClienteActivoDetalle({ activo, onClose }) {
  if (!activo) return null

  const alertaDegradado = activo.estado === 'degradado' || activo.estado === 'fuera_de_servicio'

  return (
    <aside className="detail-side-panel" style={{ width: 280, minWidth: 280, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {alertaDegradado && (
        <div style={{ background: '#FEF3CD', borderBottom: '1px solid #F8D57A', padding: '8px 14px', fontSize: 12, color: '#7A4E0A', fontWeight: 500 }}>
          ⚠️ {ESTADO_LABEL[activo.estado] ?? activo.estado} — Contacta a tu analista DSTAC.
        </div>
      )}

      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{activo.nombre}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 3 }}>{activo.tipo}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge value={activo.criticidad} labelMap={CRIT_LABEL}  styleMap={CRIT_STYLE} />
          <Badge value={activo.estado}     labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <Row label="Proveedor"     value={activo.proveedor} />
        <Row label="Ambiente"      value={activo.ambiente ? (AMBIENTE_LABEL[activo.ambiente] ?? activo.ambiente) : null} />
        <Row label="Responsable"   value={activo.responsable_nombre} />
        <Row label="Proyecto"      value={activo.proyecto} />

        {activo.ip && <Row label="IP / Host" value={activo.ip} />}
        {activo.sistema_operativo && <Row label="Sistema Operativo" value={activo.sistema_operativo} />}
        {activo.version && <Row label="Versión" value={activo.version} />}

        {activo.documentacion && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Documentación</span>
            <p style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{activo.documentacion}</p>
          </div>
        )}

        <div style={{ padding: '8px 0', fontSize: 11, color: '#B4B2A9' }}>
          Actualizado: {activo.updated_at ? new Date(activo.updated_at).toLocaleDateString('es-CL') : '—'}
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
