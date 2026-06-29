'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../../../../lib/api'
import FixedPortal from '../../../../../components/admin/FixedPortal'
import PendientesSubnav from '../components/PendientesSubnav'

// Color por prioridad de tarea (capa de solo lectura sobre el calendario).
const PRIORIDAD_COLOR = { critical: '#E24B4A', high: '#EF9F27', medium: '#C47A1A', low: '#B4B2A9' }

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
  const router = useRouter()
  const isMobile = useIsMobile()   // < 820px → celdas con puntos + agenda inferior
  // Mes/año visibles. `hoy` se fija una vez para marcar el día actual en la grilla.
  const hoy = new Date()
  const [year,  setYear]  = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth()) // 0-11

  const [eventos,  setEventos]  = useState([])
  const [tareas,   setTareas]   = useState([])
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
      setTareas(data.tareas ?? [])
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

  // Agrupar tareas por su fecha de vencimiento (capa de solo lectura).
  const tareasPorDia = {}
  for (const t of tareas) {
    const key = String(t.fecha).slice(0, 10)
    ;(tareasPorDia[key] ||= []).push(t)
  }

  // Lista cronológica (eventos + tareas) para la agenda móvil.
  const agendaItems = isMobile ? [
    ...eventos.map(e => ({ kind: 'ev', id: e.id, fecha: String(e.fecha).slice(0, 10), hora: e.todo_el_dia ? null : (e.hora_inicio ? String(e.hora_inicio).slice(0, 5) : null), titulo: e.titulo, color: (TIPOS[e.tipo] ?? TIPOS.otro).color, sub: e.company_name, raw: e })),
    ...tareas.map(t => ({ kind: 'ta', id: t.id, fecha: String(t.fecha).slice(0, 10), hora: null, titulo: t.titulo, color: PRIORIDAD_COLOR[t.priority] ?? '#B4B2A9', sub: t.company_name, done: t.status === 'done' })),
  ].sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0) : []

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
    <div style={{ padding: isMobile ? '14px 12px' : '24px 28px' }}>

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
        {/* Las tareas con vencimiento aparecen como chip punteado (solo lectura). */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888780', marginLeft: 6 }}>
          <span style={{ width: 11, height: 9, borderRadius: 3, border: '1px dashed #888780' }} /> Tarea (vencimiento)
        </span>
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
              return <div key={`v${i}`} style={{ minHeight: isMobile ? 52 : 96, borderRight: (i + 1) % 7 ? '1px solid #f1efe8' : 'none', borderBottom: '1px solid #f1efe8', background: '#fcfbf9' }} />
            }
            const key = ymd(dia)
            const delDia    = eventosPorDia[key] ?? []
            const tareasDia = tareasPorDia[key] ?? []
            const esHoy  = key === hoyStr
            // Reparto de los 3 espacios visibles: primero eventos, luego tareas.
            const evVisibles = delDia.slice(0, 3)
            const taVisibles = tareasDia.slice(0, Math.max(0, 3 - evVisibles.length))
            const ocultos = (delDia.length - evVisibles.length) + (tareasDia.length - taVisibles.length)
            return (
              <div
                key={key}
                onClick={() => abrirNuevo(dia)}
                style={{
                  minHeight: isMobile ? 52 : 96, padding: isMobile ? '4px 3px' : '6px 7px', cursor: 'pointer',
                  borderRight: (i + 1) % 7 ? '1px solid #f1efe8' : 'none',
                  borderBottom: '1px solid #f1efe8',
                  background: esHoy ? '#F4F3FE' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!esHoy) e.currentTarget.style.background = '#faf9f6' }}
                onMouseLeave={e => { if (!esHoy) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Número del día (resaltado si es hoy) */}
                <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', marginBottom: 4 }}>
                  <span style={{
                    fontSize: isMobile ? 11 : 12, fontWeight: esHoy ? 700 : 500,
                    color: esHoy ? '#fff' : '#444441',
                    background: esHoy ? '#534AB7' : 'transparent',
                    borderRadius: '50%', width: isMobile ? 18 : 22, height: isMobile ? 18 : 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {dia.getDate()}
                  </span>
                </div>

                {isMobile ? (
                  /* Móvil: solo puntos de color (resumen); el detalle está en la agenda inferior */
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                    {delDia.slice(0, 4).map(ev => (
                      <span key={`de${ev.id}`} style={{ width: 6, height: 6, borderRadius: '50%', background: (TIPOS[ev.tipo] ?? TIPOS.otro).color }} />
                    ))}
                    {tareasDia.slice(0, Math.max(0, 4 - delDia.length)).map(t => (
                      <span key={`dt${t.id}`} style={{ width: 6, height: 6, borderRadius: '50%', border: `1.5px solid ${PRIORIDAD_COLOR[t.priority] ?? '#B4B2A9'}` }} />
                    ))}
                  </div>
                ) : (
                /* Chips de eventos + tareas (máx. 3 visibles; el resto como "+N") */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {evVisibles.map(ev => {
                    const t = TIPOS[ev.tipo] ?? TIPOS.otro
                    return (
                      <div
                        key={`e${ev.id}`}
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
                  {/* Tareas: capa de solo lectura. Clic → ir a Mis tareas. */}
                  {taVisibles.map(t => {
                    const col = PRIORIDAD_COLOR[t.priority] ?? '#B4B2A9'
                    const hecha = t.status === 'done'
                    return (
                      <div
                        key={`t${t.id}`}
                        onClick={e => { e.stopPropagation(); router.push('/admin/pendientes/mis-tareas') }}
                        title={`Tarea: ${t.titulo}${t.company_name ? ` · ${t.company_name}` : ''}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: '#fff', border: `1px dashed ${col}`,
                          borderRadius: 4, padding: '2px 5px', fontSize: 11,
                          color: hecha ? '#888780' : '#2C2C2A',
                          textDecoration: hecha ? 'line-through' : 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ color: col, flexShrink: 0, fontSize: 10 }}>{hecha ? '✓' : '◷'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</span>
                      </div>
                    )
                  })}
                  {ocultos > 0 && (
                    <div style={{ fontSize: 10, color: '#888780', paddingLeft: 4 }}>+{ocultos} más</div>
                  )}
                </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Agenda del mes (solo móvil) — lista tocable de eventos y vencimientos */}
      {isMobile && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Agenda del mes</div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden' }}>
            {agendaItems.length === 0 ? (
              <div style={{ fontSize: 13, color: '#B4B2A9', padding: '16px', textAlign: 'center' }}>Sin eventos ni vencimientos este mes.</div>
            ) : agendaItems.map((it, idx) => {
              const d = new Date(it.fecha + 'T00:00:00')
              return (
                <div key={it.kind + it.id}
                  onClick={() => it.kind === 'ev' ? abrirEditar(it.raw) : router.push('/admin/pendientes/mis-tareas')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: idx < agendaItems.length - 1 ? '1px solid #f1efe8' : 'none', cursor: 'pointer' }}>
                  <div style={{ textAlign: 'center', minWidth: 34, flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2A', lineHeight: 1 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 9, color: '#888780', textTransform: 'uppercase', marginTop: 1 }}>{DIAS[(d.getDay() + 6) % 7]}</div>
                  </div>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: it.kind === 'ev' ? it.color : '#fff', border: it.kind === 'ta' ? `1.5px solid ${it.color}` : 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: it.done ? '#888780' : '#2C2C2A', textDecoration: it.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.titulo}</div>
                    <div style={{ fontSize: 11, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.kind === 'ta' ? 'Vence' : (it.hora || 'Todo el día')}{it.sub ? ` · ${it.sub}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
    <FixedPortal>
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
    </FixedPortal>
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

// Hook de viewport: true cuando el ancho es <= bp (móvil/tablet angosto).
function useIsMobile(bp = 820) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const upd = () => setM(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [bp])
  return m
}
