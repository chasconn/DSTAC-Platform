const router = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')

router.use(requireAuth, requireClientRole, resolveTenant)

// ─── GET /api/client/personal/stats ──────────────────────────────────────────
// Debe ir antes de /:id para que Express no trate 'stats' como un id
router.get('/stats', async (req, res, next) => {
  try {
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        COUNT(*)                          AS total,
        SUM(estado = 'activo')            AS activos,
        SUM(estado = 'desvinculado')      AS desvinculados,
        SUM(estado = 'vacaciones')        AS en_vacaciones
      FROM personal
    `)
    res.json({
      total:         Number(row.total),
      activos:       Number(row.activos),
      desvinculados: Number(row.desvinculados),
      en_vacaciones: Number(row.en_vacaciones),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/client/personal ─────────────────────────────────────────────────
// Query params: search, estado, nivel_responsabilidad, page, limit
router.get('/', async (req, res, next) => {
  try {
    const { search, estado, nivel_responsabilidad, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const conditions = []
    const params = []

    if (search) {
      conditions.push('(nombre LIKE ? OR correo LIKE ? OR rol_empresarial LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (estado)               { conditions.push('estado = ?');               params.push(estado) }
    if (nivel_responsabilidad){ conditions.push('nivel_responsabilidad = ?'); params.push(nivel_responsabilidad) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await req.tenantDB.execute(`
      SELECT
        id, nombre, rol_empresarial, nivel_responsabilidad,
        estado, fecha_ingreso, correo, telefono,
        created_at, updated_at
      FROM personal
      ${where}
      ORDER BY
        FIELD(estado, 'activo', 'vacaciones', 'inactivo', 'desvinculado'),
        nombre ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await req.tenantDB.execute(
      `SELECT COUNT(*) AS total FROM personal ${where}`,
      params
    )

    res.json({ personal: rows, total, page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/client/personal/:id ────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[persona]] = await req.tenantDB.execute(
      'SELECT * FROM personal WHERE id = ?',
      [req.params.id]
    )
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' })
    res.json(persona)
  } catch (err) { next(err) }
})

module.exports = router
