'use client'
import { useState } from 'react'
import { apiFetch } from '../../../../../lib/api'

const NIVEL_LABEL  = { root: 'Root', administrador: 'Administrador', escritura: 'Escritura', lectura: 'Lectura', otro: 'Otro' }
const ESTADO_LABEL = { activo: 'Activo', expirado: 'Expirado', suspendido: 'Suspendido', pendiente_revision: 'Pendiente revisión', inactivo: 'Inactivo' }
const CRIT_LABEL   = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }
const ENTORNO_LABEL = { produccion: 'Producción', desarrollo: 'Desarrollo', testing: 'Testing', staging: 'Staging', otro: 'Otro' }

const NIVEL_STYLE = {
  root:          { bg: '#FCEBEB', color: '#791F1F' },
  administrador: { bg: '#FAEEDA', color: '#633806' },
  escritura:     { bg: '#EEEDFE', color: '#3C3489' },
  lectura:       { bg: '#EAF3DE', color: '#27500A' },
  otro:          { bg: '#F1EFE8', color: '#444441' },
}
const CRIT_STYLE = {
  critica: { bg: '#FCEBEB', color: '#791F1F' },
  alta:    { bg: '#FAEEDA', color: '#633806' },
  media:   { bg: '#EAF3DE', color: '#27500A' },
  baja:    { bg: '#F1EFE8', color: '#444441' },
}
const ESTADO_STYLE = {
  activo:             { bg: '#EAF3DE', color: '#27500A' },
  expirado:           { bg: '#FCEBEB', color: '#791F1F' },
  suspendido:         { bg: '#FAEEDA', color: '#633806' },
  pendiente_revision: { bg: '#EEEDFE', color: '#3C3489' },
  inactivo:           { bg: '#F1EFE8', color: '#444441' },
}

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
}

function Badge({ value, labelMap, styleMap }) {
  if (!value) return <span style={{ color: '#B4B2A9' }}>—</span>
  const s = styleMap?.[value]
  return (
    <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
      {labelMap?.[value] ?? value}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#B4B2A9', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#2C2C2A' }}>{children ?? '—'}</div>
    </div>
  )
}

export default function AccesoDetalle({ acceso, empresaSlug, onClose, onEdit, onDeleted }) {
  const [suspending, setSuspending] = useState(false)

  const esExpirado = acceso.estado === 'expirado'
  const esRoot     = acceso.nivel_acceso === 'root'

  async function handleSuspender() {
    if (suspending) return
    setSuspending(true)
    try {
      await apiFetch(`/api/admin/accesos/${acceso.id}`, {
        method: 'PUT',
        headers: { 'X-Company-Slug': empresaSlug },
        body: JSON.stringify({ estado: 'suspendido' }),
      })
      onDeleted()
    } catch (err) {
      alert(err.message || 'Error al suspender')
    } finally {
      setSuspending(false)
    }
  }

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(acceso.identidad_valor ?? '')
    } catch {
      /* no clipboard */
    }
  }

  return (
    <div style={{ width: 300, minWidth: 300, background: '#fff', borderLeft: '1px solid #e2e0d8', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1efe8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#888780', marginBottom: 4 }}>Detalle de acceso</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {acceso.identidad_valor}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, lineHeight: 1, padding: 2, flexShrink: 0 }}>×</button>
      </div>

      {/* Banners */}
      {esExpirado && (
        <div style={{ background: '#FFF0F0', borderBottom: '1px solid #F5C6C6', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>⛔</span>
          <span style={{ fontSize: 12, color: '#791F1F', fontWeight: 600 }}>Este acceso ha expirado</span>
        </div>
      )}
      {esRoot && !esExpirado && (
        <div style={{ background: '#FFFBF0', borderBottom: '1px solid #F5DFA0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>⚠️</span>
          <span style={{ fontSize: 12, color: '#633806', fontWeight: 600 }}>Acceso Root — revisar periódicamente</span>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>

        {/* Identidad */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#B4B2A9', marginBottom: 4 }}>Identidad</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#2C2C2A', fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>{acceso.identidad_valor}</span>
            <button onClick={handleCopiar} title="Copiar" style={{ background: 'none', border: '1px solid #e2e0d8', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: '#888780', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          {acceso.propietario_nombre && (
            <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>Propietario: {acceso.propietario_nombre}</div>
          )}
        </div>

        <Field label="Activo">
          <span>{acceso.activo_nombre}</span>
          {acceso.activo_tipo && <span style={{ color: '#888780', fontSize: 11, marginLeft: 6 }}>({acceso.activo_tipo})</span>}
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#B4B2A9', marginBottom: 4 }}>Nivel</div>
            <Badge value={acceso.nivel_acceso} labelMap={NIVEL_LABEL} styleMap={NIVEL_STYLE} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#B4B2A9', marginBottom: 4 }}>Estado</div>
            <Badge value={acceso.estado} labelMap={ESTADO_LABEL} styleMap={ESTADO_STYLE} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#B4B2A9', marginBottom: 4 }}>Criticidad</div>
            <Badge value={acceso.criticidad} labelMap={CRIT_LABEL} styleMap={CRIT_STYLE} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#B4B2A9', marginBottom: 4 }}>Entorno</div>
            <span style={{ fontSize: 13, color: '#2C2C2A' }}>{acceso.entorno ? (ENTORNO_LABEL[acceso.entorno] ?? acceso.entorno) : '—'}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1efe8', paddingTop: 14, marginTop: 4 }}>
          <Field label="Fecha otorgamiento">{fmtFecha(acceso.fecha_otorgamiento)}</Field>
          <Field label="Fecha expiración">{fmtFecha(acceso.fecha_expiracion)}</Field>
          <Field label="Autorizado por">{acceso.quien_autorizo}</Field>
          {acceso.justificacion && <Field label="Justificación">{acceso.justificacion}</Field>}
        </div>

        <div style={{ fontSize: 10, color: '#B4B2A9', marginTop: 8 }}>
          Creado: {fmtFecha(acceso.created_at)}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f1efe8', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => onEdit(acceso)}
          style={{ width: '100%', padding: '8px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', color: '#2C2C2A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Editar acceso
        </button>
        {acceso.estado === 'activo' && (
          <button onClick={handleSuspender} disabled={suspending}
            style={{ width: '100%', padding: '8px', borderRadius: 7, border: '1px solid #FAEEDA', background: '#FFFBF0', color: '#854F0B', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: suspending ? 0.7 : 1 }}>
            {suspending ? 'Suspendiendo…' : 'Suspender acceso'}
          </button>
        )}
      </div>
    </div>
  )
}
