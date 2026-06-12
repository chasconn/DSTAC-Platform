'use client'

export default function ActivosWidget({ stats, width }) {
  const activos = stats?.activos ?? { total: 0, criticos: 0, alta: 0, media: 0, baja: 0, operativos: 0, degradados: 0 }

  const barras = [
    { label: 'Crítica', val: activos.criticos ?? 0, color: '#E24B4A', tc: '#A32D2D' },
    { label: 'Alta',    val: activos.alta     ?? 0, color: '#EF9F27', tc: '#854F0B' },
    { label: 'Media',   val: activos.media    ?? 0, color: '#639922', tc: '#3B6D11' },
    { label: 'Baja',    val: activos.baja     ?? 0, color: '#B4B2A9', tc: '#888780' },
  ]
  const maxVal = Math.max(...barras.map(d => d.val), 1)

  // ── MODO MICRO — w <= 2: solo barra crítica ───────────────────────────────
  if (width <= 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column',
        justifyContent: 'center', height: '100%' }}>
        <div style={{ fontSize: 9, color: '#888780', marginBottom: 6 }}>
          Activos · {activos.total} total
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <div style={{ fontSize: 9, color: '#A32D2D', width: 36, flexShrink: 0 }}>Crítica</div>
          <div style={{ flex: 1, height: 7, background: '#f1efe8', borderRadius: 3 }}>
            <div style={{
              height: 7, borderRadius: 3, background: '#E24B4A',
              width: `${activos.total > 0 ? ((activos.criticos ?? 0) / activos.total) * 100 : 0}%`,
            }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#A32D2D' }}>{activos.criticos ?? 0}</div>
        </div>
        <div style={{ fontSize: 9, color: '#888780', marginTop: 2 }}>
          {activos.degradados ?? 0} degradados
        </div>
      </div>
    )
  }

  // ── MODO MEDIANO/GRANDE — w <= 5: barras; w > 5: barras + pills de estado ─
  const showPills = width > 5

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="widget-title">
        <i className="ti ti-server" aria-hidden="true" />
        Activos
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500,
          background: '#EEEDFE', color: '#3C3489', padding: '2px 8px', borderRadius: 8 }}>
          {activos.total} total
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
        {barras.map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, color: d.tc, width: 46, flexShrink: 0 }}>{d.label}</div>
            <div style={{ flex: 1, height: 8, background: '#f1efe8', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, background: d.color,
                width: `${(d.val / maxVal) * 100}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#2C2C2A', width: 18, textAlign: 'right' }}>
              {d.val}
            </div>
          </div>
        ))}
      </div>

      {showPills && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginTop: 4 }}>
          <div style={{ flex: 1, background: '#EAF3DE', borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#3B6D11' }}>{activos.operativos ?? 0}</div>
            <div style={{ fontSize: 10, color: '#3B6D11' }}>Operativos</div>
          </div>
          <div style={{ flex: 1, background: '#FAEEDA', borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#854F0B' }}>{activos.degradados ?? 0}</div>
            <div style={{ fontSize: 10, color: '#854F0B' }}>Degradados</div>
          </div>
        </div>
      )}
    </div>
  )
}
