'use client'

import { useState, useCallback } from 'react'
import SecurityScoreWidget from './widgets/SecurityScoreWidget'
import NistWidget          from './widgets/NistWidget'
import IncidentesWidget    from './widgets/IncidentesWidget'
import ActivosWidget       from './widgets/ActivosWidget'
import IdentidadesWidget   from './widgets/IdentidadesWidget'

const WIDGETS = {
  'security-score': SecurityScoreWidget,
  nist:             NistWidget,
  incidentes:       IncidentesWidget,
  activos:          ActivosWidget,
  identidades:      IdentidadesWidget,
}

// Widgets sin variante B — no mostrar el botón de toggle
const NO_TOGGLE = new Set(['activos', 'security-score', 'nist'])

export default function WidgetWrapper({ id, width, height, stats, initialVariant = 'A', onVariantChange }) {
  const [variant, setVariant] = useState(initialVariant)
  const Widget = WIDGETS[id]
  if (!Widget) return null

  const handleToggle = useCallback(() => {
    const next = variant === 'A' ? 'B' : 'A'
    setVariant(next)
    onVariantChange?.(id, next)
  }, [variant, id, onVariantChange])

  return (
    <div className="widget-container">
      {/* Drag handle — con o sin botón de toggle */}
      <div className="widget-drag-handle">
        <i className="ti ti-grip-horizontal" aria-hidden="true"
          style={{ fontSize: 14, color: 'var(--color-border-secondary)' }} />
        {!NO_TOGGLE.has(id) && (
          <button
            className="widget-variant-toggle"
            onClick={handleToggle}
            title={`Cambiar a variante ${variant === 'A' ? 'B' : 'A'}`}
            aria-label="Cambiar visualización del widget"
          >
            <i className="ti ti-switch-horizontal" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Contenido del widget */}
      <div className="widget-content">
        <Widget stats={stats} width={width} height={height} variant={variant} />
      </div>
    </div>
  )
}
