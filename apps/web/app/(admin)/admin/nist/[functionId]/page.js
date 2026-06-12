'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../../../lib/api'
import ResumenTab    from '../components/tabs/ResumenTab'
import ControlesTab  from '../components/tabs/ControlesTab'
import EvidenciasTab from '../components/tabs/EvidenciasTab'
import PlanAccionTab from '../components/tabs/PlanAccionTab'
import HistorialTab  from '../components/tabs/HistorialTab'
import NistScoreRing from '../components/NistScoreRing'

const TABS = [
  { id: 'resumen',    label: 'Resumen'       },
  { id: 'controles',  label: 'Controles'     },
  { id: 'evidencias', label: 'Evidencias'    },
  { id: 'plan',       label: 'Plan de acción'},
  { id: 'historial',  label: 'Historial'     },
]

export default function FunctionPage() {
  const { functionId } = useParams()
  const router         = useRouter()

  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [tab,           setTab]           = useState('resumen')
  const [fn,            setFn]            = useState(null)
  const [categories,    setCategories]    = useState([])
  const [controls,      setControls]      = useState([])
  const [evalId,        setEvalId]        = useState(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  const slug    = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}

  const cargar = useCallback(async () => {
    if (!slug || !functionId) return
    setLoading(true)
    try {
      const [fnData, ctrlData] = await Promise.all([
        apiFetch(`/api/admin/nist/functions/${functionId}`, { headers }),
        apiFetch(`/api/admin/nist/controls?function_id=${functionId}`, { headers }),
      ])
      setFn({ ...fnData.function, score: fnData.categories?.reduce((s, c) => s + (Number(c.score) || 0), 0) / (fnData.categories?.length || 1) })
      setCategories(fnData.categories ?? [])
      setControls(ctrlData.controls ?? [])
      setEvalId(ctrlData.evaluation_id ?? fnData.evaluation_id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, functionId])

  useEffect(() => { cargar() }, [cargar])

  if (!empresaActiva) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
        <p style={{ color: '#888780', fontSize: 13 }}>Selecciona una empresa en el panel principal</p>
        <button onClick={() => router.push('/admin/nist')}
          style={{ marginTop: 12, padding: '8px 18px', background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          ← Volver a NIST
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 28 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 14, color: '#888780' }}>
        <button onClick={() => router.push('/admin/nist')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 14, padding: 0, fontWeight: 500 }}>
          ← NIST CSF
        </button>
        <span>/</span>
        <span style={{ color: '#2C2C2A', fontWeight: 500 }}>{fn?.name ?? functionId}</span>
        <span style={{ color: '#B4B2A9' }}>·</span>
        <span>{empresaActiva.name}</span>
      </div>

      {/* Header de función */}
      {fn && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '22px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
          <NistScoreRing value={Math.round(Number(fn.score) || 0)} size={86} strokeWidth={8} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                background: (fn.color ?? '#3C3489') + '22', color: fn.color ?? '#3C3489',
                fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {fn.code} — {fn.id}
              </span>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#2C2C2A' }}>{fn.name}</h1>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: '#888780', lineHeight: 1.6 }}>{fn.description}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: fn.color ?? '#3C3489', lineHeight: 1 }}>
              {Math.round(Number(fn.score) || 0)}%
            </div>
            <div style={{ fontSize: 13, color: '#888780', marginTop: 4 }}>{controls.length} controles</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e2e0d8', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '11px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#3C3489' : '#888780',
              borderBottom: `2px solid ${tab === t.id ? '#3C3489' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.12s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando…</div>
      ) : (
        <>
          {tab === 'resumen'    && <ResumenTab    fn={fn} categories={categories} controls={controls} evaluationId={evalId} />}
          {tab === 'controles'  && <ControlesTab  controls={controls} categories={categories} fn={fn} slug={slug} evaluationId={evalId} onRefresh={cargar} />}
          {tab === 'evidencias' && <EvidenciasTab slug={slug} functionId={functionId} categories={categories} />}
          {tab === 'plan'       && <PlanAccionTab slug={slug} evaluationId={evalId} />}
          {tab === 'historial'  && <HistorialTab  slug={slug} functionId={functionId} />}
        </>
      )}
    </div>
  )
}
