'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificarLandingPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')

  function buscar(e) {
    e.preventDefault()
    const c = codigo.trim()
    if (!c) return
    router.push(`/verificar/${encodeURIComponent(c)}`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 440, width: '100%', padding: '40px 36px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 12px 40px rgba(40,30,80,0.08)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#1c1c22' }}>DSTAC <span style={{ color: '#534AB7' }}>SECURITY</span></span>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c22', margin: '0 0 8px' }}>Verificar documento</h1>
        <p style={{ fontSize: 13, color: '#8b8997', margin: '0 0 22px' }}>
          Ingresa el código de verificación que aparece en tu certificado o contrato (ej. DSTAC-XXXXXXXX).
        </p>
        <form onSubmit={buscar} style={{ display: 'flex', gap: 8 }}>
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="DSTAC-XXXXXXXX"
            autoFocus
            style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 14, outline: 'none' }}
          />
          <button type="submit" style={{ height: 40, padding: '0 18px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Verificar
          </button>
        </form>
      </div>
    </div>
  )
}
