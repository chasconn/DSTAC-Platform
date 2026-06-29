'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// El panel admin aplica zoom (--ui-zoom, ver Sidebar.js) al contenedor
// .admin-shell-main vía la propiedad CSS no estándar `zoom` (globals.css).
// Esa propiedad rompe `position:fixed` en los descendientes: quedan fijos
// respecto al contenedor zoomeado en vez del viewport real, así que cualquier
// modal/toast con position:fixed anidado directamente en el árbol del panel
// aparece mal ubicado si el usuario tiene el zoom distinto de 100%.
//
// Este wrapper renderiza su contenido en document.body, escapando ese
// contexto — mismo resultado que ya tenían los overlays construidos a mano
// con document.createElement (preview de cotizaciones, informes PDF).
// active=false (p.ej. un panel que solo se vuelve overlay fixed en mobile,
// vía CSS .detail-side-panel + @media) → renderiza inline, sin portal, para
// no romper su posición normal dentro del layout en desktop.
export default function FixedPortal({ children, active = true }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!active) return children
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

// Mismo breakpoint (820px) que usa Sidebar.js para su propio modo móvil.
// Útil para paneles tipo .detail-side-panel que solo necesitan escapar el
// contexto de zoom cuando realmente están en modo overlay fixed (mobile).
export function useIsMobile(breakpoint = 820) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [breakpoint])
  return isMobile
}
