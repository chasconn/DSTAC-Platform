'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../../../../lib/api'
import WikiGraphCanvas from '../../../../../components/admin/wiki/WikiGraphCanvas'

export default function WikiGrafoPage() {
  const [data, setData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    apiFetch('/api/admin/wiki/graph')
      .then(setData)
      .catch(err => setError(err.message || 'No se pudo cargar el grafo'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '24px 28px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Grafo de la Wiki</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>{data.nodes.length} nota{data.nodes.length !== 1 ? 's' : ''} · {data.edges.length} enlace{data.edges.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/wiki" style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          ← Volver a la wiki
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: '#888780', alignItems: 'center', flexWrap: 'wrap' }}>
        <Leyenda color="#3C3489" label="Nota privada" />
        <Leyenda color="#1D9E75" label="Nota de equipo" />
        <Leyenda color="#B4B2A9" label="Sin escribir (fantasma)" />
      </div>

      <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e0d8', borderRadius: 12, minHeight: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888780', fontSize: 13 }}>Cargando grafo…</div>
        ) : error ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#B23434', fontSize: 13 }}>{error}</div>
        ) : data.nodes.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#888780' }}>
            <div style={{ fontSize: 40 }}>🕸️</div>
            <div style={{ fontSize: 14 }}>Todavía no hay notas para graficar.</div>
          </div>
        ) : (
          <WikiGraphCanvas nodes={data.nodes} edges={data.edges}
            onNodeClick={n => router.push(`/admin/wiki?nota=${n.id}`)} />
        )}
      </div>
    </div>
  )
}

function Leyenda({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </div>
  )
}
