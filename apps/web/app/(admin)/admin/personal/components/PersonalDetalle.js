'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../../lib/api'

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
const ESTADO_LABEL = { activo: 'Activo', vacaciones: 'Vacaciones', inactivo: 'Inactivo', desvinculado: 'Desvinculado' }
const NIVEL_LABEL  = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

function getInitials(nombre) {
  return (nombre || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function fmt(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PersonalDetalle({ persona, empresaSlug, onClose, onEdit, onDelete }) {
  const router = useRouter()
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    setDetalle(null)
    api.get(`/api/admin/personal/${persona.id}`, { 'X-Company-Slug': empresaSlug })
      .then(setDetalle)
      .catch(() => setDetalle(persona))
  }, [persona.id])

  const p = detalle ?? persona
  const avatarStyle = ESTADO_STYLE[p.estado] || { bg: '#F1EFE8', color: '#444441' }

  return (
    <div style={{
      width: 280, minWidth: 280, background: '#fff',
      borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e0d8' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: 2 }}>×</button>
        </div>

        {/* Avatar grande */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: avatarStyle.bg, color: avatarStyle.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700,
          }}>
            {getInitials(p.nombre)}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A' }}>{p.nombre}</div>
            {p.rol_empresarial && <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{p.rol_empresarial}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {p.estado && (
              <span style={{ ...badge, background: ESTADO_STYLE[p.estado]?.bg, color: ESTADO_STYLE[p.estado]?.color }}>
                {ESTADO_LABEL[p.estado] ?? p.estado}
              </span>
            )}
            {p.nivel_responsabilidad && (
              <span style={{ ...badge, background: NIVEL_STYLE[p.nivel_responsabilidad]?.bg, color: NIVEL_STYLE[p.nivel_responsabilidad]?.color }}>
                {NIVEL_LABEL[p.nivel_responsabilidad] ?? p.nivel_responsabilidad}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        <Section title="Contacto">
          <InfoRow label="Correo"   value={p.correo   || '—'} />
          <InfoRow label="Teléfono" value={p.telefono || '—'} />
        </Section>

        <Section title="Información laboral">
          <InfoRow label="Rol"            value={p.rol_empresarial ?? '—'} />
          <InfoRow label="Nivel"          value={p.nivel_responsabilidad ? NIVEL_LABEL[p.nivel_responsabilidad] : '—'} />
          <InfoRow label="Fecha ingreso"  value={fmt(p.fecha_ingreso)} />
        </Section>

        {/* Identidades asociadas */}
        <Section title="Identidades asociadas">
          {detalle?.identidades > 0 ? (
            <button
              onClick={() => router.push(`/admin/identidades?propietario_id=${p.id}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 12, fontWeight: 600, padding: 0 }}
            >
              Ver {detalle.identidades} identidad{detalle.identidades !== 1 ? 'es' : ''} →
            </button>
          ) : (
            <span style={{ fontSize: 12, color: '#B4B2A9' }}>Sin identidades asociadas</span>
          )}
        </Section>

        <Section title="Auditoría">
          <InfoRow label="Creado"       value={fmt(p.created_at)} />
          <InfoRow label="Actualizado"  value={fmt(p.updated_at)} />
        </Section>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={onEdit}
          style={{ padding: '8px 0', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Editar persona
        </button>
        <button onClick={() => router.push(`/admin/identidades?propietario_id=${p.id}`)}
          style={{ padding: '8px 0', background: '#fff', color: '#534AB7', border: '1px solid #534AB7', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Ver identidades
        </button>
        <button onClick={onDelete}
          style={{ padding: '8px 0', background: '#fff', color: '#E24B4A', border: '1px solid #E24B4A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Eliminar
        </button>
      </div>
    </div>
  )
}

const badge = { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.8, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ fontSize: 12, color: '#888780' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#2C2C2A', fontWeight: 500, maxWidth: 160, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}
