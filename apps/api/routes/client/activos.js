const router = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')

// Aplicar auth + tenant a todas las rutas de este módulo
router.use(requireAuth, requireClientRole, resolveTenant)

// ─── GET /api/client/activos/stats ───────────────────────────────────────────
// stats antes que /:id para que Express no trate 'stats' como un id
router.get('/stats', async (req, res, next) => {
  try {
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        COUNT(*)                              AS total,
        SUM(criticidad = 'critica')           AS criticos,
        SUM(estado = 'degradado')             AS degradados,
        SUM(estado = 'fuera_de_servicio')     AS fuera_servicio,
        SUM(estado = 'operativo')             AS operativos
      FROM activos
    `)
    res.json({
      total:          Number(row.total),
      criticos:       Number(row.criticos),
      degradados:     Number(row.degradados),
      fuera_servicio: Number(row.fuera_servicio),
      operativos:     Number(row.operativos),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/client/activos ──────────────────────────────────────────────────
// Query params: search, tipo, criticidad, estado, ambiente, page, limit
router.get('/', async (req, res, next) => {
  try {
    const { search, tipo, criticidad, estado, ambiente, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const conditions = []
    const params = []

    if (search) {
      conditions.push('(a.nombre LIKE ? OR a.proveedor LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }
    if (tipo)       { conditions.push('a.tipo = ?');        params.push(tipo) }
    if (criticidad) { conditions.push('a.criticidad = ?');  params.push(criticidad) }
    if (estado)     { conditions.push('a.estado = ?');      params.push(estado) }
    if (ambiente)   { conditions.push('a.ambiente = ?');    params.push(ambiente) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await req.tenantDB.execute(`
      SELECT
        a.id, a.tipo, a.nombre, a.proveedor, a.estado, a.criticidad,
        a.ambiente, a.proyecto, a.documentacion, a.metadata,
        a.created_at, a.updated_at,
        p.nombre AS responsable_nombre
      FROM activos a
      LEFT JOIN personal p ON a.responsable_id = p.id
      ${where}
      ORDER BY
        FIELD(a.criticidad,'critica','alta','media','baja'),
        a.nombre ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await req.tenantDB.execute(
      `SELECT COUNT(*) AS total FROM activos a ${where}`,
      params
    )

    // Aplanar campos de metadata para el frontend
    const activos = rows.map(row => ({
      ...row,
      ip:                row.metadata?.ip                ?? null,
      sistema_operativo: row.metadata?.sistema_operativo ?? null,
      version:           row.metadata?.version           ?? null,
    }))

    res.json({ activos, total, page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/client/activos/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[activo]] = await req.tenantDB.execute(`
      SELECT a.*, p.nombre AS responsable_nombre
      FROM activos a
      LEFT JOIN personal p ON a.responsable_id = p.id
      WHERE a.id = ?
    `, [req.params.id])

    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' })

    activo.ip                = activo.metadata?.ip                ?? null
    activo.sistema_operativo = activo.metadata?.sistema_operativo ?? null
    activo.version           = activo.metadata?.version           ?? null

    res.json(activo)
  } catch (err) { next(err) }
})

module.exports = router
