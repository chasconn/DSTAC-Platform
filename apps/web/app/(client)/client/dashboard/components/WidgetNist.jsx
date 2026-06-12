'use client'

import { useState } from 'react'

// ── NIST ─────────────────────────────────────────────────────────────────────

const CX = 55, CY = 60, R = 42

const FUNCIONES = [
  { key: 'identificar', label: 'Identificar', short: 'Id' },
  { key: 'proteger',    label: 'Proteger',    short: 'P'  },
  { key: 'detectar',    label: 'Detectar',    short: 'D'  },
  { key: 'responder',   label: 'Responder',   short: 'R'  },
  { key: 'recuperar',   label: 'Recuperar',   short: 'Rc' },
]

function angle(i) { return (i * 72 - 90) * Math.PI / 180 }
function vertex(i, r = R) {
  return { x: CX + r * Math.cos(angle(i)), y: CY + r * Math.sin(angle(i)) }
}
function polyStr(r) {
  return Array.from({ length: 5 }, (_, i) => {
    const v = vertex(i, r)
    return `${v.x.toFixed(1)},${v.y.toFixed(1)}`
  }).join(' ')
}

function lvlColor(pct) {
  if (pct >= 70) return { bar: '#059669', text: '#047857', label: 'Gestionado' }
  if (pct >= 50) return { bar: '#534AB7', text: '#3730A3', label: 'Parcial'    }
  if (pct >= 30) return { bar: '#D97706', text: '#92400E', label: 'Parcial'    }
  return          { bar: '#DC2626', text: '#B91C1C', label: 'Inicial'     }
}

const LABEL_POS = FUNCIONES.map((_, i) => {
  const v = vertex(i, R + 16)
  return { x: parseFloat(v.x.toFixed(1)), y: parseFloat(v.y.toFixed(1)) }
})

const GRIDS = [1, 0.75, 0.5, 0.25]

