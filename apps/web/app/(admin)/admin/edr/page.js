'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'

// ── Helpers de estilo / datos ─────────────────────────────────────────────────
function nivelStyle(lvl) {
  if (lvl >= 12) return { label: 'Crítico', color: '#791F1F', bg: '#FCEBEB' }
  if (lvl >= 7)  return { label: 'Alto',    color: '#854F0B', bg: '#FAEEDA' }
  if (lvl >= 4)  return { label: 'Medio',   color: '#7A5C00', bg: '#FFF6DD' }
  return { label: 'Bajo', color: '#27500A', bg: '#EAF3DE' }
}
function scoreColor(s) {
  if (s >= 80) return '#1D9E75'
  if (s >= 50) return '#C98A1E'
  return '#D8543F'
}
function parseJsonArr(v) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
}
function fechaHora(d) {
  if (!d) return '—'
  const opts = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
  let date = new Date(d)
  if (isNaN(date.getTime())) date = new Date(String(d).replace(' ', 'T') + 'Z')
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL', opts)
}
function diaCorto(d) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '') } catch { return d.slice(5) }
}

// ── Mini-gráficos SVG (sin librerías) ──────────────────────────────────────────
function Donut({ segments, total, size = 150 }) {
  const r = size / 2 - 15, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EFEDE6" strokeWidth="13" />
      {total > 0 && segments.map((s, i) => {
        const len = (s.value / total) * circ
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="13"
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray .6s ease' }} />
        )
        offset += len
        return el
      })}
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize="30" fontWeight="800" fill="#2C2C2A">{total}</text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize="10.5" fill="#9A988F">alertas</text>
    </svg>
  )
}

function Ring({ pct, size = 92 }) {
  const r = size / 2 - 7, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r
  const len = (Math.max(0, Math.min(100, pct)) / 100) * circ
  const col = scoreColor(pct)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EFEDE6" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${len} ${circ - len}`} transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray .7s ease' }} />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="21" fontWeight="800" fill={col}>{pct}%</text>
    </svg>
  )
}

