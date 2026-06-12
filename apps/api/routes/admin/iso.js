const router  = require('express').Router()
const path    = require('path')
const fs      = require('fs')
const multer  = require('multer')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                 = require('../../middleware/tenant')
const centralDB                         = require('../../db/central')
const { getOrCreateEvaluation, recalcularScores } = require('../../services/isoService')

// ── Multer para evidencias ISO ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(__dirname, '../../uploads/iso', req.company.slug)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    cb(null, `${Date.now()}_${base}${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

router.use(requireAuth, requireDstacRole, resolveTenant)

// ── EVALUACIONES ─────────────────────────────────────────────────────────────

router.get('/evaluacion', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT e.*, u.first_name, u.last_name, u.email AS evaluator_email
       FROM iso_evaluations e
       LEFT JOIN users u ON e.evaluator_id = u.id
       WHERE e.company_id = ? AND e.status = 'activa' LIMIT 1`,
      [req.company.id]
    )
    res.json({ evaluacion: rows[0] ?? null })
  } catch (err) { next(err) }
})

router.post('/evaluacion', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    await centralDB.execute(
      `UPDATE iso_evaluations SET status = 'archivada' WHERE company_id = ? AND status = 'activa'`,
      [companyId]
    )
    const evalId = await getOrCreateEvaluation(companyId, userId)
    res.json({ evaluacion_id: evalId, message: 'Evaluación creada' })
  } catch (err) { next(err) }
})

// ── DOMINIOS CON SCORES ───────────────────────────────────────────────────────

router.get('/domains', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [domains] = await centralDB.execute(`
      SELECT d.*,
             COUNT(ic.id)                                                  AS total_controls,
             ROUND(AVG(CASE WHEN ica.applies = 1 AND ica.status != 'no_aplica'
                            THEN ica.progress END), 1)                    AS score,
             SUM(CASE WHEN ica.status = 'implementado' THEN 1 ELSE 0 END) AS implementados,
             SUM(CASE WHEN ica.status = 'parcial'      THEN 1 ELSE 0 END) AS parciales,
             SUM(CASE WHEN ica.status = 'pendiente'    THEN 1 ELSE 0 END) AS pendientes,
             SUM(CASE WHEN ica.applies = 0             THEN 1 ELSE 0 END) AS no_aplica
      FROM iso_domains d
      LEFT JOIN iso_controls ic ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      GROUP BY d.id
      ORDER BY d.order_num
    `, [evalId])

    res.json({ domains, evaluation_id: evalId })
  } catch (err) { next(err) }
})

// ── CONTROLES CON FILTROS ─────────────────────────────────────────────────────

router.get('/controls', async (req, res, next) => {
  try {
    const { domain_id, status, data_source, q } = req.query
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    let where = 'WHERE 1=1'
    const params = [evalId]

    if (domain_id)   { where += ' AND ic.domain_id = ?';     params.push(domain_id) }
    if (status)      { where += ' AND ica.status = ?';       params.push(status) }
    if (data_source) { where += ' AND ic.data_source LIKE ?'; params.push(`%${data_source}%`) }
    if (q)           { where += ' AND (ic.id LIKE ? OR ic.name LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }

    const [controls] = await centralDB.execute(`
      SELECT ic.*, d.name AS domain_name, d.color AS domain_color,
             ica.id AS assessment_id, ica.status, ica.progress,
             ica.applies, ica.non_apply_reason,
             ica.checklist_items, ica.notes_dstac, ica.policy_content,
             ica.updated_at AS assessed_at,
             u.first_name AS updated_by_name
      FROM iso_controls ic
      JOIN iso_domains d ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      LEFT JOIN users u ON ica.updated_by = u.id
      ${where}
      ORDER BY d.order_num, ic.order_num
    `, params)

    res.json({ controls, evaluation_id: evalId })
  } catch (err) { next(err) }
})

router.get('/controls/:id', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [rows] = await centralDB.execute(`
      SELECT ic.*, d.name AS domain_name, d.color AS domain_color,
             ica.id AS assessment_id, ica.status, ica.progress,
             ica.applies, ica.non_apply_reason, ica.checklist_items,
             ica.notes_dstac, ica.policy_content, ica.updated_at AS assessed_at,
             u.first_name AS updated_by_name
      FROM iso_controls ic
      JOIN iso_domains d ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      LEFT JOIN users u ON ica.updated_by = u.id
      WHERE ic.id = ?
    `, [evalId, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Control no encontrado' })

    // Evidencias del control
    const [evidencias] = await centralDB.execute(`
      SELECT e.*, u.first_name AS uploaded_by_name
      FROM iso_evidences e
      LEFT JOIN users u ON e.uploaded_by = u.id
      WHERE e.control_id = ? AND e.company_id = ?
      ORDER BY e.created_at DESC LIMIT 10
    `, [req.params.id, companyId])

    res.json({ control: rows[0], evidencias, evaluation_id: evalId })
  } catch (err) { next(err) }
})

// ── ASSESSMENTS ───────────────────────────────────────────────────────────────

router.put('/assessments/:controlId', async (req, res, next) => {
  try {
    const { controlId } = req.params
    const { status, progress, applies, non_apply_reason, checklist_items, notes_dstac, comment } = req.body
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [ctrl] = await centralDB.execute(`SELECT id FROM iso_controls WHERE id = ?`, [controlId])
    if (!ctrl.length) return res.status(404).json({ error: 'Control no encontrado' })

    const [prev] = await centralDB.execute(
      `SELECT status, progress, applies, notes_dstac FROM iso_control_assessments
       WHERE evaluation_id = ? AND control_id = ?`,
      [evalId, controlId]
    )
    const previousData = prev[0] ?? null

    // Calcular progress desde checklist si se envía
    let computedProgress = progress ?? previousData?.progress ?? 0
    if (checklist_items && typeof checklist_items === 'object') {
      const items = Object.values(checklist_items)
      const done  = items.filter(Boolean).length
      computedProgress = items.length ? Math.round((done / items.length) * 100) : 0
    }

    // Derivar status desde progress si no se pasa explícito
    let computedStatus = status ?? previousData?.status ?? 'pendiente'
    const appliesToUse = applies !== undefined ? (applies ? 1 : 0) : (previousData?.applies ?? 1)

    if (appliesToUse === 0) {
      computedStatus = 'no_aplica'
      computedProgress = 0
    } else if (!status) {
      if (computedProgress === 100) computedStatus = 'implementado'
      else if (computedProgress > 0) computedStatus = 'parcial'
      else computedStatus = 'pendiente'
    }

    await centralDB.execute(`
      INSERT INTO iso_control_assessments
        (evaluation_id, control_id, applies, non_apply_reason, status, progress,
         checklist_items, notes_dstac, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        applies          = VALUES(applies),
        non_apply_reason = VALUES(non_apply_reason),
        status           = VALUES(status),
        progress         = VALUES(progress),
        checklist_items  = VALUES(checklist_items),
        notes_dstac      = VALUES(notes_dstac),
        updated_by       = VALUES(updated_by)
    `, [
      evalId, controlId, appliesToUse,
      non_apply_reason ?? previousData?.non_apply_reason ?? null,
      computedStatus, computedProgress,
      checklist_items ? JSON.stringify(checklist_items) : null,
      notes_dstac ?? previousData?.notes_dstac ?? null,
      userId
    ])

    await centralDB.execute(`
      INSERT INTO iso_history
        (evaluation_id, control_id, company_id, event_type, user_id, previous_data, new_data, comment)
      VALUES (?, ?, ?, 'control_actualizado', ?, ?, ?, ?)
    `, [evalId, controlId, companyId, userId,
        JSON.stringify(previousData),
        JSON.stringify({ status: computedStatus, progress: computedProgress, applies: appliesToUse }),
        comment ?? null])

    const scores = await recalcularScores(evalId)
    res.json({ success: true, progress: computedProgress, status: computedStatus, ...scores })
  } catch (err) { next(err) }
})

// ── SOA (Declaración de Aplicabilidad) ───────────────────────────────────────

router.get('/soa', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [rows] = await centralDB.execute(`
      SELECT ic.id, ic.name, ic.domain_id, d.name AS domain_name, d.color AS domain_color,
             ic.order_num,
             ica.applies, ica.non_apply_reason, ica.status, ica.progress
      FROM iso_controls ic
      JOIN iso_domains d ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      ORDER BY d.order_num, ic.order_num
    `, [evalId])

    const total    = rows.length
    const aplican  = rows.filter(r => r.applies !== 0).length
    const noAplica = total - aplican

    res.json({ soa: rows, stats: { total, aplican, no_aplica: noAplica }, evaluation_id: evalId })
  } catch (err) { next(err) }
})

router.put('/soa/:controlId', async (req, res, next) => {
  try {
    const { controlId } = req.params
    const { applies, non_apply_reason } = req.body
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    if (applies !== undefined) {
      const appliesToUse = applies ? 1 : 0
      const newStatus = appliesToUse === 0 ? 'no_aplica' : 'pendiente'

      await centralDB.execute(`
        INSERT INTO iso_control_assessments
          (evaluation_id, control_id, applies, non_apply_reason, status, progress)
        VALUES (?, ?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          applies          = VALUES(applies),
          non_apply_reason = VALUES(non_apply_reason),
          status           = CASE WHEN VALUES(applies) = 0 THEN 'no_aplica'
                                  WHEN status = 'no_aplica' THEN 'pendiente'
                                  ELSE status END
      `, [evalId, controlId, appliesToUse, non_apply_reason ?? null])

      await centralDB.execute(`
        INSERT INTO iso_history
          (evaluation_id, control_id, company_id, event_type, user_id, new_data, comment)
        VALUES (?, ?, ?, 'estado_cambiado', ?, ?, ?)
      `, [evalId, controlId, companyId, userId,
          JSON.stringify({ applies: appliesToUse, non_apply_reason: non_apply_reason ?? null }),
          non_apply_reason ?? null])

      await recalcularScores(evalId)
    }

    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── EVALUACIÓN DE RIESGOS ─────────────────────────────────────────────────────

router.get('/riesgos/stats', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [stats] = await centralDB.execute(`
      SELECT
        COUNT(*)                                         AS total,
        SUM(risk_category = 'critico')                  AS criticos,
        SUM(risk_category = 'alto')                     AS altos,
        SUM(risk_category = 'medio')                    AS medios,
        SUM(risk_category = 'bajo')                     AS bajos,
        SUM(treatment = 'mitigar')                      AS mitigar,
        SUM(treatment = 'aceptar')                      AS aceptar,
        SUM(treatment = 'transferir')                   AS transferir,
        SUM(treatment = 'evitar')                       AS evitar,
        SUM(status = 'abierto')                         AS abiertos,
        SUM(status = 'en_tratamiento')                  AS en_tratamiento,
        SUM(status = 'cerrado')                         AS cerrados
      FROM iso_risks WHERE company_id = ?
    `, [companyId])
    res.json({ stats: stats[0] })
  } catch (err) { next(err) }
})

router.get('/riesgos', async (req, res, next) => {
  try {
    const { status, risk_category, treatment, control_id, q } = req.query
    const companyId = req.company.id

    let where = 'WHERE r.company_id = ?'
    const params = [companyId]

    if (status)       { where += ' AND r.status = ?';        params.push(status) }
    if (risk_category){ where += ' AND r.risk_category = ?'; params.push(risk_category) }
    if (treatment)    { where += ' AND r.treatment = ?';     params.push(treatment) }
    if (control_id)   { where += ' AND r.control_id = ?';    params.push(control_id) }
    if (q)            { where += ' AND (r.asset_name LIKE ? OR r.threat LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }

    const [rows] = await centralDB.execute(`
      SELECT r.*, ic.name AS control_name, u.first_name AS created_by_name
      FROM iso_risks r
      LEFT JOIN iso_controls ic ON r.control_id = ic.id
      LEFT JOIN users u ON r.created_by = u.id
      ${where}
      ORDER BY r.risk_level DESC, r.created_at DESC
    `, params)

    res.json({ riesgos: rows })
  } catch (err) { next(err) }
})

router.post('/riesgos', async (req, res, next) => {
  try {
    const {
      asset_id, asset_name, threat, vulnerability,
      probability, impact, existing_controls,
      residual_probability, residual_impact,
      treatment, treatment_notes, control_id
    } = req.body

    if (!asset_name || !threat || !probability || !impact) {
      return res.status(400).json({ error: 'asset_name, threat, probability e impact son requeridos' })
    }
    if (probability < 1 || probability > 5 || impact < 1 || impact > 5) {
      return res.status(400).json({ error: 'probability e impact deben estar entre 1 y 5' })
    }

    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [result] = await centralDB.execute(`
      INSERT INTO iso_risks
        (evaluation_id, company_id, asset_id, asset_name, threat, vulnerability,
         probability, impact, existing_controls, residual_probability, residual_impact,
         treatment, treatment_notes, control_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [evalId, companyId, asset_id ?? null, asset_name, threat, vulnerability ?? null,
        probability, impact, existing_controls ?? null,
        residual_probability ?? null, residual_impact ?? null,
        treatment ?? 'mitigar', treatment_notes ?? null, control_id ?? null, userId])

    await centralDB.execute(`
      INSERT INTO iso_history
        (evaluation_id, control_id, company_id, event_type, user_id, new_data)
      VALUES (?, ?, ?, 'riesgo_agregado', ?, ?)
    `, [evalId, control_id ?? null, companyId, userId,
        JSON.stringify({ risk_id: result.insertId, asset_name, threat })])

    res.status(201).json({ id: result.insertId, message: 'Riesgo creado' })
  } catch (err) { next(err) }
})

