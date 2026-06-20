'use client'

import { useState, useEffect } from 'react'

const NIVEL_COLOR = { Alto: '#1D9E75', Medio: '#C98A1E', Bajo: '#D8543F' }

export default function ClienteCertificadosPage() {
  const [certificados, setCertificados] = useState([])
  const [loading, setLoading] = useState(true)
  const [descargando, setDescargando] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    fetch('/api/client/certificados', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setCertificados(d.certificados ?? []))
      .catch(() => showToast('No se pudieron cargar los certificados'))
      .finally(() => setLoading(false))
  }, [])

  async function descargar(c) {
    setDescargando(c.id + c.ley_codigo)
    try {
      const res = await fetch(`/api/reports/client/certificado?format=pdf&evaluacionId=${c.id}&ley=${c.ley_codigo}`, { credentials: 'include' })
      if (!res.ok) throw new Error('No se pudo descargar el certificado')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Certificado_Ley${c.ley_codigo}_${c.certificado_codigo}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) { showToast(e.message || 'Error al descargar') }
    finally { setDescargando(null) }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Certificados</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
          Certificados de cumplimiento normativo emitidos por DSTAC Security para tu empresa.
        </p>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#888780' }}>Cargando…</div>
      ) : certificados.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e0d8', padding: '60px 40px', textAlign: 'center', maxWidth: 540 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
            🏅
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2A', margin: '0 0 10px' }}>Aún no tienes certificados</h2>
          <p style={{ fontSize: 14, color: '#888780', lineHeight: 1.6, margin: 0 }}>
            Cuando tu equipo de DSTAC complete y apruebe una evaluación de cumplimiento (Ley 21.663 o Ley 21.719) con nivel Alto, el certificado aparecerá aquí.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, maxWidth: 900 }}>
          {certificados.map(c => (
            <div key={c.ley_codigo + c.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A' }}>{c.ley}</div>
                <span style={{ background: `${NIVEL_COLOR[c.nivel]}1A`, color: NIVEL_COLOR[c.nivel], fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                  Nivel {c.nivel}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#888780', marginBottom: 4 }}>Puntaje de cumplimiento</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2C2C2A', marginBottom: 14 }}>{c.score_total}%</div>
              <div style={{ fontSize: 11, color: '#B4B2A9', marginBottom: 14 }}>
                Emitido el {new Date(c.certificado_emitido_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })} · {c.certificado_codigo}
              </div>
              <button onClick={() => descargar(c)} disabled={descargando === c.id + c.ley_codigo}
                style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {descargando === c.id + c.ley_codigo ? 'Descargando…' : '📄 Descargar certificado'}
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: '#1a1740', color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div>}
    </div>
  )
}
