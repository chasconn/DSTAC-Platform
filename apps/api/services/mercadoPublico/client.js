// Cliente para la API pública de Mercado Público (Chile).
// Documentación: https://api.mercadopublico.cl — requiere un "ticket" gratuito
// que se solicita en mercadopublico.cl (Empresas > Servicios > API).
//
// IMPORTANTE: esta API solo permite *buscar* licitaciones. No existe un
// endpoint oficial para enviar ofertas — la postulación real siempre se hace
// a mano en el portal. Por eso este módulo solo detecta y prepara, nunca envía.

const BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json'

function getTicket() {
  const ticket = process.env.MERCADOPUBLICO_TICKET
  if (!ticket) {
    throw new Error('MERCADOPUBLICO_TICKET no está configurado en .env — solicítalo en mercadopublico.cl')
  }
  return ticket
}

// fecha: Date → 'ddmmyyyy' (formato exigido por la API)
function formatFecha(date) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}${m}${y}`
}

async function fetchLicitaciones(params = {}) {
  const url = new URL(BASE_URL)
  url.searchParams.set('ticket', getTicket())
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Mercado Público respondió ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return Array.isArray(data?.Listado) ? data.Listado : []
}

// Licitaciones actualmente abiertas a postulación (lo más útil para este módulo)
async function fetchLicitacionesActivas() {
  return fetchLicitaciones({ estado: 'activas' })
}

// Licitaciones publicadas en una fecha específica (para barrido histórico/diario)
async function fetchLicitacionesPorFecha(date) {
  return fetchLicitaciones({ fecha: formatFecha(date) })
}

module.exports = { fetchLicitaciones, fetchLicitacionesActivas, fetchLicitacionesPorFecha, formatFecha }
