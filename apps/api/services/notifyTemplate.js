// Plantilla branded para notificaciones internas del EDR (correo al equipo
// DSTAC, no al cliente) — auto-bloqueos de IP y escalamiento de incidentes.
// Mismo lenguaje visual que las cotizaciones (NAVY + PURPLE, tabla-based para
// que se vea bien en Outlook).
const NAVY = '#13112B', PURPLE = '#3C3489', GREEN = '#1D9E75', RED = '#B91C1C', INK = '#2C2C2A', MUTED = '#6b6a66', BORDER = '#E8E6DE', BG = '#F4F3EF'

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function fila(label, value, ultima = false) {
  if (value == null || value === '') return ''
  return `<tr><td style="padding:7px 0;${ultima ? '' : `border-bottom:1px solid ${BORDER};`}font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;width:40%;vertical-align:top">${esc(label)}</td>
    <td style="padding:7px 0;${ultima ? '' : `border-bottom:1px solid ${BORDER};`}font-size:13px;color:${INK};font-weight:600">${value}</td></tr>`
}

// Tarjeta de geolocalización de la IP de origen — país, región, ciudad,
// ISP/organización, ASN y flags de proxy/hosting (relevante para evaluar si
// el origen es legítimo o un VPN/datacenter usado para encubrir el ataque),
// con enlace directo al mapa.
function geoCard(geo) {
  if (!geo) return ''
  if (geo.privada || geo.error) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:10px;margin-top:14px"><tr><td style="padding:12px 16px;font-size:12px;color:${MUTED}">📍 ${esc(geo.ip)} — ${esc(geo.mensaje || geo.error)}</td></tr></table>`
  }
  const tipoRed = [geo.proxy && 'Proxy/VPN', geo.hosting && 'Datacenter/Hosting'].filter(Boolean).join(' · ')
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${BORDER};border-radius:10px;margin-top:14px">
    <tr><td style="padding:14px 18px">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${PURPLE};margin-bottom:8px">📍 Origen de la IP ${esc(geo.ip)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${fila('País', `${esc(geo.pais)}${geo.paisCodigo ? ' (' + esc(geo.paisCodigo) + ')' : ''}`)}
        ${fila('Región', esc(geo.region))}
        ${fila('Ciudad', esc(geo.ciudad))}
        ${fila('Código postal', esc(geo.cp))}
        ${fila('ISP', esc(geo.isp))}
        ${fila('Organización', esc(geo.org))}
        ${fila('ASN', esc(geo.asn))}
        ${fila('Zona horaria', esc(geo.timezone))}
        ${tipoRed ? fila('Tipo de red', `<span style="color:${RED}">⚠ ${esc(tipoRed)}</span>`, true) : ''}
      </table>
      ${geo.maps ? `<div style="margin-top:12px"><a href="${geo.maps}" style="display:inline-block;padding:8px 16px;border-radius:7px;background:${PURPLE};color:#fff;font-size:12px;font-weight:700;text-decoration:none">📍 Ver en el mapa</a></div>` : ''}
    </td></tr>
  </table>`
}

// titulo/icono/resumen describen el evento; campos = [[label, value], ...]
// (ya escapados por quien llama); geo = resultado de services/geoip.geoip().
function buildAlertaEmail({ titulo, icono = '⚡', resumen, campos = [], geo }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}">
    <tr><td align="center" style="padding:24px 14px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <tr><td bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:14px 14px 0 0;padding:20px 26px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><img src="https://portal.dstac.cl/logo-dstac.png" alt="DSTAC" height="26" style="display:block"></td>
            <td align="right" style="color:#CECBF6;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700">EDR · Notificación interna</td>
          </tr></table>
          <div style="color:#ffffff;font-size:18px;font-weight:800;margin-top:14px">${icono} ${esc(titulo)}</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:20px 26px 6px">
          <p style="font-size:13.5px;color:${INK};line-height:1.6;margin:0">${resumen}</p>
        </td></tr>

        <tr><td style="background:#ffffff;padding:6px 26px 22px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:10px">
            <tr><td style="padding:4px 16px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${campos.map(([l, v], i) => fila(l, v, i === campos.length - 1)).join('')}
              </table>
            </td></tr>
          </table>
          ${geoCard(geo)}
        </td></tr>

        <tr><td bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:0 0 14px 14px;padding:14px 26px;text-align:center">
          <div style="color:#7F77DD;font-size:10.5px">DSTAC CIBERSEGURIDAD · portal.dstac.cl</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

module.exports = { buildAlertaEmail, esc }
