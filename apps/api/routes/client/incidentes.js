const router = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')
const { hasModule } = require('../../../../shared/plans')

router.use(requireAuth, requireClientRole, resolveTenant)

// Verificar que el plan incluye el módulo de incidentes
function requireIncidentes(req, res, next) {
  if (!hasModule(req.user.plan, 'incidentes')) {
    return res.status(403).json({ error: 'modulo_no_disponible', module: 'incidentes' })
  }
  next()
}

// GET /api/client/incidentes/stats
router.get('/stats', requireIncidentes, async (req, res, next) => {
  try {
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        COUNT(*)                         AS total,
        SUM(estado = 'abierto')          AS abiertos,
        SUM(estado = 'en_investigacion') AS en_investigacion,
        SUM(estado = 'en_respuesta')     AS en_respuesta,
        SUM(estado = 'cerrado')          AS cerrados,
        SUM(severidad = 'critica')       AS criticos
      FROM incidentes
    `)
    res.json({
      total:            Number(row.total),
      abiertos:         Number(row.abiertos),
      en_investigacion: Number(row.en_investigacion),
      en_respuesta:     Number(row.en_respuesta),
      cerrados:         Number(row.cerrados),
      criticos:         Number(row.criticos),
    })
  } catch (err) { next(err) }
})

// GET /api/client/incidentes
router.get('/', requireIncidentes, async (req, res, next) => {
  try {
    const { estado, severidad, search, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const conditions = []
    const params = []

    if (estado)   { conditions.push('estado = ?');   params.push(estado)   }
    if (severidad){ conditions.push('severidad = ?'); params.push(severidad)}
    if (search)   { conditions.push('(tipo LIKE ? OR descripcion LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await req.tenantDB.execute(`
      SELECT id, tipo, categoria, estado, severidad, impacto,
             fecha_deteccion, fecha_respuesta, descripcion, responsable,
             created_at
      FROM incidentes ${where}
      ORDER BY
        FIELD(severidad,'critica','alta','media','baja'),
        FIELD(estado,'abierto','en_investigacion','en_respuesta','cerrado','falso_positivo'),
        created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await req.tenantDB.execute(
      `SELECT COUNT(*) AS total FROM incidentes ${where}`, params
    )

    res.json({ incidentes: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// GET /api/client/incidentes/:id
router.get('/:id', requireIncidentes, async (req, res, next) => {
  try {
    const [[inc]] = await req.tenantDB.execute('SELECT * FROM incidentes WHERE id = ?', [req.params.id])
    if (!inc) return res.status(404).json({ error: 'Incidente no encontrado' })
    res.json(inc)
  } catch (err) { next(err) }
})

module.exports = router
