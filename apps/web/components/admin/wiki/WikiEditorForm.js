'use client'

import { useState, useRef, useMemo } from 'react'

const INPUT = { padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13.5, color: '#2C2C2A', background: '#fff', outline: 'none', width: '100%', fontFamily: 'inherit' }

export default function WikiEditorForm({ nota, notasDisponibles, onGuardar, onCancelar, onSubirAdjunto, subiendoAdjunto }) {
  const esNueva = !nota?.id
  const [titulo, setTitulo]         = useState(nota?.titulo ?? '')
  const [contenido, setContenido]   = useState(nota?.contenido ?? '')
  const [carpeta, setCarpeta]       = useState(nota?.carpeta ?? '')
  const [tagsTxt, setTagsTxt]       = useState((nota?.tags ?? []).join(', '))
  const [visibilidad, setVisibilidad] = useState(nota?.visibilidad ?? 'privada')
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState(null)

  const [autocomplete, setAutocomplete] = useState(null) // { query, start, end }
  const textareaRef = useRef(null)

  const puedeEditar = esNueva || nota?.puedo_editar !== false
  const esDueno = esNueva || nota?.es_mia !== false

  const sugerencias = useMemo(() => {
    if (!autocomplete) return []
    const q = autocomplete.query.toLowerCase()
    return (notasDisponibles || [])
      .filter(n => n.titulo.toLowerCase().includes(q))
      .slice(0, 8)
  }, [autocomplete, notasDisponibles])

  function detectarAutocomplete(value, cursorPos) {
    const antes = value.slice(0, cursorPos)
    const m = /\[\[([^\]]*)$/.exec(antes)
    if (m) setAutocomplete({ query: m[1], start: cursorPos - m[1].length, end: cursorPos })
    else setAutocomplete(null)
  }

  function handleChange(e) {
    setContenido(e.target.value)
    detectarAutocomplete(e.target.value, e.target.selectionStart)
  }

  function insertarWikilink(titulo) {
    if (!autocomplete) return
    const before = contenido.slice(0, autocomplete.start)
    const after = contenido.slice(autocomplete.end)
    const nuevo = `${before}${titulo}]]${after}`
    setContenido(nuevo)
    setAutocomplete(null)
    requestAnimationFrame(() => {
      const pos = before.length + titulo.length + 2
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(pos, pos)
    })
  }

  function insertarEnCursor(prefijo, sufijo = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const seleccion = contenido.slice(start, end)
    const nuevo = contenido.slice(0, start) + prefijo + seleccion + sufijo + contenido.slice(end)
    setContenido(nuevo)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + prefijo.length, start + prefijo.length + seleccion.length)
    })
  }

  async function guardar() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    setError(null); setGuardando(true)
    try {
      await onGuardar({
        titulo: titulo.trim(),
        contenido,
        carpeta: carpeta.trim() || null,
        tags: tagsTxt.trim() ? tagsTxt.split(',').map(t => t.trim()).filter(Boolean) : null,
        visibilidad,
      })
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally { setGuardando(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título de la nota"
          style={{ ...INPUT, flex: '2 1 260px', fontSize: 16, fontWeight: 600 }} disabled={!puedeEditar} />
        <input value={carpeta} onChange={e => setCarpeta(e.target.value)} placeholder="Carpeta (ej: Runbooks/Incidentes)"
          style={{ ...INPUT, flex: '1 1 200px' }} disabled={!puedeEditar} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={tagsTxt} onChange={e => setTagsTxt(e.target.value)} placeholder="Tags separados por coma"
          style={{ ...INPUT, flex: '1 1 220px' }} disabled={!puedeEditar} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#faf9f6', border: '1px solid #e2e0d8', borderRadius: 8, padding: '4px' }}>
          <button type="button" onClick={() => setVisibilidad('privada')} disabled={!esDueno}
            style={pillBtn(visibilidad === 'privada', esDueno)}>🔒 Privada</button>
          <button type="button" onClick={() => setVisibilidad('equipo')} disabled={!esDueno}
            style={pillBtn(visibilidad === 'equipo', esDueno)}>👥 Equipo</button>
        </div>
        {!esDueno && (
          <span style={{ fontSize: 11.5, color: '#888780' }}>Solo el dueño puede cambiar la visibilidad</span>
        )}
      </div>

      {/* Barra de formato */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <ToolBtn onClick={() => insertarEnCursor('**', '**')} title="Negrita">B</ToolBtn>
        <ToolBtn onClick={() => insertarEnCursor('*', '*')} title="Cursiva"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => insertarEnCursor('## ')} title="Título">H</ToolBtn>
        <ToolBtn onClick={() => insertarEnCursor('- ')} title="Lista">•</ToolBtn>
        <ToolBtn onClick={() => insertarEnCursor('`', '`')} title="Código">{'</>'}</ToolBtn>
        <ToolBtn onClick={() => insertarEnCursor('[[', ']]')} title="Enlazar otra nota">[[ ]]</ToolBtn>
        {nota?.id && onSubirAdjunto && (
          <label style={{ ...toolBtnStyle, cursor: subiendoAdjunto ? 'wait' : 'pointer' }}>
            {subiendoAdjunto ? 'Subiendo…' : '📎 Adjuntar'}
            <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf" style={{ display: 'none' }}
              disabled={subiendoAdjunto}
              onChange={e => { if (e.target.files?.[0]) onSubirAdjunto(e.target.files[0]); e.target.value = '' }} />
          </label>
        )}
      </div>

      {/* Editor con autocompletado */}
      <div style={{ position: 'relative', flex: 1, minHeight: 260 }}>
        <textarea
          ref={textareaRef}
          value={contenido}
          onChange={handleChange}
          onKeyDown={e => {
            if (autocomplete && sugerencias.length && (e.key === 'Escape')) setAutocomplete(null)
          }}
          disabled={!puedeEditar}
          placeholder="Escribe en markdown. Usa [[Título]] para enlazar otra nota…"
          style={{ ...INPUT, width: '100%', height: '100%', minHeight: 260, resize: 'vertical', lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 13 }}
        />
        {autocomplete && sugerencias.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8, background: '#fff', border: '1px solid #e2e0d8',
            borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,.15)', width: 280, maxHeight: 220, overflowY: 'auto', zIndex: 10,
          }}>
            {sugerencias.map(n => (
              <div key={n.id} onMouseDown={e => { e.preventDefault(); insertarWikilink(n.titulo) }}
                style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1efe9', display: 'flex', alignItems: 'center', gap: 6 }}>
                {n.es_fantasma ? '👻' : '📄'} {n.titulo}
              </div>
            ))}
            <div onMouseDown={e => { e.preventDefault(); insertarWikilink(autocomplete.query) }}
              style={{ padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', color: '#888780' }}>
              + Crear "{autocomplete.query}"
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#B23434', fontSize: 12.5 }}>{error}</div>}

      {puedeEditar && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancelar} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: guardando ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}

const toolBtnStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }

function ToolBtn({ onClick, title, children }) {
  return <button type="button" onClick={onClick} title={title} style={{ ...toolBtnStyle, cursor: 'pointer' }}>{children}</button>
}

function pillBtn(activo, habilitado) {
  return {
    padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
    background: activo ? '#3C3489' : 'transparent', color: activo ? '#fff' : '#888780',
    cursor: habilitado ? 'pointer' : 'default', opacity: habilitado ? 1 : 0.6,
  }
}
