const router  = require('express').Router()
const path    = require('path')
const fs      = require('fs')
const multer  = require('multer')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                 = require('../../middleware/tenant')
const centralDB                         = require('../../db/central')
const { getOrCreateEvaluation }         = require('../../services/nistService')

// ── Multer: guardar evidencias en /uploads/nist/{company_slug}/ ──────────────
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(__dirname, '../../uploads/nist', req.company.slug)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    cb(null, `${Date.now()}_${base}${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }) // 20 MB

// ── Todas las rutas requieren auth DSTAC + tenant resuelto ───────────────────
router.use(requireAuth, requireDstacRole, resolveTenant)

// ── Helpers ──────────────────────────────────────────────────────────────────
// getOrCreateEvaluation lives in services/nistService.js and is imported above

// Recalcula score_total de la evaluación (promedio de progress de controles aplicables)
async function recalcularScores(evaluationId) {
  const [fns] = await centralDB.execute(`SELECT id FROM nist_functions`)
  let totalFunctions = 0, totalScore = 0

  for (const fn of fns) {
    const [r] = await centralDB.execute(`
      SELECT AVG(nca.progress) AS avg_progress
      FROM nist_control_assessments nca
      JOIN nist_controls nc    ON nca.control_id  = nc.id
      JOIN nist_categories ncat ON nc.category_id = ncat.id
      WHERE nca.evaluation_id = ?
        AND ncat.function_id  = ?
        AND nca.status       != 'no_aplica'
    `, [evaluationId, fn.id])

    const avg = Number(r[0].avg_progress ?? 0)
    totalScore += avg
    totalFunctions++
  }

  const overall = totalFunctions ? Math.round((totalScore / totalFunctions) * 100) / 100 : 0
  await centralDB.execute(
    `UPDATE nist_evaluations SET score_total = ? WHERE id = ?`,
    [overall, evaluationId]
  )
  return overall
}

// ── EVALUACIONES ─────────────────────────────────────────────────────────────

// GET /api/admin/nist/evaluacion
router.get('/evaluacion', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [rows] = await centralDB.execute(
      `SELECT e.*, u.first_name, u.last_name, u.email AS evaluator_email
       FROM nist_evaluations e
       LEFT JOIN users u ON e.evaluator_id = u.id
       WHERE e.company_id = ? AND e.status = 'activa'
       LIMIT 1`,
      [companyId]
    )
    if (!rows.length) return res.json({ evaluacion: null })
    res.json({ evaluacion: rows[0] })
  } catch (err) { next(err) }
})

// POST /api/admin/nist/evaluacion — crea evaluación si no existe
router.post('/evaluacion', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id

    // Archivar evaluación activa anterior si existe
    await centralDB.execute(
      `UPDATE nist_evaluations SET status = 'archivada' WHERE company_id = ? AND status = 'activa'`,
      [companyId]
    )

    const evalId = await getOrCreateEvaluation(companyId, userId)
    res.json({ evaluacion_id: evalId, message: 'Evaluación creada' })
  } catch (err) { next(err) }
})

// ── FUNCIONES ─────────────────────────────────────────────────────────────────

// GET /api/admin/nist/functions
router.get('/functions', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [fns] = await centralDB.execute(
      `SELECT f.*,
              COUNT(nc.id)                                                   AS total_controls,
              AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END) AS score
       FROM nist_functions f
       LEFT JOIN nist_categories  ncat ON ncat.function_id = f.id
       LEFT JOIN nist_controls    nc   ON nc.category_id   = ncat.id
       LEFT JOIN nist_control_assessments nca
              ON nca.control_id = nc.id AND nca.evaluation_id = ?
       GROUP BY f.id
       ORDER BY f.order_num`,
      [evalId]
    )

    res.json({ functions: fns, evaluation_id: evalId })
  } catch (err) { next(err) }
})

// GET /api/admin/nist/functions/:id
router.get('/functions/:id', async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [fns] = await centralDB.execute(
      `SELECT * FROM nist_functions WHERE id = ?`, [id]
    )
    if (!fns.length) return res.status(404).json({ error: 'Función no encontrada' })

    const [cats] = await centralDB.execute(
      `SELECT ncat.*,
              COUNT(nc.id)                                                   AS total_controls,
              AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END) AS score
       FROM nist_categories ncat
       LEFT JOIN nist_controls nc ON nc.category_id = ncat.id
       LEFT JOIN nist_control_assessments nca
              ON nca.control_id = nc.id AND nca.evaluation_id = ?
       WHERE ncat.function_id = ?
       GROUP BY ncat.id`,
      [evalId, id]
    )

    res.json({ function: fns[0], categories: cats, evaluation_id: evalId })
  } catch (err) { next(err) }
})

// ── CONTROLES ─────────────────────────────────────────────────────────────────

// GET /api/admin/nist/controls
router.get('/controls', async (req, res, next) => {
  try {
    const { function_id, category_id, status, q } = req.query
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    let where = 'WHERE 1=1'
    const params = [evalId]

    if (function_id) { where += ' AND ncat.function_id = ?';  params.push(function_id) }
    if (category_id) { where += ' AND nc.category_id = ?';    params.push(category_id) }
    if (status)      { where += ' AND nca.status = ?';        params.push(status) }
    if (q)           { where += ' AND (nc.id LIKE ? OR nc.name LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }

    const [controls] = await centralDB.execute(`
      SELECT nc.*, ncat.name AS category_name, ncat.function_id,
             nca.id AS assessment_id, nca.status, nca.progress,
             nca.current_value, nca.max_value, nca.checklist_items, nca.notes_dstac,
             nca.updated_at AS assessed_at,
             u.first_name AS updated_by_name
      FROM nist_controls nc
      JOIN nist_categories ncat ON nc.category_id = ncat.id
      LEFT JOIN nist_control_assessments nca
             ON nca.control_id = nc.id AND nca.evaluation_id = ?
      LEFT JOIN users u ON nca.updated_by = u.id
      ${where}
      ORDER BY nc.category_id, nc.order_num
    `, params)

    res.json({ controls, evaluation_id: evalId })
  } catch (err) { next(err) }
})

// GET /api/admin/nist/controls/:id
router.get('/controls/:id', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [rows] = await centralDB.execute(`
      SELECT nc.*, ncat.name AS category_name, ncat.function_id,
             f.name AS function_name, f.color AS function_color,
             nca.id AS assessment_id, nca.status, nca.progress,
             nca.current_value, nca.max_value, nca.checklist_items, nca.notes_dstac,
             nca.updated_at AS assessed_at
      FROM nist_controls nc
      JOIN nist_categories ncat ON nc.category_id = ncat.id
      JOIN nist_functions  f    ON ncat.function_id = f.id
      LEFT JOIN nist_control_assessments nca
             ON nca.control_id = nc.id AND nca.evaluation_id = ?
      WHERE nc.id = ?
    `, [evalId, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Control no encontrado' })
    res.json({ control: rows[0], evaluation_id: evalId })
  } catch (err) { next(err) }
})

// ── ASSESSMENTS ───────────────────────────────────────────────────────────────

// PUT /api/admin/nist/assessments/:controlId
router.put('/assessments/:controlId', async (req, res, next) => {
  try {
    const { controlId }  = req.params
    const { status, progress, current_value, max_value, checklist_items, notes_dstac, comment } = req.body
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    // Verificar que el control existe
    const [ctrl] = await centralDB.execute(`SELECT id FROM nist_controls WHERE id = ?`, [controlId])
    if (!ctrl.length) return res.status(404).json({ error: 'Control no encontrado' })

    // Obtener estado anterior para historial
    const [prev] = await centralDB.execute(
      `SELECT status, progress, notes_dstac FROM nist_control_assessments
       WHERE evaluation_id = ? AND control_id = ?`,
      [evalId, controlId]
    )
    const previousData = prev[0] ?? null

    // Calcular progress automáticamente desde checklist si se pasan checklist_items
    let computedProgress = progress ?? previousData?.progress ?? 0
    if (checklist_items && typeof checklist_items === 'object') {
      const items  = Object.values(checklist_items)
      const done   = items.filter(Boolean).length
      computedProgress = items.length ? Math.round((done / items.length) * 100) : 0
    }

    // Derivar status desde progress si no se pasa explícitamente
    let computedStatus = status ?? previousData?.status ?? 'pendiente'
    if (!status && computedProgress === 100) computedStatus = 'implementado'
    else if (!status && computedProgress > 0)  computedStatus = 'parcial'
    else if (!status && computedProgress === 0) computedStatus = 'pendiente'

    await centralDB.execute(`
      INSERT INTO nist_control_assessments
        (evaluation_id, control_id, status, progress, current_value, max_value, checklist_items, notes_dstac, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status         = VALUES(status),
        progress       = VALUES(progress),
        current_value  = VALUES(current_value),
        max_value      = VALUES(max_value),
        checklist_items= VALUES(checklist_items),
        notes_dstac    = VALUES(notes_dstac),
        updated_by     = VALUES(updated_by)
    `, [
      evalId, controlId, computedStatus, computedProgress,
      current_value ?? previousData?.current_value ?? 0,
      max_value     ?? previousData?.max_value     ?? 0,
      checklist_items ? JSON.stringify(checklist_items) : null,
      notes_dstac ?? previousData?.notes_dstac ?? null,
      userId
    ])

    // Registrar en historial
    await centralDB.execute(`
      INSERT INTO nist_history
        (evaluation_id, control_id, company_id, event_type, user_id, previous_data, new_data, comment)
      VALUES (?, ?, ?, 'control_actualizado', ?, ?, ?, ?)
    `, [evalId, controlId, companyId, userId,
        JSON.stringify(previousData),
        JSON.stringify({ status: computedStatus, progress: computedProgress }),
        comment ?? null])

    const totalScore = await recalcularScores(evalId)

    res.json({ success: true, progress: computedProgress, status: computedStatus, score_total: totalScore })
  } catch (err) { next(err) }
})

// ── EVIDENCIAS ────────────────────────────────────────────────────────────────

// GET /api/admin/nist/evidencias
router.get('/evidencias', async (req, res, next) => {
  try {
    const { function_id, category_id, status, control_id, q } = req.query
    const companyId = req.company.id

    let where = 'WHERE e.company_id = ?'
    const params = [companyId]

    if (control_id)  { where += ' AND e.control_id = ?';         params.push(control_id) }
    if (status)      { where += ' AND e.status = ?';             params.push(status) }
    if (category_id) { where += ' AND nc.category_id = ?';       params.push(category_id) }
    if (function_id) { where += ' AND ncat.function_id = ?';     params.push(function_id) }
    if (q)           { where += ' AND e.original_name LIKE ?';   params.push(`%${q}%`) }

    const [rows] = await centralDB.execute(`
      SELECT e.*, nc.name AS control_name, nc.category_id,
             ncat.name AS category_name, ncat.function_id,
             u.first_name AS uploaded_by_name,
             r.first_name AS reviewed_by_name
      FROM nist_evidences e
      JOIN nist_controls   nc   ON e.control_id    = nc.id
      JOIN nist_categories ncat ON nc.category_id  = ncat.id
      LEFT JOIN users u ON e.uploaded_by  = u.id
      LEFT JOIN users r ON e.reviewed_by  = r.id
      ${where}
      ORDER BY e.created_at DESC
    `, params)

    res.json({ evidencias: rows })
  } catch (err) { next(err) }
})

// POST /api/admin/nist/evidencias — subir archivo
router.post('/evidencias', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' })

    const { control_id, comment, expires_at } = req.body
    if (!control_id) return res.status(400).json({ error: 'control_id requerido' })

    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [result] = await centralDB.execute(`
      INSERT INTO nist_evidences
        (evaluation_id, control_id, company_id, filename, original_name, file_type, file_size, file_path,
         status, uploaded_by, comments, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)
    `, [
      evalId, control_id, companyId,
      req.file.filename, req.file.originalname,
      req.file.mimetype, req.file.size,
      req.file.path,
      userId, comment ?? null, expires_at ?? null
    ])

    // Registrar en historial
    await centralDB.execute(`
      INSERT INTO nist_history
        (evaluation_id, control_id, company_id, event_type, user_id, new_data)
      VALUES (?, ?, ?, 'evidencia_agregada', ?, ?)
    `, [evalId, control_id, companyId, userId,
        JSON.stringify({ filename: req.file.originalname, evidence_id: result.insertId })])

    res.status(201).json({ id: result.insertId, message: 'Evidencia subida' })
  } catch (err) { next(err) }
})

// PUT /api/admin/nist/evidencias/:id — aprobar/rechazar
router.put('/evidencias/:id', async (req, res, next) => {
  try {
    const { status, comments } = req.body
    if (!['aprobada', 'rechazada', 'pendiente'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const userId    = req.user.user_id || req.user.id
    const companyId = req.company.id

    const [evs] = await centralDB.execute(
      `SELECT * FROM nist_evidences WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!evs.length) return res.status(404).json({ error: 'Evidencia no encontrada' })

    await centralDB.execute(`
      UPDATE nist_evidences
      SET status = ?, reviewed_by = ?, reviewed_at = NOW(), comments = ?
      WHERE id = ?
    `, [status, userId, comments ?? evs[0].comments, req.params.id])

    const eventType = status === 'aprobada' ? 'evidencia_aprobada' : 'evidencia_rechazada'
    await centralDB.execute(`
      INSERT INTO nist_history
        (evaluation_id, control_id, company_id, event_type, user_id, previous_data, new_data, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [evs[0].evaluation_id, evs[0].control_id, companyId, eventType, userId,
        JSON.stringify({ status: evs[0].status }),
        JSON.stringify({ status }),
        comments ?? null])

    res.json({ success: true })
  } catch (err) { next(err) }
})

// DELETE /api/admin/nist/evidencias/:id
router.delete('/evidencias/:id', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [evs] = await centralDB.execute(
      `SELECT * FROM nist_evidences WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!evs.length) return res.status(404).json({ error: 'Evidencia no encontrada' })

    // Eliminar archivo físico
    if (evs[0].file_path && fs.existsSync(evs[0].file_path)) {
      fs.unlinkSync(evs[0].file_path)
    }

    await centralDB.execute(`DELETE FROM nist_evidences WHERE id = ?`, [req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── HISTORIAL ─────────────────────────────────────────────────────────────────

// GET /api/admin/nist/historial
router.get('/historial', async (req, res, next) => {
  try {
    const { function_id, user_id, event_type, date_from, date_to, q } = req.query
    const companyId = req.company.id

    let where = 'WHERE h.company_id = ?'
    const params = [companyId]

    if (user_id)    { where += ' AND h.user_id = ?';         params.push(user_id) }
    if (event_type) { where += ' AND h.event_type = ?';      params.push(event_type) }
    if (date_from)  { where += ' AND h.created_at >= ?';     params.push(date_from) }
    if (date_to)    { where += ' AND h.created_at <= ?';     params.push(date_to + ' 23:59:59') }
    if (function_id){ where += ' AND ncat.function_id = ?';  params.push(function_id) }
    if (q)          { where += ' AND (nc.name LIKE ? OR nc.id LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }

    const [rows] = await centralDB.execute(`
      SELECT h.*, nc.name AS control_name, nc.category_id,
             ncat.function_id, ncat.name AS category_name,
             u.first_name AS user_name, u.last_name AS user_last, u.role AS user_role
      FROM nist_history h
      LEFT JOIN nist_controls   nc   ON h.control_id    = nc.id
      LEFT JOIN nist_categories ncat ON nc.category_id  = ncat.id
      LEFT JOIN users u ON h.user_id = u.id
      ${where}
      ORDER BY h.created_at DESC
      LIMIT 200
    `, params)

    // Stats para cards
    const [stats] = await centralDB.execute(`
      SELECT
        COUNT(*)                                                 AS total_eventos,
        SUM(MONTH(created_at) = MONTH(NOW()))                   AS cambios_mes,
        COUNT(DISTINCT control_id)                              AS controles_modificados,
        SUM(event_type = 'evidencia_agregada')                  AS evidencias_agregadas,
        COUNT(DISTINCT user_id)                                 AS usuarios_activos
      FROM nist_history WHERE company_id = ?
    `, [companyId])

    res.json({ historial: rows, stats: stats[0] })
  } catch (err) { next(err) }
})

// ── PLAN DE ACCIÓN ────────────────────────────────────────────────────────────

// GET /api/admin/nist/plan-accion
router.get('/plan-accion', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [rows] = await centralDB.execute(`
      SELECT p.*, nc.name AS control_name, nc.category_id,
             ncat.function_id, ncat.name AS category_name
      FROM nist_action_plans p
      JOIN nist_controls   nc   ON p.control_id   = nc.id
      JOIN nist_categories ncat ON nc.category_id = ncat.id
      WHERE p.company_id = ?
      ORDER BY FIELD(p.priority,'critica','alta','media','baja'), p.due_date ASC
    `, [companyId])
    res.json({ plan: rows })
  } catch (err) { next(err) }
})

// POST /api/admin/nist/plan-accion — crear tarea manual
router.post('/plan-accion', async (req, res, next) => {
  try {
    const { control_id, priority, responsible, due_date, action, evidence_needed, comment_dstac } = req.body
    if (!control_id || !action) return res.status(400).json({ error: 'control_id y action son requeridos' })

    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [result] = await centralDB.execute(`
      INSERT INTO nist_action_plans
        (evaluation_id, control_id, company_id, priority, responsible, due_date, action, evidence_needed, comment_dstac)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [evalId, control_id, companyId, priority ?? 'media', responsible ?? null,
        due_date ?? null, action, evidence_needed ?? null, comment_dstac ?? null])

    res.status(201).json({ id: result.insertId, message: 'Tarea creada' })
  } catch (err) { next(err) }
})

// PUT /api/admin/nist/plan-accion/:id
router.put('/plan-accion/:id', async (req, res, next) => {
  try {
    const { priority, status, responsible, due_date, action, evidence_needed, comment_dstac } = req.body
    const companyId = req.company.id

    const [existing] = await centralDB.execute(
      `SELECT id FROM nist_action_plans WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!existing.length) return res.status(404).json({ error: 'Tarea no encontrada' })

    await centralDB.execute(`
      UPDATE nist_action_plans
      SET priority = COALESCE(?, priority),
          status   = COALESCE(?, status),
          responsible    = COALESCE(?, responsible),
          due_date       = COALESCE(?, due_date),
          action         = COALESCE(?, action),
          evidence_needed= COALESCE(?, evidence_needed),
          comment_dstac  = COALESCE(?, comment_dstac)
      WHERE id = ?
    `, [priority ?? null, status ?? null, responsible ?? null, due_date ?? null,
        action ?? null, evidence_needed ?? null, comment_dstac ?? null, req.params.id])

    res.json({ success: true })
  } catch (err) { next(err) }
})

// POST /api/admin/nist/plan-accion/generar — genera automáticamente desde controles pendientes/parciales
router.post('/plan-accion/generar', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    // Controles pendientes o parciales sin tarea activa
    const [controls] = await centralDB.execute(`
      SELECT nc.id, nc.name, nc.category_id,
             nca.status, nca.progress,
             ncat.function_id
      FROM nist_control_assessments nca
      JOIN nist_controls   nc   ON nca.control_id   = nc.id
      JOIN nist_categories ncat ON nc.category_id   = ncat.id
      WHERE nca.evaluation_id = ?
        AND nca.status IN ('pendiente','parcial')
        AND nc.id NOT IN (
          SELECT control_id FROM nist_action_plans
          WHERE company_id = ? AND status NOT IN ('completada','cancelada')
        )
    `, [evalId, companyId])

    if (!controls.length) return res.json({ created: 0, message: 'No hay controles que requieran plan de acción' })

    let created = 0
    for (const c of controls) {
      const priority = c.status === 'pendiente' ? 'alta' : 'media'
      await centralDB.execute(`
        INSERT INTO nist_action_plans
          (evaluation_id, control_id, company_id, priority, action, status)
        VALUES (?, ?, ?, ?, ?, 'pendiente')
      `, [evalId, c.id, companyId, priority,
          `Implementar control ${c.id}: ${c.name}`])
      created++
    }

    res.json({ created, message: `${created} tareas generadas` })
  } catch (err) { next(err) }
})

