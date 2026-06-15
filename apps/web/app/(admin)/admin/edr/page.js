'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'

// Color por severidad del nivel de regla Wazuh (0–15).
function nivelStyle(lvl) {
  if (lvl >= 12) return { label: 'Crítico', color: '#791F1F', bg: '#FCEBEB' }
  if (lvl >= 7)  return { label: 'Alto',    color: '#633806', bg: '#FAEEDA' }
  if (lvl >= 4)  return { label: 'Medio',   color: '#7A5C00', bg: '#FFFBF0' }
  return { label: 'Bajo', color: '#27500A', bg: '#EAF3DE' }
}

function parseJsonArr(v) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
}

function fechaHora(d) {
  if (!d) return '—'
  try {
    return new Date(String(d).replace(' ', 'T') + 'Z').toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return String(d) }
}

export default function EdrPage() {
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [stats,   setStats]   = useState(null)
  const [agents,  setAgents]  = useState([])
  const [sinAsig, setSinAsig] = useState([])
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [nivelMin, setNivelMin] = useState('')
  const [busca,    setBusca]    = useState('')
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
      const [st, ag, al] = await Promise.all([
        api.get('/api/admin/edr/stats', headers),
        api.get('/api/admin/edr/agents', headers),
        api.get(`/api/admin/edr/alerts?${params}`, headers),
      ])
      setStats(st)
      setAgents(ag.agents ?? [])
      setAlerts(al.alerts ?? [])
      if ((st?.sin_asignar ?? 0) > 0) {
        const sa = await api.get('/api/admin/edr/agents/sin-asignar', headers)
        setSinAsig(sa.agents ?? [])
      } else setSinAsig([])
    } catch (err) {
      showToast(err.message || 'Error cargando datos del EDR', 'error')
    } finally {
      setLoading(false)
    }
  }, [slug, nivelMin, busca])

  useEffect(() => { cargar() }, [slug])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
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

  const STAT_CARDS = stats ? [
    { label: 'Agentes activos', value: `${stats.agentes.activos}/${stats.agentes.total}`, color: '#0F6E56' },
    { label: 'Alertas 24h',     value: stats.alertas.ultimas_24h, color: '#185FA5' },
    { label: 'Críticas',        value: stats.alertas.criticas,    color: '#791F1F' },
    { label: 'Altas',           value: stats.alertas.altas,       color: '#854F0B' },
  ] : []

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>EDR · Detección y respuesta</h1>
        <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>
          Telemetría de endpoints de {empresaActiva.name} (Wazuh)
        </p>
      </div>

      {toast && (
        <div style={{ marginBottom: 14, background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500 }}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '14px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agentes sin asignar */}
      {sinAsig.length > 0 && (
        <div style={{ marginBottom: 18, background: '#FFFBF0', border: '1px solid #EAD9A6', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#633806', marginBottom: 8 }}>
            {sinAsig.length} agente{sinAsig.length !== 1 ? 's' : ''} sin asignar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sinAsig.map(a => (
              <div key={a.wazuh_id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#2C2C2A' }}>
                  <strong>{a.wazuh_id}</strong> · {a.name || 'sin nombre'} · {a.ip || '—'}
                </span>
                <button onClick={() => asignar(a.wazuh_id)}
                  style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Asignar a {empresaActiva.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agentes asignados */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', margin: '0 0 10px' }}>Agentes</h2>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden', marginBottom: 24 }}>
        {agents.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#888780', fontSize: 13 }}>
            Aún no hay agentes asignados a esta empresa.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8f7f4', color: '#888780', textAlign: 'left' }}>
                <th style={th}>ID</th><th style={th}>Nombre</th><th style={th}>IP</th>
                <th style={th}>Estado</th><th style={th}>Último contacto</th><th style={th}>Alertas</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.wazuh_id} style={{ borderTop: '1px solid #f1efe8' }}>
                  <td style={td}><strong>{a.wazuh_id}</strong></td>
                  <td style={td}>{a.name || '—'}</td>
                  <td style={td}>{a.ip || '—'}</td>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.status === 'active' ? '#1D9E75' : '#C0392B' }} />
                      {a.status === 'active' ? 'Activo' : 'Desconectado'}
                    </span>
                  </td>
                  <td style={td}>{fechaHora(a.last_keepalive)}</td>
                  <td style={td}>{a.total_alertas ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Alertas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>Alertas</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={nivelMin} onChange={e => setNivelMin(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, background: '#fff' }}>
            <option value="">Todos los niveles</option>
            <option value="4">Nivel ≥ 4 (medio)</option>
            <option value="7">Nivel ≥ 7 (alto)</option>
            <option value="12">Nivel ≥ 12 (crítico)</option>
          </select>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…"
            onKeyDown={e => e.key === 'Enter' && cargar()}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, width: 160 }} />
          <button onClick={cargar}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Filtrar
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#888780', fontSize: 13 }}>
            No hay alertas. Cuando un agente enrolado genere eventos, aparecerán aquí.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8f7f4', color: '#888780', textAlign: 'left' }}>
                <th style={th}>Fecha</th><th style={th}>Nivel</th><th style={th}>Agente</th>
                <th style={th}>Descripción</th><th style={th}>MITRE</th><th style={th}>Origen</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(al => {
                const ns = nivelStyle(al.rule_level)
                const tactics = parseJsonArr(al.mitre_tactics)
                return (
                  <tr key={al.id} style={{ borderTop: '1px solid #f1efe8' }}>
                    <td style={td}>{fechaHora(al.event_time)}</td>
                    <td style={td}>
                      <span style={{ background: ns.bg, color: ns.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                        {al.rule_level} · {ns.label}
                      </span>
                    </td>
                    <td style={td}>{al.agent_name || al.wazuh_id}</td>
                    <td style={{ ...td, maxWidth: 360 }}>{al.rule_description || '—'}</td>
                    <td style={td}>{tactics.length ? tactics.join(', ') : '—'}</td>
                    <td style={td}>{al.src_ip || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th = { padding: '10px 14px', fontWeight: 600, fontSize: 11.5, whiteSpace: 'nowrap' }
const td = { padding: '9px 14px', color: '#2C2C2A', verticalAlign: 'top' }
