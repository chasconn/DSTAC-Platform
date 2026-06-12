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

export default function ClientShell({ user, theme, children }) {
  const [collapsed, setCollapsed] = useState(false)

  const bg       = dashboardBg(theme.theme_color)
  const sidebar  = sidebarBg(theme.theme_color)
  const midRgb   = hexToRgbStr(theme.theme_mid)

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
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <ClientSidebar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--dash-bg)' }}>
        {children}
      </main>
    </div>
  )
}
