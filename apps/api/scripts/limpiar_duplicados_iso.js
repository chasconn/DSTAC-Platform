/**
 * limpiar_duplicados_iso.js
 *
 * Elimina filas duplicadas en iso_control_assessments conservando, por cada
 * par (evaluation_id, control_id), la fila con el id más alto (la más reciente).
 * Luego garantiza que exista el índice único uq_evaluation_control para impedir
 * que vuelvan a generarse duplicados.
 *
 * Uso (desde el contenedor de la API, donde la BD central es accesible):
 *   node apps/api/scripts/limpiar_duplicados_iso.js
 *
 * Es idempotente: puede ejecutarse varias veces sin efectos adversos.
 */
const centralDB = require('../db/central')

async function main() {
  console.log('› Revisando duplicados en iso_control_assessments…')

  const [[antes]] = await centralDB.query(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT evaluation_id, control_id) AS distintos
     FROM iso_control_assessments`
  )
  console.log(`  total=${antes.total}  distintos=${antes.distintos}  duplicados=${antes.total - antes.distintos}`)

  if (antes.total > antes.distintos) {
    const [del] = await centralDB.query(`
      DELETE t1 FROM iso_control_assessments t1
      INNER JOIN iso_control_assessments t2
        ON t1.evaluation_id = t2.evaluation_id
       AND t1.control_id    = t2.control_id
       AND t1.id < t2.id
    `)
    console.log(`  ✓ ${del.affectedRows} fila(s) duplicada(s) eliminada(s) (se conservó el id más alto)`)
  } else {
    console.log('  ✓ No hay duplicados que eliminar')
  }

  // Garantizar índice único (idempotente)
  const [idx] = await centralDB.query(
    `SHOW INDEX FROM iso_control_assessments WHERE Key_name = 'uq_evaluation_control'`
  )
  if (idx.length) {
    console.log('  ✓ El índice único uq_evaluation_control ya existe')
  } else {
    await centralDB.query(
      `ALTER TABLE iso_control_assessments
         ADD UNIQUE KEY uq_evaluation_control (evaluation_id, control_id)`
    )
    console.log('  ✓ Índice único uq_evaluation_control creado')
  }

  const [[despues]] = await centralDB.query(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT evaluation_id, control_id) AS distintos
     FROM iso_control_assessments`
  )
  console.log(`  resultado: total=${despues.total}  distintos=${despues.distintos}`)
  console.log('✓ Listo.')
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error('✗ Error:', err.message); process.exit(1) })
