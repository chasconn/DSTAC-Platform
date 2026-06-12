const centralDB = require('../db/central')

/**
 * Obtiene la evaluación NIST activa de una empresa o la crea si no existe.
 * Idempontente: llamar múltiples veces no duplica la evaluación.
 */
async function getOrCreateEvaluation(companyId, userId) {
  const [rows] = await centralDB.execute(
    `SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
    [companyId]
  )
  if (rows.length) return rows[0].id

  const [result] = await centralDB.execute(
    `INSERT INTO nist_evaluations (company_id, evaluator_id, status) VALUES (?, ?, 'activa')`,
    [companyId, userId]
  )
  const evalId = result.insertId

  // Seed un assessment por cada control existente
  const [controls] = await centralDB.execute(`SELECT id FROM nist_controls`)
  if (controls.length) {
    const vals = controls.map(c => `(${evalId}, '${c.id}', 'pendiente', 0)`).join(',')
    await centralDB.execute(
      `INSERT INTO nist_control_assessments (evaluation_id, control_id, status, progress) VALUES ${vals}`
    )
  }

  await centralDB.execute(
    `INSERT INTO nist_history (evaluation_id, control_id, company_id, event_type, user_id, new_data)
     VALUES (?, NULL, ?, 'evaluacion_creada', ?, ?)`,
    [evalId, companyId, userId, JSON.stringify({ company_id: companyId })]
  )

  return evalId
}

module.exports = { getOrCreateEvaluation }
