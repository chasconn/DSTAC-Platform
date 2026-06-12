const router = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')

router.use(requireAuth, requireClientRole, resolveTenant)

// Enmascara el valor de una identidad si es api_key:
// muestra "••••••••" + últimos 4 caracteres
function enmascararValor(tipo, valor) {
  if (tipo === 'api_key' && valor) {
    return '••••••••' + valor.slice(-4)
  }
  return valor
}

// ─── GET /api/client/identidades/stats ───────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const hoy30 = 'DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        COUNT(*)                                                          AS total,
        SUM(estado = 'activa')                                           AS activas,
        SUM(estado = 'comprometida')                                     AS comprometidas,
        SUM(estado = 'expirada')                                         AS expiradas,
        SUM(fecha_expiracion BETWEEN CURDATE() AND ${hoy30}
            AND estado = 'activa')                                       AS por_vencer
      FROM identidades
    `)
    res.json({
      total:        Number(row.total),
      activas:      Number(row.activas),
      comprometidas: Number(row.comprometidas),
      expiradas:    Number(row.expiradas),
      por_vencer:   Number(row.por_vencer),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/client/identidades ─────────────────────────────────────────────
// Query params: search, tipo_identidad, estado, page, limit
router.get('/', async (req, res, next) => {
  try {
    const { search, tipo_identidad, estado, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const conditions = []
    const params = []

    if (search) {
      conditions.push('(i.nombre LIKE ? OR i.identidad LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }
    if (tipo_identidad) { conditions.push('i.tipo_identidad = ?'); params.push(tipo_identidad) }
    if (estado)         { conditions.push('i.estado = ?');         params.push(estado) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await req.tenantDB.execute(`
      SELECT
        i.id, i.nombre, i.identidad, i.tipo_identidad, i.origen,
        i.estado, i.fecha_expiracion, i.fecha_revision, i.created_at,
        p.nombre          AS propietario_nombre,
        p.rol_empresarial AS propietario_rol
      FROM identidades i
      LEFT JOIN personal p ON i.propietario_id = p.id
      ${where}
      ORDER BY
        FIELD(i.estado,'comprometida','expirada','pendiente','activa','inactiva'),
        i.nombre ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await req.tenantDB.execute(
      `SELECT COUNT(*) AS total FROM identidades i ${where}`,
      params
    )

    // Enmascarar api_keys antes de enviar al cliente
    const identidades = rows.map(row => ({
      ...row,
      identidad: enmascararValor(row.tipo_identidad, row.identidad),
    }))

    res.json({ identidades, total, page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/client/identidades/:id ─────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        i.*,
        p.nombre          AS propietario_nombre,
        p.rol_empresarial AS propietario_rol
      FROM identidades i
      LEFT JOIN personal p ON i.propietario_id = p.id
      WHERE i.id = ?
    `, [req.params.id])

    if (!row) return res.status(404).json({ error: 'Identidad no encontrada' })

    // Enmascarar api_key en el detalle también
    row.identidad = enmascararValor(row.tipo_identidad, row.identidad)

    res.json(row)
  } catch (err) { next(err) }
})

module.exports = router