router.put('/riesgos/:id', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [existing] = await centralDB.execute(
      `SELECT id FROM iso_risks WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!existing.length) return res.status(404).json({ error: 'Riesgo no encontrado' })

    const {
      asset_name, threat, vulnerability, probability, impact,
      existing_controls, residual_probability, residual_impact,
      treatment, treatment_notes, control_id, status
    } = req.body

    await centralDB.execute(`
      UPDATE iso_risks SET
        asset_name           = COALESCE(?, asset_name),
        threat               = COALESCE(?, threat),
        vulnerability        = COALESCE(?, vulnerability),
        probability          = COALESCE(?, probability),
        impact               = COALESCE(?, impact),
        existing_controls    = COALESCE(?, existing_controls),
        residual_probability = COALESCE(?, residual_probability),
        residual_impact      = COALESCE(?, residual_impact),
        treatment            = COALESCE(?, treatment),
        treatment_notes      = COALESCE(?, treatment_notes),
        control_id           = COALESCE(?, control_id),
        status               = COALESCE(?, status)
      WHERE id = ?
    `, [asset_name ?? null, threat ?? null, vulnerability ?? null,
        probability ?? null, impact ?? null, existing_controls ?? null,
        residual_probability ?? null, residual_impact ?? null,
        treatment ?? null, treatment_notes ?? null, control_id ?? null,
        status ?? null, req.params.id])

    const userId = req.user.user_id || req.user.id
    const [risk]  = await centralDB.execute(`SELECT evaluation_id, control_id FROM iso_risks WHERE id = ?`, [req.params.id])
    await centralDB.execute(`
      INSERT INTO iso_history
        (evaluation_id, control_id, company_id, event_type, user_id, new_data)
      VALUES (?, ?, ?, 'riesgo_actualizado', ?, ?)
    `, [risk[0].evaluation_id, risk[0].control_id, companyId, userId,
        JSON.stringify({ risk_id: Number(req.params.id) })])

    res.json({ success: true })
  } catch (err) { next(err) }
})

router.delete('/riesgos/:id', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [existing] = await centralDB.execute(
      `SELECT id FROM iso_risks WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!existing.length) return res.status(404).json({ error: 'Riesgo no encontrado' })
    await centralDB.execute(`DELETE FROM iso_risks WHERE id = ?`, [req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── POLÍTICAS ─────────────────────────────────────────────────────────────────

router.get('/politicas', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [rows] = await centralDB.execute(`
      SELECT ic.id, ic.name, ic.domain_id, d.name AS domain_name,
             ic.policy_template,
             ica.policy_content,
             CASE
               WHEN ica.policy_content IS NOT NULL AND LENGTH(TRIM(ica.policy_content)) > 0 THEN 'lista'
               WHEN ic.policy_template IS NOT NULL THEN 'borrador'
               ELSE 'sin_politica'
             END AS politica_status
      FROM iso_controls ic
      JOIN iso_domains d ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      WHERE ic.policy_template IS NOT NULL
      ORDER BY d.order_num, ic.order_num
    `, [evalId])

    res.json({ politicas: rows, evaluation_id: evalId })
  } catch (err) { next(err) }
})

router.put('/politicas/:controlId', async (req, res, next) => {
  try {
    const { controlId } = req.params
    const { policy_content } = req.body
    if (!policy_content) return res.status(400).json({ error: 'policy_content requerido' })

    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    await centralDB.execute(`
      INSERT INTO iso_control_assessments
        (evaluation_id, control_id, applies, status, progress, policy_content, updated_by)
      VALUES (?, ?, 1, 'pendiente', 0, ?, ?)
      ON DUPLICATE KEY UPDATE
        policy_content = VALUES(policy_content),
        updated_by     = VALUES(updated_by)
    `, [evalId, controlId, policy_content, userId])

    await centralDB.execute(`
      INSERT INTO iso_history
        (evaluation_id, control_id, company_id, event_type, user_id, new_data)
      VALUES (?, ?, ?, 'politica_guardada', ?, ?)
    `, [evalId, controlId, companyId, userId, JSON.stringify({ control_id: controlId })])

    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── EVIDENCIAS ────────────────────────────────────────────────────────────────

router.get('/evidencias', async (req, res, next) => {
  try {
    const { domain_id, control_id, status, q } = req.query
    const companyId = req.company.id

    let where = 'WHERE e.company_id = ?'
    const params = [companyId]

    if (control_id) { where += ' AND e.control_id = ?';         params.push(control_id) }
    if (status)     { where += ' AND e.status = ?';             params.push(status) }
    if (domain_id)  { where += ' AND ic.domain_id = ?';         params.push(domain_id) }
    if (q)          { where += ' AND e.original_name LIKE ?';   params.push(`%${q}%`) }

    const [rows] = await centralDB.execute(`
      SELECT e.*, ic.name AS control_name, ic.domain_id,
             d.name AS domain_name,
             u.first_name AS uploaded_by_name,
             r.first_name AS reviewed_by_name
      FROM iso_evidences e
      JOIN iso_controls ic ON e.control_id = ic.id
      JOIN iso_domains  d  ON ic.domain_id = d.id
      LEFT JOIN users u ON e.uploaded_by = u.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      ${where}
      ORDER BY e.created_at DESC
    `, params)

    // Stats
    const [stats] = await centralDB.execute(`
      SELECT
        COUNT(*)                           AS total,
        SUM(status = 'aprobada')           AS aprobadas,
        SUM(status = 'pendiente')          AS pendientes_revision,
        SUM(status = 'rechazada')          AS rechazadas
      FROM iso_evidences WHERE company_id = ?
    `, [companyId])

    res.json({ evidencias: rows, stats: stats[0] })
  } catch (err) { next(err) }
})

router.post('/evidencias', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' })

    const { control_id, comment, expires_at } = req.body
    if (!control_id) return res.status(400).json({ error: 'control_id requerido' })

    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [result] = await centralDB.execute(`
      INSERT INTO iso_evidences
        (evaluation_id, control_id, company_id, filename, original_name, file_type,
         file_size, file_path, status, uploaded_by, comments, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)
    `, [evalId, control_id, companyId, req.file.filename, req.file.originalname,
        req.file.mimetype, req.file.size, req.file.path,
        userId, comment ?? null, expires_at ?? null])

    await centralDB.execute(`
      INSERT INTO iso_history
        (evaluation_id, control_id, company_id, event_type, user_id, new_data)
      VALUES (?, ?, ?, 'evidencia_agregada', ?, ?)
    `, [evalId, control_id, companyId, userId,
        JSON.stringify({ filename: req.file.originalname, evidence_id: result.insertId })])

    res.status(201).json({ id: result.insertId, message: 'Evidencia subida' })
  } catch (err) { next(err) }
})

router.put('/evidencias/:id', async (req, res, next) => {
  try {
    const { status, comments } = req.body
    if (!['aprobada', 'rechazada', 'pendiente'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id

    const [evs] = await centralDB.execute(
      `SELECT * FROM iso_evidences WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!evs.length) return res.status(404).json({ error: 'Evidencia no encontrada' })

    await centralDB.execute(`
      UPDATE iso_evidences
      SET status = ?, reviewed_by = ?, reviewed_at = NOW(), comments = ?
      WHERE id = ?
    `, [status, userId, comments ?? evs[0].comments, req.params.id])

    const eventType = status === 'aprobada' ? 'evidencia_aprobada' : 'evidencia_rechazada'
    await centralDB.execute(`
      INSERT INTO iso_history
        (evaluation_id, control_id, company_id, event_type, user_id, previous_data, new_data, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [evs[0].evaluation_id, evs[0].control_id, companyId, eventType, userId,
        JSON.stringify({ status: evs[0].status }),
        JSON.stringify({ status }),
        comments ?? null])

    res.json({ success: true })
  } catch (err) { next(err) }
})

router.delete('/evidencias/:id', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [evs] = await centralDB.execute(
      `SELECT * FROM iso_evidences WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!evs.length) return res.status(404).json({ error: 'Evidencia no encontrada' })

    if (evs[0].file_path && fs.existsSync(evs[0].file_path)) {
      fs.unlinkSync(evs[0].file_path)
    }
    await centralDB.execute(`DELETE FROM iso_evidences WHERE id = ?`, [req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── HISTORIAL ─────────────────────────────────────────────────────────────────

router.get('/historial', async (req, res, next) => {
  try {
    const { domain_id, user_id, event_type, date_from, date_to, q } = req.query
    const companyId = req.company.id

    let where = 'WHERE h.company_id = ?'
    const params = [companyId]

    if (user_id)    { where += ' AND h.user_id = ?';         params.push(user_id) }
    if (event_type) { where += ' AND h.event_type = ?';      params.push(event_type) }
    if (date_from)  { where += ' AND h.created_at >= ?';     params.push(date_from) }
    if (date_to)    { where += ' AND h.created_at <= ?';     params.push(date_to + ' 23:59:59') }
    if (domain_id)  { where += ' AND ic.domain_id = ?';      params.push(domain_id) }
    if (q)          { where += ' AND (ic.name LIKE ? OR ic.id LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }

    const [rows] = await centralDB.execute(`
      SELECT h.*, ic.name AS control_name, ic.domain_id,
             d.name AS domain_name,
             u.first_name AS user_name, u.last_name AS user_last, u.role AS user_role
      FROM iso_history h
      LEFT JOIN iso_controls ic ON h.control_id = ic.id
      LEFT JOIN iso_domains  d  ON ic.domain_id  = d.id
      LEFT JOIN users u ON h.user_id = u.id
      ${where}
      ORDER BY h.created_at DESC
      LIMIT 200
    `, params)

    const [stats] = await centralDB.execute(`
      SELECT
        COUNT(*)                                          AS total_eventos,
        SUM(MONTH(created_at) = MONTH(NOW())
          AND YEAR(created_at) = YEAR(NOW()))             AS cambios_mes,
        COUNT(DISTINCT control_id)                        AS controles_modificados,
        SUM(event_type = 'evidencia_agregada')            AS evidencias_agregadas,
        COUNT(DISTINCT user_id)                           AS usuarios_activos
      FROM iso_history WHERE company_id = ?
    `, [companyId])

    res.json({ historial: rows, stats: stats[0] })
  } catch (err) { next(err) }
})

// ── PLAN DE ACCIÓN ────────────────────────────────────────────────────────────

router.get('/plan-accion', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [rows] = await centralDB.execute(`
      SELECT p.*, ic.name AS control_name, ic.domain_id, d.name AS domain_name
      FROM iso_action_plans p
      JOIN iso_controls ic ON p.control_id = ic.id
      JOIN iso_domains  d  ON ic.domain_id = d.id
      WHERE p.company_id = ?
      ORDER BY FIELD(p.priority,'critica','alta','media','baja'), p.due_date ASC
    `, [companyId])
    res.json({ plan: rows })
  } catch (err) { next(err) }
})

router.post('/plan-accion', async (req, res, next) => {
  try {
    const { control_id, priority, responsible, due_date, action, evidence_needed, comment_dstac } = req.body
    if (!control_id || !action) return res.status(400).json({ error: 'control_id y action son requeridos' })

    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [result] = await centralDB.execute(`
      INSERT INTO iso_action_plans
        (evaluation_id, control_id, company_id, priority, responsible, due_date, action, evidence_needed, comment_dstac)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [evalId, control_id, companyId, priority ?? 'media', responsible ?? null,
        due_date ?? null, action, evidence_needed ?? null, comment_dstac ?? null])

    res.status(201).json({ id: result.insertId, message: 'Tarea creada' })
  } catch (err) { next(err) }
})

router.put('/plan-accion/:id', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [existing] = await centralDB.execute(
      `SELECT id FROM iso_action_plans WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    )
    if (!existing.length) return res.status(404).json({ error: 'Tarea no encontrada' })

    const { priority, status, responsible, due_date, action, evidence_needed, comment_dstac } = req.body
    await centralDB.execute(`
      UPDATE iso_action_plans SET
        priority       = COALESCE(?, priority),
        status         = COALESCE(?, status),
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

router.post('/plan-accion/generar', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [controls] = await centralDB.execute(`
      SELECT ic.id, ic.name, ica.status, ica.progress
      FROM iso_control_assessments ica
      JOIN iso_controls ic ON ica.control_id = ic.id
      WHERE ica.evaluation_id = ?
        AND ica.status IN ('pendiente','parcial')
        AND ica.applies = 1
        AND ic.id NOT IN (
          SELECT control_id FROM iso_action_plans
          WHERE company_id = ? AND status NOT IN ('completada','cancelada')
        )
    `, [evalId, companyId])

    if (!controls.length) return res.json({ created: 0, message: 'No hay controles que requieran plan de acción' })

    let created = 0
    for (const c of controls) {
      await centralDB.execute(`
        INSERT INTO iso_action_plans
          (evaluation_id, control_id, company_id, priority, action, status)
        VALUES (?, ?, ?, ?, ?, 'pendiente')
      `, [evalId, c.id, companyId,
          c.status === 'pendiente' ? 'alta' : 'media',
          `Implementar control ${c.id}: ${c.name}`])
      created++
    }

    res.json({ created, message: `${created} tareas generadas` })
  } catch (err) { next(err) }
})

// ── STATS + INDICADOR DE BRECHA ───────────────────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const userId    = req.user.user_id || req.user.id
    const evalId    = await getOrCreateEvaluation(companyId, userId)

    const [domainScores] = await centralDB.execute(`
      SELECT d.id AS domain_id, d.name, d.color, d.order_num,
             COUNT(ic.id)                                                  AS controls_total,
             ROUND(AVG(CASE WHEN ica.applies = 1 AND ica.status != 'no_aplica'
                            THEN ica.progress END), 1)                    AS score,
             SUM(CASE WHEN ica.status = 'implementado' THEN 1 ELSE 0 END) AS controls_done,
             SUM(CASE WHEN ica.status = 'parcial'      THEN 1 ELSE 0 END) AS controls_partial
      FROM iso_domains d
      LEFT JOIN iso_controls ic ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = ?
      GROUP BY d.id
      ORDER BY d.order_num
    `, [evalId])

    const [counts] = await centralDB.execute(`
      SELECT
        SUM(CASE WHEN ica.status = 'implementado' THEN 1 ELSE 0 END) AS implementados,
        SUM(CASE WHEN ica.status = 'parcial'      THEN 1 ELSE 0 END) AS parciales,
        SUM(CASE WHEN ica.status = 'pendiente'    THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN ica.applies = 0             THEN 1 ELSE 0 END) AS no_aplica,
        SUM(CASE WHEN ica.status = 'implementado'
                  AND NOT EXISTS (
                    SELECT 1 FROM iso_evidences ie
                    WHERE ie.control_id = ica.control_id
                      AND ie.company_id = ? AND ie.status = 'aprobada'
                  ) THEN 1 ELSE 0 END)                                AS sin_evidencia
      FROM iso_control_assessments ica
      WHERE ica.evaluation_id = ?
    `, [companyId, evalId])

    const [evalRow] = await centralDB.execute(
      `SELECT score_total, gap_total FROM iso_evaluations WHERE id = ?`, [evalId]
    )

    res.json({
      evaluation_id: evalId,
      score_total:  evalRow[0]?.score_total ?? 0,
      gap_total:    evalRow[0]?.gap_total   ?? 100,
      por_dominio:  domainScores,
      ...counts[0]
    })
  } catch (err) { next(err) }
})

