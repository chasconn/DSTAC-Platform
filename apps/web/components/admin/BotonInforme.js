'use client'

import { useState } from 'react'

// Vista previa in-page con zoom (idéntica a la del módulo Prospectos / panel de leads).
function dstacReportPreview(html) {
  const ov = document.createElement('div')
  ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(5,5,12,.88);display:flex;flex-direction:column;padding:14px;box-sizing:border-box'
  const bar = document.createElement('div')
  bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap'
  const left = document.createElement('span'); left.style.cssText = 'color:#fff;font:600 15px system-ui'; left.textContent = 'Vista previa del informe'
  bar.appendChild(left)
  const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:8px;align-items:center'
  const zb = (t) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;width:30px;height:30px;font:600 17px system-ui;cursor:pointer;padding:0'; return b }
  const zout = zb('−'), zin = zb('+')
  const zlbl = document.createElement('button'); zlbl.title = 'Ajustar al ancho'; zlbl.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;height:30px;padding:0 10px;font:600 13px system-ui;cursor:pointer;min-width:54px'
  const zw = document.createElement('div'); zw.style.cssText = 'display:flex;gap:4px;align-items:center;margin-right:6px'; zw.append(zout, zlbl, zin)
  const dl = document.createElement('button'); dl.textContent = 'Guardar PDF'; dl.style.cssText = 'background:#7B4DFF;color:#fff;border:none;border-radius:999px;padding:10px 20px;font:600 14px system-ui;cursor:pointer'
  const cl = document.createElement('button'); cl.textContent = 'Cerrar'; cl.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:10px 16px;font:600 14px system-ui;cursor:pointer'
  btns.append(zw, dl, cl); bar.appendChild(btns); ov.appendChild(bar)
  const box = document.createElement('div'); box.style.cssText = 'flex:1;overflow:auto;background:#525659;border-radius:10px;padding:14px'
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin:0 auto;position:relative'
  const ifr = document.createElement('iframe'); ifr.style.cssText = 'width:794px;border:0;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.5);display:block;transform-origin:top left'
  wrap.appendChild(ifr); box.appendChild(wrap); ov.appendChild(box); document.body.appendChild(ov)
  const d = ifr.contentWindow.document; d.open(); d.write(html); d.close()
  let zoom = 1, baseW = 0, baseH = 0
  const apply = () => { if (!baseW) return; ifr.style.transform = 'scale(' + zoom + ')'; wrap.style.width = (baseW * zoom) + 'px'; wrap.style.height = (baseH * zoom) + 'px'; zlbl.textContent = Math.round(zoom * 100) + '%' }
  // Mide el ancho REAL del contenido (algunos informes son horizontales, ej.
  // el brochure a 297mm) en vez de asumir siempre formato vertical de 210mm —
  // si no, el contenido se corta y el zoom queda mal calculado.
  const measure = () => {
    try {
      const docEl = ifr.contentWindow.document.documentElement
      baseW = docEl.scrollWidth || 794
      baseH = docEl.scrollHeight || 1123
    } catch { baseW = 794; baseH = 1123 }
    ifr.style.width = baseW + 'px'
    ifr.style.height = baseH + 'px'
    apply()
  }
  const fit = () => { measure(); zoom = Math.max(0.5, Math.min(2, (box.clientWidth - 28) / (baseW || 794))); apply() }
  const setZ = (z) => { zoom = Math.max(0.4, Math.min(3, Math.round(z * 100) / 100)); apply() }
  ifr.onload = () => { measure(); try { ifr.contentWindow.document.fonts?.ready?.then(fit) } catch {} ; setTimeout(fit, 200) }
  setTimeout(fit, 500)
  zin.onclick = () => setZ(zoom + 0.1); zout.onclick = () => setZ(zoom - 0.1); zlbl.onclick = fit
  box.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZ(zoom + (e.deltaY < 0 ? 0.1 : -0.1)) } }, { passive: false })
  dl.onclick = () => { try { ifr.contentWindow.focus(); ifr.contentWindow.print() } catch (e) { alert('No se pudo abrir el guardado: ' + e) } }
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey) }
  const onKey = (e) => { if (e.key === 'Escape') close() }
  cl.onclick = close; ov.addEventListener('click', (e) => { if (e.target === ov) close() }); document.addEventListener('keydown', onKey)
}

// Botón reutilizable: abre la vista previa del informe del módulo (tipo) para la empresa (slug).
export default function BotonInforme({ tipo, slug, label = 'Generar informe', query = {} }) {
  const [loading, setLoading] = useState(false)

  async function abrir() {
    if (loading) return
    let sl = slug
    if (!sl && typeof window !== 'undefined') {
      try { sl = JSON.parse(localStorage.getItem('empresa_activa') || '{}').slug } catch {}
    }
    if (!sl) { alert('Selecciona una empresa primero'); return }
    setLoading(true)
    try {
      const qs = new URLSearchParams({ format: 'html', ...query }).toString()
      const res = await fetch(`/api/reports/${tipo}?${qs}`, { credentials: 'include', headers: { 'X-Company-Slug': sl } })
      if (!res.ok) {
        let msg = 'No se pudo generar el informe'
        try { const j = await res.json(); msg = j.message || j.error || msg } catch {}
        alert(msg)
        return
      }
      const html = await res.text()
      dstacReportPreview(html)
    } catch {
      alert('Error generando el informe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={abrir} disabled={loading} title="Vista previa del informe"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: loading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
      📄 {loading ? 'Generando…' : label}
    </button>
  )
}
