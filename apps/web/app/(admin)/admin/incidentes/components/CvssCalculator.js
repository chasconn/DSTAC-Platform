'use client'

import { useState } from 'react'

// ── CVSS v3.1 weights ─────────────────────────────────────────────────────────
const W_AV  = { N: 0.85, A: 0.62, L: 0.55, P: 0.20 }
const W_AC  = { L: 0.77, H: 0.44 }
const W_PR  = { U: { N: 0.85, L: 0.62, H: 0.27 }, C: { N: 0.85, L: 0.50, H: 0.50 } }
const W_UI  = { N: 0.85, R: 0.62 }
const W_CIA = { N: 0.00, L: 0.22, H: 0.56 }

function roundup(x) {
  const i = Math.round(x * 100000)
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10
}

function calcScore(m) {
  const iscBase = 1 - (1 - W_CIA[m.C]) * (1 - W_CIA[m.I]) * (1 - W_CIA[m.A])
  const isc = m.S === 'U'
    ? 6.42 * iscBase
    : 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15)
  if (isc <= 0) return 0
  const ess = 8.22 * W_AV[m.AV] * W_AC[m.AC] * W_PR[m.S][m.PR] * W_UI[m.UI]
  return m.S === 'U'
    ? roundup(Math.min(isc + ess, 10))
    : roundup(Math.min(1.08 * (isc + ess), 10))
}

function severityOf(score) {
  if (score === 0) return { label: 'None',     color: '#888780', bg: '#F1EFE8' }
  if (score < 4)   return { label: 'Low',      color: '#639922', bg: '#EAF3DE' }
  if (score < 7)   return { label: 'Medium',   color: '#C47A1A', bg: '#FAEEDA' }
  if (score < 9)   return { label: 'High',     color: '#C04C0A', bg: '#FDE8D8' }
  return                  { label: 'Critical', color: '#791F1F', bg: '#FCEBEB' }
}

const METRICS = [
  {
    key: 'AV', label: 'Attack Vector',
    opts: [{ v: 'N', label: 'Network' }, { v: 'A', label: 'Adjacent' }, { v: 'L', label: 'Local' }, { v: 'P', label: 'Physical' }],
  },
  {
    key: 'AC', label: 'Attack Complexity',
    opts: [{ v: 'L', label: 'Low' }, { v: 'H', label: 'High' }],
  },
  {
    key: 'PR', label: 'Privileges Required',
    opts: [{ v: 'N', label: 'None' }, { v: 'L', label: 'Low' }, { v: 'H', label: 'High' }],
  },
  {
    key: 'UI', label: 'User Interaction',
    opts: [{ v: 'N', label: 'None' }, { v: 'R', label: 'Required' }],
  },
  {
    key: 'S', label: 'Scope',
    opts: [{ v: 'U', label: 'Unchanged' }, { v: 'C', label: 'Changed' }],
  },
  {
    key: 'C', label: 'Confidentiality',
    opts: [{ v: 'N', label: 'None' }, { v: 'L', label: 'Low' }, { v: 'H', label: 'High' }],
  },
  {
    key: 'I', label: 'Integrity',
    opts: [{ v: 'N', label: 'None' }, { v: 'L', label: 'Low' }, { v: 'H', label: 'High' }],
  },
  {
    key: 'A', label: 'Availability',
    opts: [{ v: 'N', label: 'None' }, { v: 'L', label: 'Low' }, { v: 'H', label: 'High' }],
  },
]

// Rows: AV solo / AC+PR / UI+S / C+I+A
const ROWS = [
  [METRICS[0]],
  [METRICS[1], METRICS[2]],
  [METRICS[3], METRICS[4]],
  [METRICS[5], METRICS[6], METRICS[7]],
]

const DEFAULTS = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' }

export default function CvssCalculator({ onApply, onClose }) {
  const [m, setM] = useState(DEFAULTS)

  const score = calcScore(m)
  const sev   = severityOf(score)
  const vec   = `CVSS:3.1/AV:${m.AV}/AC:${m.AC}/PR:${m.PR}/UI:${m.UI}/S:${m.S}/C:${m.C}/I:${m.I}/A:${m.A}`

  return (
    <div style={{ marginTop: 8, background: '#f8f7f4', border: '1px solid #e2e0d8', borderRadius: 10, padding: '16px 18px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2C2C2A', letterSpacing: 0.2 }}>Calculadora CVSS v3.1</span>
        <button type="button" onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
      </div>

      {/* Metric rows */}
      {ROWS.map((rowMetrics, ri) => (
        <div key={ri} style={{
          display: 'grid',
          gridTemplateColumns: rowMetrics.map(() => '1fr').join(' '),
          gap: 10, marginBottom: 10,
        }}>
          {rowMetrics.map(metric => (
            <div key={metric.key}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                {metric.label}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {metric.opts.map(opt => {
                  const active = m[metric.key] === opt.v
                  return (
                    <button key={opt.v} type="button" onClick={() => setM(p => ({ ...p, [metric.key]: opt.v }))}
                      style={{
                        padding: '4px 9px', borderRadius: 6, fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        border: active ? '1.5px solid #3C3489' : '1px solid #d8d5ce',
                        background: active ? '#3C3489' : '#fff',
                        color: active ? '#fff' : '#444441',
                        cursor: 'pointer', transition: 'all 0.1s',
                        whiteSpace: 'nowrap',
                      }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Score result */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '12px 16px', background: '#fff', borderRadius: 8, border: `1px solid ${sev.bg}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: sev.color, lineHeight: 1 }}>{score.toFixed(1)}</span>
          <span style={{ fontSize: 12, color: '#888780' }}>/ 10</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: sev.bg, color: sev.color }}>
            {sev.label}
          </span>
          <button type="button" onClick={() => { onApply(score.toFixed(1)); onClose() }}
            style={{ padding: '7px 16px', background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Aplicar
          </button>
        </div>
      </div>

      {/* Vector string */}
      <div style={{ marginTop: 8, fontSize: 10, color: '#B4B2A9', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {vec}
      </div>
    </div>
  )
}
