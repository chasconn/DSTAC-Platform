'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getUser, clearSession } from '../../lib/auth'
import EmpresaSelectorModal from './EmpresaSelectorModal'

const NAV = [
  { href: '/admin/dashboard',  label: 'Dashboard',  icon: IconDashboard  },
  { href: '/admin/clientes',   label: 'Clientes',   icon: IconClientes   },
  { href: '/admin/prospectos', label: 'Prospectos', icon: IconProspectos },
  { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: IconCotizaciones },
  { href: '/admin/usuarios',   label: 'Usuarios',   icon: IconUsuarios   },
  { href: '/admin/personal',   label: 'Personal',   icon: IconPersonal   },
  { href: '/admin/activos',    label: 'Activos',    icon: IconActivos    },
  { href: '/admin/identidades', label: 'Identidades', icon: IconIdentidades },
  { href: '/admin/accesos',     label: 'Accesos',     icon: IconAccesos     },
  { href: '/admin/incidentes',  label: 'Incidentes',  icon: IconIncidentes  },
  { href: '/admin/riesgos',     label: 'Riesgos',     icon: IconRiesgos     },
  { href: '/admin/nist',        label: 'NIST',        icon: IconNist        },
  { href: '/admin/iso',         label: 'ISO 27001',   icon: IconIso         },
  { href: '/admin/edr',         label: 'EDR',         icon: IconEdr         },
  { href: '/admin/pendientes',  label: 'Pendientes',  icon: IconPendientes  },
  { href: '/admin/sitio',       label: 'Sitio web',   icon: IconSitio       },
]

