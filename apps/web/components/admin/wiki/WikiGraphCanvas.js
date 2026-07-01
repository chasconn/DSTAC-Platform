'use client'

// Vista de grafo de la Wiki — sin librerías externas (evita sumar una
// dependencia nueva al build). Simulación de fuerzas simple: los nodos se
// repelen entre sí, los enlaces los acercan como un resorte, y todo se atrae
// levemente al centro. Se detiene sola cuando el movimiento es mínimo.
import { useEffect, useRef, useState } from 'react'

const COLORS = {
  fantasma: '#B4B2A9',
  equipo:   '#1D9E75',
  privada:  '#3C3489',
}

export default function WikiGraphCanvas({ nodes, edges, onNodeClick, activeId }) {
  const containerRef = useRef(null)
  const posRef = useRef({})
  const [size, setSize] = useState({ w: 800, h: 560 })
  const [, forceRender] = useState(0)
  const [hoverId, setHoverId] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.max(width, 300), h: Math.max(height, 300) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!nodes.length) return
    const pos = posRef.current
    // Inicializa posiciones nuevas cerca del centro, en círculo
    nodes.forEach((n, idx) => {
      if (!pos[n.id]) {
        const angle = (idx / nodes.length) * Math.PI * 2
        pos[n.id] = {
          x: size.w / 2 + Math.cos(angle) * 120,
          y: size.h / 2 + Math.sin(angle) * 120,
          vx: 0, vy: 0,
        }
      }
    })
    // Limpia posiciones de nodos que ya no existen
    Object.keys(pos).forEach(id => { if (!nodes.find(n => String(n.id) === id)) delete pos[id] })

    let ticks = 0
    let raf
    const maxTicks = 400

    function step() {
      ticks++
      const REPEL = 2600, SPRING = 0.012, SPRING_LEN = 130, CENTER = 0.006, DAMP = 0.82

      // Repulsión entre todos los pares (O(n²) — adecuado para una wiki chica)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = pos[nodes[i].id], b = pos[nodes[j].id]
          if (!a || !b) continue
          let dx = a.x - b.x, dy = a.y - b.y
          let dist2 = dx * dx + dy * dy || 0.01
          const force = REPEL / dist2
          const dist = Math.sqrt(dist2) || 1
          const fx = (dx / dist) * force, fy = (dy / dist) * force
          a.vx += fx; a.vy += fy
          b.vx -= fx; b.vy -= fy
        }
      }
      // Resorte a lo largo de los enlaces
      edges.forEach(e => {
        const a = pos[e.source], b = pos[e.target]
        if (!a || !b) return
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const diff = (dist - SPRING_LEN) * SPRING
        const fx = (dx / dist) * diff, fy = (dy / dist) * diff
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      })
      // Atracción leve al centro
      let maxV = 0
      nodes.forEach(n => {
        const p = pos[n.id]
        if (!p) return
        p.vx += (size.w / 2 - p.x) * CENTER
        p.vy += (size.h / 2 - p.y) * CENTER
        p.vx *= DAMP; p.vy *= DAMP
        p.x += p.vx; p.y += p.vy
        maxV = Math.max(maxV, Math.abs(p.vx), Math.abs(p.vy))
      })

      forceRender(v => v + 1)
      if (ticks < maxTicks && maxV > 0.05) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, size.w, size.h])

  const pos = posRef.current

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400 }}>
      <svg width={size.w} height={size.h} style={{ display: 'block' }}>
        <g>
          {edges.map((e, idx) => {
            const a = pos[e.source], b = pos[e.target]
            if (!a || !b) return null
            const resaltado = hoverId != null && (String(e.source) === String(hoverId) || String(e.target) === String(hoverId))
            return (
              <line key={idx} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={resaltado ? '#3C3489' : '#e2e0d8'} strokeWidth={resaltado ? 1.6 : 1} />
            )
          })}
        </g>
        <g>
          {nodes.map(n => {
            const p = pos[n.id]
            if (!p) return null
            const color = n.es_fantasma ? COLORS.fantasma : (n.visibilidad === 'equipo' ? COLORS.equipo : COLORS.privada)
            const r = n.id === activeId ? 9 : 6.5
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId(null)}
                onClick={() => onNodeClick?.(n)}>
                <circle r={r} fill={color} stroke={n.id === activeId ? '#2C2C2A' : '#fff'} strokeWidth={n.id === activeId ? 2 : 1.5}
                  strokeDasharray={n.es_fantasma ? '2,2' : undefined} opacity={n.es_fantasma ? 0.6 : 1} />
                <text x={r + 5} y={4} fontSize={11} fill="#2C2C2A" style={{ pointerEvents: 'none', fontWeight: n.id === activeId ? 700 : 400 }}>
                  {n.titulo}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
