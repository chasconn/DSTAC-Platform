// Construye el HTML branded de la cotización para generar el PDF que se envía
// por correo al cliente — mismo template visual que el preview del navegador
// (apps/web/.../cotizaciones/components/quotePreview.js), portado a Node.

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clp = (n) => '$' + new Intl.NumberFormat('es-CL').format(Number(n) || 0)
const fecha = (d) => {
  try {
    const iso = d instanceof Date ? d.toISOString() : String(d)
    return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return d }
}

// Calcula neto/IVA separando pago único de mensual, con descuento proporcional
// (idéntico a apps/web/.../cotizaciones/components/format.js#totales).
function totales(items = [], descuento = {}) {
  const sub = (it) => (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)
  const netoUnicoBruto = items.filter(it => it.tipo !== 'mensual').reduce((s, it) => s + sub(it), 0)
  const netoMensualBruto = items.filter(it => it.tipo === 'mensual').reduce((s, it) => s + sub(it), 0)
  const netoBruto = netoUnicoBruto + netoMensualBruto

  const valor = Number(descuento?.valor) || 0
  let descuentoMonto = 0
  if (valor > 0) {
    descuentoMonto = descuento?.tipo === 'monto'
      ? Math.min(valor, netoBruto)
      : Math.round(netoBruto * (Math.min(valor, 100) / 100))
  }
  const shareUnico = netoBruto > 0 ? netoUnicoBruto / netoBruto : 0
  const descUnico = Math.round(descuentoMonto * shareUnico)
  const descMensual = descuentoMonto - descUnico

  const netoUnico = netoUnicoBruto - descUnico
  const netoMensual = netoMensualBruto - descMensual
  const ivaUnico = Math.round(netoUnico * 0.19)
  const ivaMensual = Math.round(netoMensual * 0.19)
  return {
    netoUnicoBruto, descUnico, netoUnico, ivaUnico, totalUnico: netoUnico + ivaUnico,
    netoMensualBruto, descMensual, netoMensual, ivaMensual, totalMensual: netoMensual + ivaMensual,
  }
}

function buildQuoteHtml(c) {
  const items = c.items || []
  const t = totales(items, { tipo: c.descuento_tipo, valor: c.descuento_valor })
  const itemsUnico   = items.filter(it => it.tipo !== 'mensual')
  const itemsMensual = items.filter(it => it.tipo === 'mensual')
  const listaItems = (arr) => arr.map(it =>
    `<div class="item"><div class="sv">${esc(it.servicio)}</div>${it.detalle ? `<div class="dt">${esc(it.detalle)}</div>` : ''}</div>`
  ).join('')

  const validezTxt = c.validez_dias ? `${c.validez_dias} días` : '—'

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
.item{padding:10px 12px;border-bottom:1px solid #ececec}
.item:last-child{border-bottom:none}
.sv{font-weight:600;color:#2C2C2A}
.dt{font-size:11px;color:#888780;margin-top:2px}
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
    <div class="brand"><img src="https://portal.dstac.cl/logo-dstac.png" alt="DSTAC"></div>
    <div class="doc"><div class="t">COTIZACIÓN</div><div class="n">${esc(c.numero || '')}</div><div class="f">${fecha(c.fecha)}</div></div>
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

  ${itemsUnico.length ? `<div class="seclabel">Servicios — Pago único</div><div class="list">${listaItems(itemsUnico)}</div>` : ''}
  ${itemsMensual.length ? `<div class="seclabel">Servicios — Mensual</div><div class="list">${listaItems(itemsMensual)}</div>` : ''}
  ${!items.length ? `<div class="list"><div class="item" style="text-align:center;color:#888780">Sin líneas</div></div>` : ''}

  <div class="tots">
    ${t.netoUnico > 0 ? `<div class="tot">
      <h4>Pago único</h4>
      ${t.descUnico > 0 ? `<div class="l"><span>Neto bruto</span><span>${clp(t.netoUnicoBruto)}</span></div>
      <div class="l"><span>Descuento</span><span>− ${clp(t.descUnico)}</span></div>` : ''}
      <div class="l"><span>Neto</span><span>${clp(t.netoUnico)}</span></div>
      <div class="l"><span>IVA (19%)</span><span>${clp(t.ivaUnico)}</span></div>
      <div class="l g"><span>Total</span><span>${clp(t.totalUnico)}</span></div>
    </div>` : ''}
    ${t.netoMensual > 0 ? `<div class="tot mensual">
      <h4>Mensual</h4>
      ${t.descMensual > 0 ? `<div class="l"><span>Neto bruto</span><span>${clp(t.netoMensualBruto)}</span></div>
      <div class="l"><span>Descuento</span><span>− ${clp(t.descMensual)}</span></div>` : ''}
      <div class="l"><span>Neto</span><span>${clp(t.netoMensual)}</span></div>
      <div class="l"><span>IVA (19%)</span><span>${clp(t.ivaMensual)}</span></div>
      <div class="l g"><span>Total / mes</span><span>${clp(t.totalMensual)}</span></div>
    </div>` : ''}
  </div>

  <div class="terms">
    ${c.forma_pago ? `<div class="b"><h4>Forma de pago</h4>${esc(c.forma_pago)}</div>` : ''}
    ${c.plazo_ejecucion ? `<div class="b"><h4>Plazo de ejecución</h4>${esc(c.plazo_ejecucion)}</div>` : ''}
    ${c.notas ? `<div class="b"><h4>Notas</h4>${esc(c.notas)}</div>` : ''}
    ${c.descuento_motivo ? `<div class="b"><h4>Motivo del descuento</h4>${esc(c.descuento_motivo)}</div>` : ''}
  </div>

  <div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>Valores en pesos chilenos (CLP)</span></div>
</body></html>`
}

module.exports = { buildQuoteHtml, totales }
