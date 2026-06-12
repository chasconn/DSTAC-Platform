'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { api } from '../../lib/api'
import WidgetWrapper from './WidgetWrapper'

// Constraints canónicos — siempre aplicados en render, ignorando lo guardado en BD
const CONSTRAINTS = {
  'security-score': { minW: 2, minH: 2 },
  'incidentes':     { minW: 2, minH: 2 },
  'activos':        { minW: 2, minH: 2 },
  'identidades':    { minW: 2, minH: 2 },
  'nist':           { minW: 3, minH: 3 },
}

export default function DashboardGrid({ layout: initialLayout, variants: initialVariants = {}, stats }) {
  const [layout,   setLayout]   = useState(initialLayout)
  const [variants, setVariants] = useState(initialVariants)
  const [containerWidth, setContainerWidth] = useState(1200)
  const containerRef = useRef(null)
  const saveTimer    = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.offsetWidth)
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const persist = useCallback((newLayout, newVariants) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.post('/api/client/dashboard/layout', { layout: newLayout, variants: newVariants }).catch(() => {})
    }, 900)
  }, [])

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout)
    persist(newLayout, variants)
  }, [variants, persist])

  const handleVariantChange = useCallback((widgetId, newVariant) => {
    const newVariants = { ...variants, [widgetId]: newVariant }
    setVariants(newVariants)
    // Guardar variante inmediatamente (sin debounce)
    api.post('/api/client/dashboard/layout', { layout, variants: newVariants }).catch(() => {})
  }, [variants, layout])

  // Aplica constraints canónicos sobre el layout guardado (sobrescribe minH/minW viejos)
  const constrainedLayout = layout.map(item => ({
    ...item,
    ...(CONSTRAINTS[item.i] ?? {}),
  }))

  return (
    <div ref={containerRef}>
      <GridLayout
        layout={constrainedLayout}
        width={containerWidth}
        cols={12}
        rowHeight={88}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        useCSSTransforms
      >
        {constrainedLayout.map(item => (
          <div key={item.i}>
            <WidgetWrapper
              id={item.i}
              width={item.w}
              height={item.h}
              stats={stats}
              initialVariant={variants[item.i] ?? 'A'}
              onVariantChange={handleVariantChange}
            />
          </div>
        ))}
      </GridLayout>
    </div>
  )
}
