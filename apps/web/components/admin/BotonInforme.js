'use client'

import { useState } from 'react'

// Botón reutilizable: descarga el informe PDF del módulo (tipo) para la empresa (slug).
// tipo: activos | identidades | incidentes | riesgos | iso | nist | edr | executive
export default function BotonInforme({ tipo, slug, label = 'Generar informe' }) {
  const [loading, setLoading] = useState(false)

  async function descargar() {
    if (!slug || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${tipo}`, { credentials: 'include', headers: { 'X-Company-Slug': slug } })
      if (!res.ok) {
        let msg = 'No se pudo generar el informe'
        try { const j = await res.json(); msg = j.message || j.error || msg } catch {}
        alert(msg)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      // Abre el visor del navegador → vista previa con opciones de imprimir/guardar.
      const win = window.open(url, '_blank')
      if (!win) {
        // Si el navegador bloquea el popup, cae a descarga directa.
        const a = document.createElement('a')
        a.href = url; a.download = `DSTAC_${tipo}.pdf`
        document.body.appendChild(a); a.click(); a.remove()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      alert('Error generando el informe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={descargar} disabled={loading} title="Descargar informe PDF"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: loading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
      📄 {loading ? 'Generando…' : label}
    </button>
  )
}
