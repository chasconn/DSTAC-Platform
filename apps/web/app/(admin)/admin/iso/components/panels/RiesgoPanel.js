'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '../../../../../../lib/api'

const PROB_LABELS = ['', 'Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta']
const IMP_LABELS  = ['', 'Mínimo',  'Bajo', 'Moderado', 'Alto', 'Crítico']

function riskCategory(prob, imp) {
  const level = prob * imp
  if (level >= 15) return { cat: 'critico', color: '#E24B4A', label: 'Crítico' }
  if (level >= 8)  return { cat: 'alto',    color: '#EF9F27', label: 'Alto'    }
  if (level >= 4)  return { cat: 'medio',   color: '#639922', label: 'Medio'   }
  return { cat: 'bajo', color: '#B4B2A9', label: 'Bajo' }
}

export default function RiesgoPanel({ riesgo, slug, domainId, onClose, onSaved, showToast }) {
  const isEdit = !!riesgo?.id

  const [form, setForm] = useState({
    asset_name:          '',
    threat:              '',
    vulnerability:       '',
    probability:         3,
    impact:              3,
    existing_controls:   '',
    residual_probability:'',
    residual_impact:     '',
    treatment:           'mitigar',
    treatment_notes:     '',
    status:              'abierto',
    control_id:          '',
  })
  const [saving, setSaving] = useState(false)
  const [controls, setControls] = useState([])

  useEffect(() => {
    if (riesgo) {
      setForm({
        asset_name:          riesgo.asset_name          ?? '',
        threat:              riesgo.threat              ?? '',
        vulnerability:       riesgo.vulnerability       ?? '',
        probability:         Number(riesgo.probability) || 3,
        impact:              Number(riesgo.impact)      || 3,
        existing_controls:   riesgo.existing_controls   ?? '',
        residual_probability: riesgo.residual_probability ?? '',
        residual_impact:     riesgo.residual_impact     ?? '',
        treatment:           riesgo.treatment           ?? 'mitigar',
        treatment_notes:     riesgo.treatment_notes     ?? '',
        status:              riesgo.status              ?? 'abierto',
        control_id:          riesgo.control_id          ?? '',
      })
    }
  }, [riesgo?.id])

  useEffect(() => {
    apiFetch(`/api/admin/iso/controls?domain_id=${domainId}`, {
      headers: { 'X-Company-Slug': slug },
    }).then(d => setControls(d.controls ?? [])).catch(() => {})
  }, [slug, domainId])

  const cat     = riskCategory(form.probability, form.impact)
  const headers = { 'X-Company-Slug': slug, 'Content-Type': 'application/json' }

  function up(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function guardar() {
    if (!form.asset_name.trim() || !form.threat.trim()) {
      showToast('Activo y amenaza son requeridos', 'error')
      return
    }
    setSaving(true)
    try {
      const body = {
        ...form,
        probability:          Number(form.probability),
        impact:               Number(form.impact),
        residual_probability: form.residual_probability ? Number(form.residual_probability) : null,
        residual_impact:      form.residual_impact      ? Number(form.residual_impact)      : null,
        control_id:           form.control_id           || null,
      }
      if (isEdit) {
        await apiFetch(`/api/admin/iso/riesgos/${riesgo.id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
        showToast('Riesgo actualizado')
      } else {
        await apiFetch('/api/admin/iso/riesgos', { method: 'POST', headers, body: JSON.stringify(body) })
        showToast('Riesgo creado')
      }
      onSaved()
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  function ScaleSelector({ value, onChange, labels }) {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => onChange(n)}
            style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: value >= n ? cat.color : '#f1efe8',
              color: value >= n ? '#fff' : '#B4B2A9',
              transition: 'all 0.12s',
            }}
            title={labels[n]}>
            {n}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e0d8', overflow: 'hidden', position: 'sticky', top: 20 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1efe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A' }}>
          {isEdit ? 'Editar riesgo' : 'Nuevo riesgo'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: cat.color + '20', color: cat.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
            {cat.label} — P{form.probability}×I{form.impact}={form.probability*form.impact}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 18, padding: 0 }}>×</button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Activo */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Activo / Servicio *</label>
          <input value={form.asset_name} onChange={e => up('asset_name', e.target.value)}
            placeholder="Nombre del activo…"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        {/* Amenaza */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Amenaza *</label>
          <input value={form.threat} onChange={e => up('threat', e.target.value)}
            placeholder="Descripción de la amenaza…"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        {/* Vulnerabilidad */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Vulnerabilidad</label>
          <textarea value={form.vulnerability} onChange={e => up('vulnerability', e.target.value)}
            rows={2} placeholder="Vulnerabilidad que explota la amenaza…"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        {/* Probabilidad e Impacto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
              Probabilidad: <span style={{ color: cat.color }}>{PROB_LABELS[form.probability]}</span>
            </label>
            <ScaleSelector value={form.probability} onChange={v => up('probability', v)} labels={PROB_LABELS} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
              Impacto: <span style={{ color: cat.color }}>{IMP_LABELS[form.impact]}</span>
            </label>
            <ScaleSelector value={form.impact} onChange={v => up('impact', v)} labels={IMP_LABELS} />
          </div>
        </div>

        {/* Controles existentes */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Controles existentes</label>
          <textarea value={form.existing_controls} onChange={e => up('existing_controls', e.target.value)}
            rows={2} placeholder="Controles de seguridad ya implementados…"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        {/* Tratamiento */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Tratamiento</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['mitigar','aceptar','transferir','evitar'].map(t => (
              <button key={t} onClick={() => up('treatment', t)}
                style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                  background: form.treatment === t ? '#3C3489' : '#f8f7f4',
                  color: form.treatment === t ? '#fff' : '#888780',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Notas de tratamiento */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Notas de tratamiento</label>
          <textarea value={form.treatment_notes} onChange={e => up('treatment_notes', e.target.value)}
            rows={2} placeholder="Plan de tratamiento…"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        {/* Control ISO asociado */}
        {controls.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Control ISO asociado</label>
            <select value={form.control_id} onChange={e => up('control_id', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}>
              <option value="">— Ninguno —</option>
              {controls.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
            </select>
          </div>
        )}

        {/* Estado */}
        {isEdit && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Estado</label>
            <select value={form.status} onChange={e => up('status', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}>
              <option value="abierto">Abierto</option>
              <option value="en_tratamiento">En tratamiento</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #f1efe8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 13 }}>
          Cancelar
        </button>
        <button onClick={guardar} disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear riesgo'}
        </button>
      </div>
    </div>
  )
}
