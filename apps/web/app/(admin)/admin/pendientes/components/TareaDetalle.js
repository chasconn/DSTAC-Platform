'use client'

// Panel de detalle de una tarea — SOLO LECTURA.
// Permite ver título completo, descripción y metadatos sin entrar a editar.
// Recibe la tarea ya cargada (objeto de la lista), así que no hace fetch extra.

const PRIORITY_STYLE = {
  critical: { bg: '#FCEBEB', color: '#791F1F', label: 'Crítica'  },
  high:     { bg: '#FEF3E2', color: '#633806', label: 'Alta'     },
  medium:   { bg: '#FAEEDA', color: '#854F0B', label: 'Media'    },
  low:      { bg: '#F1EFE8', color: '#444441', label: 'Baja'     },
}
const STATUS_STYLE = {
  pending:     { bg: '#E6F1FB', color: '#0C447C', label: 'Pendiente'   },
  in_progress: { bg: '#EEEDFE', color: '#3C3489', label: 'En progreso' },
  done:        { bg: '#EAF3DE', color: '#27500A', label: 'Completada'  },
  cancelled:   { bg: '#F1EFE8', color: '#888780', label: 'Cancelada'   },
}

function Badge({ value, map }) {
  if (!value) return null
  const s = map[value]
  return <span style={{ background: s?.bg ?? '#F1EFE8', color: s?.color ?? '#444441', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s?.label ?? value}</span>
}

const fmtFecha = (s) => { try { return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return s } }

export default function TareaDetalle({ tarea, onClose, onEdit }) {
  if (!tarea) return null

  const t = tarea
  const vencida = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'cancelled'

  // Filas de metadatos (se omiten las vacías).
  const filas = [
    ['Empresa',     t.company_name],
    ['Personal',    t.personal_nombre],
    ['Analista',    t.assigned_name?.trim() || null],
    ['Vence',       t.due_date ? fmtFecha(t.due_date) : null],
    ['Creada por',  t.created_by_name?.trim() || null],
    ['Creada',      t.created_at ? fmtFecha(t.created_at) : null],
  ].filter(([, v]) => v)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,20,.35)', zIndex: 80 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(460px, 94vw)', background: '#fff', zIndex: 81, boxShadow: '-8px 0 30px rgba(0,0,0,.18)', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{t.title}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#888780', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge value={t.priority} map={PRIORITY_STYLE} />
          <Badge value={t.status}   map={STATUS_STYLE} />
          {vencida && <span style={{ fontSize: 12, background: '#FCEBEB', color: '#791F1F', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>Vencida</span>}
        </div>

        {/* Descripción */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Descripción</div>
          {t.description
            ? <div style={{ fontSize: 14, color: '#444441', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{t.description}</div>
            : <div style={{ fontSize: 13, color: '#B4B2A9', fontStyle: 'italic' }}>Sin descripción.</div>}
        </div>

        {/* Metadatos */}
        <div style={{ marginTop: 22, display: 'grid', gap: 10 }}>
          {filas.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, borderBottom: '1px solid #f1efe8', paddingBottom: 8 }}>
              <span style={{ color: '#888780' }}>{k}</span>
              <b style={{ color: '#2C2C2A', textAlign: 'right', maxWidth: 260, wordBreak: 'break-word' }}>{v}</b>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontSize: 13.5 }}>Cerrar</button>
          <button onClick={() => onEdit(t)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>Editar</button>
        </div>
      </div>
    </>
  )
}
