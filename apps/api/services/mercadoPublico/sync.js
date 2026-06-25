// Sincroniza licitaciones activas de Mercado Público, las puntúa según
// relevancia para servicios de ciberseguridad (DSTAC) y guarda/actualiza
// las relevantes en oportunidades_licitaciones para revisión humana.
//
// Este módulo NUNCA postula ni envía nada — solo detecta y puntúa.

const centralDB = require('../../db/central')
const { fetchLicitacionesActivas } = require('./client')

const DIACRITICOS = new RegExp('[̀-ͯ]', 'g')

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(DIACRITICOS, '') // quita tildes
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function getKeywordsActivas() {
  const [rows] = await centralDB.execute(
    'SELECT palabra, peso FROM oportunidades_keywords WHERE activo = 1'
  )
  return rows.map(r => ({
    palabra: normalizar(r.palabra),
    peso: r.peso,
    regex: new RegExp('\\b' + escapeRegex(normalizar(r.palabra)) + '\\b', 'i'),
  }))
}

// Calcula el score de relevancia y devuelve qué keywords matchearon.
// Usa coincidencia de palabra completa (no substring) para evitar falsos
// positivos como "soc" matcheando dentro de "asociados".
function calcularScore(licitacion, keywords) {
  const texto = normalizar(`${licitacion.Nombre || ''} ${licitacion.Descripcion || licitacion.descripcion || ''}`)
  let score = 0
  const matched = []
  for (const { palabra, peso, regex } of keywords) {
    const re = regex || new RegExp('\\b' + escapeRegex(palabra) + '\\b', 'i')
    if (re.test(texto)) {
      score += peso
      matched.push(palabra)
    }
  }
  return { score, matched }
}

function extraerCampos(licitacion) {
  return {
    codigo_externo: licitacion.CodigoExterno || licitacion.Codigo || String(licitacion.Codigo || ''),
    nombre: licitacion.Nombre || 'Sin nombre',
    organismo: licitacion?.Comprador?.NombreOrganismo || licitacion?.Organismo?.Nombre || licitacion.NombreOrganismo || null,
    descripcion: licitacion.Descripcion || licitacion.descripcion || null,
    rubro1: licitacion?.Items?.Listado?.[0]?.RubroN1 || licitacion.Rubro1 || null,
    fecha_publicacion: licitacion.FechaPublicacion || null,
    fecha_cierre: licitacion.FechaCierre || null,
    monto_estimado: licitacion.MontoEstimado || null,
    estado_mp: licitacion.CodigoEstado || licitacion.Estado || null,
    link_ficha: licitacion.CodigoExterno
      ? `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(licitacion.CodigoExterno)}`
      : null,
  }
}

async function upsertOportunidad(campos, score, matched, raw) {
  await centralDB.execute(`
    INSERT INTO oportunidades_licitaciones
      (codigo_externo, nombre, organismo, descripcion, rubro1, fecha_publicacion,
       fecha_cierre, monto_estimado, estado_mp, link_ficha, score, keywords_matched, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nombre = VALUES(nombre), organismo = VALUES(organismo), descripcion = VALUES(descripcion),
      rubro1 = VALUES(rubro1), fecha_publicacion = VALUES(fecha_publicacion),
      fecha_cierre = VALUES(fecha_cierre), monto_estimado = VALUES(monto_estimado),
      estado_mp = VALUES(estado_mp), link_ficha = VALUES(link_ficha),
      score = VALUES(score), keywords_matched = VALUES(keywords_matched), raw_json = VALUES(raw_json)
  `, [
    campos.codigo_externo, campos.nombre, campos.organismo, campos.descripcion, campos.rubro1,
    campos.fecha_publicacion, campos.fecha_cierre, campos.monto_estimado, campos.estado_mp,
    campos.link_ficha, score, JSON.stringify(matched), JSON.stringify(raw),
  ])
}

const SCORE_MINIMO = 8 // bajo este puntaje no se considera relevante para ciberseguridad

async function sincronizarOportunidades() {
  const keywords = await getKeywordsActivas()
  if (!keywords.length) {
    console.warn('[oportunidades] sin keywords activas configuradas, omitiendo sync')
    return { revisadas: 0, relevantes: 0 }
  }

  const licitaciones = await fetchLicitacionesActivas()
  let relevantes = 0

  for (const lic of licitaciones) {
    const { score, matched } = calcularScore(lic, keywords)
    if (score < SCORE_MINIMO) continue

    const campos = extraerCampos(lic)
    if (!campos.codigo_externo) continue

    await upsertOportunidad(campos, score, matched, lic)
    relevantes++
  }

  console.log(`[oportunidades] sync: ${licitaciones.length} revisadas, ${relevantes} relevantes`)
  return { revisadas: licitaciones.length, relevantes }
}

module.exports = { sincronizarOportunidades, calcularScore, normalizar, SCORE_MINIMO }
