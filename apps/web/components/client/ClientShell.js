'use client'

import { useState } from 'react'
import ClientSidebar from './ClientSidebar'

// Genera blanco plomito: 93% blanco + 7% del color del tema → tinte muy sutil
function dashboardBg(hex) {
  try {
    const pr = parseInt(hex.slice(1, 3), 16)
    const pg = parseInt(hex.slice(3, 5), 16)
    const pb = parseInt(hex.slice(5, 7), 16)
    const r  = Math.round(255 * 0.93 + pr * 0.07).toString(16).padStart(2, '0')
    const g  = Math.round(255 * 0.93 + pg * 0.07).toString(16).padStart(2, '0')
    const b  = Math.round(255 * 0.93 + pb * 0.07).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  } catch {
    return '#f1f1f7'
  }
}

// Genera el fondo del sidebar (más oscuro que el dashboard)
function sidebarBg(hex) {
  try {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * 0.27).toString(16).padStart(2, '0')
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * 0.27).toString(16).padStart(2, '0')
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * 0.34).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  } catch {
    return '#0f0d2e'
  }
}

// Convierte hex a "r, g, b" para usar en rgba() con CSS variables
function hexToRgbStr(hex) {
  try {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ].join(', ')
  } catch {
    return '83, 74, 183'
  }
}

export default function ClientShell({ user, theme, children, suplantando, empresaSlug }) {
  const [collapsed, setCollapsed] = useState(false)
  const [volviendo, setVolviendo] = useState(false)

  const bg       = dashboardBg(theme.theme_color)
  const sidebar  = sidebarBg(theme.theme_color)
  const midRgb   = hexToRgbStr(theme.theme_mid)

  async function volverAlPanel() {
    setVolviendo(true)
    try {
      const r = await fetch('/api/auth/volver-admin', { method: 'POST', credentials: 'include' })
      if (!r.ok) throw new Error((await r.json()).error || 'No se pudo volver')
      window.location.href = '/admin/dashboard'
    } catch (e) {
      alert(e.message || 'No se pudo volver al panel admin')
      setVolviendo(false)
    }
  }

  return (
    <div
      style={{
        '--brand-color':   theme.theme_color,
        '--brand-light':   theme.theme_light,
        '--brand-mid':     theme.theme_mid,
        '--brand-mid-rgb': midRgb,
        '--dash-bg':       bg,
        '--sidebar-bg':    sidebar,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {suplantando && (
        <div style={{ background: '#26215C', color: '#fff', padding: '8px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, flexShrink: 0, zIndex: 10 }}>
          <span>👁 Estás viendo el portal como cliente{empresaSlug ? ` de "${empresaSlug}"` : ''} — modo prueba, no es tu sesión real.</span>
          <button onClick={volverAlPanel} disabled={volviendo}
            style={{ background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.35)', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: volviendo ? 'wait' : 'pointer' }}>
            {volviendo ? 'Volviendo…' : '← Volver al panel admin'}
          </button>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ClientSidebar
          user={user}
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--dash-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