function InfoStrip({ text }) {
  return (
    <div style={{
      padding: '8px 14px',
      borderTop: '0.5px solid rgba(83,74,183,0.15)',
      display: 'flex', alignItems: 'flex-start', gap: 6,
    }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: '#7F77DD', flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 11, color: '#6155BD', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

function NistView({ nist }) {
  const dataStr = FUNCIONES.map((f, i) => {
    const pct = nist[f.key] ?? 0
    const r   = (pct / 100) * R
    const v   = vertex(i, r)
    return `${v.x.toFixed(1)},${v.y.toFixed(1)}`
  }).join(' ')

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', padding: '10px 14px', gap: 12, flex: 1 }}>
      {/* Radar SVG */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <svg viewBox="-25 -12 155 145" style={{ width: 160, minWidth: 140 }}>
          {GRIDS.map(frac => (
            <polygon key={frac} points={polyStr(R * frac)}
              fill="none"
              stroke={`rgba(83,74,183,${frac === 1 ? 0.4 : 0.15})`}
              strokeWidth={frac === 1 ? 0.8 : 0.5} />
          ))}
          {FUNCIONES.map((_, i) => {
            const v = vertex(i)
            return <line key={i} x1={CX} y1={CY} x2={v.x.toFixed(1)} y2={v.y.toFixed(1)}
              stroke="rgba(83,74,183,0.3)" strokeWidth="0.5" />
          })}
          <polygon points={dataStr} fill="#534AB7" fillOpacity="0.2" stroke="#534AB7" strokeWidth="1.5" />
          {FUNCIONES.map((f, i) => {
            const pct = nist[f.key] ?? 0
            const r   = (pct / 100) * R
            const v   = vertex(i, r)
            return <circle key={f.key} cx={v.x.toFixed(1)} cy={v.y.toFixed(1)} r="2.5" fill="#534AB7" />
          })}
          {FUNCIONES.map((f, i) => {
            const pct  = nist[f.key] ?? 0
            const clr  = lvlColor(pct)
            const lx   = LABEL_POS[i].x
            const ly   = LABEL_POS[i].y
            const text = `${f.short} ${pct}%`
            const rw   = 8 + text.length * 5
            return (
              <g key={f.key}>
                <rect x={lx - rw / 2} y={ly - 7} width={rw} height={13} rx="3"
                  fill="rgba(255,255,255,0.92)" stroke="rgba(83,74,183,0.25)" strokeWidth="0.5" />
                <text x={lx} y={ly + 3.5} textAnchor="middle"
                  fontSize="8.5" fontWeight="500" fill={clr.text}>{text}</text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Barras */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 9, minWidth: 0 }}>
        {FUNCIONES.map(f => {
          const pct = nist[f.key] ?? 0
          const clr = lvlColor(pct)
          return (
            <div key={f.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: '#4A43A8' }}>{f.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1740' }}>{pct}%</span>
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: `${clr.bar}22`, color: clr.text, border: `0.5px solid ${clr.bar}44` }}>
                    {clr.label}
                  </span>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(83,74,183,0.1)' }}>
                <div style={{ height: 5, borderRadius: 3, background: clr.bar, width: `${pct}%`, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )
        })}
        <div style={{ marginTop: 4, paddingTop: 8, borderTop: '0.5px solid rgba(83,74,183,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#6155BD' }}>Promedio NIST</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1740' }}>{nist.promedio ?? '—'}%</span>
        </div>
      </div>
    </div>
  )
}

// ── ISO ───────────────────────────────────────────────────────────────────────

function isoLevel(pct) {
  if (pct >= 91) return { label: 'Completamente alineado', color: '#059669', bg: '#D1FAE5' }
  if (pct >= 76) return { label: 'Alineamiento alto',      color: '#059669', bg: '#D1FAE5' }
  if (pct >= 51) return { label: 'Alineamiento medio',     color: '#D97706', bg: '#FEF3C7' }
  if (pct >= 26) return { label: 'Alineamiento bajo',      color: '#D97706', bg: '#FEF3C7' }
  return               { label: 'Alineamiento crítico',    color: '#DC2626', bg: '#FEE2E2' }
}

function isoDomainColor(score) {
  if (score >= 76) return '#059669'
  if (score >= 26) return '#D97706'
  return '#DC2626'
}

function IsoGapRing({ score, color, size = 90 }) {
  const sw     = 8
  const radius = (size - sw) / 2
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(83,74,183,0.1)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={size/2} y={size/2 - 4} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={20} fontWeight="800" fontFamily="inherit">{score}</text>
      <text x={size/2} y={size/2 + 13} textAnchor="middle" dominantBaseline="central"
        fill="#B4B2A9" fontSize={10} fontFamily="inherit">/ 100</text>
    </svg>
  )
}

function IsoView({ iso }) {
  const score   = iso?.score_total ?? null
  const gap     = iso?.gap_total   ?? null
  const domains = iso?.domains     ?? []

  if (score === null) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', color: '#888780' }}>
        <i className="ti ti-shield-off" style={{ fontSize: 28, marginBottom: 10, color: '#B4B2A9' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#4A43A8', marginBottom: 4 }}>Sin evaluación ISO activa</div>
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>El equipo DSTAC aún no ha iniciado la evaluación ISO 27001 para tu empresa.</div>
      </div>
    )
  }

  const lvl   = isoLevel(score)
  const color = lvl.color

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', padding: '10px 14px', gap: 14, flex: 1 }}>
      {/* Anillo + texto */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
        <IsoGapRing score={score} color={color} />
        <span style={{ background: lvl.bg, color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textAlign: 'center', maxWidth: 110, lineHeight: 1.3 }}>
          {lvl.label}
        </span>
        <div style={{ fontSize: 11, color: '#6155BD' }}>
          <strong style={{ color: '#1a1740' }}>{gap}%</strong> por cerrar
        </div>
      </div>

      {/* Dominios */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, minWidth: 0 }}>
        {/* Barra global */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#4A43A8', fontWeight: 600 }}>Alineamiento global</span>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>ISO/IEC 27001:2022</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(83,74,183,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}99, ${color})`, width: `${score}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Barras por dominio */}
        {domains.map(d => {
          const ds    = d.score ?? 0
          const dc    = d.color ?? isoDomainColor(ds)
          return (
            <div key={d.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: dc, background: dc + '15', padding: '1px 6px', borderRadius: 4, letterSpacing: 0.3 }}>{d.id}</span>
                  <span style={{ fontSize: 11, color: '#4A43A8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: dc, flexShrink: 0, marginLeft: 4 }}>{ds}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 3, background: 'rgba(83,74,183,0.1)' }}>
                <div style={{ height: 4, borderRadius: 3, background: dc, width: `${ds}%`, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Widget principal ──────────────────────────────────────────────────────────

export default function WidgetNist({ stats }) {
  const [mode, setMode] = useState('nist')

  const nist = stats?.nist ?? {}
  const iso  = stats?.iso  ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Toggle NIST / ISO */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: '8px 14px 0',
        borderBottom: '0.5px solid rgba(83,74,183,0.12)',
        marginBottom: 2,
      }}>
        {[
          { id: 'nist', label: 'NIST CSF', icon: 'ti-chart-radar' },
          { id: 'iso',  label: 'ISO 27001', icon: 'ti-shield-bolt' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setMode(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', border: 'none', cursor: 'pointer', background: 'none',
              fontSize: 12, fontWeight: mode === tab.id ? 700 : 400,
              color:       mode === tab.id ? '#3C3489' : '#888780',
              borderBottom: `2px solid ${mode === tab.id ? '#534AB7' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
            }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {mode === 'nist'
        ? <NistView nist={nist} />
        : <IsoView  iso={iso}  />
      }

      {/* Info strip */}
      <InfoStrip text={mode === 'nist'
        ? 'El NIST CSF mide preparación en 5 áreas: Identificar, Proteger, Detectar, Responder y Recuperar. Evaluado por DSTAC.'
        : 'El ISO 27001:2022 Annex A cubre 93 controles en 4 dominios (A5-A8). Muestra el % de alineamiento de tu empresa.'
      } />
    </div>
  )
}
