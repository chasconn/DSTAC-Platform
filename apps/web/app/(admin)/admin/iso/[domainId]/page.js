'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../../../lib/api'
import ResumenTab   from '../components/tabs/ResumenTab'
import ControlesTab from '../components/tabs/ControlesTab'
import SoaTab       from '../components/tabs/SoaTab'
import RiesgosTab   from '../components/tabs/RiesgosTab'
import PoliticasTab from '../components/tabs/PoliticasTab'
import EvidenciasTab from '../components/tabs/EvidenciasTab'
import PlanAccionTab from '../components/tabs/PlanAccionTab'
import HistorialTab  from '../components/tabs/HistorialTab'

const TABS = [
  { id: 'resumen',    label: 'Resumen'          },
  { id: 'controles',  label: 'Controles'        },
  { id: 'soa',        label: 'SoA'              },
  { id: 'riesgos',    label: 'Riesgos'          },
  { id: 'politicas',  label: 'Políticas'        },
  { id: 'evidencias', label: 'Evidencias'       },
  { id: 'plan',       label: 'Plan de acción'   },
  { id: 'historial',  label: 'Historial'        },
]

const DOMAIN_LABELS = {
  A5: { name: 'Controles Organizacionales', color: '#3C3489' },
  A6: { name: 'Controles de Personas',      color: '#0F6E56' },
  A7: { name: 'Controles Físicos',          color: '#854F0B' },
  A8: { name: 'Controles Tecnológicos',     color: '#185FA5' },
}

export default function DomainPage() {
  const { domainId } = useParams()
  const router = useRouter()

  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [tab,           setTab]           = useState('resumen')
  const [domain,        setDomain]        = useState(null)
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
    if (!slug || !domainId) return
    setLoading(true)
    try {
      const [domainsData, ctrlData] = await Promise.all([
        apiFetch('/api/admin/iso/domains',            { headers }),
        apiFetch(`/api/admin/iso/controls?domain_id=${domainId}`, { headers }),
      ])
      const found = (domainsData.domains ?? []).find(d => d.id === domainId)
      setDomain(found ?? { id: domainId, ...(DOMAIN_LABELS[domainId] ?? {}) })
      setControls(ctrlData.controls ?? [])
      setEvalId(ctrlData.evaluation_id ?? domainsData.evaluation_id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug, domainId])

  useEffect(() => { cargar() }, [cargar])

  if (!empresaActiva) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
        <p style={{ color: '#888780', fontSize: 13 }}>Selecciona una empresa en el panel principal</p>
        <button onClick={() => router.push('/admin/iso')}
          style={{ marginTop: 12, padding: '8px 18px', background: '#3C3489', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          ← Volver a ISO
        </button>
      </div>
    )
  }

  const score     = Math.round(Number(domain?.score) || 0)
  const domColor  = domain?.color ?? DOMAIN_LABELS[domainId]?.color ?? '#3C3489'
  const domName   = domain?.name  ?? DOMAIN_LABELS[domainId]?.name  ?? domainId

  return (
    <div style={{ padding: 28 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 14, color: '#888780' }}>
        <button onClick={() => router.push('/admin/iso')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 14, padding: 0, fontWeight: 500 }}>
          ← ISO 27001
        </button>
        <span>/</span>
        <span style={{ color: domColor, fontWeight: 700 }}>{domainId}</span>
        <span>/</span>
        <span style={{ color: '#2C2C2A', fontWeight: 500 }}>{domName}</span>
        <span style={{ color: '#B4B2A9' }}>·</span>
        <span>{empresaActiva.name}</span>
      </div>

      {/* Header del dominio */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '22px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Badge grande */}
        <div style={{ width: 80, height: 80, borderRadius: 16, background: domColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: domColor }}>{domainId}</span>
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>{domName}</h1>
          {domain?.description && (
            <p style={{ margin: 0, fontSize: 14, color: '#888780', lineHeight: 1.6 }}>{domain.description}</p>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: domColor, lineHeight: 1 }}>{score}%</div>
          <div style={{ fontSize: 13, color: '#888780', marginTop: 4 }}>{controls.length} controles</div>
          {domain && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
              {[
                { label: 'Impl.',    value: domain.implementados || 0, color: '#27500A', bg: '#EAF3DE' },
                { label: 'Parcial',  value: domain.parciales     || 0, color: '#633806', bg: '#FAEEDA' },
                { label: 'Pend.',    value: domain.pendientes    || 0, color: '#791F1F', bg: '#FCEBEB' },
              ].map(s => (
                <span key={s.label} style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {s.value} {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e2e0d8' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '11px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#3C3489' : '#888780',
              borderBottom: `2px solid ${tab === t.id ? '#3C3489' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.12s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#888780', padding: 40, fontSize: 13 }}>Cargando…</div>
      ) : (
        <>
          {tab === 'resumen'    && <ResumenTab    domain={domain} controls={controls} evaluationId={evalId} />}
          {tab === 'controles'  && <ControlesTab  controls={controls} domain={domain} slug={slug} evaluationId={evalId} onRefresh={cargar} />}
          {tab === 'soa'        && <SoaTab        domainId={domainId} slug={slug} evaluationId={evalId} onRefresh={cargar} />}
          {tab === 'riesgos'    && <RiesgosTab    domainId={domainId} slug={slug} />}
          {tab === 'politicas'  && <PoliticasTab  domainId={domainId} slug={slug} />}
          {tab === 'evidencias' && <EvidenciasTab domainId={domainId} slug={slug} />}
          {tab === 'plan'       && <PlanAccionTab domainId={domainId} slug={slug} />}
          {tab === 'historial'  && <HistorialTab  domainId={domainId} slug={slug} />}
        </>
      )}
    </div>
  )
}
