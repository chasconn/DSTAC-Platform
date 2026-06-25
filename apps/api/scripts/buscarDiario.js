// scripts/buscarDiario.js — corrida automatica diaria (via cron) de la
// busqueda de empresas para la campana "pymes-chile". Rota por una lista fija
// de rubro+ciudad para no repetir siempre lo mismo, usando el dia del año
// como indice -- sin necesitar guardar estado en ningun lado.
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

// Principales ciudades de Chile, de norte a sur.
const CIUDADES = [
  'Iquique', 'Antofagasta', 'La Serena', 'Santiago', 'Valparaiso',
  'Rancagua', 'Talca', 'Concepcion', 'Temuco', 'Puerto Montt',
]

const COMBOS_POR_DIA = 3 // ritmo conservador: ~10.000 busquedas gratis/mes en Places API

function diaDelAnio() {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), 0, 0)
  return Math.floor((ahora - inicio) / 86400000)
}

function combosDeHoy() {
  const todos = []
  for (const rubro of RUBROS) for (const ciudad of CIUDADES) todos.push({ rubro, ciudad })
  const inicio = (diaDelAnio() * COMBOS_POR_DIA) % todos.length
  const seleccion = []
  for (let i = 0; i < COMBOS_POR_DIA; i++) seleccion.push(todos[(inicio + i) % todos.length])
  return seleccion
}

async function main() {
  const combos = combosDeHoy()
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
