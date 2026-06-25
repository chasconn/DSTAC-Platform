// scripts/buscarDiario.js — corrida automatica (via cron, varias veces al
// dia) de la busqueda de empresas para la campana "pymes-chile". Rota por una
// lista fija de rubro+ciudad para no repetir siempre lo mismo, usando un
// indice global (dia del año x corrida del dia) -- sin necesitar guardar
// estado en ningun lado, y sin repetir las mismas combinaciones en las
// distintas corridas de un mismo dia.
//
// Uso: node apps/api/scripts/buscarDiario.js
const centralDB = require('../db/central')
const { buscarEmpresas } = require('../services/marketing/buscarEmpresas')

// Rubros tipicos de pyme chilena que normalmente no tienen equipo de TI propio.
const RUBROS = [
  'ferreterias', 'clinicas dentales', 'estudios contables',
  'empresas de transporte de carga', 'constructoras', 'inmobiliarias',
  'talleres mecanicos', 'distribuidoras de alimentos', 'estudios de abogados',
  'agencias de turismo',
]

// Antofagasta es la prioridad (foco comercial); el resto de ciudades se usa
// solo ocasionalmente para no dejar de cubrir el resto del pais.
const CIUDAD_PRINCIPAL = 'Antofagasta'
const OTRAS_CIUDADES = [
  'Iquique', 'La Serena', 'Santiago', 'Valparaiso',
  'Rancagua', 'Talca', 'Concepcion', 'Temuco', 'Puerto Montt',
]

const COMBOS_POR_CORRIDA = 3
const COMBOS_ANTOFAGASTA_POR_CORRIDA = 2 // 2 de 3 combos por corrida son siempre Antofagasta
const CORRIDAS_POR_DIA = 4 // el cron dispara cada 6 horas (00, 06, 12, 18)

// Combos/dia = COMBOS_POR_CORRIDA x CORRIDAS_POR_DIA = 12/dia => ~360/mes,
// comodo bajo el tope gratis de Google (5.000/mes en el SKU que usamos).
function diaDelAnio() {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), 0, 0)
  return Math.floor((ahora - inicio) / 86400000)
}

// Indice que avanza con cada corrida (no solo con cada dia), para que las
// distintas corridas del mismo dia no repitan las mismas combinaciones.
function indiceGlobal() {
  const horasPorCorrida = 24 / CORRIDAS_POR_DIA
  const corridaDelDia = Math.floor(new Date().getHours() / horasPorCorrida)
  return diaDelAnio() * CORRIDAS_POR_DIA + corridaDelDia
}

function combosDeEstaCorrida() {
  const idx = indiceGlobal()
  const seleccion = []

  // Mayoria del cupo: Antofagasta, rotando por rubro.
  for (let i = 0; i < COMBOS_ANTOFAGASTA_POR_CORRIDA; i++) {
    const idxRubro = (idx * COMBOS_ANTOFAGASTA_POR_CORRIDA + i) % RUBROS.length
    seleccion.push({ rubro: RUBROS[idxRubro], ciudad: CIUDAD_PRINCIPAL })
  }

  // Resto del cupo: rotando por las demas ciudades, para no abandonar el
  // resto del pais.
  const otrosTodos = []
  for (const rubro of RUBROS) for (const ciudad of OTRAS_CIUDADES) otrosTodos.push({ rubro, ciudad })
  const restantes = COMBOS_POR_CORRIDA - COMBOS_ANTOFAGASTA_POR_CORRIDA
  for (let i = 0; i < restantes; i++) {
    seleccion.push(otrosTodos[(idx * restantes + i) % otrosTodos.length])
  }

  return seleccion
}

async function main() {
  const combos = combosDeEstaCorrida()
  console.log(`[buscarDiario] ${new Date().toISOString()} — combos de hoy:`, combos)

  let totalEncontrados = 0, totalNuevos = 0
  for (const { rubro, ciudad } of combos) {
    try {
      const encontrados = await buscarEmpresas(rubro, ciudad)
      totalEncontrados += encontrados.length
      for (const e of encontrados) {
        try {
          await centralDB.execute(
            `INSERT INTO marketing_candidatos (campana, empresa, sitio_web, email_sugerido, rubro, ciudad)
             VALUES ('pymes-chile', ?, ?, ?, ?, ?)`,
            [e.empresa, e.sitioWeb, e.email, e.rubro, e.ciudad]
          )
          totalNuevos++
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY') throw err
        }
      }
      console.log(`[buscarDiario]   ${rubro} en ${ciudad}: ${encontrados.length} encontradas`)
    } catch (err) {
      console.error(`[buscarDiario]   ERROR en ${rubro}/${ciudad}:`, err.message)
    }
  }
  console.log(`[buscarDiario] total encontrados=${totalEncontrados} nuevos=${totalNuevos}`)
}

main().then(() => process.exit(0)).catch(err => { console.error('[buscarDiario] FATAL', err.message); process.exit(1) })
