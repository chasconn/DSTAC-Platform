'use client'

const NIVEL_STYLE = {
  critico:   { bg: '#FCEBEB', color: '#791F1F' },
  alto:      { bg: '#FAEEDA', color: '#633806' },
  medio:     { bg: '#FEF3E2', color: '#854F0B' },
  bajo:      { bg: '#EAF3DE', color: '#27500A' },
  aceptable: { bg: '#F1EFE8', color: '#444441' },
}
const ESTADO_STYLE = {
  abierto:        { bg: '#FCEBEB', color: '#791F1F' },
  en_tratamiento: { bg: '#EEEDFE', color: '#3C3489' },
  aceptado:       { bg: '#FAEEDA', color: '#633806' },
  cerrado:        { bg: '#EAF3DE', color: '#27500A' },
}
const NIVEL_LABEL  = { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo', aceptable: 'Aceptable' }
const ESTADO_LABEL = { abierto: 'Abierto', en_tratamiento: 'En tratamiento', aceptado: 'Aceptado', cerrado: 'Cerrado' }
const PROB_LABEL   = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const IMPACTO_LABEL= { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

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

export default function ClienteRiesgoDetalle({ riesgo, onClose }) {
  if (!riesgo) return null

  const esCritico = riesgo.nivel_riesgo === 'critico' || riesgo.nivel_riesgo === 'alto'
  const estaAbierto = riesgo.estado === 'abierto' || riesgo.estado === 'en_tratamiento'

  return (
    <aside style={{ width: 280, minWidth: 280, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {esCritico && estaAbierto && (
        <div style={{ background: '#FAEEDA', borderBottom: '1px solid #F8D57A', padding: '8px 14px', fontSize: 12, color: '#633806', fontWeight: 500 }}>
          ⚠️ Riesgo {NIVEL_LABEL[riesgo.nivel_riesgo]} — Contacta a tu analista DSTAC.
        </div>
      )}

      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{riesgo.tipo}</div>
            {riesgo.categoria && <div style={{ fontSize: 12, color: '#888780', marginTop: 3 }}>{riesgo.categoria}</div>}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge value={riesgo.nivel_riesgo} labelMap={NIVEL_LABEL} styleMap={NIVEL_STYLE} />
          <Badge value={riesgo.estado}       labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <Row label="Probabilidad"  value={riesgo.probabilidad ? (PROB_LABEL[riesgo.probabilidad] ?? riesgo.probabilidad) : null} />
        <Row label="Impacto"       value={riesgo.impacto ? (IMPACTO_LABEL[riesgo.impacto] ?? riesgo.impacto) : null} />
        <Row label="Responsable"   value={riesgo.responsable} />
        <Row
          label="Identificado"
          value={riesgo.fecha_identificacion ? new Date(riesgo.fecha_identificacion).toLocaleDateString('es-CL') : null}
        />
        {riesgo.fecha_revision && (
          <Row label="Próxima revisión" value={new Date(riesgo.fecha_revision).toLocaleDateString('es-CL')} />
        )}

        {riesgo.descripcion && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Descripción</span>
            <p style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{riesgo.descripcion}</p>
          </div>
        )}

        {riesgo.controles_tratamientos && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Controles / Tratamientos</span>
            <p style={{ fontSize: 13, color: '#2C2C2A', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{riesgo.controles_tratamientos}</p>
          </div>
        )}

        {(riesgo.nivel_residual) && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
            <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Riesgo Residual</span>
            <div style={{ marginTop: 6 }}>
              <Badge value={riesgo.nivel_residual} labelMap={NIVEL_LABEL} styleMap={NIVEL_STYLE} />
            </div>
          </div>
        )}

        <div style={{ padding: '8px 0', fontSize: 11, color: '#B4B2A9' }}>
          Registrado: {riesgo.created_at ? new Date(riesgo.created_at).toLocaleDateString('es-CL') : '—'}
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
