'use client'

import { StatusBadge, PlanBadge, getInitials } from './badges'

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e2e0d8', animation: 'pulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, background: '#e2e0d8', borderRadius: 6, marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 11, width: '60%', background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ height: 44, background: '#f8f7f4', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    </div>
  )
}

export default function ClientesCards({ empresas, loading, selectedSlug, onSelect, onSuspender }) {

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (empresas.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#888780', fontSize: 13 }}>
        No se encontraron empresas
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {empresas.map(emp => {
        const selected = emp.slug === selectedSlug
        const score = emp.score ?? null
        const scoreColor = score === null ? '#888780' : score >= 70 ? '#639922' : score >= 40 ? '#EF9F27' : '#E24B4A'

        return (
          <div
            key={emp.slug}
            onClick={() => onSelect(emp)}
            style={{
              background: '#fff',
              borderRadius: 12,
              border: `2px solid ${selected ? '#534AB7' : '#e2e0d8'}`,
              padding: 16,
              cursor: 'pointer',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: selected ? '0 0 0 3px #EEEDFE' : 'none',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#AFA9EC' }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#e2e0d8' }}
          >
            {/* Cabecera: avatar + nombre + badges */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                {/* Avatar iniciales */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: emp.theme_color || '#3C3489',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                }}>
                  {getInitials(emp.name)}
                </div>

                {/* Botón suspender / reactivar */}
                <button
                  onClick={e => { e.stopPropagation(); onSuspender(emp) }}
                  title={emp.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.6 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                >
                  {emp.status === 'suspended' ? <IconPlay /> : <IconBan />}
                </button>
              </div>

              {/* Nombre */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 5, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {emp.name}
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <PlanBadge plan={emp.plan_name} />
                <StatusBadge status={emp.status} />
              </div>
            </div>

            {/* Stats en 3 columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <StatBox label="Score" value={score ?? '—'} color={scoreColor} />
              <StatBox label="Inc." value={emp.incidentes ?? '—'} color={emp.incidentes > 0 ? '#E24B4A' : '#888780'} />
              <StatBox label="Activos" value={emp.activos ?? '—'} color="#2C2C2A" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '7px 6px', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#888780', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function IconBan() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
}
function IconPlay() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#639922" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
}
