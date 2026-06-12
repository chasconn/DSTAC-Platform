const router    = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB                          = require('../../db/central')

router.use(requireAuth, requireClientRole, resolveTenant)

// Obtener evaluación activa con stats completos
router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.company.id

    const [evalRows] = await centralDB.execute(
      `SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    )
    if (!evalRows.length) return res.json({ evaluacion: null, functions: [], score_total: 0 })

    const evalId = evalRows[0].id

    const [fnScores] = await centralDB.execute(`
      SELECT f.id, f.code, f.name, f.color, f.order_num, f.description,
             AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END) AS score,
             COUNT(CASE WHEN nca.status = 'implementado' THEN 1 END)  AS implementados,
             COUNT(CASE WHEN nca.status = 'parcial'      THEN 1 END)  AS parciales,
             COUNT(CASE WHEN nca.status = 'pendiente'    THEN 1 END)  AS pendientes,
             COUNT(nc.id)                                              AS total_controls
      FROM nist_functions f
      LEFT JOIN nist_categories ncat ON ncat.function_id = f.id
      LEFT JOIN nist_controls   nc   ON nc.category_id   = ncat.id
      LEFT JOIN nist_control_assessments nca
             ON nca.control_id = nc.id AND nca.evaluation_id = ?
      GROUP BY f.id
      ORDER BY f.order_num
    `, [evalId])

    const [evalRow] = await centralDB.execute(
      `SELECT score_total, evaluated_at FROM nist_evaluations WHERE id = ?`, [evalId]
    )

    res.json({
      evaluation_id: evalId,
      score_total:   evalRow[0]?.score_total ?? 0,
      evaluated_at:  evalRow[0]?.evaluated_at ?? null,
      functions:     fnScores
    })
  } catch (err) { next(err) }
})

// Controles de una función (solo lectura)
router.get('/controls/:functionId', async (req, res, next) => {
  try {
    const companyId = req.company.id

    const [evalRows] = await centralDB.execute(
      `SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    )
    if (!evalRows.length) return res.json({ controls: [], categories: [] })

    const evalId = evalRows[0].id

    const [controls] = await centralDB.execute(`
      SELECT nc.*, ncat.name AS category_name,
             nca.status, nca.progress, nca.notes_dstac
      FROM nist_controls nc
      JOIN nist_categories ncat ON nc.category_id = ncat.id
      LEFT JOIN nist_control_assessments nca
             ON nca.control_id = nc.id AND nca.evaluation_id = ?
      WHERE ncat.function_id = ?
      ORDER BY nc.category_id, nc.order_num
    `, [evalId, req.params.functionId])

    const [categories] = await centralDB.execute(
      `SELECT * FROM nist_categories WHERE function_id = ?`, [req.params.functionId]
    )

    res.json({ controls, categories })
  } catch (err) { next(err) }
})

// Evidencias (solo lectura)
router.get('/evidencias', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const { function_id, category_id, control_id, status } = req.query

    const [evalRows] = await centralDB.execute(
      `SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    )
    if (!evalRows.length) return res.json({ evidencias: [] })
    const evalId = evalRows[0].id

    let where = 'WHERE e.evaluation_id = ?'
    const params = [evalId]
    if (control_id)  { where += ' AND e.control_id = ?';    params.push(control_id) }
    if (status)      { where += ' AND e.status = ?';        params.push(status) }
    if (category_id) { where += ' AND nc.category_id = ?';  params.push(category_id) }
    if (function_id) { where += ' AND ncat.function_id = ?';params.push(function_id) }

    const [rows] = await centralDB.execute(`
      SELECT e.id, e.control_id, e.original_name, e.file_type, e.file_size,
             e.status, e.comments, e.expires_at, e.created_at,
             nc.name AS control_name, nc.category_id,
             ncat.name AS category_name, ncat.function_id,
             u.first_name AS uploaded_by_name
      FROM nist_evidences e
      JOIN nist_controls   nc   ON e.control_id    = nc.id
      JOIN nist_categories ncat ON nc.category_id  = ncat.id
      LEFT JOIN users u ON e.uploaded_by = u.id
      ${where}
      ORDER BY e.created_at DESC
    `, params)

    res.json({ evidencias: rows })
  } catch (err) { next(err) }
})

// Historial (solo lectura)
router.get('/historial', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const { function_id, event_type, limit = 50 } = req.query

    const [evalRows] = await centralDB.execute(
      `SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    )
    if (!evalRows.length) return res.json({ historial: [], stats: null })
    const evalId = evalRows[0].id

    let where = 'WHERE h.evaluation_id = ?'
    const params = [evalId]
    if (function_id) { where += ' AND ncat.function_id = ?'; params.push(function_id) }
    if (event_type)  { where += ' AND h.event_type = ?';     params.push(event_type) }

    const [rows] = await centralDB.execute(`
      SELECT h.id, h.control_id, h.event_type, h.previous_data, h.new_data, h.comment, h.created_at,
             nc.name AS control_name, nc.category_id,
             ncat.name AS category_name, ncat.function_id,
             u.first_name AS user_name, u.last_name AS user_last
      FROM nist_history h
      LEFT JOIN nist_controls   nc   ON h.control_id   = nc.id
      LEFT JOIN nist_categories ncat ON nc.category_id = ncat.id
      LEFT JOIN users u ON h.user_id = u.id
      ${where}
      ORDER BY h.created_at DESC
      LIMIT ${Number(limit)}
    `, params)

    const [statsRows] = await centralDB.execute(`
      SELECT
        COUNT(*)                                                         AS total_eventos,
        SUM(h.event_type = 'control_actualizado')                       AS controles_modificados,
        SUM(h.event_type IN ('evidencia_agregada','evidencia_aprobada')) AS evidencias_agregadas,
        COUNT(DISTINCT h.user_id)                                       AS usuarios_activos
      FROM nist_history h
      WHERE h.evaluation_id = ?
    `, [evalId])

    res.json({ historial: rows, stats: statsRows[0] })
  } catch (err) { next(err) }
})

// Plan de acción (solo lectura)
router.get('/plan-accion', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const { function_id, status } = req.query

    const [evalRows] = await centralDB.execute(
      `SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    )
    if (!evalRows.length) return res.json({ plan: [] })
    const evalId = evalRows[0].id

    let where = 'WHERE p.evaluation_id = ?'
    const params = [evalId]
    if (status)      { where += ' AND p.status = ?';         params.push(status) }
    if (function_id) { where += ' AND ncat.function_id = ?'; params.push(function_id) }

    const [rows] = await centralDB.execute(`
      SELECT p.id, p.control_id, p.priority, p.status, p.responsible,
             p.due_date, p.action, p.evidence_needed, p.created_at, p.updated_at,
             nc.name AS control_name, nc.category_id,
             ncat.name AS category_name, ncat.function_id
      FROM nist_action_plans p
      JOIN nist_controls   nc   ON p.control_id   = nc.id
      JOIN nist_categories ncat ON nc.category_id = ncat.id
      ${where}
      ORDER BY FIELD(p.priority,'critica','alta','media','baja'), p.due_date ASC
    `, params)

    res.json({ plan: rows })
  } catch (err) { next(err) }
})

module.exports = router
