// Plantilla de correo HTML para enviar cotizaciones a clientes — reutilizable
// para todos los clientes (actuales y futuros). Tabla-based para que se vea
// bien en Outlook/Gmail/Apple Mail. El detalle de cada servicio (campo
// `detalle` de cotizacion_items, ya editable en el modal) se muestra como la
// explicación de "qué incluye y por qué te lo recomendamos", en lenguaje llano.
const { totales } = require('./quoteHtml')

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clp = (n) => '$' + new Intl.NumberFormat('es-CL').format(Number(n) || 0)
const fecha = (d) => {
  try {
    const iso = d instanceof Date ? d.toISOString() : String(d)
    return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return d }
}

const NAVY = '#13112B', PURPLE = '#3C3489', GREEN = '#1D9E75', INK = '#2C2C2A', MUTED = '#888780', BORDER = '#E8E6DE', BG = '#F4F3EF'

function fechaVencimiento(fechaEmision, dias) {
  if (!dias) return null
  try {
    const iso = fechaEmision instanceof Date ? fechaEmision.toISOString() : String(fechaEmision)
    const d = new Date(iso.slice(0, 10) + 'T00:00:00')
    d.setDate(d.getDate() + Number(dias))
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return null }
}

function buildQuoteEmailHtml(c, opciones = {}) {
  const { incluyeMuestraEdr = false } = opciones
  const items = c.items || []
  const t = totales(items, { tipo: c.descuento_tipo, valor: c.descuento_valor })
  const validezTxt = c.validez_dias ? `${c.validez_dias} días` : 'tiempo limitado'
  const venceTxt = fechaVencimiento(c.fecha, c.validez_dias)
  const nombreContacto = c.cliente_contacto ? esc(c.cliente_contacto.split(' ')[0]) : ''

  let n = 0
  const tarjetasServicios = items.map(it => {
    n++
    const sub = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)
    const cant = Number(it.cantidad) || 0
    return `
    <tr><td style="padding:0 0 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px">
        <tr><td style="padding:16px 18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="26" style="vertical-align:top">
              <div style="width:20px;height:20px;border-radius:10px;background:${PURPLE};color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:20px;font-family:Arial,Helvetica,sans-serif">${n}</div>
            </td>
            <td style="vertical-align:top">
              <div style="font-size:15px;font-weight:700;color:${INK};font-family:Arial,Helvetica,sans-serif">${esc(it.servicio)}</div>
              ${it.detalle ? `<div style="font-size:13px;color:#444441;line-height:1.55;margin-top:7px;font-family:Arial,Helvetica,sans-serif">${esc(it.detalle)}</div>` : ''}
            </td>
            <td align="right" style="vertical-align:top;white-space:nowrap;padding-left:14px">
              ${cant !== 1 ? `<div style="font-size:11px;color:${MUTED};font-family:Arial,Helvetica,sans-serif">${cant} × ${clp(it.precio_unitario)}</div>` : ''}
              <div style="font-size:14px;font-weight:700;color:${INK};font-family:Arial,Helvetica,sans-serif;margin-top:2px">${clp(sub)}</div>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>`
  }).join('')

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Cotización DSTAC</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">
    Tu cotización de ${esc(c.cliente_empresa || '')} está lista — te explicamos qué incluye cada servicio y por qué te lo recomendamos.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}">
    <tr><td align="center" style="padding:28px 14px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td bgcolor="${NAVY}" background="https://portal.dstac.cl/email-bg-navy.png" style="background-color:${NAVY};background-image:url('https://portal.dstac.cl/email-bg-navy.png');background-repeat:repeat;border-radius:14px 14px 0 0;padding:28px 30px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><img src="https://portal.dstac.cl/logo-dstac.png" alt="DSTAC" height="30" style="display:block"></td>
            <td align="right" style="color:#CECBF6;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700">Propuesta de servicios</td>
          </tr></table>
          <div style="color:#ffffff;font-size:22px;font-weight:800;margin-top:18px">Cotización ${esc(c.numero || '')}</div>
          <div style="color:#CECBF6;font-size:13px;margin-top:4px">${esc(c.cliente_empresa || '')} · ${fecha(c.fecha)}</div>
          ${venceTxt ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px"><tr><td style="background:rgba(255,255,255,.14);border-radius:20px;padding:5px 12px"><span style="color:#FFD9A0;font-size:11.5px;font-weight:700;font-family:Arial,Helvetica,sans-serif">⏱ Válida hasta el ${venceTxt}</span></td></tr></table>` : ''}
        </td></tr>

        <!-- Saludo -->
        <tr><td style="background:#ffffff;padding:26px 30px 6px">
          <p style="font-size:14.5px;color:${INK};line-height:1.6;margin:0">
            Hola${nombreContacto ? ` ${nombreContacto}` : ''}, te preparamos una propuesta a la medida de
            ${c.cliente_empresa ? `<b>${esc(c.cliente_empresa)}</b>` : 'tu empresa'} pensada en cerrar los riesgos
            más importantes detectados, sin perder tiempo en cosas que no aplican a tu negocio.
          </p>
          <p style="font-size:14.5px;color:${INK};line-height:1.6;margin:14px 0 0">
            Abajo te explicamos, en simple, qué incluye cada servicio y por qué te lo estamos recomendando.
          </p>
        </td></tr>

        <!-- Servicios -->
        <tr><td style="background:#ffffff;padding:18px 30px 6px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};margin-bottom:12px">Qué te estamos cotizando y por qué</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${tarjetasServicios || '<tr><td style="color:'+MUTED+';font-size:13px">Sin servicios.</td></tr>'}
          </table>
        </td></tr>

        <!-- Descuento (si aplica) -->
        ${(t.descUnico + t.descMensual) > 0 ? `
        <tr><td style="background:#ffffff;padding:0 30px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAF6F1;border-radius:10px">
            <tr><td style="padding:13px 16px">
              <div style="font-size:13.5px;color:${GREEN};font-weight:700;font-family:Arial,Helvetica,sans-serif">Esta propuesta incluye un descuento de ${clp(t.descUnico + t.descMensual)}</div>
              ${c.descuento_motivo ? `<div style="font-size:12.5px;color:#27500A;margin-top:3px;font-family:Arial,Helvetica,sans-serif">${esc(c.descuento_motivo)}</div>` : ''}
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- Totales -->
        <tr><td style="background:#ffffff;padding:6px 30px 26px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${t.netoUnico > 0 ? `
            <td width="50%" style="padding-right:6px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:10px">
                <tr><td style="padding:14px 16px">
                  <div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${MUTED}">Pago único</div>
                  <div style="font-size:21px;font-weight:800;color:${INK};margin-top:4px">${clp(t.totalUnico)}</div>
                </td></tr>
              </table>
            </td>` : ''}
            ${t.netoMensual > 0 ? `
            <td width="50%" style="padding-left:${t.netoUnico > 0 ? '6' : '0'}px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEEDFE;border-radius:10px">
                <tr><td style="padding:14px 16px">
                  <div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${PURPLE}">Mensual</div>
                  <div style="font-size:21px;font-weight:800;color:${PURPLE};margin-top:4px">${clp(t.totalMensual)}<span style="font-size:12px;font-weight:600">/mes</span></div>
                </td></tr>
              </table>
            </td>` : ''}
          </tr></table>
          <p style="font-size:12px;color:${MUTED};margin:14px 0 0;line-height:1.5">
            Valores netos + IVA. Revisa el desglose completo en el PDF adjunto. Esta propuesta tiene una validez de ${validezTxt}.
          </p>
          ${incluyeMuestraEdr ? `
          <p style="font-size:12px;color:${MUTED};margin:8px 0 0;line-height:1.5">
            También adjuntamos una muestra de cómo se ve el informe de tu protección EDR — para que veas, con un ejemplo, qué tipo de reportes recibirías.
          </p>` : ''}
        </td></tr>

        <!-- CTA / cierre -->
        <tr><td style="background:#FAFAF7;border-top:1px solid ${BORDER};padding:22px 30px">
          <p style="font-size:14px;color:${INK};line-height:1.6;margin:0">
            Cualquier duda sobre la propuesta, escríbenos y la revisamos juntos — sin compromiso.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
            <td style="background:${GREEN};border-radius:8px"><a href="mailto:contacto@dstac.cl?subject=Consulta%20cotizaci%C3%B3n%20${encodeURIComponent(c.numero || '')}" style="display:inline-block;padding:11px 22px;font-size:13.5px;font-weight:700;color:#ffffff;text-decoration:none">Responder esta cotización</a></td>
          </tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td bgcolor="${NAVY}" background="https://portal.dstac.cl/email-bg-navy.png" style="background-color:${NAVY};background-image:url('https://portal.dstac.cl/email-bg-navy.png');background-repeat:repeat;border-radius:0 0 14px 14px;padding:18px 30px;text-align:center">
          <div style="color:#CECBF6;font-size:11.5px;font-weight:700;letter-spacing:.05em">DSTAC CIBERSEGURIDAD</div>
          <div style="color:#7F77DD;font-size:11px;margin-top:4px">contacto@dstac.cl · www.dstac.cl</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

module.exports = { buildQuoteEmailHtml }
