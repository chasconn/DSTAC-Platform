'use client'

export default function ClienteCapacitacionesPage() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Capacitaciones</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888780' }}>
          Material de formación en ciberseguridad para tu equipo.
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e0d8', padding: '60px 40px', textAlign: 'center', maxWidth: 540 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
          📚
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2A', margin: '0 0 10px' }}>
          Próximamente
        </h2>
        <p style={{ fontSize: 14, color: '#888780', lineHeight: 1.6, margin: '0 0 24px' }}>
          El módulo de Capacitaciones estará disponible pronto. Aquí podrás acceder a cursos, guías y material de concientización en ciberseguridad diseñado para tu equipo.
        </p>
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', background: '#EEEDFE', borderRadius: 20, padding: '8px 18px', fontSize: 13, color: '#3C3489', fontWeight: 500 }}>
          🔔 Tu analista DSTAC te notificará cuando esté disponible
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {[
          { title: 'Phishing y Ingeniería Social', tag: 'Próximamente', icon: '🎣' },
          { title: 'Contraseñas Seguras y MFA',    tag: 'Próximamente', icon: '🔒' },
          { title: 'Respuesta ante Incidentes',     tag: 'Próximamente', icon: '🚨' },
          { title: 'Políticas de Seguridad',        tag: 'Próximamente', icon: '📋' },
        ].map(c => (
          <div key={c.title} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 18px', opacity: 0.6 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', marginBottom: 4 }}>{c.title}</div>
            <span style={{ background: '#F1EFE8', color: '#888780', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{c.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
