'use client'

// 5 tarjetas de resumen del módulo de Riesgos.
export default function RiesgosStats({ stats, isMobile }) {
  const cards = [
    { label: 'Total',          value: stats?.total,          color: '#534AB7' },
    { label: 'Críticos',       value: stats?.criticos,       color: '#E24B4A' },
    { label: 'Altos',          value: stats?.altos,          color: '#EF9F27' },
    { label: 'En tratamiento', value: stats?.en_tratamiento, color: '#3C3489' },
    { label: 'Sin tratar',     value: stats?.sin_tratar,     color: '#888780' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 10, marginBottom: 18 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${c.color}`, padding: isMobile ? '10px 12px' : '14px 18px' }}>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#2C2C2A' }}>{c.value ?? '—'}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}
