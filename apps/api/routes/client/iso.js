const router    = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB                          = require('../../db/central')

router.use(requireAuth, requireClientRole, resolveTenant)

// GET /api/client/iso/stats — overview con scores de dominios
router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [evalRows] = await centralDB.execute(
      `SELECT id, score_total, gap_total, evaluated_at FROM iso_evaluations
       WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    )
    if (!evalRows.length) return res.json({ evaluacion: null, domains: [], score_total: 0, gap_total: 100 })

    const evalId = evalRows[0].id

    const [domains] = await centralDB.execute(`
      SELECT d.id, d.name, d.color, d.order_num, d.description,
             ROUND(AVG(CASE WHEN ica.applies = 1 AND ica.status != 'no_aplica'
                            THEN ica.progress END), 1)                    AS score,
             SUM(CASE WHEN ica.status = 'implementado' THEN 1 ELSE 0 END) AS implementados,
             SUM(CASE WHEN ica.status = 'parcial'      THEN 1 ELSE 0 END) AS parciales,
             SUM(CASE WHEN ica.status = 'pendiente'    THEN 1 ELSE 0 END) AS pendientes,
             COUNT(ic.id)                                                  AS total_controls
      FROM iso_domains d
      LEFT JOIN iso_controls ic ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      GROUP BY d.id
      ORDER BY d.order_num
    `, [evalId])

    res.json({
      evaluation_id: evalId,
      score_total:   evalRows[0].score_total ?? 0,
      gap_total:     evalRows[0].gap_total   ?? 100,
      evaluated_at:  evalRows[0].evaluated_at,
      domains
    })
  } catch (err) { next(err) }
})

// GET /api/client/iso/controls/:domainId — controles de un dominio
router.get('/controls/:domainId', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [evalRows] = await centralDB.execute(
      `SELECT id FROM iso_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    )
    if (!evalRows.length) return res.json({ controls: [] })
    const evalId = evalRows[0].id

    const [controls] = await centralDB.execute(`
      SELECT ic.id, ic.name, ic.description, ic.data_source, ic.order_num,
             ica.status, ica.progress, ica.applies
      FROM iso_controls ic
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      WHERE ic.domain_id = ?
      ORDER BY ic.order_num
    `, [evalId, req.params.domainId])

    res.json({ controls })
  } catch (err) { next(err) }
})

// GET /api/client/iso/evidencias — evidencias aprobadas (solo lectura)
router.get('/evidencias', async (req, res, next) => {
  try {
    const { domain_id, control_id } = req.query
    const companyId = req.company.id

    let where = "WHERE e.company_id = ? AND e.status = 'aprobada'"
    const params = [companyId]

    if (control_id) { where += ' AND e.control_id = ?'; params.push(control_id) }
    if (domain_id)  { where += ' AND ic.domain_id = ?'; params.push(domain_id) }

    const [rows] = await centralDB.execute(`
      SELECT e.id, e.original_name, e.file_type, e.file_size, e.created_at,
             e.control_id, ic.name AS control_name, ic.domain_id,
             u.first_name AS uploaded_by_name
      FROM iso_evidences e
      JOIN iso_controls ic ON e.control_id = ic.id
      LEFT JOIN users u ON e.uploaded_by = u.id
      ${where}
      ORDER BY e.created_at DESC
    `, params)

    res.json({ evidencias: rows })
  } catch (err) { next(err) }
})

// GET /api/client/iso/plan-accion — plan de acción (solo lectura)
router.get('/plan-accion', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const { domain_id } = req.query
    let sql = `
      SELECT p.id, p.control_id, p.priority, p.status, p.responsible,
             p.due_date, p.action, p.evidence_needed,
             ic.name AS control_name, ic.domain_id, d.name AS domain_name
      FROM iso_action_plans p
      JOIN iso_controls ic ON p.control_id = ic.id
      JOIN iso_domains  d  ON ic.domain_id = d.id
      WHERE p.company_id = ? AND p.status != 'cancelada'
    `
    const params = [companyId]
    if (domain_id) { sql += ' AND ic.domain_id = ?'; params.push(domain_id) }
    sql += " ORDER BY FIELD(p.priority,'critica','alta','media','baja'), p.due_date ASC"
    const [rows] = await centralDB.execute(sql, params)
    res.json({ plan: rows })
  } catch (err) { next(err) }
})

// GET /api/client/iso/historial — historial (solo lectura)
router.get('/historial', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const { domain_id } = req.query
    let sql = `
      SELECT h.id, h.event_type, h.created_at,
             h.control_id, ic.name AS control_name, ic.domain_id,
             u.first_name AS user_name
      FROM iso_history h
      LEFT JOIN iso_controls ic ON h.control_id = ic.id
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.company_id = ?
    `
    const params = [companyId]
    if (domain_id) { sql += ' AND ic.domain_id = ?'; params.push(domain_id) }
    sql += ' ORDER BY h.created_at DESC LIMIT 100'
    const [rows] = await centralDB.execute(sql, params)
    res.json({ historial: rows })
  } catch (err) { next(err) }
})

module.exports = router
