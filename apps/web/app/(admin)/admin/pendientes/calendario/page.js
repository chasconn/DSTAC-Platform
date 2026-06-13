'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../../../lib/api'
import PendientesSubnav from '../components/PendientesSubnav'

// Tipos de evento y su color asociado (se usa en el chip dentro de cada día).
const TIPOS = {
  reunion:      { label: 'Reunión',      color: '#534AB7' },
  tarea:        { label: 'Tarea',        color: '#EF9F27' },
  recordatorio: { label: 'Recordatorio', color: '#1D9E75' },
  auditoria:    { label: 'Auditoría',    color: '#E24B4A' },
  vencimiento:  { label: 'Vencimiento',  color: '#C47A1A' },
  otro:         { label: 'Otro',         color: '#888780' },
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// yyyy-mm-dd local (sin desfase por zona horaria, a diferencia de toISOString).
function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function CalendarioPage() {
  // Mes/año visibles. `hoy` se fija una vez para marcar el día actual en la grilla.
  const hoy = new Date()
  const [year,  setYear]  = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth()) // 0-11

  const [eventos,  setEventos]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [empresas, setEmpresas] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editando,  setEditando]  = useState(null)   // evento existente o null
  const [fechaNueva, setFechaNueva] = useState(null)  // fecha preseleccionada al crear
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  // Empresas para el selector opcional del modal (un solo listado plano).
  useEffect(() => {
    apiFetch('/api/admin/empresas/selector')
      .then(d => setEmpresas([...(d.internas ?? []), ...(d.clientes ?? [])]))
      .catch(() => {})
  }, [])

  const cargarEventos = useCallback(async () => {
    setLoading(true)
    try {
      // month+1 porque el backend espera 1-12.
      const data = await apiFetch(`/api/admin/pendientes/eventos?year=${year}&month=${month + 1}`)
      setEventos(data.eventos ?? [])
    } catch (err) {
      showToast(err.message || 'Error al cargar eventos', 'error')
    } finally { setLoading(false) }
  }, [year, month])

  useEffect(() => { cargarEventos() }, [cargarEventos])

  // ── Construcción de la grilla del mes ──────────────────────────────────────
  // Una grilla de semanas (filas) × 7 días (columnas), empezando en lunes.
  // 1. firstDay = día de la semana del día 1 del mes, convertido a base lunes (0=Lun … 6=Dom).
  // 2. Se rellenan celdas vacías antes del día 1 para alinear la primera semana.
  // 3. Se agregan los días 1..N del mes.
  // 4. Se completa la última semana hasta múltiplo de 7 con celdas vacías.
  function construirGrilla() {
    const primerDia = new Date(year, month, 1)
    const diasEnMes = new Date(year, month + 1, 0).getDate()
    // getDay(): 0=Dom..6=Sáb → convertir a 0=Lun..6=Dom.
    const offset = (primerDia.getDay() + 6) % 7

    const celdas = []
    for (let i = 0; i < offset; i++) celdas.push(null)               // huecos antes del 1
    for (let d = 1; d <= diasEnMes; d++) celdas.push(new Date(year, month, d))
    while (celdas.length % 7 !== 0) celdas.push(null)                // completar última semana
    return celdas
  }

  const celdas = construirGrilla()
  const hoyStr = ymd(hoy)

  // Agrupar eventos por fecha (yyyy-mm-dd) para pintarlos rápido en cada celda.
  const eventosPorDia = {}
  for (const ev of eventos) {
    // ev.fecha puede venir como 'yyyy-mm-dd' o ISO; nos quedamos con los 10 primeros chars.
    const key = String(ev.fecha).slice(0, 10)
    ;(eventosPorDia[key] ||= []).push(ev)
  }

  function mesAnterior() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function mesSiguiente() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }
  function irAHoy() { setYear(hoy.getFullYear()); setMonth(hoy.getMonth()) }

  function abrirNuevo(fecha) {
    setEditando(null)
    setFechaNueva(fecha ? ymd(fecha) : ymd(hoy))
    setModalOpen(true)
  }
  function abrirEditar(ev) {
    setEditando(ev)
    setFechaNueva(null)
    setModalOpen(true)
  }

  return (
    <div style={{ padding: '24px 28px' }}>

      <PendientesSubnav />

      {/* Toast */}
      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      {/* Header: navegación de mes + nuevo evento */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A', minWidth: 190 }}>
            {MESES[month]} {year}
          </h1>
          <button onClick={mesAnterior}  style={navBtn} title="Mes anterior">‹</button>
          <button onClick={mesSiguiente} style={navBtn} title="Mes siguiente">›</button>
          <button onClick={irAHoy} style={{ ...navBtn, width: 'auto', padding: '0 12px', fontSize: 13 }}>Hoy</button>
        </div>
        <button
          onClick={() => abrirNuevo(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Nuevo evento
        </button>
      </div>

      {/* Leyenda de tipos */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(TIPOS).map(([k, t]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888780' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.color }} /> {t.label}
          </span>
        ))}
      </div>

      {/* Grilla del calendario */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>

        {/* Cabecera de días de la semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8f7f4', borderBottom: '1px solid #e2e0d8' }}>
          {DIAS.map(d => (
            <div key={d} style={{ padding: '9px 10px', fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{d}</div>
          ))}
        </div>

        {/* Celdas: cada una es un día (o un hueco vacío) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {celdas.map((dia, i) => {
            if (!dia) {
              // Hueco fuera del mes — celda inerte gris muy claro.
              return <div key={`v${i}`} style={{ minHeight: 96, borderRight: (i + 1) % 7 ? '1px solid #f1efe8' : 'none', borderBottom: '1px solid #f1efe8', background: '#fcfbf9' }} />
            }
            const key = ymd(dia)
            const delDia = eventosPorDia[key] ?? []
            const esHoy  = key === hoyStr
            return (
              <div
                key={key}
                onClick={() => abrirNuevo(dia)}
                style={{
                  minHeight: 96, padding: '6px 7px', cursor: 'pointer',
                  borderRight: (i + 1) % 7 ? '1px solid #f1efe8' : 'none',
                  borderBottom: '1px solid #f1efe8',
                  background: esHoy ? '#F4F3FE' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!esHoy) e.currentTarget.style.background = '#faf9f6' }}
                onMouseLeave={e => { if (!esHoy) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Número del día (resaltado si es hoy) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 12, fontWeight: esHoy ? 700 : 500,
                    color: esHoy ? '#fff' : '#444441',
                    background: esHoy ? '#534AB7' : 'transparent',
                    borderRadius: '50%', width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {dia.getDate()}
                  </span>
                </div>

                {/* Chips de eventos (máx. 3 visibles; el resto se indica con "+N") */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {delDia.slice(0, 3).map(ev => {
                    const t = TIPOS[ev.tipo] ?? TIPOS.otro
                    return (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); abrirEditar(ev) }}
                        title={ev.titulo}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: t.color + '1A', borderLeft: `3px solid ${t.color}`,
                          borderRadius: 4, padding: '2px 5px', fontSize: 11,
                          color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {!ev.todo_el_dia && ev.hora_inicio && (
                          <span style={{ color: t.color, fontWeight: 600, flexShrink: 0 }}>{String(ev.hora_inicio).slice(0, 5)}</span>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.titulo}</span>
                      </div>
                    )
                  })}
                  {delDia.length > 3 && (
                    <div style={{ fontSize: 10, color: '#888780', paddingLeft: 4 }}>+{delDia.length - 3} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {loading && <div style={{ padding: '12px', textAlign: 'center', color: '#888780', fontSize: 12 }}>Cargando…</div>}

      {/* Modal de evento */}
      {modalOpen && (
        <EventoModal
          evento={editando}
          fechaInicial={fechaNueva}
          empresas={empresas}
          onClose={() => { setModalOpen(false); setEditando(null) }}
          onSaved={() => { setModalOpen(false); setEditando(null); cargarEventos(); showToast(editando ? 'Evento actualizado' : 'Evento creado') }}
          onDeleted={() => { setModalOpen(false); setEditando(null); cargarEventos(); showToast('Evento eliminado') }}
        />
      )}
    </div>
  )
}

const navBtn = { width: 34, height: 34, borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 18, color: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }

// ─── Modal crear/editar evento ────────────────────────────────────────────────
function EventoModal({ evento, fechaInicial, empresas, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    titulo:      evento?.titulo ?? '',
    descripcion: evento?.descripcion ?? '',
    fecha:       evento?.fecha ? String(evento.fecha).slice(0, 10) : (fechaInicial ?? ''),
    tipo:        evento?.tipo ?? 'reunion',
    todo_el_dia: evento?.todo_el_dia ? true : false,
    hora_inicio: evento?.hora_inicio ? String(evento.hora_inicio).slice(0, 5) : '',
    hora_fin:    evento?.hora_fin ? String(evento.hora_fin).slice(0, 5) : '',
    company_id:  evento?.company_id ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    if (!form.titulo.trim() || !form.fecha) { setError('Título y fecha son obligatorios'); return }
    setSaving(true); setError('')
    const body = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      fecha: form.fecha,
      tipo: form.tipo,
      todo_el_dia: form.todo_el_dia,
      hora_inicio: form.todo_el_dia ? null : (form.hora_inicio || null),
      hora_fin:    form.todo_el_dia ? null : (form.hora_fin || null),
      company_id: form.company_id || null,
    }
    try {
      if (evento) {
        await apiFetch(`/api/admin/pendientes/eventos/${evento.id}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await apiFetch('/api/admin/pendientes/eventos', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Error al guardar'); setSaving(false)
    }
  }

  async function eliminar() {
    setDeleting(true)
    try {
      await apiFetch(`/api/admin/pendientes/eventos/${evento.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      setError(err.message || 'Error al eliminar'); setDeleting(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,33,92,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2C2C2A' }}>{evento ? 'Editar evento' : 'Nuevo evento'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#888780', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 12, padding: '8px 12px', borderRadius: 8 }}>{error}</div>}

          <Field label="Título *">
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} autoFocus
              placeholder="Ej. Reunión kickoff con cliente" style={inp} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Fecha *">
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} />
            </Field>
            <Field label="Tipo">
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inp}>
                {Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#444441', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.todo_el_dia} onChange={e => set('todo_el_dia', e.target.checked)} />
            Todo el día
          </label>

          {!form.todo_el_dia && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Hora inicio">
                <input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} style={inp} />
              </Field>
              <Field label="Hora fin">
                <input type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)} style={inp} />
              </Field>
            </div>
          )}

          <Field label="Empresa relacionada (opcional)">
            <select value={form.company_id} onChange={e => set('company_id', e.target.value)} style={inp}>
              <option value="">— Sin empresa —</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>

          <Field label="Descripción">
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3}
              placeholder="Notas, agenda, enlace de la reunión…" style={{ ...inp, resize: 'vertical' }} />
          </Field>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {evento ? (
            <button onClick={eliminar} disabled={deleting}
              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #E8A6A6', background: '#fff', color: '#C0392B', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={guardar} disabled={saving}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#888780' }}>{label}</span>
      {children}
    </label>
  )
}

const inp = { width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none', boxSizing: 'border-box' }