// ── DATOS CONECTADOS (BD operacional) ─────────────────────────────────────────

router.get('/data/activos', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(
      `SELECT id, nombre, tipo, criticidad, estado, ambiente FROM activos
       ORDER BY criticidad DESC, nombre ASC LIMIT 200`
    )
    res.json({ activos: rows })
  } catch (err) { next(err) }
})

router.get('/data/identidades', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(
      `SELECT id, nombre, identidad, tipo_identidad, estado, origen FROM identidades
       ORDER BY estado ASC, nombre ASC LIMIT 200`
    )
    res.json({ identidades: rows })
  } catch (err) { next(err) }
})

router.get('/data/accesos', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(`
      SELECT a.id, a.nivel_acceso, a.estado, a.criticidad,
             i.nombre AS identidad_nombre, ac.nombre AS activo_nombre
      FROM accesos a
      LEFT JOIN identidades i  ON a.identidad_id = i.id
      LEFT JOIN activos     ac ON a.activo_id    = ac.id
      ORDER BY a.criticidad DESC LIMIT 200
    `)
    res.json({ accesos: rows })
  } catch (err) { next(err) }
})

router.get('/data/personal', async (req, res, next) => {
  try {
    const [rows] = await req.tenantDB.execute(
      `SELECT id, nombre, rol_empresarial, nivel_responsabilidad, estado FROM personal
       ORDER BY nivel_responsabilidad ASC, nombre ASC LIMIT 200`
    )
    res.json({ personal: rows })
  } catch (err) { next(err) }
})

module.exports = router
