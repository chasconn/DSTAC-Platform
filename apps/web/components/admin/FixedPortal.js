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
export default function FixedPortal({ children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
