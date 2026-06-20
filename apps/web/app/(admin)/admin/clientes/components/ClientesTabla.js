'use client'

import { StatusBadge, PlanBadge, getInitials } from './badges'

// Skeleton de fila mientras carga
function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 70px 70px 1fr 96px', minWidth: 760, gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid #f1efe8' }}>
      {[180, 80, 80, 50, 50, 90, 80].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#e2e0d8', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

export default function ClientesTabla({ empresas, loading, selectedSlug, onSelect, onSuspender }) {

  const COLS = [
    { label: 'Empresa',  style: { gridColumn: '1' } },
    { label: 'Plan',     style: { gridColumn: '2' } },
    { label: 'Estado',   style: { gridColumn: '3' } },
    { label: 'Score',    style: { gridColumn: '4', textAlign: 'center' } },
    { label: 'Inc.',     style: { gridColumn: '5', textAlign: 'center' } },
    { label: 'Creado',   style: { gridColumn: '6' } },
    { label: 'Acciones', style: { gridColumn: '7', textAlign: 'right' } },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflowX: 'auto' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 70px 70px 1fr 96px', minWidth: 760,
        gap: 12, padding: '8px 16px',
        background: '#f8f7f4', borderBottom: '1px solid #e2e0d8'
      }}>
        {COLS.map(c => (
          <span key={c.label} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888780', letterSpacing: 0.5, ...c.style }}>
            {c.label}
          </span>
        ))}
      </div>

      {/* Skeletons */}
      {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

      {/* Sin resultados */}
      {!loading && empresas.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#888780', fontSize: 13 }}>
          No se encontraron empresas
        </div>
      )}

      {/* Filas */}
      {!loading && empresas.map(emp => {
        const selected = emp.slug === selectedSlug
        const fecha = emp.created_at ? new Date(emp.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

        return (
          <div
            key={emp.slug}
            onClick={() => onSelect(emp)}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 70px 70px 1fr 96px', minWidth: 760,
              gap: 12, padding: '10px 16px', alignItems: 'center',
              borderBottom: '1px solid #f1efe8',
              background: selected ? '#EEEDFE' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8f7f4' }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Empresa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: emp.theme_color || '#3C3489',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700
              }}>
                {getInitials(emp.name)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {emp.name}
                </div>
                <div style={{ fontSize: 11, color: '#888780' }}>{emp.slug}</div>
              </div>
            </div>

            {/* Plan */}
            <div><PlanBadge plan={emp.plan_name} /></div>

            {/* Estado */}
            <div><StatusBadge status={emp.status} /></div>

            {/* Score */}
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: emp.score >= 70 ? '#639922' : emp.score >= 40 ? '#EF9F27' : '#E24B4A' }}>
              {emp.score ?? '—'}
            </div>

            {/* Incidentes */}
            <div style={{ textAlign: 'center', fontSize: 13, color: emp.incidentes > 0 ? '#E24B4A' : '#888780', fontWeight: emp.incidentes > 0 ? 600 : 400 }}>
              {emp.incidentes ?? '—'}
            </div>

            {/* Creado */}
            <div style={{ fontSize: 12, color: '#888780' }}>{fecha}</div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
              <ActionBtn title="Ver detalle" onClick={() => onSelect(emp)}>
                <IconEye />
              </ActionBtn>
              <ActionBtn title={emp.status === 'suspended' ? 'Reactivar' : 'Suspender'} onClick={() => onSuspender(emp)}>
                {emp.status === 'suspended' ? <IconPlay /> : <IconBan />}
              </ActionBtn>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActionBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{ background: 'none', border: '1px solid #e2e0d8', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f1efe8'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {children}
    </button>
  )
}

function IconEye() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function IconBan() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
}
function IconPlay() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#639922" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
}
