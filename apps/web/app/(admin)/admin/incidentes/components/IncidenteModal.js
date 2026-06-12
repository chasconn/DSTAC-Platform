'use client'

import { useState, useEffect } from 'react'
import { api } from '../../../../../lib/api'
import CvssCalculator from './CvssCalculator'

const INP = { width: '100%', padding: '8px 10px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 13, color: '#2C2C2A', outline: 'none', boxSizing: 'border-box', background: '#fff' }

export default function IncidenteModal({ incidente, empresaSlug, onClose, onSaved }) {
  const esEdicion = !!incidente
  const headers   = empresaSlug ? { 'X-Company-Slug': empresaSlug } : {}

  const [form, setForm] = useState({
    tipo:         incidente?.tipo         ?? '',
    categoria:    incidente?.categoria    ?? '',
    estado:       incidente?.estado       ?? 'abierto',
    severidad:    incidente?.severidad    ?? 'media',
    impacto:      incidente?.impacto      ?? '',
    descripcion:  incidente?.descripcion  ?? '',
    causa_raiz:   incidente?.causa_raiz   ?? '',
    vulnerabilidades: incidente?.vulnerabilidades ?? '',
    cvss:         incidente?.cvss != null ? String(incidente.cvss) : '',
    activo_id:    String(incidente?.activo_id ?? ''),
    proyecto:     incidente?.proyecto     ?? '',
    responsable:  incidente?.responsable  ?? '',
    fecha_deteccion:  incidente?.fecha_deteccion ? incidente.fecha_deteccion.split('T')[0] : new Date().toISOString().split('T')[0],
    fecha_respuesta:  incidente?.fecha_respuesta  ? incidente.fecha_respuesta.split('T')[0]  : '',
    tiempo_resolucion: incidente?.tiempo_resolucion != null ? String(incidente.tiempo_resolucion) : '',
    requiere_notificacion_legal: incidente?.requiere_notificacion_legal ?? false,
  })

  const [activos,   setActivos]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [showCvss,  setShowCvss]  = useState(false)

  useEffect(() => {
    if (!empresaSlug) return
    api.get('/api/admin/activos?limit=200', headers)
      .then(d => setActivos(d.activos ?? []))
      .catch(() => {})
  }, [empresaSlug])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const payload = {
      tipo:         form.tipo,
      categoria:    form.categoria || undefined,
      estado:       form.estado,
      severidad:    form.severidad,
      impacto:      form.impacto || undefined,
      descripcion:  form.descripcion || undefined,
      causa_raiz:   form.causa_raiz || undefined,
      vulnerabilidades: form.vulnerabilidades || undefined,
      cvss:         form.cvss ? Number(form.cvss) : undefined,
      activo_id:    form.activo_id ? Number(form.activo_id) : undefined,
      proyecto:     form.proyecto || undefined,
      responsable:  form.responsable || undefined,
      fecha_deteccion:  form.fecha_deteccion || undefined,
      fecha_respuesta:  form.fecha_respuesta  || undefined,
      tiempo_resolucion: form.tiempo_resolucion ? Number(form.tiempo_resolucion) : undefined,
      requiere_notificacion_legal: form.requiere_notificacion_legal,
    }
    try {
      if (esEdicion) {
        await api.put(`/api/incidents/${incidente.id}`, payload, headers)
      } else {
        await api.post('/api/incidents', payload, headers)
      }
      onSaved()
    } catch (err) { setError(err.message || 'Error al guardar') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>
            {esEdicion ? 'Editar incidente' : 'Nuevo incidente'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <F label="Tipo *">
              <input value={form.tipo} onChange={e => set('tipo', e.target.value)} required style={INP} placeholder="Ej: Acceso no autorizado" />
            </F>
            <F label="Categoría">
              <input value={form.categoria} onChange={e => set('categoria', e.target.value)} style={INP} placeholder="Ej: Intrusión" />
            </F>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <F label="Severidad *">
              <select value={form.severidad} onChange={e => set('severidad', e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </F>
            <F label="Estado">
              <select value={form.estado} onChange={e => set('estado', e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
                <option value="abierto">Abierto</option>
                <option value="en_investigacion">En investigación</option>
                <option value="en_respuesta">En respuesta</option>
                <option value="cerrado">Cerrado</option>
                <option value="falso_positivo">Falso positivo</option>
              </select>
            </F>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <F label="Impacto">
              <select value={form.impacto} onChange={e => set('impacto', e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
                <option value="">Sin especificar</option>
                <option value="critico">Crítico</option>
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
                <option value="bajo">Bajo</option>
              </select>
            </F>
            <F label="CVSS (0–10)">
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" min="0" max="10" step="0.1" value={form.cvss} onChange={e => set('cvss', e.target.value)} style={{ ...INP, flex: 1 }} placeholder="Ej: 8.5" />
                <button type="button" onClick={() => setShowCvss(v => !v)}
                  title="Abrir calculadora CVSS v3.1"
                  style={{ padding: '0 10px', borderRadius: 8, border: '1px solid #e2e0d8', background: showCvss ? '#EEEDFE' : '#fff', color: showCvss ? '#3C3489' : '#888780', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  🧮 Calcular
                </button>
              </div>
            </F>
          </div>

          {showCvss && (
            <CvssCalculator
              onApply={score => set('cvss', score)}
              onClose={() => setShowCvss(false)}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <F label="Responsable">
              <input value={form.responsable} onChange={e => set('responsable', e.target.value)} style={INP} placeholder="Analista a cargo" />
            </F>
            <F label="Proyecto">
              <input value={form.proyecto} onChange={e => set('proyecto', e.target.value)} style={INP} placeholder="Proyecto relacionado" />
            </F>
          </div>

          <F label="Activo relacionado">
            <select value={form.activo_id} onChange={e => set('activo_id', e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
              <option value="">Sin activo</option>
              {activos.map(a => (
                <option key={a.id} value={String(a.id)}>{a.nombre} — {a.tipo}</option>
              ))}
            </select>
          </F>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <F label="Fecha de detección">
              <input type="date" value={form.fecha_deteccion} onChange={e => set('fecha_deteccion', e.target.value)} style={INP} />
            </F>
            <F label="Fecha de respuesta">
              <input type="date" value={form.fecha_respuesta} onChange={e => set('fecha_respuesta', e.target.value)} style={INP} />
            </F>
          </div>

          <F label="Tiempo de resolución (minutos)">
            <input type="number" min="0" value={form.tiempo_resolucion} onChange={e => set('tiempo_resolucion', e.target.value)} style={INP} placeholder="Ej: 120" />
          </F>

          <F label="Descripción">
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3}
              style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Descripción del incidente…" />
          </F>

          <F label="Causa raíz">
            <textarea value={form.causa_raiz} onChange={e => set('causa_raiz', e.target.value)} rows={2}
              style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Análisis de causa raíz…" />
          </F>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <input
              type="checkbox"
              id="notif_legal"
              checked={form.requiere_notificacion_legal}
              onChange={e => set('requiere_notificacion_legal', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="notif_legal" style={{ fontSize: 13, color: '#2C2C2A', cursor: 'pointer' }}>
              Requiere notificación legal / regulatoria
            </label>
          </div>

          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #E8A6A6', borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: 13, color: '#791F1F' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#444441', fontWeight: 500 }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.tipo || !form.severidad}
              style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: (loading || !form.tipo || !form.severidad) ? 0.5 : 1 }}>
              {loading ? 'Guardando…' : (esEdicion ? 'Guardar' : 'Crear incidente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function F({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#2C2C2A', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