export default function Sidebar() {
  const [collapsed, setCollapsed]         = useState(false)
  const [user, setUser]                   = useState(null)
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [selectorOpen, setSelectorOpen]   = useState(false)
  const [isMobile, setIsMobile]           = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [theme, setTheme]                 = useState('light')
  const pathname = usePathname()
  const router   = useRouter()

  // Tema (claro/oscuro): se persiste en localStorage y se refleja en <html data-theme>.
  // El script en el layout raíz ya lo aplicó antes del paint; aquí solo sincronizamos el estado.
  useEffect(() => {
    try { setTheme(localStorage.getItem('dstac_theme') === 'dark' ? 'dark' : 'light') } catch {}
  }, [])
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('dstac_theme', next) } catch {}
    if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
  }

  // Tamaño del texto/UI (zoom del panel): persiste en localStorage y se aplica como
  // variable CSS --ui-zoom (el layout la lee antes del paint para evitar saltos).
  const [uiZoom, setUiZoom] = useState(1)
  useEffect(() => {
    try { const z = parseFloat(localStorage.getItem('dstac_ui_zoom')); if (z) setUiZoom(z) } catch {}
  }, [])
  function cambiarZoom(z) {
    const v = Math.round(z * 100) / 100
    setUiZoom(v)
    try { localStorage.setItem('dstac_ui_zoom', String(v)) } catch {}
    document.documentElement.style.setProperty('--ui-zoom', String(v))
  }

  // Leer localStorage solo tras el mount — evita hydration mismatch
  useEffect(() => {
    setUser(getUser())
    const raw = localStorage.getItem('empresa_activa')
    if (raw) { setEmpresaActiva(JSON.parse(raw)); return }
    // Sin empresa seleccionada → por defecto la interna DSTAC
    fetch('/api/admin/empresas/selector', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const internas = data?.internas ?? []
        const dstac = internas.find(e => /dstac/i.test(e.slug || e.name || '')) || internas[0]
        if (!dstac) return
        const obj = {
          id: dstac.id, name: dstac.name, slug: dstac.slug,
          plan: dstac.plan_name, interno: dstac.is_internal === 1,
        }
        localStorage.setItem('empresa_activa', JSON.stringify(obj))
        setEmpresaActiva(obj)
        window.dispatchEvent(new Event('empresa_activa_changed'))
      })
      .catch(() => {})
  }, [])

  // Sincronizar chip cuando cambia la empresa activa (misma pestaña o cruzada)
  useEffect(() => {
    function syncEmpresa() {
      const updated = localStorage.getItem('empresa_activa')
      setEmpresaActiva(updated ? JSON.parse(updated) : null)
    }
    function onStorage(e) {
      if (e.key === 'empresa_activa') syncEmpresa()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('empresa_activa_changed', syncEmpresa)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('empresa_activa_changed', syncEmpresa)
    }
  }, [])

  // Responsive: detectar móvil; en móvil el menú es un drawer (no colapsado)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const upd = () => { setIsMobile(mq.matches); if (mq.matches) setCollapsed(false) }
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])
  // Cerrar el drawer al navegar
  useEffect(() => { setMobileOpen(false) }, [pathname])

  function limpiarEmpresa(e) {
    e.stopPropagation()
    localStorage.removeItem('empresa_activa')
    setEmpresaActiva(null)
    window.dispatchEvent(new Event('empresa_activa_changed'))
  }

  async function handleLogout() {
    await clearSession()
    window.location.href = '/login'
  }

  const enActivos      = pathname.startsWith('/admin/activos')
  const enPersonal     = pathname.startsWith('/admin/personal')
  const enIdentidades  = pathname.startsWith('/admin/identidades')
  const enAccesos      = pathname.startsWith('/admin/accesos')
  const enPendientes   = pathname.startsWith('/admin/pendientes')

  return (
    <>
      {isMobile && !mobileOpen && (
        <button onClick={() => setMobileOpen(true)} aria-label="Abrir menú"
          style={{ position: 'fixed', top: 10, left: 10, zIndex: 1001, width: 42, height: 42, borderRadius: 10,
                   background: '#26215C', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                   boxShadow: '0 2px 12px rgba(0,0,0,.35)', cursor: 'pointer' }}>
          <IconMenu color="#fff" />
        </button>
      )}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 999 }} />
      )}
    <aside
      style={{
        width: isMobile ? 250 : (collapsed ? 52 : 210),
        minWidth: isMobile ? 250 : (collapsed ? 52 : 210),
        background: '#26215C',
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
      }}
    >
      {/* Logo + colapsar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 12px 12px', borderBottom: '1px solid #3C3489',
      }}>
        {!collapsed && (
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: 1, whiteSpace: 'nowrap' }}>
            DSTAC
          </span>
        )}
        <button
          onClick={() => isMobile ? setMobileOpen(false) : setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, marginLeft: collapsed ? 'auto' : 0 }}
          title={isMobile ? 'Cerrar' : (collapsed ? 'Expandir' : 'Colapsar')}
        >
          <IconMenu color="#AFA9EC" />
        </button>
      </div>

      {/* Chip de empresa activa */}
      {empresaActiva && (
        collapsed ? (
          /* Colapsado: solo el punto verde centrado */
          <div
            onMouseDown={e => e.preventDefault()}
            onClick={() => setSelectorOpen(true)}
            title={`${empresaActiva.name} — cambiar`}
            style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', cursor: 'pointer' }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', display: 'block' }} />
          </div>
        ) : (
          /* Expandido: chip completo */
          <div
            onMouseDown={e => e.preventDefault()}
            onClick={() => setSelectorOpen(true)}
            title="Cambiar empresa"
            style={{
              margin: '8px 8px 2px',
              padding: '7px 10px',
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(83,74,183,0.5)',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(83,74,183,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#CECBF6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {empresaActiva.name}
              </div>
              <div style={{ fontSize: 10, color: '#7F77DD', marginTop: 1 }}>
                {empresaActiva.plan ?? 'cambiar ↓'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: '#7F77DD', whiteSpace: 'nowrap' }}>cambiar ↓</span>
              <button
                onClick={limpiarEmpresa}
                title="Salir del contexto"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 13, padding: '1px 3px', borderRadius: 3, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F09595'; e.currentTarget.style.background = 'rgba(226,75,74,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#534AB7'; e.currentTarget.style.background = 'none' }}
              >
                ×
              </button>
            </div>
          </div>
        )
      )}

      {/* Modal selector — montado fuera del aside para no quedar cortado por overflow:hidden */}
      {selectorOpen && (
        <EmpresaSelectorModal
          empresaActiva={empresaActiva}
          onClose={() => setSelectorOpen(false)}
        />
      )}

      {/* Navegación */}
      <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <div key={href}>
              <Link
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 8px', borderRadius: 8, marginBottom: 2,
                  background: active ? '#3C3489' : 'transparent',
                  color: active ? '#fff' : '#AFA9EC',
                  textDecoration: 'none', fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  transition: 'background 0.15s',
                }}
                title={collapsed ? label : undefined}
              >
                <Icon color={active ? '#fff' : '#AFA9EC'} />
                {!collapsed && <span>{label}</span>}
              </Link>

              {/* Subitems de Activos */}
              {href === '/admin/activos' && enActivos && !collapsed && (
                <div style={{ marginBottom: 4 }}>
                  <Link href="/admin/activos"         style={subitemStyle(pathname === '/admin/activos')}>
                    <IconLista color={pathname === '/admin/activos' ? '#CECBF6' : '#7F77DD'} />
                    Lista de activos
                  </Link>
                  <Link href="/admin/activos?nuevo=1"    style={subitemStyle(false)}><IconPlus color="#7F77DD" />Nuevo activo</Link>
                  <Link href="/admin/activos?exportar=1" style={subitemStyle(false)}><IconDownload color="#7F77DD" />Exportar</Link>
                </div>
              )}

              {/* Subitems de Identidades */}
              {href === '/admin/identidades' && enIdentidades && !collapsed && (
                <div style={{ marginBottom: 4 }}>
                  <Link href="/admin/identidades"           style={subitemStyle(pathname === '/admin/identidades')}>
                    <IconLista color={pathname === '/admin/identidades' ? '#CECBF6' : '#7F77DD'} />
                    Lista de identidades
                  </Link>
                  <Link href="/admin/identidades?nuevo=1"    style={subitemStyle(false)}><IconPlus color="#7F77DD" />Nueva identidad</Link>
                  <Link href="/admin/identidades?exportar=1" style={subitemStyle(false)}><IconDownload color="#7F77DD" />Exportar</Link>
                </div>
              )}

              {/* Subitems de Personal */}
              {href === '/admin/personal' && enPersonal && !collapsed && (
                <div style={{ marginBottom: 4 }}>
                  <Link href="/admin/personal"           style={subitemStyle(pathname === '/admin/personal')}>
                    <IconLista color={pathname === '/admin/personal' ? '#CECBF6' : '#7F77DD'} />
                    Lista de personal
                  </Link>
                  <Link href="/admin/personal?nuevo=1"    style={subitemStyle(false)}><IconPlus color="#7F77DD" />Nueva persona</Link>
                  <Link href="/admin/personal?exportar=1" style={subitemStyle(false)}><IconDownload color="#7F77DD" />Exportar</Link>
                </div>
              )}

              {/* Subitems de Accesos */}
              {href === '/admin/accesos' && enAccesos && !collapsed && (
                <div style={{ marginBottom: 4 }}>
                  <Link href="/admin/accesos"           style={subitemStyle(pathname === '/admin/accesos')}>
                    <IconLista color={pathname === '/admin/accesos' ? '#CECBF6' : '#7F77DD'} />
                    Lista de accesos
                  </Link>
                  <Link href="/admin/accesos?nuevo=1"    style={subitemStyle(false)}><IconPlus color="#7F77DD" />Nuevo acceso</Link>
                  <Link href="/admin/accesos?exportar=1" style={subitemStyle(false)}><IconDownload color="#7F77DD" />Exportar</Link>
                </div>
              )}

              {/* Subitems de Pendientes */}
              {href === '/admin/pendientes' && enPendientes && !collapsed && (
                <div style={{ marginBottom: 4 }}>
                  <Link href="/admin/pendientes/mis-tareas" style={subitemStyle(pathname.startsWith('/admin/pendientes/mis-tareas'))}>
                    <IconLista color={pathname.startsWith('/admin/pendientes/mis-tareas') ? '#CECBF6' : '#7F77DD'} />
                    Mis tareas
                  </Link>
                  <Link href="/admin/pendientes/calendario" style={subitemStyle(pathname.startsWith('/admin/pendientes/calendario'))}>
                    <IconCalendar color={pathname.startsWith('/admin/pendientes/calendario') ? '#CECBF6' : '#7F77DD'} />
                    Calendario
                  </Link>
                  <Link href="/admin/pendientes/actividad" style={subitemStyle(pathname.startsWith('/admin/pendientes/actividad'))}>
                    <IconHistory color={pathname.startsWith('/admin/pendientes/actividad') ? '#CECBF6' : '#7F77DD'} />
                    Actividad
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Usuario + logout */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid #3C3489' }}>
        {!collapsed && user && (
          <div style={{ color: '#CECBF6', fontSize: 12, marginBottom: 8, padding: '0 4px', overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
            <div style={{ color: '#7F77DD', textTransform: 'capitalize' }}>
              {user.role?.replace(/_/g, ' ')}
            </div>
          </div>
        )}
        {/* Tamaño del texto (zoom del panel) */}
        {!collapsed && (
          <div style={{ padding: '4px 8px 10px' }}>
            <div style={{ fontSize: 11, color: '#7F77DD', fontWeight: 600, marginBottom: 5 }}>Tamaño del texto</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#AFA9EC', fontSize: 11, lineHeight: 1 }}>A</span>
              <input
                type="range" min="0.8" max="1.5" step="0.05" value={uiZoom}
                onChange={e => cambiarZoom(parseFloat(e.target.value))}
                title={`${Math.round(uiZoom * 100)}%`}
                style={{ flex: 1, accentColor: '#7F77DD', cursor: 'pointer' }}
              />
              <span style={{ color: '#AFA9EC', fontSize: 17, lineHeight: 1 }}>A</span>
            </div>
            {uiZoom !== 1 && (
              <button onClick={() => cambiarZoom(1)} style={{ background: 'none', border: 'none', color: '#7F77DD', fontSize: 10.5, cursor: 'pointer', padding: '4px 0 0', marginLeft: 'auto', display: 'block' }}>
                Restablecer ({Math.round(uiZoom * 100)}%)
              </button>
            )}
          </div>
        )}

        {/* Interruptor de tema claro/oscuro */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          style={{ marginBottom: 2, justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          {theme === 'dark' ? <IconSun color="#AFA9EC" /> : <IconMoon color="#AFA9EC" />}
          {!collapsed && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', background: 'none', border: 'none',
            cursor: 'pointer', padding: '7px 8px', borderRadius: 8,
            color: '#AFA9EC', fontSize: 13,
          }}
          title="Cerrar sesión"
        >
          <IconLogout color="#AFA9EC" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
    </>
  )
}

function subitemStyle(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '6px 10px 6px 28px',
    fontSize: 11, fontWeight: active ? 600 : 400,
    color: active ? '#CECBF6' : '#7F77DD',
    borderLeft: `3px solid ${active ? '#7F77DD' : 'transparent'}`,
    textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'color 0.12s',
  }
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────
function IconIdentidades({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <circle cx="8" cy="12" r="2"/>
      <path d="M13 10h5M13 14h3"/>
    </svg>
  )
}
function IconUsuarios({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconPersonal({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
    </svg>
  )
}
function IconActivos({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  )
}
function IconLista({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1" fill={color}/><circle cx="3" cy="12" r="1" fill={color}/><circle cx="3" cy="18" r="1" fill={color}/>
    </svg>
  )
}
function IconPlus({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconDownload({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function IconCalendar({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconHistory({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>
    </svg>
  )
}
function IconDashboard({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}
function IconClientes({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 21h18"/>
      <path d="M5 21V7l7-4 7 4v14"/>
      <path d="M9 21v-4h6v4"/>
      <path d="M9 11h.01M12 11h.01M15 11h.01"/>
      <path d="M9 15h.01M12 15h.01M15 15h.01"/>
    </svg>
  )
}
function IconProspectos({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>
    </svg>
  )
}
function IconAccesos({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function IconPendientes({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}
function IconCotizaciones({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
    </svg>
  )
}
function IconRiesgos({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.5" fill={color}/>
      <line x1="12" y1="12" x2="19" y2="7"/>
    </svg>
  )
}
function IconIncidentes({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function IconIso({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function IconNist({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function IconEdr({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}
function IconMenu({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}
function IconSitio({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}
function IconMoon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
function IconSun({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  )
}
function IconLogout({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
