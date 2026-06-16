'use client'

// Modal crear/editar riesgo. Calcula el nivel en tiempo real y permite asociar
// controles ISO. Guarda directamente contra /api/admin/riesgos con X-Company-Slug.
import { useState, useMemo } from 'react'
import { apiFetch } from '../../../../../lib/api'
import { NIVEL, ESTADO, CATEGORIA, TRATAMIENTO, PROB_LABELS, IMP_LABELS, nivelDe } from './constants'

const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 11px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }

export default function RiesgoModal({ riesgo, slug, activos = [], isoControls = [], onClose, onSaved }) {
  const ed = !!riesgo
  const [f, setF] = useState({
    nombre:        riesgo?.nombre ?? '',
    descripcion:   riesgo?.descripcion ?? '',
    estado:        riesgo?.estado ?? 'identificado',
    categoria:     riesgo?.categoria ?? 'tecnico',
    activo_id:     riesgo?.activo_id ?? '',
    amenaza:       riesgo?.amenaza ?? '',
    vulnerabilidad: riesgo?.vulnerabilidad ?? '',
    probabilidad:  riesgo?.probabilidad ?? 3,
    impacto:       riesgo?.impacto ?? 3,
    tipo_tratamiento: riesgo?.tipo_tratamiento ?? '',
    plan_tratamiento: riesgo?.plan_tratamiento ?? '',
    responsable:   riesgo?.responsable ?? '',
    fecha_limite:  riesgo?.fecha_limite ? String(riesgo.fecha_limite).slice(0, 10) : '',
    residual_probabilidad: riesgo?.residual_probabilidad ?? '',
    residual_impacto:      riesgo?.residual_impacto ?? '',
    notas_dstac:   riesgo?.notas_dstac ?? '',
  })
  const initialControls = Array.isArray(riesgo?.iso_control_ids) ? riesgo.iso_control_ids
    : (riesgo?.iso_control_ids ? (() => { try { return JSON.parse(riesgo.iso_control_ids) } catch { return [] } })() : [])
  const [controles, setControles] = useState(initialControls)
  const [busca, setBusca] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const niv = NIVEL[nivelDe(f.probabilidad, f.impacto)]
  const tieneTrat = !!f.tipo_tratamiento
  const nivResidual = NIVEL[nivelDe(f.residual_probabilidad || f.probabilidad, f.residual_impacto || f.impacto)]

  const controlesFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q) return isoControls.slice(0, 40)
    return isoControls.filter(c => `${c.id} ${c.name}`.toLowerCase().includes(q)).slice(0, 40)
  }, [busca, isoControls])

  function toggleControl(id) {
    setControles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function guardar() {
    if (!f.nombre.trim() || !f.amenaza.trim()) { setError('Nombre y amenaza son obligatorios'); return }
    setSaving(true); setError('')
    const body = {
      nombre: f.nombre.trim(), descripcion: f.descripcion.trim() || null, estado: f.estado, categoria: f.categoria,
      activo_id: f.activo_id || null, amenaza: f.amenaza.trim(), vulnerabilidad: f.vulnerabilidad.trim() || null,
      probabilidad: Number(f.probabilidad), impacto: Number(f.impacto),
      tipo_tratamiento: f.tipo_tratamiento || null, plan_tratamiento: f.plan_tratamiento.trim() || null,
      responsable: f.responsable.trim() || null, fecha_limite: f.fecha_limite || null,
      residual_probabilidad: f.residual_probabilidad ? Number(f.residual_probabilidad) : null,
      residual_impacto: f.residual_impacto ? Number(f.residual_impacto) : null,
      iso_control_ids: controles, notas_dstac: f.notas_dstac.trim() || null,
    }
    const headers = slug ? { 'X-Company-Slug': slug } : {}
    try {
      if (ed) await apiFetch(`/api/admin/riesgos/${riesgo.id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
      else    await apiFetch('/api/admin/riesgos', { method: 'POST', headers, body: JSON.stringify(body) })
      onSaved()
    } catch (err) { setError(err.message || 'Error al guardar'); setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,33,92,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 10px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>{ed ? 'Editar riesgo' : 'Nuevo riesgo'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#888780', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 12, padding: '8px 12px', borderRadius: 8 }}>{error}</div>}

          {riesgo?.incidente_id && (
            <div style={{ background: '#FEF3E2', color: '#633806', fontSize: 12, padding: '8px 12px', borderRadius: 8 }}>
              ⚡ Riesgo generado automáticamente desde el incidente: <b>{riesgo.incidente_nombre}</b>
            </div>
          )}

          <Field label="Nombre del riesgo *"><input value={f.nombre} onChange={e => set('nombre', e.target.value)} autoFocus style={inp} placeholder="Ej. Acceso no autorizado al servidor de BD" /></Field>
          <Field label="Descripción"><textarea value={f.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} /></Field>

          <Row style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <Field label="Estado *">
              <select value={f.estado} onChange={e => set('estado', e.target.value)} style={inp} required>
                {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Categoría *">
              <select value={f.categoria} onChange={e => set('categoria', e.target.value)} style={inp}>
                {Object.entries(CATEGORIA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Activo relacionado">
              <select value={f.activo_id} onChange={e => set('activo_id', e.target.value)} style={inp}>
                <option value="">— Ninguno —</option>
                {activos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Amenaza *"><input value={f.amenaza} onChange={e => set('amenaza', e.target.value)} style={inp} placeholder="Ej. Atacante externo, ransomware…" /></Field>
          <Field label="Vulnerabilidad"><input value={f.vulnerabilidad} onChange={e => set('vulnerabilidad', e.target.value)} style={inp} placeholder="Ej. Falta de MFA, software sin parchar…" /></Field>

          <Row>
            <Field label="Probabilidad *">
              <select value={f.probabilidad} onChange={e => set('probabilidad', e.target.value)} style={inp}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} · {PROB_LABELS[n]}</option>)}
              </select>
            </Field>
            <Field label="Impacto *">
              <select value={f.impacto} onChange={e => set('impacto', e.target.value)} style={inp}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} · {IMP_LABELS[n]}</option>)}
              </select>
            </Field>
          </Row>

          {/* Nivel calculado en tiempo real */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: niv.bg, borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 12, color: niv.text, fontWeight: 600 }}>Nivel de riesgo:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: niv.text }}>{niv.label.toUpperCase()} ({Number(f.probabilidad) * Number(f.impacto)}/25)</span>
          </div>

          <div style={{ borderTop: '1px solid #f1efe8', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Tratamiento</div>
            <Row>
              <Field label="Tipo de tratamiento">
                <select value={f.tipo_tratamiento} onChange={e => set('tipo_tratamiento', e.target.value)} style={inp}>
                  <option value="">— Sin asignar —</option>
                  {Object.entries(TRATAMIENTO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <Field label="Responsable"><input value={f.responsable} onChange={e => set('responsable', e.target.value)} style={inp} /></Field>
            </Row>
            <div style={{ marginTop: 12 }}><Field label="Plan de tratamiento"><textarea value={f.plan_tratamiento} onChange={e => set('plan_tratamiento', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} /></Field></div>
            <div style={{ marginTop: 12 }}><Field label="Fecha límite"><input type="date" value={f.fecha_limite} onChange={e => set('fecha_limite', e.target.value)} style={inp} /></Field></div>

            {tieneTrat && (
              <>
                <Row style={{ marginTop: 12 }}>
                  <Field label="Probabilidad residual">
                    <select value={f.residual_probabilidad} onChange={e => set('residual_probabilidad', e.target.value)} style={inp}>
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} · {PROB_LABELS[n]}</option>)}
                    </select>
                  </Field>
                  <Field label="Impacto residual">
                    <select value={f.residual_impacto} onChange={e => set('residual_impacto', e.target.value)} style={inp}>
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} · {IMP_LABELS[n]}</option>)}
                    </select>
                  </Field>
                </Row>
                {(f.residual_probabilidad || f.residual_impacto) && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: nivResidual.text, fontWeight: 600 }}>
                    Riesgo residual esperado: {nivResidual.label.toUpperCase()} ({(Number(f.residual_probabilidad) || Number(f.probabilidad)) * (Number(f.residual_impacto) || Number(f.impacto))}/25)
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controles ISO */}
          <div style={{ borderTop: '1px solid #f1efe8', paddingTop: 12 }}>
            <Field label="Controles ISO 27001 relacionados">
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar control (código o nombre)…" style={inp} />
            </Field>
            {controles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {controles.map(id => (
                  <span key={id} onClick={() => toggleControl(id)} style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}>{id} ×</span>
                ))}
              </div>
            )}
            <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #f1efe8', borderRadius: 8, marginTop: 8 }}>
              {controlesFiltrados.length === 0 && <div style={{ padding: 10, fontSize: 12, color: '#B4B2A9' }}>Sin resultados</div>}
              {controlesFiltrados.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 12.5, color: '#2C2C2A', cursor: 'pointer', borderBottom: '1px solid #f8f7f4' }}>
                  <input type="checkbox" checked={controles.includes(c.id)} onChange={() => toggleControl(c.id)} />
                  <b style={{ fontWeight: 600, color: '#3C3489' }}>{c.id}</b> {c.name}
                </label>
              ))}
            </div>
          </div>

          <Field label="Notas DSTAC"><textarea value={f.notas_dstac} onChange={e => set('notas_dstac', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} /></Field>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e0d8', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: '#fff' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{saving ? 'Guardando…' : 'Guardar riesgo'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#888780' }}>{label}</span>{children}</label>
}
function Row({ children, style }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...style }}>{children}</div>
}
