'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../../../lib/api'
import BotonInforme from '../../../../components/admin/BotonInforme'
import GapIndicator from './components/GapIndicator'
import DomainCard   from './components/DomainCard'

export default function IsoPage() {
  const router = useRouter()

  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [stats,         setStats]         = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [creating,      setCreating]      = useState(false)
  const [toast,         setToast]         = useState(null)
  const [empresas,      setEmpresas]      = useState({ internas: [], clientes: [] })

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    setEmpresaActiva(raw ? JSON.parse(raw) : null)
  }, [])

  useEffect(() => {
    apiFetch('/api/admin/empresas/selector')
      .then(d => setEmpresas({ internas: d.internas ?? [], clientes: d.clientes ?? [] }))
      .catch(() => {})
  }, [])

  const slug    = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}

  const cargar = useCallback(async () => {
    if (!slug) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/iso/stats', { headers })
      setStats(data)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { cargar() }, [cargar])

  function seleccionarEmpresa(s) {
    const all = [...empresas.internas, ...empresas.clientes]
    const emp = all.find(e => e.slug === s)
    if (!emp) return
    const val = { id: emp.id, name: emp.name, slug: emp.slug }
    localStorage.setItem('empresa_activa', JSON.stringify(val))
    window.dispatchEvent(new Event('empresa_activa_changed'))
    setEmpresaActiva(val)
    setStats(null)
  }

  async function nuevaEvaluacion() {
    if (!confirm('¿Crear una nueva evaluación ISO? La evaluación activa será archivada.')) return
    setCreating(true)
    try {
      await apiFetch('/api/admin/iso/evaluacion', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      showToast('Nueva evaluación creada')
      await cargar()
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally { setCreating(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const domains     = stats?.por_dominio ?? []
  const scoreTotal  = Math.round(Number(stats?.score_total) || 0)
  const gapTotal    = Math.round(Number(stats?.gap_total)   || 100)

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>ISO 27001:2022</h1> <BotonInforme tipo="iso" slug={slug} />
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
            Evaluación de madurez y alineamiento por empresa
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={empresaActiva?.slug ?? ''}
            onChange={e => seleccionarEmpresa(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e0d8',
              fontSize: 14, color: empresaActiva ? '#2C2C2A' : '#888780',
              background: '#fff', cursor: 'pointer', minWidth: 200,
            }}
          >
            <option value="">— Seleccionar empresa —</option>
            {empresas.internas.length > 0 && (
              <optgroup label="DSTAC (interno)">
                {empresas.internas.map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}
              </optgroup>
            )}
            {empresas.clientes.length > 0 && (
              <optgroup label="Clientes">
                {empresas.clientes.map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}
              </optgroup>
            )}
          </select>

          {empresaActiva && (
            <button onClick={nuevaEvaluacion} disabled={creating}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Creando…' : '+ Nueva evaluación'}
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      {!empresaActiva && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px dashed #e2e0d8', padding: '48px 32px', textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2A', margin: '0 0 8px' }}>Selecciona una empresa</h2>
          <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Usa el selector de arriba para elegir la empresa a evaluar.
          </p>
          <a href="/admin/clientes" style={{ display: 'inline-block', padding: '9px 20px', background: '#f8f7f4', color: '#534AB7', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #e2e0d8' }}>
            Ir a Clientes →
          </a>
        </div>
      )}

      {empresaActiva && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 16px', background: '#EEEDFE', borderRadius: 10, width: 'fit-content' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
              {(empresaActiva.name ?? '?')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#3C3489' }}>{empresaActiva.name}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#888780', fontSize: 13 }}>Cargando evaluación…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

              {/* Columna izquierda — Gap indicator + resumen */}
              <div>
                <GapIndicator scoreTotal={scoreTotal} gapTotal={gapTotal} domains={domains} />

                {/* Resumen de controles */}
                {stats && (
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 18px', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>Resumen de controles</div>
                    {[
                      { label: 'Implementados', value: stats.implementados || 0, color: '#27500A', bg: '#EAF3DE' },
                      { label: 'Parciales',     value: stats.parciales     || 0, color: '#633806', bg: '#FAEEDA' },
                      { label: 'Pendientes',    value: stats.pendientes    || 0, color: '#791F1F', bg: '#FCEBEB' },
                      { label: 'No aplica',     value: stats.no_aplica     || 0, color: '#444441', bg: '#F1EFE8' },
                      { label: 'Sin evidencia', value: stats.sin_evidencia || 0, color: '#633806', bg: '#FAEEDA' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#888780' }}>{s.label}</span>
                        <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Norma info */}
                <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#888780', lineHeight: 1.6 }}>
                  <strong style={{ color: '#2C2C2A', display: 'block', marginBottom: 4 }}>ISO/IEC 27001:2022</strong>
                  Annex A — 4 dominios, 93 controles de seguridad de la información
                </div>
              </div>

              {/* Columna derecha — Domain cards */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Dominios de control</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {domains.map(d => (
                    <DomainCard
                      key={d.domain_id ?? d.id}
                      domain={{ ...d, id: d.domain_id ?? d.id, total_controls: d.controls_total ?? d.total_controls }}
                      onClick={() => router.push(`/admin/iso/${d.domain_id ?? d.id}`)}
                    />
                  ))}
                  {domains.length === 0 && (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: 32, textAlign: 'center', color: '#888780', fontSize: 13 }}>
                      No hay evaluación activa. Crea una nueva evaluación para comenzar.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
