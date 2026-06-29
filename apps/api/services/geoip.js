// Geolocalización de IPs vía ip-api.com (free tier, HTTP) — usado para
// "¿desde dónde nos atacaron?" en alertas EDR y para ubicar equipos por su
// IP pública. Centralizado aquí porque lo usan tanto el webhook público
// (notificación de auto-bloqueo) como las rutas admin del módulo EDR.
const FIELDS = 'status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query'

function ipPrivada(ip) {
  return !ip || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|::1|fe80:|any$)/.test(ip)
}

function geoipRaw(ip) {
  return new Promise(resolve => {
    require('http').get(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${FIELDS}`,
      r => { let b = ''; r.on('data', c => (b += c)); r.on('end', () => { try { resolve(JSON.parse(b)) } catch { resolve(null) } }) }
    ).on('error', () => resolve(null))
  })
}

// Devuelve la forma normalizada que consume tanto el portal (admin/edr.js)
// como las plantillas de correo (notifyTemplate.js): incluye ASN/organización
// y los flags proxy/hosting, útiles para evaluar si el origen es un VPN o
// datacenter usado para encubrir el ataque, no solo "de dónde viene".
async function geoip(ip) {
  if (ipPrivada(ip)) {
    return { privada: true, ip, mensaje: 'IP de red privada/local; no es geolocalizable públicamente.' }
  }
  const g = await geoipRaw(ip)
  if (!g || g.status !== 'success') return { ip, error: 'No se pudo geolocalizar la IP' }
  return {
    ip: g.query || ip,
    ciudad: g.city || null,
    region: g.regionName || null,
    pais: g.country || null,
    paisCodigo: g.countryCode || null,
    cp: g.zip || null,
    isp: g.isp || null,
    org: g.org || null,
    asn: g.as || null,
    timezone: g.timezone || null,
    proxy: !!g.proxy,
    hosting: !!g.hosting,
    lat: g.lat ?? null,
    lon: g.lon ?? null,
    maps: (g.lat != null && g.lon != null) ? `https://www.google.com/maps?q=${g.lat},${g.lon}` : null,
  }
}

module.exports = { geoip, ipPrivada }
