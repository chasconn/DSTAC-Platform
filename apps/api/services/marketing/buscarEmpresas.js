// services/marketing/buscarEmpresas.js — busqueda de pymes chilenas por
// rubro+ciudad via Google Places API (New), y extraccion de un correo de
// contacto PUBLICADO POR LA PROPIA EMPRESA en su sitio web (no se toca nada
// de terceros ni datos personales -- solo lo que la empresa ya hizo publico
// a proposito para que la contacten).
const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText'
const UA = 'DSTACBot/1.0 (+https://www.dstac.cl; prospeccion comercial, contacto: contacto@dstac.cl)'

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('Falta GOOGLE_PLACES_API_KEY en el entorno')
  return key
}

const FIELD_MASK = 'places.displayName,places.websiteUri,places.formattedAddress,nextPageToken'
const MAX_PAGINAS = 3 // la API tope 20 resultados por pagina => hasta 60 por combo

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function buscarPaginaPlaces(rubro, ciudad, pageToken) {
  // Google exige que las peticiones de paginas siguientes repitan exactamente
  // los mismos parametros que la busqueda inicial (textQuery, languageCode,
  // regionCode) ademas del pageToken -- si no, responde 400 INVALID_ARGUMENT.
  const body = {
    textQuery: `${rubro} en ${ciudad}, Chile`,
    languageCode: 'es',
    regionCode: 'CL',
    ...(pageToken && { pageToken }),
  }

  const res = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Google Places respondio ${res.status}: ${t.slice(0, 300)}`)
  }
  return res.json()
}

// Trae hasta MAX_PAGINAS de resultados (20 por pagina). El nextPageToken de
// Google demora unos segundos en activarse, por eso la espera antes de usarlo.
async function buscarPlaces(rubro, ciudad) {
  const places = []
  let pageToken = null
  for (let i = 0; i < MAX_PAGINAS; i++) {
    if (pageToken) await sleep(2000)
    const data = await buscarPaginaPlaces(rubro, ciudad, pageToken)
    places.push(...(data.places || []))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return places
}

async function fetchConTimeout(url, ms = 6000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' })
  } finally {
    clearTimeout(t)
  }
}

function extraerEmailDeHtml(html) {
  const mailto = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (mailto) return mailto[1].toLowerCase()
  const directo = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return directo ? directo[0].toLowerCase() : null
}

function extraerLinkContacto(html, baseUrl) {
  const m = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>[^<]*(contacto|contact)[^<]*<\/a>/i)
  if (!m) return null
  try { return new URL(m[1], baseUrl).toString() } catch { return null }
}

async function buscarEmailEnSitio(sitioWeb) {
  try {
    const res = await fetchConTimeout(sitioWeb)
    if (!res.ok) return null
    const html = await res.text()
    let email = extraerEmailDeHtml(html)
    if (email) return email

    const linkContacto = extraerLinkContacto(html, sitioWeb)
    if (linkContacto) {
      const res2 = await fetchConTimeout(linkContacto)
      if (res2.ok) {
        const html2 = await res2.text()
        email = extraerEmailDeHtml(html2)
        if (email) return email
      }
    }
    return null
  } catch {
    return null // sitio caido, timeout, redireccion rara -- se omite, no se reintenta agresivo
  }
}

const CONCURRENCIA_SITIOS = 8 // visitar sitios web en paralelo -- con 60 resultados
// por combo, hacerlo uno por uno puede tardar minutos y cortar la conexion
// HTTP del navegador (proxy/gateway timeout) antes de responder.

async function buscarEmailesEnParalelo(places) {
  const resultados = new Array(places.length)
  let siguiente = 0
  async function trabajador() {
    while (siguiente < places.length) {
      const i = siguiente++
      resultados[i] = await buscarEmailEnSitio(places[i].websiteUri)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA_SITIOS, places.length) }, trabajador))
  return resultados
}

// Devuelve [{ empresa, sitioWeb, email, rubro, ciudad }] -- email puede venir null
// si no se encontro nada publicado; el usuario lo completa a mano en ese caso.
async function buscarEmpresas(rubro, ciudad) {
  const places = (await buscarPlaces(rubro, ciudad)).filter(p => p.websiteUri)
  const emails = await buscarEmailesEnParalelo(places)
  return places.map((p, i) => ({
    empresa: p.displayName?.text || 'Sin nombre',
    sitioWeb: p.websiteUri,
    email: emails[i],
    rubro,
    ciudad,
  }))
}

module.exports = { buscarEmpresas }
