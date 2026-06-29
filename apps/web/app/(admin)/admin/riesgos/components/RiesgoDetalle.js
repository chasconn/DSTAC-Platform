'use client'

// Panel lateral de detalle de un riesgo. Recibe el riesgo completo (con historial).
import { useState } from 'react'
import { NIVEL, ESTADO, CATEGORIA, TRATAMIENTO } from './constants'
import FixedPortal from '../../../../../components/admin/FixedPortal'

const fmt = (d) => { try { return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d } }
const fmtH = (d) => { try { return new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return d } }

function Badge({ map, value }) {
  const s = map[value]; if (!s) return null
  return <span style={{ background: s.bg, color: s.text, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{s.label}</span>
}

export default function RiesgoDetalle({ riesgo, isoControls = [], onClose, onEditar, onGenerarPDF, onCambiarEstado, onGuardarNotas }) {
  const [generando, setGenerando] = useState(false)
  const [notas, setNotas] = useState(riesgo.notas_dstac || '')
  const [guardandoNotas, setGuardandoNotas] = useState(false)

  const niv = NIVEL[riesgo.nivel_categoria] || NIVEL.bajo
  const controlIds = Array.isArray(riesgo.iso_control_ids) ? riesgo.iso_control_ids
    : (riesgo.iso_control_ids ? (() => { try { return JSON.parse(riesgo.iso_control_ids) } catch { return [] } })() : [])
  const nombreControl = (id) => { const c = isoControls.find(x => x.id === id); return c ? `${c.id} · ${c.name}` : id }

  const tieneResidual = riesgo.residual_probabilidad && riesgo.residual_impacto
  // El informe se puede generar desde que el riesgo deja de estar solo "identificado".
  // Si tiene controles ISO, además se adjunta como evidencia.
  const puedePDF = riesgo.estado !== 'identificado'
  const siguienteEstado = ['identificado', 'en_tratamiento'].includes(riesgo.estado)
    ? { v: 'mitigado', label: 'Marcar como mitigado' }
    : (['mitigado', 'aceptado'].includes(riesgo.estado) ? { v: 'cerrado', label: 'Cerrar riesgo' } : null)

  async function generar() {
    setGenerando(true)
    try { await onGenerarPDF(riesgo) } finally { setGenerando(false) }
  }
  async function guardarNotas() {
    setGuardandoNotas(true)
    try { await onGuardarNotas(riesgo.id, notas) } finally { setGuardandoNotas(false) }
  }

  return (
    <FixedPortal>
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,20,.35)', zIndex: 80 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(460px, 96vw)', background: '#fff', zIndex: 81, boxShadow: '-8px 0 30px rgba(0,0,0,.18)', overflowY: 'auto', padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.3 }}>{riesgo.nombre}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#888780', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge map={NIVEL} value={riesgo.nivel_categoria} />
          <Badge map={ESTADO} value={riesgo.estado} />
          <span style={{ background: '#F1EFE8', color: '#444441', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{CATEGORIA[riesgo.categoria] || riesgo.categoria}</span>
        </div>

        {/* Score visual: inherente → residual */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, margin: '20px 0', padding: '14px', background: '#FAFAF8', borderRadius: 12, border: '1px solid #f1efe8' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: niv.color, lineHeight: 1 }}>{riesgo.nivel_riesgo}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>Inherente · P{riesgo.probabilidad}×I{riesgo.impacto}</div>
          </div>
          {tieneResidual && (
            <>
              <span style={{ fontSize: 22, color: '#B4B2A9' }}>→</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 34, fontWeight: 700, color: (NIVEL[nivelResidual(riesgo)] || NIVEL.bajo).color, lineHeight: 1 }}>{riesgo.residual_nivel}</div>
                <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>Residual · P{riesgo.residual_probabilidad}×I{riesgo.residual_impacto}</div>
              </div>
            </>
          )}
        </div>

        {/* Origen (incidente) */}
        {riesgo.incidente_id && (
          <div style={{ background: '#FEF3E2', color: '#633806', fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
            ⚡ Generado desde incidente: {riesgo.incidente_nombre || `#${riesgo.incidente_id}`}
          </div>
        )}

        <Seccion titulo="Identificación">
          {riesgo.descripcion && <Campo label="Descripción" valor={riesgo.descripcion} />}
          {(riesgo.activo_nombre_actual || riesgo.activo_nombre) && <Campo label="Activo afectado" valor={riesgo.activo_nombre_actual || riesgo.activo_nombre} />}
          <Campo label="Amenaza" valor={riesgo.amenaza} />
          {riesgo.vulnerabilidad && <Campo label="Vulnerabilidad" valor={riesgo.vulnerabilidad} />}
        </Seccion>

        <Seccion titulo="Tratamiento">
          <Campo label="Tipo" valor={TRATAMIENTO[riesgo.tipo_tratamiento] || 'Sin asignar'} />
          {riesgo.responsable && <Campo label="Responsable" valor={riesgo.responsable} />}
          {riesgo.fecha_limite && <Campo label="Fecha límite" valor={fmt(riesgo.fecha_limite)} />}
          {riesgo.plan_tratamiento && <Campo label="Plan" valor={riesgo.plan_tratamiento} />}
        </Seccion>

        {controlIds.length > 0 && (
          <Seccion titulo="Controles ISO 27001 relacionados">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {controlIds.map(id => (
                <span key={id} title={nombreControl(id)} style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreControl(id)}</span>
              ))}
            </div>
          </Seccion>
        )}

        {/* Notas editables */}
        <Seccion titulo="Notas DSTAC">
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, color: '#2C2C2A', outline: 'none', resize: 'vertical' }} />
          {notas !== (riesgo.notas_dstac || '') && (
            <button onClick={guardarNotas} disabled={guardandoNotas} style={{ marginTop: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#3C3489', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {guardandoNotas ? 'Guardando…' : 'Guardar notas'}
            </button>
          )}
        </Seccion>

        {/* Historial */}
        {riesgo.historial?.length > 0 && (
          <Seccion titulo="Historial">
            {riesgo.historial.slice(0, 4).map(h => (
              <div key={h.id} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#888780', padding: '5px 0', borderBottom: '1px solid #f1efe8' }}>
                <span style={{ color: '#B4B2A9', whiteSpace: 'nowrap' }}>{fmtH(h.created_at)}</span>
                <span style={{ color: '#444441' }}>{h.comentario || `${h.campo_cambiado}: ${h.valor_nuevo}`}</span>
              </div>
            ))}
          </Seccion>
        )}

        {/* Footer de acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1efe8' }}>
          {puedePDF ? (
            <button onClick={generar} disabled={generando}
              style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', cursor: generando ? 'default' : 'pointer', fontWeight: 600, fontSize: 13.5 }}>
              {generando ? 'Generando PDF…' : (controlIds.length > 0 ? '📄 Generar informe PDF → adjuntar a ISO' : '📄 Generar informe PDF')}
            </button>
          ) : (
            <div style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#FEF3E2', color: '#633806', fontSize: 12.5, textAlign: 'center' }}>
              Cambia el estado a "En tratamiento" para generar el informe PDF.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEditar(riesgo)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>Editar riesgo</button>
            {siguienteEstado && (
              <button onClick={() => onCambiarEstado(riesgo.id, siguienteEstado.v)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>{siguienteEstado.label}</button>
            )}
          </div>
        </div>
      </div>
    </>
    </FixedPortal>
  )
}

function nivelResidual(r) {
  const v = (r.residual_probabilidad || r.probabilidad) * (r.residual_impacto || r.impacto)
  if (v >= 20) return 'critico'; if (v >= 15) return 'alto'; if (v >= 6) return 'medio'; return 'bajo'
}
function Seccion({ titulo, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{titulo}</div>
      {children}
    </div>
  )
}
function Campo({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f1efe8' }}>
      <span style={{ color: '#888780', flexShrink: 0 }}>{label}</span>
      <b style={{ color: '#2C2C2A', textAlign: 'right', fontWeight: 500, wordBreak: 'break-word' }}>{valor}</b>
    </div>
  )
}
