'use client'

// Subnavegación del módulo Pendientes: 3 pestañas que enrutan a las subvistas.
// Marca como activa la pestaña según el pathname actual.
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/pendientes/mis-tareas', label: 'Mis tareas', icon: 'ti-checklist' },
  { href: '/admin/pendientes/calendario', label: 'Calendario', icon: 'ti-calendar-month' },
  { href: '/admin/pendientes/actividad',  label: 'Actividad',  icon: 'ti-history' },
]

export default function PendientesSubnav() {
  const pathname = usePathname()

  return (
    <div className="pendientes-subnav">
      {TABS.map(t => {
        const active = pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`subnav-tab${active ? ' active' : ''}`}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 16 }} />
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
