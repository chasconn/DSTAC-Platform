'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clearSession } from '../../lib/auth'

// Sección "Seguridad"
const NAV_SEGURIDAD = [
  { href: '/client/dashboard',   label: 'Dashboard',   icon: IconDashboard   },
  { href: '/client/personal',    label: 'Personal',    icon: IconPersonal    },
  { href: '/client/activos',     label: 'Activos',     icon: IconActivos     },
  { href: '/client/identidades', label: 'Identidades', icon: IconIdentidades },
  { href: '/client/accesos',     label: 'Accesos',     icon: IconAccesos     },
  { href: '/client/incidentes',  label: 'Incidentes',  icon: IconIncidentes, planRequired: 'profesional' },
  { href: '/client/riesgos',     label: 'Riesgos',     icon: IconRiesgos,    planRequired: 'profesional' },
  { href: '/client/nist',        label: 'NIST CSF',    icon: IconNist        },
  { href: '/client/iso',         label: 'ISO 27001',   icon: IconIso         },
]

// Sección "Gestión"
const NAV_GESTION = [
  { href: '/client/reportes',       label: 'Reportes',       icon: IconReportes      },
  { href: '/client/capacitaciones', label: 'Capacitaciones', icon: IconCapacitaciones },
  { href: '/client/documentos',     label: 'Documentos',     icon: IconDocumentos    },
  { href: '/client/certificados',   label: 'Certificados',   icon: IconCertificados  },
  { href: '/client/cotizaciones',   label: 'Cotizaciones',   icon: IconCotizaciones  },
  { href: '/client/contratos',      label: 'Contratos',      icon: IconContratos     },
]

const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 600,
  color: '#534AB7',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '10px 10px 4px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
}

export default function ClientSidebar({ user, collapsed, onToggle }) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Responsive: en celular el sidebar pasa a ser un drawer que se abre con
  // un botón flotante, en vez de quedar siempre ocupando ancho fijo.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    await clearSession()
    window.location.href = '/login'
  }

  function NavItem({ href, label, icon: Icon }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '7px 8px',
          borderRadius: active ? 0 : 6,
          borderLeft: active ? '3px solid #AFA9EC' : '3px solid transparent',
          marginBottom: 1,
          background: active ? 'rgba(83,74,183,0.3)' : 'transparent',
          color: active ? '#fff' : '#7F77DD',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: active ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(83,74,183,0.15)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
        title={effCollapsed ? label : undefined}
      >
        <Icon active={active} />
        {!effCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      </Link>
    )
  }

  // En celular siempre se muestra expandido dentro del drawer (no tiene
  // sentido un drawer angosto de solo iconos).
  const effCollapsed = isMobile ? false : collapsed

  return (
    <>
      {isMobile && !mobileOpen && (
        <button onClick={() => setMobileOpen(true)} aria-label="Abrir menú"
          style={{ position: 'fixed', top: 10, left: 10, zIndex: 1001, width: 42, height: 42, borderRadius: 10,
                   background: 'var(--sidebar-bg, #0f0d2e)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                   boxShadow: '0 2px 12px rgba(0,0,0,.35)', cursor: 'pointer' }}>
          <IconMenu />
        </button>
      )}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 999 }} />
      )}
    <aside
      style={{
        width: isMobile ? 250 : (collapsed ? 48 : 200),
        minWidth: isMobile ? 250 : (collapsed ? 48 : 200),
        background: 'var(--sidebar-bg, #0f0d2e)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        transition: 'transform .25s ease, width 0.2s, min-width 0.2s',
        overflow: 'hidden',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0,
        zIndex: isMobile ? 1000 : 'auto',
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        boxShadow: isMobile && mobileOpen ? '4px 0 24px rgba(0,0,0,.4)' : 'none',
        borderRight: '1px solid rgba(83,74,183,0.2)',
      }}
    >
      {/* Toggle */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: effCollapsed ? 'center' : 'space-between',
        padding: effCollapsed ? '0 12px' : '0 10px 0 14px',
        borderBottom: '1px solid rgba(83,74,183,0.2)',
        flexShrink: 0,
      }}>
        {!effCollapsed && (
          <span style={{ color: '#CECBF6', fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>
            Portal
          </span>
        )}
        <button
          onClick={() => isMobile ? setMobileOpen(false) : onToggle()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, borderRadius: 6, color: '#7F77DD',
            display: 'flex', alignItems: 'center',
          }}
          title={isMobile ? 'Cerrar' : (collapsed ? 'Expandir' : 'Colapsar')}
        >
          <IconMenu />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
        {!effCollapsed && (
          <div style={SECTION_LABEL}>Seguridad</div>
        )}
        {NAV_SEGURIDAD.map(item => (
          <NavItem key={item.href} {...item} />
        ))}

        {!effCollapsed && (
          <div style={{ ...SECTION_LABEL, marginTop: 6 }}>Gestión</div>
        )}
        {effCollapsed && <div style={{ height: 8 }} />}
        {NAV_GESTION.map(item => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '8px 6px',
        borderTop: '1px solid rgba(83,74,183,0.2)',
        flexShrink: 0,
      }}>
        {!effCollapsed && user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            marginBottom: 4,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(83,74,183,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#CECBF6',
              flexShrink: 0,
            }}>
              {(user.first_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 500, color: '#CECBF6',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.first_name || user.email}
              </div>
              <div style={{ fontSize: 12, color: '#7F77DD', textTransform: 'capitalize' }}>
                {user.role?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', background: 'none', border: 'none',
            cursor: 'pointer', padding: '6px 8px', borderRadius: 6,
            color: '#7F77DD', fontSize: 13,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(83,74,183,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          title="Cerrar sesión"
        >
          <IconLogout />
          {!effCollapsed && <span>Cerrar sesión</span>}
        </button>

        {!effCollapsed && (
          <div style={{
            textAlign: 'center',
            color: 'rgba(127,119,221,0.4)',
            fontSize: 9,
            marginTop: 6,
            letterSpacing: 0.4,
          }}>
            Powered by DSTAC
          </div>
        )}
      </div>
    </aside>
    </>
  )
}

// ─── Íconos ──────────────────────────────────────────────────────────────────
function ic(active) { return active ? '#CECBF6' : '#7F77DD' }

function IconMenu() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}
function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function IconDashboard({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}
function IconPersonal({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconActivos({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  )
}
function IconIdentidades({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconAccesos({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function IconIncidentes({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function IconRiesgos({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
function IconReportes({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}
function IconCapacitaciones({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}
function IconCertificados({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="8" r="6"/>
      <path d="M9 13.5 7.5 22l4.5-2.5 4.5 2.5-1.5-8.5"/>
    </svg>
  )
}
function IconCotizaciones({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}
function IconContratos({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <path d="M14 3v6h6"/>
      <path d="M9 17l2-2 2 2 3-3"/>
    </svg>
  )
}
function IconDocumentos({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  )
}
function IconNist({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function IconIso({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ic(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
