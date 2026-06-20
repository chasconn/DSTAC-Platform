'use client'

import { useState } from 'react'

const ESTADO_STYLE = {
  activa:       { bg: '#EAF3DE', color: '#27500A' },
  inactiva:     { bg: '#F1EFE8', color: '#444441' },
  comprometida: { bg: '#FCEBEB', color: '#791F1F' },
  expirada:     { bg: '#FAEEDA', color: '#633806' },
}
const ESTADO_LABEL = { activa: 'Activa', inactiva: 'Inactiva', comprometida: 'Comprometida', expirada: 'Expirada' }
const TIPO_LABEL = {
  usuario: 'Usuario', cuenta_servicio: 'Cuenta de servicio',
  api_key: 'API Key', certificado: 'Certificado', otro: 'Otro',
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

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: value ? '#2C2C2A' : '#B4B2A9', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</span>
    </div>
  )
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#2C2C2A', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <button onClick={handleCopy} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: copied ? '#1D9E75' : '#888780', padding: '2px 4px', flexShrink: 0 }}>
          {copied ? '✓' : '⎘'}
        </button>
      </div>
    </div>
  )
}

function formatFecha(f) {
  if (!f) return null
  return new Date(f).toLocaleDateString('es-CL')
}

export default function ClienteIdentidadDetalle({ identidad, onClose }) {
  if (!identidad) return null

  const esApiKey = identidad.tipo_identidad === 'api_key'
  const esComprometida = identidad.estado === 'comprometida'

  return (
    <aside className="detail-side-panel" style={{ width: 280, minWidth: 280, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {esComprometida && (
        <div style={{ background: '#FCEBEB', borderBottom: '1px solid #E8A6A6', padding: '8px 14px', fontSize: 12, color: '#791F1F', fontWeight: 500 }}>
          ⛔ Identidad comprometida — Contacta urgentemente a tu analista DSTAC.
        </div>
      )}

      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{identidad.nombre}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{TIPO_LABEL[identidad.tipo_identidad] ?? identidad.tipo_identidad}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ marginTop: 10 }}>
          <Badge value={identidad.estado} labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {esApiKey
          ? <Row label="Identidad" value={identidad.identidad} mono />
          : <CopyRow label="Identidad" value={identidad.identidad} />
        }
        <Row label="Origen"      value={identidad.origen} />
        <Row label="Propietario" value={identidad.propietario_nombre} />
        <Row label="Rol"         value={identidad.propietario_rol} />
        <Row label="Creación"    value={formatFecha(identidad.fecha_creacion)} />
        <Row label="Revisión"    value={formatFecha(identidad.fecha_revision)} />
        <Row label="Expiración"  value={formatFecha(identidad.fecha_expiracion)} />

        <div style={{ padding: '8px 0', fontSize: 11, color: '#B4B2A9' }}>
          Registrado: {identidad.created_at ? new Date(identidad.created_at).toLocaleDateString('es-CL') : '—'}
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
