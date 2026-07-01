// Renderer de markdown liviano para la Wiki interna — sin dependencias externas
// (evita agregar una librería nueva al build). Soporta lo esencial: títulos,
// negrita/cursiva, código inline y en bloque, listas, citas, línea horizontal,
// enlaces normales y, lo importante, [[Enlaces internos]] / [[Título|Alias]].
'use client'

// Aplica negrita/cursiva/código inline y [[wikilinks]]/enlaces normales dentro de una línea.
function renderInline(text, key, onWikiLinkClick) {
  const nodes = []
  let rest = text
  let i = 0
  // Orden de prioridad: código inline > wikilink > enlace md > negrita > cursiva
  const re = /(`[^`]+`)|(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/
  while (rest.length) {
    const m = re.exec(rest)
    if (!m) { nodes.push(rest); break }
    if (m.index > 0) nodes.push(rest.slice(0, m.index))

    if (m[1]) { // `código`
      nodes.push(<code key={`${key}-${i++}`} className="wiki-inline-code">{m[1].slice(1, -1)}</code>)
    } else if (m[2]) { // [[Título]] / [[Título|Alias]]
      const titulo = m[3].trim()
      const alias = m[4]?.trim() || titulo
      nodes.push(
        <a key={`${key}-${i++}`} href="#" className="wiki-link"
          onClick={e => { e.preventDefault(); onWikiLinkClick?.(titulo) }}>
          {alias}
        </a>
      )
    } else if (m[5]) { // [texto](url)
      nodes.push(<a key={`${key}-${i++}`} href={m[7]} target="_blank" rel="noreferrer" className="wiki-ext-link">{m[6]}</a>)
    } else if (m[8]) { // **negrita**
      nodes.push(<strong key={`${key}-${i++}`}>{m[9]}</strong>)
    } else if (m[10]) { // *cursiva*
      nodes.push(<em key={`${key}-${i++}`}>{m[11]}</em>)
    }
    rest = rest.slice(m.index + m[0].length)
  }
  return nodes
}

export function renderWikiMarkdown(source, { onWikiLinkClick } = {}) {
  const lines = (source || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0, key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^\s*$/.test(line)) { i++; continue }

    // Bloque de código ```
    if (/^```/.test(line)) {
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++ }
      i++ // cierra ```
      blocks.push(<pre key={key++} className="wiki-codeblock"><code>{buf.join('\n')}</code></pre>)
      continue
    }

    // Títulos
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const Tag = `h${Math.min(level + 1, 6)}`
      blocks.push(<Tag key={key++} className={`wiki-h wiki-h${level}`}>{renderInline(h[2], key, onWikiLinkClick)}</Tag>)
      i++; continue
    }

    // Línea horizontal
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="wiki-hr" />)
      i++; continue
    }

    // Cita
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++ }
      blocks.push(<blockquote key={key++} className="wiki-quote">{buf.map((l, idx) => <p key={idx}>{renderInline(l, `${key}-${idx}`, onWikiLinkClick)}</p>)}</blockquote>)
      continue
    }

    // Lista (- / * / 1.)
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''))
        i++
      }
      const ListTag = ordered ? 'ol' : 'ul'
      blocks.push(
        <ListTag key={key++} className="wiki-list">
          {items.map((it, idx) => <li key={idx}>{renderInline(it, `${key}-${idx}`, onWikiLinkClick)}</li>)}
        </ListTag>
      )
      continue
    }

    // Párrafo (agrupa líneas seguidas sin blanco)
    const buf = [line]
    i++
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4})\s+/.test(lines[i]) &&
           !/^```/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) && !/^>\s?/.test(lines[i])) {
      buf.push(lines[i]); i++
    }
    blocks.push(<p key={key++} className="wiki-p">{renderInline(buf.join(' '), key, onWikiLinkClick)}</p>)
  }

  return blocks
}

// Extrae los títulos [[Título]] de un texto (usado para el autocompletado del editor).
export function extraerTitulosWikilink(texto) {
  const set = new Set()
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let m
  while ((m = re.exec(texto || '')) !== null) set.add(m[1].trim())
  return [...set]
}
