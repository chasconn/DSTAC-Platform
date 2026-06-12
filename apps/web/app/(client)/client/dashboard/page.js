'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../lib/api'
import DashboardLayout from './components/DashboardLayout'

export default function ClientDashboardPage() {
  const [stats,  setStats]  = useState(null)
  const [layout, setLayout] = useState(null)
  const [error,  setError]  = useState(null)

  useEffect(() => {
    const DEFAULT_LAYOUT = [['score', 'incidentes'], 'nist', ['activos-ident', 'personal']]
    Promise.allSettled([
      api.get('/api/client/stats/summary'),
      api.get('/api/client/dashboard/layout'),
    ]).then(([statsResult, layoutResult]) => {
      if (statsResult.status === 'fulfilled') setStats(statsResult.value)
      else setError(statsResult.reason?.message || 'Error al cargar los datos')
      setLayout(layoutResult.status === 'fulfilled' ? layoutResult.value.layout : DEFAULT_LAYOUT)
    })
  }, [])

  if (error) {
    return (
      <div className="dashboard-bg" style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#F09595', fontSize: 13,
          padding: '12px 16px', borderRadius: 8,
          background: 'rgba(226,75,74,0.12)', border: '0.5px solid rgba(226,75,74,0.3)',
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 16 }} />
          {error}
        </div>
      </div>
    )
  }

  if (!stats || !layout) {
    return (
      <div className="dashboard-bg" style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: '#7F77DD', fontSize: 13,
        }}>
          <span style={{
            display: 'inline-block', width: 18, height: 18, flexShrink: 0,
            border: '2px solid rgba(127,119,221,0.2)',
            borderTopColor: '#7F77DD',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Cargando dashboard…
        </div>
      </div>
    )
  }

  return <DashboardLayout stats={stats} initialLayout={layout} />
}
