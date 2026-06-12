const centralDB = require('../db/central')

async function getOrCreateEvaluation(companyId, userId) {
  const [rows] = await centralDB.execute(
    `SELECT id FROM iso_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
    [companyId]
  )
  if (rows.length) return rows[0].id

  const [result] = await centralDB.execute(
    `INSERT INTO iso_evaluations (company_id, evaluator_id, status) VALUES (?, ?, 'activa')`,
    [companyId, userId]
  )
  const evalId = result.insertId

  // Un assessment por cada control del Anexo A
  const [controls] = await centralDB.execute(`SELECT id FROM iso_controls`)
  if (controls.length) {
    const vals = controls.map(c => `(${evalId}, '${c.id}', 1, 'pendiente', 0)`).join(',')
    await centralDB.execute(
      `INSERT INTO iso_control_assessments (evaluation_id, control_id, applies, status, progress) VALUES ${vals}`
    )
  }

  await centralDB.execute(
    `INSERT INTO iso_history (evaluation_id, control_id, company_id, event_type, user_id, new_data)
     VALUES (?, NULL, ?, 'evaluacion_creada', ?, ?)`,
    [evalId, companyId, userId, JSON.stringify({ company_id: companyId })]
  )

  return evalId
}

async function recalcularScores(evalId) {
  const [domains] = await centralDB.execute(`SELECT id FROM iso_domains`)
  let totalScore = 0

  for (const domain of domains) {
    const [r] = await centralDB.execute(`
      SELECT AVG(ica.progress) AS avg_progress
      FROM iso_control_assessments ica
      JOIN iso_controls ic ON ica.control_id = ic.id
      WHERE ica.evaluation_id = ?
        AND ic.domain_id = ?
        AND ica.applies = 1
        AND ica.status != 'no_aplica'
    `, [evalId, domain.id])
    totalScore += Number(r[0].avg_progress ?? 0)
  }

  const scoreTotal = Math.round((totalScore / domains.length) * 100) / 100
  const gapTotal   = Math.round((100 - scoreTotal) * 100) / 100

  await centralDB.execute(
    `UPDATE iso_evaluations SET score_total = ?, gap_total = ? WHERE id = ?`,
    [scoreTotal, gapTotal, evalId]
  )
  return { scoreTotal, gapTotal }
}

module.exports = { getOrCreateEvaluation, recalcularScores }
