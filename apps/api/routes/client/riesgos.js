const router = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')
const { hasModule } = require('../../../../shared/plans')

router.use(requireAuth, requireClientRole, resolveTenant)

function requireRiesgos(req, res, next) {
  if (!hasModule(req.user.plan, 'riesgos')) {
    return res.status(403).json({ error: 'modulo_no_disponible', module: 'riesgos' })
  }
  next()
}

// GET /api/client/riesgos/stats
router.get('/stats', requireRiesgos, async (req, res, next) => {
  try {
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        COUNT(*)                          AS total,
        SUM(estado = 'abierto')           AS abiertos,
        SUM(estado = 'en_tratamiento')    AS en_tratamiento,
        SUM(estado = 'aceptado')          AS aceptados,
        SUM(estado = 'cerrado')           AS cerrados,
        SUM(nivel_riesgo = 'critico')     AS criticos,
        SUM(nivel_riesgo = 'alto')        AS altos
      FROM riesgos
    `)
    res.json({
      total:         Number(row.total),
      abiertos:      Number(row.abiertos),
      en_tratamiento:Number(row.en_tratamiento),
      aceptados:     Number(row.aceptados),
      cerrados:      Number(row.cerrados),
      criticos:      Number(row.criticos),
      altos:         Number(row.altos),
    })
  } catch (err) { next(err) }
})

// GET /api/client/riesgos
router.get('/', requireRiesgos, async (req, res, next) => {
  try {
    const { estado, nivel_riesgo, search, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const conditions = []
    const params = []

    if (estado)      { conditions.push('estado = ?');       params.push(estado)      }
    if (nivel_riesgo){ conditions.push('nivel_riesgo = ?'); params.push(nivel_riesgo)}
    if (search)      { conditions.push('(tipo LIKE ? OR descripcion LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await req.tenantDB.execute(`
      SELECT id, tipo, categoria, descripcion,
             probabilidad, impacto, nivel_riesgo, estado,
             responsable, fecha_identificacion, fecha_revision,
             controles_tratamientos,
             created_at
      FROM riesgos ${where}
      ORDER BY
        FIELD(nivel_riesgo,'critico','alto','medio','bajo','aceptable'),
        FIELD(estado,'abierto','en_tratamiento','aceptado','cerrado'),
        created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await req.tenantDB.execute(
      `SELECT COUNT(*) AS total FROM riesgos ${where}`, params
    )

    res.json({ riesgos: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// GET /api/client/riesgos/:id
router.get('/:id', requireRiesgos, async (req, res, next) => {
  try {
    const [[r]] = await req.tenantDB.execute('SELECT * FROM riesgos WHERE id = ?', [req.params.id])
    if (!r) return res.status(404).json({ error: 'Riesgo no encontrado' })
    res.json(r)
  } catch (err) { next(err) }
})

module.exports = router
