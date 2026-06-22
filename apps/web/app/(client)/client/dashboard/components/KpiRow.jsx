'use client'

const KPI_CONFIG = [
  {
    label:    'Score',
    icon:     'ti-shield-check',
    border:   '#534AB7',
    getValue: (s) => s.security_score?.valor ?? '—',
    getColor: ()  => '#1a1740',
    getSub:   (s) => `/100 · Nivel ${s.security_score?.nivel ?? '—'}`,
    getTrend: ()  => ({ text: '+3 este mes', up: true }),
  },
  {
    label:    'Incidentes',
    icon:     'ti-alert-triangle',
    border:   '#DC2626',
    getValue: (s) => s.incidentes?.abiertos ?? '—',
    getColor: ()  => '#B91C1C',
    getSub:   (s) => `${s.incidentes?.criticos ?? 0} crítico · ${s.incidentes?.en_investigacion ?? 0} en revisión`,
    getTrend: ()  => ({ text: 'Sin resolver', up: 'warn' }),
  },
  {
    label:    'Activos críticos',
    icon:     'ti-server',
    border:   '#D97706',
    getValue: (s) => s.activos?.criticos ?? '—',
    getColor: ()  => '#92400E',
    getSub:   (s) => `Críticos · ${s.activos?.degradados ?? 0} degradados`,
    getTrend: (s) => ({ text: `${s.activos?.total ?? 0} total`, up: null }),
  },
  {
    label:    'Identidades',
    icon:     'ti-users',
    border:   '#DC2626',
    getValue: (s) => (s.identidades?.comprometidas ?? 0) + (s.identidades?.expiradas ?? 0),
    getColor: (s) => {
      const n = (s.identidades?.comprometidas ?? 0) + (s.identidades?.expiradas ?? 0)
      return n > 0 ? '#B91C1C' : '#047857'
    },
    getSub:   () => 'Requieren atención',
    getTrend: (s) => {
      const c = s.identidades?.comprometidas ?? 0
      return { text: `${c} comprometida${c !== 1 ? 's' : ''}`, up: c > 0 ? 'warn' : null }
    },
  },
  {
    label:    'NIST CSF',
    icon:     'ti-chart-radar',
    border:   '#059669',
    getValue: (s) => s.nist?.promedio != null ? `${s.nist.promedio}%` : '—',
    getColor: ()  => '#047857',
    getSub:   (s) => {
      const p = s.nist?.promedio ?? 0
      if (p >= 70) return 'Gestionado'
      if (p >= 50) return 'Parcial'
      return 'Inicial'
    },
    getTrend: () => ({ text: 'Hacia gestionado', up: true }),
  },
  {
    label:    'ISO 27001',
    icon:     'ti-shield-bolt',
    border:   '#0F6E56',
    getValue: (s) => s.iso?.score_total != null ? `${s.iso.score_total}%` : '—',
    getColor: (s) => {
      const p = s.iso?.score_total
      if (p == null) return '#888780'
      if (p >= 76) return '#0F6E56'
      if (p >= 26) return '#854F0B'
      return '#791F1F'
    },
    getSub: (s) => {
      const p = s.iso?.score_total
      if (p == null) return 'Sin evaluación activa'
      if (p >= 91) return 'Completamente alineado'
      if (p >= 76) return 'Alineamiento alto'
      if (p >= 51) return 'Alineamiento medio'
      if (p >= 26) return 'Alineamiento bajo'
      return 'Alineamiento crítico'
    },
    getTrend: (s) => {
      const gap = s.iso?.gap_total
      return {
        text: gap != null ? `${gap}% por cerrar` : 'Iniciar evaluación',
        up: gap != null && gap <= 30 ? true : null,
      }
    },
  },
]

// up: true → verde #047857  |  'warn' → ámbar #92400E  |  false/null → gris #6155BD
function trendColor(up) {
  if (up === true)   return '#047857'
  if (up === 'warn') return '#92400E'
  return '#6155BD'
}
function TrendIcon({ up }) {
  if (up === true)   return <i className="ti ti-trending-up"   style={{ fontSize: 11 }} />
  if (up === 'warn') return <i className="ti ti-alert-circle"  style={{ fontSize: 11 }} />
  if (up === false)  return <i className="ti ti-trending-down" style={{ fontSize: 11 }} />
  return <i className="ti ti-minus" style={{ fontSize: 11 }} />
}

function KpiSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      {KPI_CONFIG.map(k => (
        <div key={k.label} className="kpi-card"
          style={{ borderTop: `2px solid ${k.border}`, minHeight: 76 }}>
          <div style={{
            height: 8, width: '40%', borderRadius: 4,
            background: 'rgba(83,74,183,0.08)', marginBottom: 12,
          }} />
          <div style={{
            height: 20, width: '60%', borderRadius: 4,
            background: 'rgba(83,74,183,0.06)',
          }} />
        </div>
      ))}
    </div>
  )
}

export default function KpiRow({ stats }) {
  if (!stats) return <KpiSkeleton />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      {KPI_CONFIG.map(kpi => {
        const value = kpi.getValue(stats)
        const color = kpi.getColor(stats)
        const sub   = kpi.getSub(stats)
        const trend = kpi.getTrend(stats)

        return (
          <div key={kpi.label} className="kpi-card"
            style={{ borderTop: `2px solid ${kpi.border}` }}>

            {/* Label + ícono */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 8,
            }}>
              <span style={{
                fontSize: 11, color: '#4A43A8',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {kpi.label}
              </span>
              <i className={`ti ${kpi.icon}`}
                style={{ fontSize: 13, color: kpi.border, opacity: 0.65 }} />
            </div>

            {/* Valor principal */}
            <div style={{
              fontSize: 24, fontWeight: 500, color, lineHeight: 1, marginBottom: 4,
            }}>
              {value}
            </div>

            {/* Subtítulo */}
            <div style={{ fontSize: 11, color: '#6155BD', marginBottom: 7, lineHeight: 1.4 }}>
              {sub}
            </div>

            {/* Tendencia */}
            <div style={{
              fontSize: 11, color: trendColor(trend.up),
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <TrendIcon up={trend.up} />
              {trend.text}
            </div>
          </div>
        )
      })}
    </div>
  )
}
