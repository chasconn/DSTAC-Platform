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

async function buscarPlaces(rubro, ciudad) {
  const res = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': 'places.displayName,places.websiteUri,places.formattedAddress',
    },
    body: JSON.stringify({
      textQuery: `${rubro} en ${ciudad}, Chile`,
      languageCode: 'es',
      regionCode: 'CL',
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Google Places respondio ${res.status}: ${t.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.places || []
}

async function fetchConTimeout(url, ms = 8000) {
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

// Devuelve [{ empresa, sitioWeb, email, rubro, ciudad }] -- email puede venir null
// si no se encontro nada publicado; el usuario lo completa a mano en ese caso.
async function buscarEmpresas(rubro, ciudad) {
  const places = await buscarPlaces(rubro, ciudad)
  const resultados = []
  for (const p of places) {
    if (!p.websiteUri) continue // sin sitio web no hay de donde sacar un correo propio
    const email = await buscarEmailEnSitio(p.websiteUri)
    resultados.push({
      empresa: p.displayName?.text || 'Sin nombre',
      sitioWeb: p.websiteUri,
      email,
      rubro,
      ciudad,
    })
  }
  return resultados
}

module.exports = { buscarEmpresas }
