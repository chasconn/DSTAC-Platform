const router    = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB = require('../../db/central')

router.use(requireAuth, requireClientRole, resolveTenant)

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT co.id, co.numero, co.estado, co.total, co.neto, co.iva,
              co.forma_pago, co.plazo_ejecucion, co.created_at,
              (SELECT COUNT(*) FROM contratos ct WHERE ct.cotizacion_id = co.id) AS tiene_contrato
         FROM cotizaciones co
        WHERE co.company_id = ?
        ORDER BY co.created_at DESC`,
      [req.company.id]
    )
    res.json({ cotizaciones: rows })
  } catch (err) { next(err) }
})

module.exports = router
