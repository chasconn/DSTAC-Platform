const router    = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')

const PUEDE_VER_INTERNO = ['super_admin', 'admin_dstac']

// GET /api/admin/empresas/selector
router.get('/selector', requireAuth, requireDstacRole, async (req, res, next) => {
  try {
    const { role } = req.user

    let internas = []
    if (PUEDE_VER_INTERNO.includes(role)) {
      const [rows] = await centralDB.execute(
        `SELECT c.id, c.name, c.slug, c.status, c.is_internal, c.theme_color,
                p.name AS plan_name
         FROM companies c
         LEFT JOIN plans p ON c.plan_id = p.id
         WHERE c.is_internal = 1
         ORDER BY c.name ASC`
      )
      internas = rows
    }

    const [clientes] = await centralDB.execute(
      `SELECT c.id, c.name, c.slug, c.status, c.is_internal, c.theme_color,
              p.name AS plan_name
       FROM companies c
       LEFT JOIN plans p ON c.plan_id = p.id
       WHERE c.is_internal = 0
       ORDER BY c.name ASC`
    )

    res.json({ internas, clientes })
  } catch (err) {
    next(err)
  }
})

module.exports = router
