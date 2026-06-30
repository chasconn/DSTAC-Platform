// Construye el HTML branded de la cotización y lo muestra en una vista previa
// con zoom + "Guardar PDF" (impresión del navegador). 100% cliente.
import { totales } from './format'
import { alertDstac } from '../../../../../components/admin/ConfirmDialog'

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clp = (n) => '$' + new Intl.NumberFormat('es-CL').format(Number(n) || 0)
const fecha = (d) => { try { return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d } }
const fechaVencimiento = (fechaEmision, dias) => {
  if (!dias) return null
  try {
    const d = new Date(String(fechaEmision).slice(0, 10) + 'T00:00:00')
    d.setDate(d.getDate() + Number(dias))
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return null }
}

function buildQuoteHtml(c) {
  const items = c.items || []
  const t = totales(items, { tipo: c.descuento_tipo, valor: c.descuento_valor })
  const itemsUnico   = items.filter(it => it.tipo !== 'mensual')
  const itemsMensual = items.filter(it => it.tipo === 'mensual')
  const hayAmbos = itemsUnico.length > 0 && itemsMensual.length > 0

  // Numeral propio por sección — pago único y mensual se presentan como dos
  // cotizaciones independientes, no como un único bloque mezclado.
  const listaItems = (arr) => {
    let n = 0
    return arr.map(it => {
      n++
      const sub = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)
      const cant = Number(it.cantidad) || 0
      return `<div class="item">
        <div class="item-n">${n}</div>
        <div class="item-tx"><div class="sv">${esc(it.servicio)}</div>${it.detalle ? `<div class="dt">${esc(it.detalle)}</div>` : ''}</div>
        <div class="item-price">${cant !== 1 ? `<div class="qty">${cant} × ${clp(it.precio_unitario)}</div>` : ''}<div class="sub">${clp(sub)}</div></div>
      </div>`
    }).join('')
  }

  const totBox = (tipo) => {
    if (tipo === 'unico' && t.netoUnico > 0) {
      return `<div class="tots"><div class="tot">
        <h4>Pago único</h4>
        ${t.descUnico > 0 ? `<div class="l"><span>Neto bruto</span><span>${clp(t.netoUnicoBruto)}</span></div>
        <div class="l"><span>Descuento</span><span>− ${clp(t.descUnico)}</span></div>` : ''}
        <div class="l"><span>Neto</span><span>${clp(t.netoUnico)}</span></div>
        <div class="l"><span>IVA (19%)</span><span>${clp(t.ivaUnico)}</span></div>
        <div class="l g"><span>Total</span><span>${clp(t.totalUnico)}</span></div>
      </div></div>`
    }
    if (tipo === 'mensual' && t.netoMensual > 0) {
      return `<div class="tots"><div class="tot mensual">
        <h4>Mensual</h4>
        ${t.descMensual > 0 ? `<div class="l"><span>Neto bruto</span><span>${clp(t.netoMensualBruto)}</span></div>
        <div class="l"><span>Descuento</span><span>− ${clp(t.descMensual)}</span></div>` : ''}
        <div class="l"><span>Neto</span><span>${clp(t.netoMensual)}</span></div>
        <div class="l"><span>IVA (19%)</span><span>${clp(t.ivaMensual)}</span></div>
        <div class="l g"><span>Total / mes</span><span>${clp(t.totalMensual)}</span></div>
      </div></div>`
    }
    return ''
  }

  const discountBoxFor = (tipo) => {
    const monto = tipo === 'unico' ? t.descUnico : t.descMensual
    if (monto > 0 && c.descuento_motivo) {
      return `<div class="descuento-box"><b>Por qué este descuento de ${clp(monto)}:</b> ${esc(c.descuento_motivo)}</div>`
    }
    return ''
  }

  const validezTxt = c.validez_dias ? `${c.validez_dias} días` : '—'
  const venceTxt = fechaVencimiento(c.fecha, c.validez_dias)

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<style>
@page{size:A4 portrait;margin:14mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#2C2C2A;margin:0;font-size:12px}
.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #3C3489;padding-bottom:14px;margin-bottom:18px}
.brand{background:#26215C;padding:12px 18px;border-radius:8px;display:flex;align-items:center}
.brand img{height:32px;display:block}
.doc{text-align:right}
.doc .t{font-size:20px;font-weight:700;color:#3C3489;letter-spacing:.05em}
.doc .n{font-size:13px;font-weight:600;color:#2C2C2A;margin-top:2px}
.doc .f{font-size:11px;color:#888780;margin-top:2px}
.cols{display:flex;gap:16px;margin-bottom:18px}
.card{flex:1;background:#F8F7F4;border:1px solid #e2e0d8;border-radius:8px;padding:12px 14px}
.card h3{margin:0 0 8px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#888780}
.card .row{font-size:12px;margin:3px 0}
.card .row b{color:#2C2C2A}
.seclabel{background:#3C3489;color:#fff;font-size:10px;letter-spacing:.05em;text-transform:uppercase;padding:8px 12px;border-radius:6px 6px 0 0}
.list{border:1px solid #ececec;border-radius:0 0 6px 6px;margin-bottom:14px}
.item{padding:10px 12px;border-bottom:1px solid #ececec;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.item:last-child{border-bottom:none}
.item-n{width:20px;height:20px;border-radius:50%;background:#3C3489;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.item-tx{flex:1;min-width:0}
.sv{font-weight:600;color:#2C2C2A}
.dt{font-size:11px;color:#888780;margin-top:2px}
.item-price{text-align:right;flex-shrink:0}
.item-price .qty{font-size:10px;color:#888780}
.item-price .sub{font-size:12.5px;font-weight:700;color:#2C2C2A;margin-top:1px}
.vence{display:inline-flex;align-items:center;gap:5px;background:#FAEEDA;color:#854F0B;font-size:10.5px;font-weight:700;padding:5px 10px;border-radius:20px;margin-top:6px}
.pagebreak{break-before:page}
.contheader{display:flex;align-items:center;gap:10px;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #e2e0d8}
.contheader img{height:20px;display:block}
.contheader span{font-size:11px;color:#888780}
.descuento-box{background:#EAF6F1;border:1px solid #C9E8D8;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11.5px;color:#0F6E56}
.descuento-box b{color:#085041}
.next{background:#3C3489;border-radius:8px;padding:14px 18px;margin-top:18px;color:#fff}
.next h4{margin:0 0 4px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#CECBF6}
.next p{margin:0;font-size:12px;line-height:1.5;color:#EEEDFE}
.next a{color:#fff;font-weight:700;text-decoration:underline}
.tots{display:flex;justify-content:flex-end;gap:14px}
.tot{width:230px;background:#F8F7F4;border:1px solid #e2e0d8;border-radius:8px;padding:10px 14px;margin-bottom:14px}
.tot h4{margin:0 0 4px;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#888780}
.tot.mensual h4{color:#3C3489}
.tot .l{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#444441}
.tot .g{border-top:2px solid #3C3489;margin-top:4px;padding-top:6px;font-size:14px;font-weight:700;color:#3C3489}
.terms{display:flex;gap:16px;margin-top:20px}
.terms .b{flex:1;font-size:11px;color:#444441}
.terms .b h4{margin:0 0 4px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888780}
.foot{margin-top:26px;border-top:1px solid #e2e0d8;padding-top:10px;font-size:10px;color:#888780;display:flex;justify-content:space-between}
</style></head><body>
  <div class="top">
    <div class="brand"><img src="/logo-dstac.png" alt="DSTAC"></div>
    <div class="doc"><div class="t">COTIZACIÓN</div><div class="n">${esc(c.numero || '')}</div><div class="f">${fecha(c.fecha)}</div>
      ${venceTxt ? `<div class="vence">⏱ Válida hasta el ${venceTxt}</div>` : ''}
    </div>
  </div>

  <div class="cols">
    <div class="card">
      <h3>Cliente</h3>
      <div class="row"><b>${esc(c.cliente_empresa || c.company_name || '—')}</b></div>
      ${c.cliente_rut ? `<div class="row">RUT: ${esc(c.cliente_rut)}</div>` : ''}
      ${c.cliente_contacto ? `<div class="row">${esc(c.cliente_contacto)}</div>` : ''}
      ${c.cliente_email ? `<div class="row">${esc(c.cliente_email)}</div>` : ''}
      ${c.cliente_telefono ? `<div class="row">${esc(c.cliente_telefono)}</div>` : ''}
    </div>
    <div class="card">
      <h3>Proveedor</h3>
      <div class="row"><b>DSTAC CIBERSEGURIDAD</b></div>
      <div class="row">contacto@dstac.cl</div>
      <div class="row">www.dstac.cl</div>
      <div class="row">Validez de la oferta: ${validezTxt}</div>
    </div>
  </div>

  ${!items.length ? `<div class="list"><div class="item" style="text-align:center;color:#888780">Sin líneas</div></div>` : ''}

  ${itemsUnico.length ? `<div>
    <div class="seclabel">Servicios — Pago único</div>
    <div class="list">${listaItems(itemsUnico)}</div>
    ${totBox('unico')}
    ${discountBoxFor('unico')}
  </div>` : ''}

  ${itemsMensual.length ? `<div class="${hayAmbos ? 'pagebreak' : ''}">
    ${hayAmbos ? `<div class="contheader">
      <img src="/logo-dstac.png" alt="DSTAC">
      <span>Cotización ${esc(c.numero || '')} · ${esc(c.cliente_empresa || c.company_name || '')} · Servicios mensuales</span>
    </div>` : ''}
    <div class="seclabel">Servicios — Mensual</div>
    <div class="list">${listaItems(itemsMensual)}</div>
    ${totBox('mensual')}
    ${discountBoxFor('mensual')}
  </div>` : ''}

  <div class="terms">
    ${c.forma_pago ? `<div class="b"><h4>Forma de pago</h4>${esc(c.forma_pago)}</div>` : ''}
    ${c.plazo_ejecucion ? `<div class="b"><h4>Plazo de ejecución</h4>${esc(c.plazo_ejecucion)}</div>` : ''}
    ${c.notas ? `<div class="b"><h4>Notas</h4>${esc(c.notas)}</div>` : ''}
  </div>

  <div class="next">
    <h4>Cómo continuar</h4>
    <p>Responde este correo o escríbenos para confirmar — coordinamos la implementación de inmediato.
    <a href="mailto:contacto@dstac.cl">contacto@dstac.cl</a> · +56 9 6219 8594</p>
  </div>

  <div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>Valores en pesos chilenos (CLP)</span></div>
</body></html>`
}

// Vista previa con zoom (−, %, +), ajuste al ancho y Guardar PDF.
export function previewCotizacion(c) {
  const html = buildQuoteHtml(c)
  const ov = document.createElement('div')
  ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(5,5,12,.88);display:flex;flex-direction:column;padding:14px;box-sizing:border-box'

  const bar = document.createElement('div')
  bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap'
  const left = document.createElement('span'); left.style.cssText = 'color:#fff;font:600 15px system-ui'; left.textContent = 'Vista previa · ' + (c.numero || 'Cotización')
  bar.appendChild(left)

  const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:8px;align-items:center'
  const zb = (t) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;width:30px;height:30px;font:600 17px system-ui;cursor:pointer;padding:0'; return b }
  const zout = zb('−'), zin = zb('+')
  const zlbl = document.createElement('button'); zlbl.title = 'Ajustar al ancho'; zlbl.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;height:30px;padding:0 10px;font:600 13px system-ui;cursor:pointer;min-width:54px'
  const zw = document.createElement('div'); zw.style.cssText = 'display:flex;gap:4px;align-items:center;margin-right:6px'; zw.append(zout, zlbl, zin)
  const dl = document.createElement('button'); dl.textContent = 'Guardar PDF'; dl.style.cssText = 'background:#534AB7;color:#fff;border:none;border-radius:999px;padding:10px 20px;font:600 14px system-ui;cursor:pointer'
  const cl = document.createElement('button'); cl.textContent = 'Cerrar'; cl.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:10px 16px;font:600 14px system-ui;cursor:pointer'
  btns.append(zw, dl, cl); bar.appendChild(btns); ov.appendChild(bar)

  const box = document.createElement('div'); box.style.cssText = 'flex:1;overflow:auto;background:#525659;border-radius:10px;padding:14px'
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin:0 auto;position:relative'
  const ifr = document.createElement('iframe'); ifr.style.cssText = 'width:210mm;border:0;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.5);display:block;transform-origin:top left'
  wrap.appendChild(ifr); box.appendChild(wrap); ov.appendChild(box); document.body.appendChild(ov)
  const d = ifr.contentWindow.document; d.open(); d.write(html); d.close()

  let zoom = 1, baseW = 0, baseH = 0
  const apply = () => { if (!baseW) return; ifr.style.transform = 'scale(' + zoom + ')'; wrap.style.width = (baseW * zoom) + 'px'; wrap.style.height = (baseH * zoom) + 'px'; zlbl.textContent = Math.round(zoom * 100) + '%' }
  // Altura real del contenido (evita el bloque blanco gigante)
  const measure = () => { try { baseH = ifr.contentWindow.document.body.scrollHeight + 30 } catch { baseH = 1120 } ; ifr.style.height = baseH + 'px'; baseW = ifr.offsetWidth || 794; apply() }
  const fit = () => { measure(); zoom = Math.max(0.4, Math.min(2, (box.clientWidth - 28) / (baseW || 794))); apply() }
  const setZ = (z) => { zoom = Math.max(0.4, Math.min(3, Math.round(z * 100) / 100)); apply() }
  ifr.onload = () => { measure(); try { ifr.contentWindow.document.fonts?.ready?.then(fit) } catch {} ; setTimeout(fit, 200) }
  setTimeout(fit, 400)
  zin.onclick = () => setZ(zoom + 0.1); zout.onclick = () => setZ(zoom - 0.1); zlbl.onclick = fit
  box.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZ(zoom + (e.deltaY < 0 ? 0.1 : -0.1)) } }, { passive: false })
  dl.onclick = () => { try { ifr.contentWindow.focus(); ifr.contentWindow.print() } catch (e) { alertDstac('No se pudo abrir el guardado: ' + e, { titulo: 'Error', tipo: 'error' }) } }
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey) }
  const onKey = (e) => { if (e.key === 'Escape') close() }
  cl.onclick = close; ov.addEventListener('click', e => { if (e.target === ov) close() }); document.addEventListener('keydown', onKey)
}
