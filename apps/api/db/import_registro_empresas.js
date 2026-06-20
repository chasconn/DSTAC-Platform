// import_registro_empresas.js — descarga el "Registro de Empresas y Sociedades"
// (datos.gob.cl, Ministerio de Economía — gratuito, oficial, sin API key) y lo
// carga en la tabla local registro_empresas. Seguro de correr más de una vez
// (UPSERT por RUT; los años más nuevos pisan a los más viejos si el RUT repite,
// por ejemplo una sociedad con una modificación posterior a su constitución).
//
// Uso: node apps/api/db/import_registro_empresas.js [anioDesde]
//   Por defecto importa desde 2018 (los años más viejos rara vez aportan datos
//   útiles para autocompletar clientes activos hoy, y reduce tiempo/espacio).
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const centralDB = require('./central')
const { normalizarRut } = require('../utils/rut')

const BASE = 'https://datos.gob.cl/dataset/363edd60-4919-4ff1-b85f-f8e14d61285a/resource'
// [anio, resourceId, nombreArchivo]
const RECURSOS = [
  [2013, 'fd2b91b0-eb8e-45f1-98d0-1f3316bb6468', '2013-sociedades-por-fecha-rut-constitucion.csv'],
  [2014, 'ba5d9b2a-c292-45f5-9767-93420c62529e', '2014-sociedades-por-fecha-rut-constitucion.csv'],
  [2015, '6ffd416f-376f-40a8-9537-0d739f29fac9', '2015-sociedades-por-fecha-rut-constitucion.csv'],
  [2016, '288b0a7d-2d40-4c59-a312-2cc562cfe4eb', '2016-sociedades-por-fecha-rut-constitucion_v3.csv'],
  [2017, '667eef5c-0896-424b-baf1-d13356d40326', '2017-sociedades-por-fecha-rut-constitucion.csv'],
  [2018, 'ca45026b-4dde-44b0-8725-64446a95f69d', '2018-sociedades-por-fecha-rut-constitucion-v2.csv'],
  [2019, '0d0d0ffb-fb28-4314-9bf0-8402353c9448', '2019-sociedades-por-fecha-rut-constitucion-v3.csv'],
  [2020, '1ad6cd82-8859-4601-a993-043009279f45', '2020-sociedades-por-fecha-rut-constitucion.csv'],
  [2021, 'd5c69cb4-2fa8-4e92-906f-34776a30ce59', '2021-sociedades-por-fecha-rut-constitucion.csv'],
  [2022, '3e286353-146d-47aa-ac42-e2f36e703d1f', '2022-sociedades-por-fecha-rut-constitucion.csv'],
  [2023, '2fbe5f40-6c3d-42e6-8a84-e6ddce56d888', '2023-sociedades-por-fecha-rut-constitucion.csv'],
  [2024, '42ee8c8c-59cf-42e4-89af-ec19a87dbf8d', '2024-sociedades-por-fecha-rut-constitucion.csv'],
  [2025, '71c8e355-226a-461e-809a-870c2275a178', '2025-sociedades-por-fecha-rut-constitucion.csv'],
  [2026, '472de7b5-384f-452d-9da5-2928689d8f2f', '202605-sociedades-por-fecha-rut-constitucion.csv'],
]

function parseFechaDDMMYYYY(s) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec((s || '').trim())
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

// Parser CSV simple (delimitador ';', sin comillas en este dataset — verificado
// en una muestra real de varios años; los nombres de razón social no traen ';').
function parseCSV(texto) {
  const limpio = texto.replace(/^﻿/, '')
  const lineas = limpio.split(/\r?\n/).filter(l => l.trim())
  if (!lineas.length) return { columnas: {}, filas: [] }
  const encabezados = lineas[0].split(';').map(h => h.trim())
  const columnas = {}
  encabezados.forEach((h, i) => { columnas[h] = i })
  const filas = lineas.slice(1).map(l => l.split(';'))
  return { columnas, filas }
}

async function importarAnio(anio, resourceId, archivo) {
  const url = `${BASE}/${resourceId}/download/${archivo}`
  console.log(`› Descargando ${anio} (${archivo})…`)
  const r = await fetch(url)
  if (!r.ok) { console.error(`  ✗ ${anio}: HTTP ${r.status}`); return 0 }
  const texto = await r.text()
  const { columnas, filas } = parseCSV(texto)

  const idxRut       = columnas['RUT']
  const idxRazon     = columnas['Razon Social']
  const idxFecha     = columnas['Fecha de actuacion (1era firma)']
  const idxAnio      = columnas['Anio']
  const idxTipoSoc   = columnas['Codigo de sociedad']
  const idxTipoAct   = columnas['Tipo de actuacion']
  const idxCapital   = columnas['Capital']
  const idxComuna    = columnas['Comuna Social']
  const idxRegion    = columnas['Region Social']

  if (idxRut == null || idxRazon == null) { console.error(`  ✗ ${anio}: columnas RUT/Razon Social no encontradas`); return 0 }

  const filasValidas = []
  for (const f of filas) {
    const rut = normalizarRut(f[idxRut])
    if (!rut) continue
    filasValidas.push([
      rut,
      (f[idxRazon] || '').trim().slice(0, 255) || null,
      idxTipoSoc != null ? (f[idxTipoSoc] || '').trim().slice(0, 20) || null : null,
      idxTipoAct != null ? (f[idxTipoAct] || '').trim().slice(0, 50) || null : null,
      idxCapital != null ? (parseInt((f[idxCapital] || '').replace(/[^0-9]/g, ''), 10) || null) : null,
      idxComuna != null ? (f[idxComuna] || '').trim().slice(0, 100) || null : null,
      idxRegion != null ? (f[idxRegion] || '').trim().slice(0, 10) || null : null,
      idxAnio != null ? (parseInt(f[idxAnio], 10) || anio) : anio,
      idxFecha != null ? parseFechaDDMMYYYY(f[idxFecha]) : null,
    ])
  }

  const LOTE = 2000
  for (let i = 0; i < filasValidas.length; i += LOTE) {
    const lote = filasValidas.slice(i, i + LOTE)
    await centralDB.query(
      `INSERT INTO registro_empresas
         (rut, razon_social, tipo_sociedad, tipo_actuacion, capital, comuna, region, anio, fecha_constitucion)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         razon_social = VALUES(razon_social), tipo_sociedad = VALUES(tipo_sociedad),
         tipo_actuacion = VALUES(tipo_actuacion), capital = VALUES(capital),
         comuna = VALUES(comuna), region = VALUES(region), anio = VALUES(anio),
         fecha_constitucion = VALUES(fecha_constitucion)`,
      [lote]
    )
  }
  console.log(`  ✓ ${anio}: ${filasValidas.length} registros`)
  return filasValidas.length
}

async function main() {
  const anioDesde = parseInt(process.argv[2], 10) || 2018
  let total = 0
  for (const [anio, resourceId, archivo] of RECURSOS) {
    if (anio < anioDesde) continue
    total += await importarAnio(anio, resourceId, archivo)
  }
  console.log(`✓ Importación completa: ${total} registros procesados (años desde ${anioDesde})`)
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
