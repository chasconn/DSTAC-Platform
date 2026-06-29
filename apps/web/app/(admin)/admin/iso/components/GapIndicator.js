'use client'

function gapLevel(pct) {
  if (pct >= 91) return { label: 'Completamente alineado', color: '#1D9E75', bg: '#EAF3DE', textColor: '#27500A' }
  if (pct >= 76) return { label: 'Alineamiento alto',      color: '#1D9E75', bg: '#EAF3DE', textColor: '#27500A' }
  if (pct >= 51) return { label: 'Alineamiento medio',     color: '#EF9F27', bg: '#FAEEDA', textColor: '#633806' }
  if (pct >= 26) return { label: 'Alineamiento bajo',      color: '#EF9F27', bg: '#FAEEDA', textColor: '#633806' }
  return                { label: 'Alineamiento crítico',   color: '#E24B4A', bg: '#FCEBEB', textColor: '#791F1F' }
}

export default function GapIndicator({ scoreTotal = 0, gapTotal = 100, domains = [] }) {
  const score = Math.round(Number(scoreTotal) || 0)
  const gap   = Math.round(Number(gapTotal)   || 100)
  const level = gapLevel(score)

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: '24px 28px', marginBottom: 20 }}>
      {/* Score principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        {/* Anillo grande */}
        <GapRing score={score} size={120} color={level.color} />

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#888780', marginBottom: 4 }}>Madurez ISO 27001:2022</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: level.color, lineHeight: 1 }}>{score}%</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ background: level.bg, color: level.textColor, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
              {level.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#888780', marginTop: 8 }}>
            Te faltan <strong style={{ color: '#2C2C2A' }}>{gap}%</strong> para alineamiento completo
          </div>
        </div>
      </div>

      {/* Barra de progreso grande */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 12, background: '#f1efe8', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            width: `${score}%`, height: '100%', borderRadius: 99,
            background: `linear-gradient(90deg, ${level.color}CC, ${level.color})`,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#B4B2A9' }}>
          <span>0%</span>
          <span>Alineamiento completo 100%</span>
        </div>
      </div>

      {/* Minibarra por dominio */}
      {domains.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: 10 }}>
          {domains.map(d => {
            const ds = Math.round(Number(d.score) || 0)
            const dl = gapLevel(ds)
            return (
              <div key={d.id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: d.color ?? dl.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>{d.id}</div>
                <div style={{ height: 5, background: '#f1efe8', borderRadius: 99, overflow: 'hidden', marginBottom: 3 }}>
                  <div style={{ width: `${ds}%`, height: '100%', background: dl.color, borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: dl.color }}>{ds}%</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GapRing({ score, size = 120, color }) {
  const sw     = 10
  const radius = (size - sw) / 2
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1efe8" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={size/2} y={size/2 - 6} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={28} fontWeight="800" fontFamily="inherit">{score}</text>
      <text x={size/2} y={size/2 + 16} textAnchor="middle" dominantBaseline="central"
        fill="#B4B2A9" fontSize={13} fontFamily="inherit">/ 100</text>
    </svg>
  )
}