// ── STATS ─────────────────────────────────────────────────────────────────────

// GET /api/admin/nist/stats
router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [fnScores] = await centralDB.execute(`
      SELECT f.id, f.code, f.name, f.color, f.order_num,
             AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END) AS score,
             COUNT(CASE WHEN nca.status = 'implementado' THEN 1 END)  AS implementados,
             COUNT(CASE WHEN nca.status = 'parcial' THEN 1 END)       AS parciales,
             COUNT(CASE WHEN nca.status = 'pendiente' THEN 1 END)     AS pendientes,
             COUNT(CASE WHEN nca.status = 'no_aplica' THEN 1 END)     AS no_aplica,
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
      `SELECT score_total FROM nist_evaluations WHERE id = ?`, [evalId]
    )

    res.json({
      evaluation_id: evalId,
      score_total: evalRow[0]?.score_total ?? 0,
      functions: fnScores
    })
  } catch (err) { next(err) }
})

// ── DATOS CONECTADOS (BD operacional del cliente) ─────────────────────────────

// GET /api/admin/nist/data/activos
router.get('/data/activos', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(`
      SELECT id, nombre, tipo, criticidad, estado, ambiente
      FROM activos ORDER BY criticidad DESC, nombre ASC LIMIT 100
    `)
    res.json({ activos: rows })
  } catch (err) { next(err) }
})

// GET /api/admin/nist/data/identidades
router.get('/data/identidades', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(`
      SELECT id, nombre, identidad, tipo_identidad, estado, origen
      FROM identidades ORDER BY estado ASC, nombre ASC LIMIT 100
    `)
    res.json({ identidades: rows })
  } catch (err) { next(err) }
})

// GET /api/admin/nist/data/accesos
router.get('/data/accesos', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(`
      SELECT a.id, a.nivel_acceso, a.estado, a.criticidad,
             i.nombre AS identidad_nombre, ac.nombre AS activo_nombre
      FROM accesos a
      LEFT JOIN identidades i ON a.identidad_id = i.id
      LEFT JOIN activos      ac ON a.activo_id   = ac.id
      ORDER BY a.criticidad DESC LIMIT 100
    `)
    res.json({ accesos: rows })
  } catch (err) { next(err) }
})

// GET /api/admin/nist/data/personal
router.get('/data/personal', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(`
      SELECT id, nombre, rol_empresarial, nivel_responsabilidad, estado
      FROM personal ORDER BY nivel_responsabilidad ASC, nombre ASC LIMIT 100
    `)
    res.json({ personal: rows })
  } catch (err) { next(err) }
})

// ── INICIALIZACIÓN MASIVA ─────────────────────────────────────────────────────

// POST /api/admin/nist/init-all
// Crea evaluación NIST activa para todas las empresas activas que aún no tienen una.
// Requiere X-Company-Slug de cualquier empresa válida (solo para pasar el middleware),
// pero opera en TODAS las empresas activas de la BD central.
router.post('/init-all', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id

    const [companies] = await centralDB.execute(
      `SELECT c.id, c.name FROM companies c
       WHERE c.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM nist_evaluations ne
           WHERE ne.company_id = c.id AND ne.status = 'activa'
         )`
    )

    let initialized = 0
    const errors = []

    for (const company of companies) {
      try {
        await getOrCreateEvaluation(company.id, userId)
        initialized++
      } catch (err) {
        errors.push({ id: company.id, name: company.name, error: err.message })
      }
    }

    res.json({
      initialized,
      skipped: errors.length,
      errors,
      message: `${initialized} empresa${initialized !== 1 ? 's' : ''} inicializada${initialized !== 1 ? 's' : ''}`
    })
  } catch (err) { next(err) }
})

module.exports = router
