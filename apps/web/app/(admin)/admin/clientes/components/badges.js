// Colores de badge según el prompt
export const STATUS_STYLES = {
  active:    { bg: '#EAF3DE', color: '#27500A', dot: '#639922',  label: 'Activo'     },
  setup:     { bg: '#FAEEDA', color: '#633806', dot: '#EF9F27',  label: 'Setup'      },
  suspended: { bg: '#FCEBEB', color: '#791F1F', dot: '#E24B4A',  label: 'Suspendido' },
  cancelled: { bg: '#F1EFE8', color: '#444441', dot: '#B4B2A9',  label: 'Cancelado'  },
}

export const PLAN_STYLES = {
  enterprise:  { bg: '#EEEDFE', color: '#3C3489', label: 'Enterprise'  },
  profesional: { bg: '#E6F1FB', color: '#0C447C', label: 'Profesional' },
  pyme:        { bg: '#F1EFE8', color: '#444441', label: 'PYME'        },
}

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.setup
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

export function PlanBadge({ plan }) {
  const p = PLAN_STYLES[plan] || PLAN_STYLES.pyme
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: p.bg, color: p.color, fontSize: 11, fontWeight: 600 }}>
      {p.label}
    </span>
  )
}

// Genera las iniciales del nombre de la empresa para el avatar
export function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}
