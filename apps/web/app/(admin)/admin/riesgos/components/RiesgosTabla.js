'use client'

// Tabla de riesgos (tarjetas en móvil). Recibe la lista ya filtrada.
import { NIVEL, ESTADO, CATEGORIA } from './constants'

function Badge({ map, value }) {
  const s = map[value]
  if (!s) return <span style={{ color: '#B4B2A9' }}>—</span>
  return <span style={{ background: s.bg, color: s.text, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s.label}</span>
}

const COLS = '74px 1fr 110px 150px 130px 100px 96px'

export default function RiesgosTabla({ riesgos, loading, isMobile, onVer, onEditar, onEliminar }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '9px 16px', background: '#f8f7f4', borderBottom: '1px solid #e2e0d8' }}>
          {['Nivel', 'Riesgo', 'Categoría', 'Activo', 'Estado', 'Vence', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 8 }}>{h}</div>
          ))}
        </div>
      )}

      {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>}

      {!loading && riesgos.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 6 }}>Sin riesgos</div>
          <div style={{ fontSize: 13, color: '#888780' }}>Crea el primer riesgo con el botón "Nuevo riesgo".</div>
        </div>
      )}

      {!loading && riesgos.map((r, i) => {
        const niv = NIVEL[r.nivel_categoria] || NIVEL.bajo
        const vence = r.fecha_limite ? new Date(r.fecha_limite) : null
        const vencido = vence && vence < new Date() && !['mitigado', 'aceptado', 'cerrado'].includes(r.estado)
        const borde = i < riesgos.length - 1 ? '1px solid #f1efe8' : 'none'

        if (isMobile) {
          return (
            <div key={r.id} style={{ padding: '12px 14px', borderBottom: borde, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: niv.color, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div onClick={() => onVer(r)} style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', cursor: 'pointer', wordBreak: 'break-word' }}>{r.nombre}</div>
                  <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{r.amenaza}</div>
                </div>
                <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                  <Accion onClick={() => onVer(r)} title="Ver">👁</Accion>
                  <Accion onClick={() => onEditar(r)} title="Editar">✏️</Accion>
                  <Accion onClick={() => onEliminar(r)} title="Eliminar" danger>🗑</Accion>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingLeft: 20 }}>
                <Badge map={NIVEL} value={r.nivel_categoria} />
                <Badge map={ESTADO} value={r.estado} />
                <span style={{ fontSize: 11.5, color: '#888780' }}>{CATEGORIA[r.categoria] || r.categoria}</span>
                {(r.activo_nombre_actual || r.activo_nombre) && <span style={{ fontSize: 11.5, color: '#888780' }}>🖥 {r.activo_nombre_actual || r.activo_nombre}</span>}
                {vence && <span style={{ fontSize: 11.5, color: vencido ? '#E24B4A' : '#888780' }}>📅 {vence.toLocaleDateString('es-CL')}</span>}
              </div>
            </div>
          )
        }

        return (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '11px 16px', borderBottom: borde, alignItems: 'center', background: vencido ? '#FFFBF0' : 'transparent' }}>
            <div><span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: niv.color, padding: '2px 8px', borderRadius: 20 }}>{r.nivel_riesgo}</span></div>
            <div style={{ minWidth: 0, paddingRight: 12 }}>
              <div onClick={() => onVer(r)} title="Ver detalle" style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</div>
              <div style={{ fontSize: 11, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.amenaza}</div>
            </div>
            <div style={{ fontSize: 12, color: '#444441', paddingRight: 8 }}>{CATEGORIA[r.categoria] || r.categoria}</div>
            <div style={{ fontSize: 12, color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{r.activo_nombre_actual || r.activo_nombre || <span style={{ color: '#B4B2A9' }}>—</span>}</div>
            <div style={{ paddingRight: 8 }}><Badge map={ESTADO} value={r.estado} /></div>
            <div style={{ fontSize: 12, color: vencido ? '#E24B4A' : '#888780', whiteSpace: 'nowrap', paddingRight: 8 }}>{vence ? vence.toLocaleDateString('es-CL') : <span style={{ color: '#B4B2A9' }}>—</span>}</div>
            <div style={{ display: 'flex', gap: 0, justifyContent: 'flex-end' }}>
              <Accion onClick={() => onVer(r)} title="Ver">👁</Accion>
              <Accion onClick={() => onEditar(r)} title="Editar">✏️</Accion>
              <Accion onClick={() => onEliminar(r)} title="Eliminar" danger>🗑</Accion>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Accion({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 13, opacity: 0.6 }}
      onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = danger ? '#FCEBEB' : '#f1efe8' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = 'none' }}>
      {children}
    </button>
  )
}
