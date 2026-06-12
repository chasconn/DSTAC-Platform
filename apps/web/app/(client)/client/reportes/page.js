'use client'

import { useState } from 'react'

const REPORTES = [
  {
    id:    'executive',
    title: 'Reporte Ejecutivo',
    desc:  'Resumen ejecutivo completo: Security Score, módulos, NIST CSF, ISO 27001, hallazgos y recomendaciones.',
    icon:  'ti-chart-bar',
    pages: '3–5 páginas',
  },
  {
    id:    'activos',
    title: 'Inventario de Activos',
    desc:  'Listado completo de activos con criticidad, estado operativo y responsable.',
    icon:  'ti-server',
    pages: '2 páginas',
  },
  {
    id:    'identidades',
    title: 'Identidades y Accesos',
    desc:  'Estado de identidades digitales: activas, comprometidas, expiradas e inactivas.',
    icon:  'ti-users',
    pages: '2 páginas',
  },
  {
    id:           'incidentes',
    title:        'Incidentes de Seguridad',
    desc:         'Historial de incidentes con severidad, estado y tiempos de respuesta.',
    icon:         'ti-alert-triangle',
    pages:        '2 páginas',
    planRequired: 'profesional',
  },
  {
    id:           'riesgos',
    title:        'Gestión de Riesgos',
    desc:         'Registro de riesgos identificados, niveles de exposición y tratamientos.',
    icon:         'ti-shield-exclamation',
    pages:        '2 páginas',
    planRequired: 'profesional',
  },
]

export default function ClienteReportesPage() {
  const [generating, setGenerating] = useState(null)
  const [toast,      setToast]      = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  async function generarPDF(reporteId) {
    setGenerating(reporteId)
    try {
      const response = await fetch(
        `/api/reports/client/${reporteId}?format=pdf`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        if (response.status === 403 && err.error === 'modulo_no_disponible') {
          showToast(err.message ?? 'Este reporte requiere un plan superior.', 'warn')
          return
        }
        throw new Error(err.error || err.message || `Error ${response.status}`)
      }

      const blob  = await response.blob()
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      a.href      = url
      a.download  = `DSTAC_${reporteId}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Reporte generado y descargado correctamente')
    } catch (err) {
      showToast(err.message || 'Error al generar el reporte', 'error')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Reportes</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
          Genera y descarga reportes de tu postura de seguridad en PDF. Se generan en tiempo real con datos actuales.
        </p>
      </div>

      {toast && (
        <div style={{
          background:   toast.type === 'error' ? '#FCEBEB' : toast.type === 'warn' ? '#FAEEDA' : '#EAF3DE',
          borderRadius: 10, padding: '10px 16px', fontSize: 13, marginBottom: 20,
          color: toast.type === 'error' ? '#791F1F' : toast.type === 'warn' ? '#633806' : '#27500A',
          fontWeight: 500, border: '1px solid',
          borderColor: toast.type === 'error' ? '#F5C6C6' : toast.type === 'warn' ? '#F5D8A1' : '#A8D96C',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {REPORTES.map(r => {
          const isGenerating = generating === r.id
          const isBlocked    = !!r.planRequired
          const isDisabled   = !!generating

          return (
            <div key={r.id} style={{
              background: '#fff', borderRadius: 12,
              border: `1px solid ${isBlocked ? '#F5D8A1' : '#e2e0d8'}`,
              padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16,
              opacity: isBlocked ? 0.85 : 1,
            }}>
              {/* Icon */}
              <div style={{
                width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                background: isBlocked ? '#FAEEDA' : '#EEEDFE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${r.icon}`} style={{
                  fontSize: 22,
                  color: isBlocked ? '#854F0B' : '#534AB7',
                }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{r.title}</span>
                  {isBlocked && (
                    <span style={{
                      background: '#FAEEDA', color: '#854F0B',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.4,
                    }}>
                      Plan Profesional+
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#B4B2A9', marginLeft: 'auto' }}>{r.pages}</span>
                </div>
                <div style={{ fontSize: 12, color: '#888780', lineHeight: 1.4 }}>
                  {isBlocked
                    ? `${r.desc} Disponible desde el Plan Profesional.`
                    : r.desc}
                </div>
              </div>

              {/* Button */}
              <div style={{ flexShrink: 0 }}>
                <button
                  onClick={() => generarPDF(r.id)}
                  disabled={isDisabled || isBlocked}
                  title={isBlocked ? 'Requiere Plan Profesional o superior' : 'Descargar PDF'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: isBlocked
                      ? '#f1efe8'
                      : isGenerating
                        ? '#7C6FD6'
                        : 'var(--brand-color, #3C3489)',
                    color: isBlocked ? '#B4B2A9' : '#fff',
                    cursor: (isDisabled || isBlocked) ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 600,
                    transition: 'background 0.15s',
                    opacity: (isDisabled && !isGenerating) ? 0.6 : 1,
                  }}
                >
                  {isGenerating ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white"/>
                      </svg>
                      Generando…
                    </>
                  ) : isBlocked ? (
                    <>
                      <i className="ti ti-lock" style={{ fontSize: 13 }} />
                      Bloqueado
                    </>
                  ) : (
                    <>
                      <i className="ti ti-file-type-pdf" style={{ fontSize: 13 }} />
                      PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info banner */}
      <div style={{
        marginTop: 28, background: '#EEEDFE', borderRadius: 12,
        padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <i className="ti ti-info-circle" style={{ fontSize: 20, color: '#534AB7', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3C3489', marginBottom: 3 }}>
            Sobre los reportes PDF
          </div>
          <div style={{ fontSize: 12, color: '#534AB7', lineHeight: 1.5 }}>
            Los reportes se generan en tiempo real con los datos actuales de tu empresa y replican el estilo visual de la
            plataforma DSTAC. Para reportes periódicos programados, análisis personalizados o acceso a reportes del plan
            superior, contacta a tu analista DSTAC.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
