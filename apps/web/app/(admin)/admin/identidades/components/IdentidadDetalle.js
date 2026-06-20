'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../../lib/api'

const ESTADO_STYLE = {
  activa:       { bg: '#EAF3DE', color: '#27500A' },
  inactiva:     { bg: '#F1EFE8', color: '#444441' },
  comprometida: { bg: '#FCEBEB', color: '#791F1F' },
  expirada:     { bg: '#FAEEDA', color: '#633806' },
  pendiente:    { bg: '#EEEDFE', color: '#3C3489' },
}
const ESTADO_LABEL = { activa: 'Activa', inactiva: 'Inactiva', comprometida: 'Comprometida', expirada: 'Expirada', pendiente: 'Pendiente' }
const TIPO_LABEL   = { usuario: 'Usuario', cuenta_servicio: 'Cuenta de servicio', api_key: 'API Key', certificado: 'Certificado', grupo: 'Grupo', otro: 'Otro' }

function fmt(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInitials(nombre) {
  return (nombre || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function IdentidadDetalle({ identidad, empresaSlug, onClose, onEdit, onDelete }) {
  const router  = useRouter()
  const [detalle, setDetalle] = useState(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    setDetalle(null)
    api.get(`/api/admin/identidades/${identidad.id}`, { 'X-Company-Slug': empresaSlug })
      .then(setDetalle)
      .catch(() => setDetalle(identidad))
  }, [identidad.id])

  const d = detalle ?? identidad
  const esComprometida = d.estado === 'comprometida'
  const esExpirada     = d.estado === 'expirada'
  const estadoStyle    = ESTADO_STYLE[d.estado] ?? { bg: '#F1EFE8', color: '#444441' }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(d.identidad)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* clipboard puede fallar en contextos sin https */ }
  }

  return (
    <div className="detail-side-panel" style={{ width: 300, minWidth: 300, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: 2 }}>×</button>
        </div>

        {/* Banners de alerta */}
        {esComprometida && (
          <div style={{ background: '#FCEBEB', border: '1px solid #F5C6C6', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#791F1F', fontWeight: 600 }}>
            ⚠ Identidad comprometida — revisar urgente
          </div>
        )}
        {esExpirada && (
          <div style={{ background: '#FAEEDA', border: '1px solid #F5DFA0', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#633806', fontWeight: 600 }}>
            ⏰ Identidad expirada
          </div>
        )}

        <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', marginBottom: 6 }}>{d.nombre}</div>
        <span style={{ background: estadoStyle.bg, color: estadoStyle.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>
          {ESTADO_LABEL[d.estado] ?? d.estado}
        </span>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Valor de la identidad con botón copiar */}
        <Section title="Valor de la identidad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f7f4', border: '1px solid #e2e0d8', borderRadius: 7, padding: '8px 10px' }}>
            <code style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: '#2C2C2A', wordBreak: 'break-all' }}>
              {d.identidad}
            </code>
            <button
              onClick={copiar}
              title="Copiar al portapapeles"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiado ? '#1D9E75' : '#888780', fontSize: 13, padding: '2px 4px', flexShrink: 0 }}
            >
              {copiado ? '✓' : <IconCopy />}
            </button>
          </div>
        </Section>

        <Section title="Información">
          <InfoRow label="Tipo"   value={TIPO_LABEL[d.tipo_identidad] ?? d.tipo_identidad ?? '—'} />
          <InfoRow label="Origen" value={d.origen || '—'} />
          <InfoRow label="Estado" value={ESTADO_LABEL[d.estado] ?? d.estado} />
        </Section>

        <Section title="Propietario">
          {d.propietario_nombre ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {getInitials(d.propietario_nombre)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A' }}>{d.propietario_nombre}</div>
                {d.propietario_rol && <div style={{ fontSize: 11, color: '#888780' }}>{d.propietario_rol}</div>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#B4B2A9' }}>Sin propietario asignado</span>
              <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 12, fontWeight: 600, padding: 0 }}>
                Asignar →
              </button>
            </div>
          )}
        </Section>

        <Section title="Fechas">
          <InfoRow label="Creación"   value={fmt(d.fecha_creacion)} />
          <InfoRow label="Revisión"   value={fmt(d.fecha_revision)} />
          <InfoRow label="Expiración" value={fmt(d.fecha_expiracion)} highlight={esExpirada ? 'red' : null} />
        </Section>

        {d.notas && (
          <Section title="Notas">
            <p style={{ fontSize: 12, color: '#2C2C2A', margin: 0, lineHeight: 1.5 }}>{d.notas}</p>
          </Section>
        )}

        <Section title="Auditoría">
          <InfoRow label="Creado"      value={fmt(d.created_at)} />
          <InfoRow label="Actualizado" value={fmt(d.updated_at)} />
          {detalle?.accesos > 0 && (
            <InfoRow label="Accesos" value={`${detalle.accesos} vinculado${detalle.accesos !== 1 ? 's' : ''}`} />
          )}
        </Section>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={onEdit}
          style={{ padding: '8px 0', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Editar identidad
        </button>
        <button onClick={() => router.push(`/admin/accesos?identidad_id=${d.id}`)}
          style={{ padding: '8px 0', background: '#fff', color: '#534AB7', border: '1px solid #534AB7', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Ver accesos
        </button>
        <button onClick={onDelete}
          style={{ padding: '8px 0', background: '#fff', color: '#E24B4A', border: '1px solid #E24B4A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Eliminar
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.8, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 12, color: '#888780' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: highlight === 'red' ? '#E24B4A' : '#2C2C2A', maxWidth: 170, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function IconCopy() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
}