export default function EdrPage() {
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [stats,   setStats]   = useState(null)
  const [agents,  setAgents]  = useState([])
  const [sinAsig, setSinAsig] = useState([])
  const [sca,     setSca]     = useState([])
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [nivelMin, setNivelMin] = useState('')
  const [busca,    setBusca]    = useState('')
  const [limite,   setLimite]   = useState('20')
  const [toast,    setToast]    = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  const slug    = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}

  const cargar = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (nivelMin) params.set('nivel_min', nivelMin)
      if (busca)    params.set('q', busca)
      params.set('limit', limite === 'todas' ? '1000' : limite)
      const [st, ag, al, sc] = await Promise.all([
        api.get('/api/admin/edr/stats', headers),
        api.get('/api/admin/edr/agents', headers),
        api.get(`/api/admin/edr/alerts?${params}`, headers),
        api.get('/api/admin/edr/sca', headers),
      ])
      setStats(st)
      setAgents(ag.agents ?? [])
      setAlerts(al.alerts ?? [])
      setSca(sc.sca ?? [])
      if ((st?.sin_asignar ?? 0) > 0) {
        const sa = await api.get('/api/admin/edr/agents/sin-asignar', headers)
        setSinAsig(sa.agents ?? [])
      } else setSinAsig([])
    } catch (err) {
      showToast(err.message || 'Error cargando datos del EDR', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, nivelMin, busca, limite])

  useEffect(() => { cargar() }, [slug, limite])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3400)
  }

  async function responder(wazuhId, action, target, label) {
    if (!confirm(`¿${label}${target ? ' ' + target : ''}?\nEsta acción se ejecuta en el endpoint (${wazuhId}).`)) return
    try {
      const data = await api.post(`/api/admin/edr/agents/${wazuhId}/responder`, { action, target }, headers)
      showToast(data.message || 'Acción enviada')
    } catch (err) {
      showToast(err.message || 'Error en la respuesta activa', 'error')
    }
  }

  const protegida = stats?.proteccion_activa !== false

  async function toggleProteccion() {
    const next = !protegida
    if (!confirm(next
      ? '¿Activar la protección EDR de esta empresa?'
      : '¿Desactivar la protección EDR?\n\nSe dejarán de ingestar alertas de sus agentes y no se podrá ejecutar respuesta activa hasta reactivarla.')) return
    try {
      await api.put('/api/admin/edr/proteccion', { enabled: next }, headers)
      showToast(next ? 'Protección ACTIVADA' : 'Protección DESACTIVADA')
      await cargar()
    } catch (err) {
      showToast(err.message || 'Error al cambiar la protección', 'error')
    }
  }

  async function bloquearTodo() {
    if (!confirm('¿Bloquear TODAS las IPs de origen detectadas en las alertas de esta empresa?\n\nSe ejecuta firewall-drop en los endpoints correspondientes (solo agentes activos).')) return
    try {
      const data = await api.post('/api/admin/edr/bloquear-todo', {}, headers)
      showToast(data.message || 'Bloqueo masivo enviado')
      await cargar()
    } catch (err) {
      showToast(err.message || 'Error en el bloqueo masivo', 'error')
    }
  }

  async function asignar(wazuhId) {
    try {
      await api.post(`/api/admin/edr/agents/${wazuhId}/asignar`, {}, headers)
      showToast(`Agente ${wazuhId} asignado a ${empresaActiva.name}`)
      await cargar()
    } catch (err) {
      showToast(err.message || 'Error al asignar', 'error')
    }
  }

  if (!empresaActiva) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🛡️</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2A', margin: '0 0 8px' }}>Ninguna empresa seleccionada</h2>
        <p style={{ fontSize: 13, color: '#888780' }}>Selecciona una empresa para ver su EDR.</p>
      </div>
    )
  }

  // ── Agregaciones para los gráficos ──────────────────────────────────────────
  const dist = { crit: 0, alto: 0, medio: 0, bajo: 0 }
  alerts.forEach(a => {
    if (a.rule_level >= 12) dist.crit++
    else if (a.rule_level >= 7) dist.alto++
    else if (a.rule_level >= 4) dist.medio++
    else dist.bajo++
  })
  const donutSegs = [
    { label: 'Crítico', value: dist.crit,  color: '#D8543F' },
    { label: 'Alto',    value: dist.alto,  color: '#E0992E' },
    { label: 'Medio',   value: dist.medio, color: '#E6C34D' },
    { label: 'Bajo',    value: dist.bajo,  color: '#5DA63A' },
  ]
  const donutTotal = alerts.length

  const tacticCount = {}
  alerts.forEach(a => parseJsonArr(a.mitre_tactics).forEach(t => { tacticCount[t] = (tacticCount[t] || 0) + 1 }))
  const topTactics = Object.entries(tacticCount).map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, 6)
  const tacticMax = Math.max(...topTactics.map(t => t.value), 1)

  const KPIS = stats ? [
    { label: 'Agentes activos', value: `${stats.agentes.activos}/${stats.agentes.total}`, color: '#0F6E56', icon: IconShield },
    { label: 'Alertas 24h',     value: stats.alertas.ultimas_24h, color: '#185FA5', icon: IconPulse },
    { label: 'Críticas',        value: stats.alertas.criticas,    color: '#D8543F', icon: IconFlame },
    { label: 'Altas',           value: stats.alertas.altas,       color: '#C98A1E', icon: IconWarn },
    { label: 'Incidentes',      value: stats.alertas.incidentes ?? 0, color: '#534AB7', icon: IconBolt },
    { label: 'Correcciones',    value: stats.correcciones?.total ?? 0, color: '#0F6E56', icon: IconCheck },
  ] : []

  const visibles = nivelMin ? alerts.filter(a => a.rule_level >= Number(nivelMin)) : alerts

  return (
    <div style={{ padding: 26, maxWidth: 1240, margin: '0 auto' }}>
      <style>{`
        @keyframes edrPulse { 0%{box-shadow:0 0 0 0 rgba(29,158,117,.55)} 70%{box-shadow:0 0 0 7px rgba(29,158,117,0)} 100%{box-shadow:0 0 0 0 rgba(29,158,117,0)} }
        @keyframes edrFade { from{opacity:0; transform:translateY(7px)} to{opacity:1; transform:none} }
        .edr-card{ animation: edrFade .35s ease both; transition: transform .15s ease, box-shadow .15s ease; }
        .edr-lift:hover{ transform: translateY(-3px); box-shadow: 0 16px 36px -14px rgba(60,52,137,.32) !important; }
        .edr-row{ transition: background .12s ease; }
        .edr-row:hover{ background: #FAFAF7; }
        .edr-dot-live{ animation: edrPulse 2.2s infinite; }
        .edr-bar{ transition: width .7s cubic-bezier(.2,.8,.2,1); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#3C3489,#6E63D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -8px rgba(60,52,137,.6)' }}>
            <IconShield color="#fff" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#2C2C2A', margin: 0, letterSpacing: -0.3 }}>EDR · Detección y respuesta</h1>
            <p style={{ fontSize: 12.5, color: '#888780', margin: '3px 0 0' }}>Telemetría de endpoints de {empresaActiva.name} · <span style={{ color: '#7F77DD' }}>Wazuh</span></p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleProteccion} title="Activar / desactivar la protección de esta empresa"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: protegida ? '#EAF6F1' : '#FCEBEB', color: protegida ? '#0F6E56' : '#791F1F' }}>
            <span className={protegida ? 'edr-dot-live' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: protegida ? '#1D9E75' : '#C0392B' }} />
            {protegida ? 'Protección activa' : 'Protección inactiva'}
            <span style={{ fontSize: 10, opacity: 0.65, fontWeight: 600 }}>{protegida ? '· desactivar' : '· activar'}</span>
          </button>
          <button onClick={cargar} disabled={loading} title="Actualizar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: loading ? 'wait' : 'pointer', fontSize: 12.5, fontWeight: 600 }}>
            <IconRefresh color="#534AB7" /> {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ marginBottom: 16, background: toast.type === 'error' ? '#FCEBEB' : '#EAF6F1', borderRadius: 10, padding: '10px 15px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#0F6E56', fontWeight: 600, animation: 'edrFade .3s ease' }}>
          {toast.msg}
        </div>
      )}

      {!protegida && stats && (
        <div style={{ marginBottom: 16, background: '#FCEBEB', border: '1px solid #F0C4C4', borderRadius: 10, padding: '11px 15px', fontSize: 12.5, color: '#791F1F', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 15 }}>⛔</span>
          <span>Protección EDR <strong>desactivada</strong> para {empresaActiva.name}: no se ingestan alertas nuevas ni se puede ejecutar respuesta activa. Reactívala con el botón <strong>"Protección inactiva → activar"</strong> de arriba.</span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 14, marginBottom: 18 }}>
        {KPIS.map(k => (
          <div key={k.label} className="edr-card edr-lift" style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: k.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <k.icon color={k.color} />
              </div>
              <div>
                <div style={{ fontSize: 25, fontWeight: 800, color: '#2C2C2A', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 11.5, color: '#888780', marginTop: 3 }}>{k.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Banner sin asignar */}
      {sinAsig.length > 0 && (
        <div className="edr-card" style={{ ...cardStyle, marginBottom: 18, background: '#FFFBF0', borderColor: '#EAD9A6' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#633806', marginBottom: 10 }}>
            {sinAsig.length} agente{sinAsig.length !== 1 ? 's' : ''} sin asignar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sinAsig.map(a => (
              <div key={a.wazuh_id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: '#2C2C2A' }}><strong>{a.wazuh_id}</strong> · {a.name || 'sin nombre'} · {a.ip || '—'}</span>
                <button onClick={() => asignar(a.wazuh_id)}
                  style={{ padding: '5px 13px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Asignar a {empresaActiva.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview: severidad + MITRE + correcciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="edr-card" style={cardStyle}>
          <div style={titleStyle}>Distribución por severidad</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 6 }}>
            <Donut segments={donutSegs} total={donutTotal} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {donutSegs.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                  <span style={{ color: '#444441', minWidth: 52 }}>{s.label}</span>
                  <strong style={{ color: '#2C2C2A' }}>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="edr-card" style={cardStyle}>
          <div style={titleStyle}>Top tácticas MITRE ATT&CK</div>
          {topTactics.length === 0 ? (
            <div style={{ color: '#9A988F', fontSize: 12.5, padding: '18px 0' }}>Aún no hay tácticas detectadas en las alertas cargadas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 8 }}>
              {topTactics.map((t, i) => (
                <div key={t.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444441', marginBottom: 4 }}>
                    <span>{t.label}</span><strong style={{ color: '#2C2C2A' }}>{t.value}</strong>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: '#F1EFE8', overflow: 'hidden' }}>
                    <div className="edr-bar" style={{ width: `${(t.value / tacticMax) * 100}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg,#534AB7,#8B82E8)` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Correcciones (7 días) */}
        <div className="edr-card" style={cardStyle}>
          <div style={titleStyle}>Correcciones (7 días)</div>
          {(() => {
            const serie = stats?.correcciones?.serie ?? []
            const max = Math.max(...serie.map(d => d.n), 1)
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 84, marginTop: 14 }}>
                  {serie.map(d => (
                    <div key={d.dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: '#888780', fontWeight: 700, height: 12 }}>{d.n || ''}</span>
                      <div className="edr-bar" title={`${d.dia}: ${d.n}`} style={{ width: '100%', height: d.n ? Math.max(8, (d.n / max) * 62) : 3, borderRadius: 5, background: d.n ? 'linear-gradient(180deg,#6E63D8,#3C3489)' : '#EFEDE6' }} />
                      <span style={{ fontSize: 9.5, color: '#9A988F' }}>{diaCorto(d.dia)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: '#888780', marginTop: 10 }}>Total histórico: <strong style={{ color: '#2C2C2A' }}>{stats?.correcciones?.total ?? 0}</strong> respuestas activas</div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Agentes + Cumplimiento, lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: sca.length > 0 ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr', gap: 16, marginBottom: 24, alignItems: 'start' }}>
        {/* Columna: Agentes */}
        <div>
          <div style={{ ...titleStyle, fontSize: 15, margin: '4px 2px 12px' }}>Agentes</div>
          {agents.length === 0 ? (
            <div className="edr-card" style={{ ...cardStyle, textAlign: 'center', color: '#9A988F', fontSize: 13, padding: 28 }}>
              Aún no hay agentes asignados a esta empresa.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {agents.map(a => {
                const activo = a.status === 'active'
                return (
                  <div key={a.wazuh_id} className="edr-card edr-lift" style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={activo ? 'edr-dot-live' : ''} style={{ width: 10, height: 10, borderRadius: '50%', background: activo ? '#1D9E75' : '#C0392B', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A' }}>{a.name || a.wazuh_id}</div>
                          <div style={{ fontSize: 11, color: '#9A988F' }}>ID {a.wazuh_id} · {a.ip || 's/IP'}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: activo ? '#EAF6F1' : '#FCEBEB', color: activo ? '#0F6E56' : '#791F1F' }}>
                        {activo ? 'Activo' : 'Desconectado'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1EFE8', fontSize: 11.5, color: '#888780' }}>
                      <span><strong style={{ color: '#534AB7', fontSize: 14 }}>{a.total_alertas ?? 0}</strong> alertas</span>
                      <span>visto {fechaHora(a.last_keepalive)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Columna: Cumplimiento CIS/SCA */}
        {sca.length > 0 && (
          <div>
            <div style={{ ...titleStyle, fontSize: 15, margin: '4px 2px 4px' }}>Cumplimiento (CIS / SCA)</div>
            <p style={{ fontSize: 12, color: '#9A988F', margin: '0 2px 12px' }}>Evaluación de configuración segura por endpoint (benchmark CIS de Wazuh).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sca.map((s, i) => (
                <div key={`${s.wazuh_id}-${i}`} className="edr-card edr-lift" style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Ring pct={s.score} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#2C2C2A' }}>{s.agent_name || s.wazuh_id}</div>
                    <div style={{ fontSize: 11, color: '#9A988F', margin: '2px 0 8px', lineHeight: 1.4 }}>{s.policy || s.policy_id}</div>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: '#1D9E75', fontWeight: 700 }}>✓ {s.passed}</span>
                      <span style={{ color: '#9A988F' }}> / </span>
                      <span style={{ color: '#D8543F', fontWeight: 700 }}>✗ {s.failed}</span>
                      <span style={{ color: '#9A988F' }}> de {s.total_checks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alertas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ ...titleStyle, fontSize: 15, margin: '0 2px' }}>Alertas recientes</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={bloquearTodo} title="Bloquear todas las IPs de origen detectadas"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#C0392B,#E2574C)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 6px 16px -8px rgba(192,57,43,.7)' }}>
            ⨯ Bloquear todo
          </button>
          <select value={limite} onChange={e => setLimite(e.target.value)} style={inputStyle} title="Cantidad de alertas a mostrar">
            <option value="10">Ver 10</option>
            <option value="20">Ver 20</option>
            <option value="50">Ver 50</option>
            <option value="100">Ver 100</option>
            <option value="todas">Ver todas</option>
          </select>
          <select value={nivelMin} onChange={e => setNivelMin(e.target.value)} style={inputStyle}>
            <option value="">Todos los niveles</option>
            <option value="4">Nivel ≥ 4 (medio)</option>
            <option value="7">Nivel ≥ 7 (alto)</option>
            <option value="12">Nivel ≥ 12 (crítico)</option>
          </select>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…"
            onKeyDown={e => e.key === 'Enter' && cargar()} style={{ ...inputStyle, width: 150 }} />
          <button onClick={cargar} style={{ padding: '8px 15px', borderRadius: 9, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Filtrar</button>
        </div>
      </div>

      <div className="edr-card" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9A988F', fontSize: 13 }}>Cargando…</div>
        ) : visibles.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9A988F', fontSize: 13 }}>No hay alertas. Cuando un agente genere eventos, aparecerán aquí.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#FAFAF7', color: '#9A988F', textAlign: 'left' }}>
                  <th style={th}>Fecha</th><th style={th}>Nivel</th><th style={th}>Agente</th>
                  <th style={th}>Descripción</th><th style={th}>MITRE</th><th style={th}>Origen</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(al => {
                  const ns = nivelStyle(al.rule_level)
                  const tactics = parseJsonArr(al.mitre_tactics)
                  return (
                    <tr key={al.id} className="edr-row" style={{ borderTop: '1px solid #F1EFE8' }}>
                      <td style={td}>{fechaHora(al.event_time)}</td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: ns.bg, color: ns.color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ns.color }} />{al.rule_level} · {ns.label}
                        </span>
                      </td>
                      <td style={td}>{al.agent_name || al.wazuh_id}</td>
                      <td style={{ ...td, maxWidth: 340 }}>
                        {al.rule_description || '—'}
                        {al.incidente_id ? (
                          <span style={{ marginLeft: 8, background: '#EEEDFE', color: '#3C3489', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>→ Incidente #{al.incidente_id}</span>
                        ) : null}
                      </td>
                      <td style={td}>
                        {tactics.length ? tactics.map(t => (
                          <span key={t} style={{ display: 'inline-block', background: '#F1EFE8', color: '#6A675E', fontSize: 10, padding: '1px 7px', borderRadius: 5, marginRight: 4, marginBottom: 3 }}>{t}</span>
                        )) : '—'}
                      </td>
                      <td style={td}>
                        {al.src_ip || '—'}
                        {al.src_ip && al.wazuh_id && (
                          <button onClick={() => responder(al.wazuh_id, 'bloquear_ip', al.src_ip, `Bloquear IP ${al.src_ip}`)}
                            title="Bloquear esta IP en el endpoint (respuesta activa)"
                            style={{ marginLeft: 6, padding: '2px 9px', borderRadius: 6, border: '1px solid #f0c4c4', background: '#FDF4F4', color: '#791F1F', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ⨯ Bloquear
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── estilos compartidos ─────────────────────────────────────────────────────
const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid #ECEAE3', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,.03), 0 10px 26px -16px rgba(60,52,137,.18)' }
const titleStyle = { fontSize: 13, fontWeight: 700, color: '#2C2C2A' }
const inputStyle = { padding: '8px 11px', borderRadius: 9, border: '1px solid #e2e0d8', fontSize: 12, background: '#fff' }
const th = { padding: '11px 15px', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: .3 }
const td = { padding: '10px 15px', color: '#2C2C2A', verticalAlign: 'top' }

// ── íconos ───────────────────────────────────────────────────────────────────
function IconShield({ color, size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>) }
function IconPulse({ color }) { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>) }
function IconFlame({ color }) { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>) }
function IconWarn({ color }) { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>) }
function IconBolt({ color }) { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>) }
function IconRefresh({ color }) { return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>) }
function IconCheck({ color }) { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>) }
