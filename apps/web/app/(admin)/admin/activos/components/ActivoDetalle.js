'use client'

import { useRouter } from 'next/navigation'

const CRIT = {
  critica: { bg: '#FCEBEB', color: '#791F1F', label: 'Crítica' },
  alta:    { bg: '#FAEEDA', color: '#633806', label: 'Alta' },
  media:   { bg: '#EAF3DE', color: '#27500A', label: 'Media' },
  baja:    { bg: '#F1EFE8', color: '#444441', label: 'Baja' },
}
const ESTADO = {
  operativo:         { bg: '#EAF3DE', color: '#27500A', label: 'Operativo' },
  degradado:         { bg: '#FAEEDA', color: '#633806', label: 'Degradado' },
  fuera_de_servicio: { bg: '#FCEBEB', color: '#791F1F', label: 'Fuera de servicio' },
  en_mantencion:     { bg: '#EEEDFE', color: '#3C3489', label: 'En mantención' },
}
const AMBIENTE = {
  produccion: { bg: '#EEEDFE', color: '#3C3489', label: 'Producción' },
  desarrollo: { bg: '#EAF3DE', color: '#27500A', label: 'Desarrollo' },
  testing:    { bg: '#F1EFE8', color: '#444441', label: 'Testing' },
  staging:    { bg: '#FAEEDA', color: '#633806', label: 'Staging' },
}

function Badge({ map, value }) {
  if (!value) return null
  const cfg = map[value] ?? { bg: '#F1EFE8', color: '#444441', label: value }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  )
}

function Campo({ label, value, mono }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#2C2C2A', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </div>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {titulo}
      </div>
      {children}
    </div>
  )
}

function formatFecha(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ActivoDetalle({ activo, onClose, onEdit, onDelete }) {
  const router = useRouter()

  // Extraer campos técnicos desde metadata si vienen como objeto o desde campos planos
  const meta = activo.metadata && typeof activo.metadata === 'object' ? activo.metadata : {}
  const ip               = activo.ip               ?? meta.ip               ?? null
  const sistema_operativo = activo.sistema_operativo ?? meta.sistema_operativo ?? null
  const version          = activo.version           ?? meta.version           ?? null
  const tieneTecnicos    = ip || sistema_operativo || version

  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderLeft: '1px solid #e2e0d8',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid #f1efe8',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A', marginBottom: 6, lineHeight: 1.3 }}>
            {activo.nombre}
          </div>
          {/* Badges de estado en fila */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Badge map={CRIT}    value={activo.criticidad} />
            <Badge map={ESTADO}  value={activo.estado} />
            <Badge map={AMBIENTE} value={activo.ambiente} />
          </div>
        </div>
        <button
          onClick={onClose}
          title="Cerrar"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#B4B2A9', fontSize: 16, padding: 2, flexShrink: 0,
            lineHeight: 1,
          }}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Cuerpo */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>

        <Seccion titulo="Información general">
          <Campo label="Tipo"        value={activo.tipo} />
          <Campo label="Proveedor"   value={activo.proveedor} />
          <Campo label="Responsable" value={activo.responsable_nombre} />
          <Campo label="Proyecto"    value={activo.proyecto} />
        </Seccion>

        {/* Campos técnicos — solo si al menos uno tiene valor */}
        {tieneTecnicos && (
          <Seccion titulo="Campos técnicos">
            <Campo label="IP"                value={ip}                mono />
            <Campo label="Sistema operativo" value={sistema_operativo} />
            <Campo label="Versión"           value={version} />
          </Seccion>
        )}

        {activo.documentacion && (
          <Seccion titulo="Documentación">
            <div style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {activo.documentacion}
            </div>
          </Seccion>
        )}

        <Seccion titulo="Auditoría">
          <Campo label="Creado"       value={formatFecha(activo.created_at)} />
          <Campo label="Actualizado"  value={formatFecha(activo.updated_at)} />
        </Seccion>
      </div>

      {/* Footer con acciones */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f1efe8',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <button onClick={onEdit} style={btnPrimario}>
          <i className="ti ti-pencil" style={{ fontSize: 13 }} />
          Editar activo
        </button>

        <button
          onClick={() => router.push(`/admin/identidades?activo_id=${activo.id}`)}
          style={btnGhost}
        >
          <i className="ti ti-shield-lock" style={{ fontSize: 13 }} />
          Ver identidades relacionadas
        </button>

        <button onClick={onDelete} style={btnDanger}>
          <i className="ti ti-trash" style={{ fontSize: 13 }} />
          Eliminar activo
        </button>
      </div>
    </div>
  )
}

const btnBase = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  width: '100%', padding: '8px 12px', borderRadius: 7,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
}
const btnPrimario = { ...btnBase, background: '#3C3489', color: '#fff' }
const btnGhost    = { ...btnBase, background: '#EEEDFE', color: '#3C3489', border: '1px solid #d0cdf5' }
const btnDanger   = { ...btnBase, background: '#FCEBEB', color: '#791F1F', border: '1px solid #f5c6c6' }
