'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../../lib/api'
import RiesgoPanel from '../panels/RiesgoPanel'

const RISK_COLORS = {
  critico: { color: '#E24B4A', bg: '#FCEBEB', label: 'Crítico' },
  alto:    { color: '#EF9F27', bg: '#FAEEDA', label: 'Alto'    },
  medio:   { color: '#639922', bg: '#EAF3DE', label: 'Medio'   },
  bajo:    { color: '#B4B2A9', bg: '#F1EFE8', label: 'Bajo'    },
}

const PROB_LABELS = ['', 'Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta']
const IMP_LABELS  = ['', 'Mínimo',   'Bajo', 'Moderado', 'Alto', 'Crítico']

function riskCategory(prob, imp) {
  const level = prob * imp
  if (level >= 15) return 'critico'
  if (level >= 8)  return 'alto'
  if (level >= 4)  return 'medio'
  return 'bajo'
}

function RiskMatrix({ riesgos }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Mapa de riesgos</div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)', gap: 3, maxWidth: 480 }}>
        {/* Header row */}
        <div />
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: '#888780', fontWeight: 600, padding: '4px 0' }}>
            Imp. {i}
          </div>
        ))}
        {/* Grid rows */}
        {[5,4,3,2,1].map(prob => (
          <>
            <div key={`label-${prob}`} style={{ fontSize: 10, color: '#888780', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
              P {prob}
            </div>
            {[1,2,3,4,5].map(imp => {
              const cat     = riskCategory(prob, imp)
              const { color, bg } = RISK_COLORS[cat]
              const count   = riesgos.filter(r => Number(r.probability) === prob && Number(r.impact) === imp).length
              return (
                <div key={`${prob}-${imp}`}
                  style={{
                    height: 48, borderRadius: 6, background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${color}30`,
                  }}>
                  {count > 0 && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {count}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {Object.entries(RISK_COLORS).map(([key, v]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: v.color, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: v.bg, border: `1px solid ${v.color}60`, display: 'inline-block' }} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RiesgosTab({ domainId, slug }) {
  const [riesgos,  setRiesgos]  = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast,    setToast]    = useState(null)
  const [filterCat,setFilterCat]= useState('')

  const headers = { 'X-Company-Slug': slug }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [rData, sData] = await Promise.all([
        apiFetch(`/api/admin/iso/riesgos?domain_id=${domainId}`, { headers }),
        apiFetch('/api/admin/iso/riesgos/stats', { headers }),
      ])
      setRiesgos(rData.riesgos ?? [])
      setStats(sData.stats ?? null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, domainId])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar(id) {
    if (!confirm('¿Eliminar este riesgo?')) return
    try {
      await apiFetch(`/api/admin/iso/riesgos/${id}`, { method: 'DELETE', headers })
      showToast('Riesgo eliminado')
      await cargar()
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = filterCat ? riesgos.filter(r => r.risk_category === filterCat) : riesgos

  if (loading) return <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando riesgos…</div>

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total',     value: stats.total      || 0, color: '#2C2C2A', bg: '#f8f7f4' },
              { label: 'Críticos',  value: stats.criticos   || 0, ...RISK_COLORS.critico },
              { label: 'Altos',     value: stats.altos      || 0, ...RISK_COLORS.alto    },
              { label: 'Medios',    value: stats.medios     || 0, ...RISK_COLORS.medio   },
              { label: 'Bajos',     value: stats.bajos      || 0, ...RISK_COLORS.bajo    },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 16px', minWidth: 80 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Mapa de calor */}
        <RiskMatrix riesgos={riesgos} />

        {toast && (
          <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 12 }}>
            {toast.msg}
          </div>
        )}

        {/* Header lista */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { value: '',        label: 'Todos' },
              { value: 'critico', label: 'Crítico' },
              { value: 'alto',    label: 'Alto'    },
              { value: 'medio',   label: 'Medio'   },
              { value: 'bajo',    label: 'Bajo'    },
            ].map(o => (
              <button key={o.value} onClick={() => setFilterCat(o.value)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  background: filterCat === o.value ? '#3C3489' : '#f8f7f4',
                  color:      filterCat === o.value ? '#fff'    : '#888780',
                }}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setSelected(null); setShowForm(true) }}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            + Nuevo riesgo
          </button>
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const cat   = r.risk_category ?? riskCategory(r.probability, r.impact)
            const style = RISK_COLORS[cat] ?? RISK_COLORS.bajo
            return (
              <div key={r.id}
                onClick={() => { setSelected(r); setShowForm(true) }}
                style={{
                  background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8',
                  padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c8c4f0'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(60,52,137,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0d8'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: style.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: style.color, lineHeight: 1 }}>P{r.probability}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: style.color, lineHeight: 1 }}>×</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: style.color, lineHeight: 1 }}>I{r.impact}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.asset_name}</div>
                  <div style={{ fontSize: 12, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.threat}</div>
                </div>
                <span style={{ background: style.bg, color: style.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                  {style.label}
                </span>
                <button onClick={e => { e.stopPropagation(); eliminar(r.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 16, padding: '0 0 0 4px' }}>
                  ×
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888780', fontSize: 13, padding: 32, background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8' }}>
              Sin riesgos registrados. Haz clic en "Nuevo riesgo" para agregar.
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      {showForm && (
        <div style={{ width: 400, flexShrink: 0 }}>
          <RiesgoPanel
            riesgo={selected}
            slug={slug}
            domainId={domainId}
            onClose={() => { setShowForm(false); setSelected(null) }}
            onSaved={() => { setShowForm(false); setSelected(null); cargar() }}
            showToast={showToast}
          />
        </div>
      )}
    </div>
  )
}
