'use client'

// SVG anillo de score reutilizable
// Props: value (0-100), size (px), strokeWidth, showLabel
export default function NistScoreRing({ value = 0, size = 80, strokeWidth = 7, showLabel = true, fontSize }) {
  const pct     = Math.min(100, Math.max(0, Number(value) || 0))
  const radius  = (size - strokeWidth) / 2
  const circ    = 2 * Math.PI * radius
  const offset  = circ - (pct / 100) * circ
  const color   = pct >= 81 ? '#1D9E75'
                : pct >= 61 ? '#1D9E75'
                : pct >= 41 ? '#EF9F27'
                : pct >= 21 ? '#E24B4A'
                :             '#E24B4A'

  const labelSize = fontSize ?? Math.round(size * 0.24)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      {/* Track gris */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e2e0d8" strokeWidth={strokeWidth}
      />
      {/* Arco de progreso */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      {showLabel && (
        <>
          <text
            x={size / 2} y={size / 2 - labelSize * 0.15}
            textAnchor="middle" dominantBaseline="central"
            fill={color} fontSize={labelSize} fontWeight="800"
            fontFamily="inherit"
          >
            {Math.round(pct)}
          </text>
          <text
            x={size / 2} y={size / 2 + labelSize * 0.9}
            textAnchor="middle" dominantBaseline="central"
            fill="#B4B2A9" fontSize={labelSize * 0.55}
            fontFamily="inherit"
          >
            / 100
          </text>
        </>
      )}
    </svg>
  )
}
