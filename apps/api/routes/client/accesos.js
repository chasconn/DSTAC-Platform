const router = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')

router.use(requireAuth, requireClientRole, resolveTenant)

// ─── POST /api/client/accesos/expirar ────────────────────────────────────────
// Marca como expirados los accesos cuya fecha_expiracion ya pasó.
// Se llama al cargar la página de accesos (igual que en el panel DSTAC).
router.post('/expirar', async (req, res, next) => {
  try {
    const [result] = await req.tenantDB.execute(`
      UPDATE accesos
      SET estado = 'expirado'
      WHERE fecha_expiracion < CURDATE()
        AND fecha_expiracion IS NOT NULL
        AND estado IN ('activo', 'pendiente_revision')
    `)
    res.json({ actualizados: result.affectedRows })
  } catch (err) { next(err) }
})

// ─── GET /api/client/accesos/stats ───────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const hoy30 = 'DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        COUNT(*)                                                              AS total,
        SUM(estado = 'activo')                                               AS activos,
        SUM(estado = 'expirado')                                             AS expirados,
        SUM(criticidad = 'critica' AND estado = 'activo')                    AS criticos,
        SUM(fecha_expiracion BETWEEN CURDATE() AND ${hoy30}
            AND estado IN ('activo','pendiente_revision'))                    AS por_vencer
      FROM accesos
    `)
    res.json({
      total:      Number(row.total),
      activos:    Number(row.activos),
      expirados:  Number(row.expirados),
      criticos:   Number(row.criticos),
      por_vencer: Number(row.por_vencer),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/client/accesos ──────────────────────────────────────────────────
// Query params: search, nivel_acceso, estado, criticidad, page, limit
router.get('/', async (req, res, next) => {
  try {
    const { search, nivel_acceso, estado, criticidad, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const conditions = []
    const params = []

    if (search) {
      conditions.push('(i.nombre LIKE ? OR i.identidad LIKE ? OR a.nombre LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (nivel_acceso) { conditions.push('ac.nivel_acceso = ?'); params.push(nivel_acceso) }
    if (estado)       { conditions.push('ac.estado = ?');       params.push(estado) }
    if (criticidad)   { conditions.push('ac.criticidad = ?');   params.push(criticidad) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await req.tenantDB.execute(`
      SELECT
        ac.id, ac.nivel_acceso, ac.entorno, ac.estado, ac.criticidad,
        ac.fecha_otorgamiento, ac.fecha_expiracion,
        i.nombre          AS identidad_nombre,
        i.identidad       AS identidad_valor,
        i.tipo_identidad,
        p.nombre          AS propietario_nombre,
        a.nombre          AS activo_nombre,
        a.tipo            AS activo_tipo
      FROM accesos ac
      JOIN identidades i  ON ac.identidad_id = i.id
      JOIN activos     a  ON ac.activo_id    = a.id
      LEFT JOIN personal p ON i.propietario_id = p.id
      ${where}
      ORDER BY
        FIELD(ac.criticidad,'critica','alta','media','baja'),
        FIELD(ac.estado,'expirado','pendiente_revision','activo','suspendido','inactivo'),
        ac.fecha_expiracion ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await req.tenantDB.execute(`
      SELECT COUNT(*) AS total
      FROM accesos ac
      JOIN identidades i  ON ac.identidad_id = i.id
      JOIN activos     a  ON ac.activo_id    = a.id
      LEFT JOIN personal p ON i.propietario_id = p.id
      ${where}
    `, params)

    res.json({ accesos: rows, total, page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/client/accesos/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[acceso]] = await req.tenantDB.execute(`
      SELECT
        ac.*,
        i.nombre          AS identidad_nombre,
        i.identidad       AS identidad_valor,
        i.tipo_identidad,
        p.nombre          AS propietario_nombre,
        p.rol_empresarial AS propietario_rol,
        a.nombre          AS activo_nombre,
        a.tipo            AS activo_tipo
      FROM accesos ac
      JOIN identidades i  ON ac.identidad_id = i.id
      JOIN activos     a  ON ac.activo_id    = a.id
      LEFT JOIN personal p ON i.propietario_id = p.id
      WHERE ac.id = ?
    `, [req.params.id])

    if (!acceso) return res.status(404).json({ error: 'Acceso no encontrado' })
    res.json(acceso)
  } catch (err) { next(err) }
})

module.exports = router
