// Corrige el detalle del ítem "Diagnóstico de Postura de Seguridad" en el
// catálogo de cotizaciones para que quede claro que el precio varía por
// tamaño de empresa (igual que la propuesta por TIER) — el precio_sugerido
// se deja como referencia de "Mediana empresa"; al generar la cotización
// automática desde el diagnóstico, el backend ya calcula el precio correcto
// según el tamaño detectado (apps/api/services/diagnostico/cuestionario.js).
// Seguro correr más de una vez.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: 'db_dstac_core',
  })

  const [r] = await conn.query(
    `UPDATE cotizacion_catalogo SET detalle = ?
     WHERE nombre = 'Diagnóstico de Postura de Seguridad'`,
    ['Evaluación de lectura de la postura de ciberseguridad (2–3 semanas), con informe y hoja de ruta. Precio según tamaño: PYME $790.000 · Mediana $1.200.000 · Grande desde $2.500.000.']
  )
  console.log(`Filas actualizadas: ${r.affectedRows}`)

  await conn.end()
}

migrate().catch(err => { console.error(err); process.exit(1) })
