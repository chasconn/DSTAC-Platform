'use client'

import { useEffect, useRef } from 'react'

// Fondo animado tipo "red de nodos" para pantallas de autenticación —
// liviano (canvas, no video), funciona igual en celular/tablet/desktop sin
// depender de ningún breakpoint (a diferencia del panel lateral anterior,
// que usaba `lg:flex` y desaparecía por completo en tablets).
export default function NetworkBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf, pts = []

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    function init() {
      resize()
      const n = Math.min(60, Math.round((canvas.width * canvas.height) / 18000))
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }))
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 130) {
            ctx.strokeStyle = `rgba(127,119,221,${0.18 * (1 - d / 130)})`
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = 'rgba(175,169,236,0.85)'
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }

    init()
    tick()
    window.addEventListener('resize', init)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', init) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}
