const router = require('express').Router()
const centralDB = require('../db/central')
const { requireAuth, requireDstacRole } = require('../middleware/auth')

router.use(requireAuth, requireDstacRole)

// GET /api/pending/stats
router.get('/stats', async (req, res, next) => {
  try {
    const { company_id } = req.query
    const where  = company_id ? 'WHERE company_id = ?' : ''
    const params = company_id ? [company_id] : []

    const [[row]] = await centralDB.execute(`
      SELECT
        COUNT(*)                          AS total,
        SUM(status = 'pending')           AS pendientes,
        SUM(status = 'in_progress')       AS en_progreso,
        SUM(status = 'done')              AS completadas,
        SUM(priority = 'critical')        AS criticas,
        SUM(priority = 'high')            AS altas,
        SUM(due_date < CURDATE() AND status NOT IN ('done','cancelled')) AS vencidas
      FROM pending_tasks ${where}
    `, params)

    res.json({
      total:       Number(row.total),
      pendientes:  Number(row.pendientes),
      en_progreso: Number(row.en_progreso),
      completadas: Number(row.completadas),
      criticas:    Number(row.criticas),
      altas:       Number(row.altas),
      vencidas:    Number(row.vencidas),
    })
  } catch (err) { next(err) }
})

// GET /api/pending
router.get('/', async (req, res, next) => {
  try {
    const { company_id, status, priority, assigned_to, page = 1, limit = 30 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const conditions = []
    const params = []

    if (company_id)  { conditions.push('pt.company_id = ?');  params.push(company_id)  }
    if (status)      { conditions.push('pt.status = ?');       params.push(status)      }
    if (priority)    { conditions.push('pt.priority = ?');     params.push(priority)    }
    if (assigned_to) { conditions.push('pt.assigned_to = ?'); params.push(assigned_to) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await centralDB.execute(`
      SELECT
        pt.id, pt.title, pt.description, pt.priority, pt.status,
        pt.due_date, pt.created_at, pt.updated_at,
        c.name AS company_name, c.slug AS company_slug,
        CONCAT(ua.first_name, ' ', IFNULL(ua.last_name,'')) AS assigned_name,
        CONCAT(uc.first_name, ' ', IFNULL(uc.last_name,'')) AS created_by_name
      FROM pending_tasks pt
      LEFT JOIN companies c ON pt.company_id = c.id
      LEFT JOIN users ua    ON pt.assigned_to = ua.id
      LEFT JOIN users uc    ON pt.created_by  = uc.id
      ${where}
      ORDER BY
        FIELD(pt.priority,'critical','high','medium','low'),
        FIELD(pt.status,'pending','in_progress','done','cancelled'),
        pt.due_date ASC, pt.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await centralDB.execute(
      `SELECT COUNT(*) AS total FROM pending_tasks pt ${where}`, params
    )

    res.json({ tasks: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// GET /api/pending/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [[task]] = await centralDB.execute(`
      SELECT pt.*, c.name AS company_name, c.slug AS company_slug,
        CONCAT(ua.first_name, ' ', IFNULL(ua.last_name,'')) AS assigned_name,
        CONCAT(uc.first_name, ' ', IFNULL(uc.last_name,'')) AS created_by_name
      FROM pending_tasks pt
      LEFT JOIN companies c ON pt.company_id = c.id
      LEFT JOIN users ua    ON pt.assigned_to = ua.id
      LEFT JOIN users uc    ON pt.created_by  = uc.id
      WHERE pt.id = ?
    `, [req.params.id])

    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    res.json(task)
  } catch (err) { next(err) }
})

// POST /api/pending
router.post('/', async (req, res, next) => {
  try {
    const { company_id, title, description, priority, due_date, assigned_to } = req.body
    if (!company_id || !title || !priority) {
      return res.status(400).json({ error: 'Empresa, título y prioridad son requeridos' })
    }

    const createdBy = req.user.id || req.user.user_id

    const [result] = await centralDB.execute(`
      INSERT INTO pending_tasks (company_id, title, description, priority, due_date, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [company_id, title, description ?? null, priority, due_date ?? null, assigned_to ?? null, createdBy])

    res.status(201).json({ id: result.insertId })
  } catch (err) { next(err) }
})

// PUT /api/pending/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, priority, status, due_date, assigned_to } = req.body
    const fields = []
    const params = []

    if (title       !== undefined) { fields.push('title = ?');       params.push(title)                }
    if (description !== undefined) { fields.push('description = ?'); params.push(description)          }
    if (priority    !== undefined) { fields.push('priority = ?');    params.push(priority)             }
    if (status      !== undefined) { fields.push('status = ?');      params.push(status)               }
    if (due_date    !== undefined) { fields.push('due_date = ?');    params.push(due_date || null)      }
    if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to || null)  }

    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' })

    params.push(req.params.id)
    await centralDB.execute(`UPDATE pending_tasks SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json({ message: 'Tarea actualizada' })
  } catch (err) { next(err) }
})

// DELETE /api/pending/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await centralDB.execute('DELETE FROM pending_tasks WHERE id = ?', [req.params.id])
    res.json({ message: 'Tarea eliminada' })
  } catch (err) { next(err) }
})

module.exports = router
