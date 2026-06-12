const router = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireClientRole } = require('../../middleware/auth')

const DEFAULT_LAYOUT = {
  rows: [
    ['score', 'incidentes'],
    'nist',
    'activos-ident',
  ],
}

// GET /api/client/dashboard/layout
router.get('/layout', requireAuth, requireClientRole, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id

    let rows = []
    try {
      ;[rows] = await centralDB.execute(
        'SELECT widgets_config FROM dashboard_layouts WHERE user_id = ?',
        [userId]
      )
    } catch {
      // dashboard_layouts table may not exist yet → use default
      return res.json({ layout: DEFAULT_LAYOUT, variants: {}, es_default: true })
    }

    if (rows.length === 0) {
      return res.json({ layout: DEFAULT_LAYOUT, variants: {}, es_default: true })
    }

    const raw = typeof rows[0].widgets_config === 'string'
      ? JSON.parse(rows[0].widgets_config)
      : rows[0].widgets_config

    // Detecta formato y normaliza al nuevo modelo { rows }
    let layout, variants = {}
    if (Array.isArray(raw?.rows)) {
      // Nuevo: { rows: [...] }
      layout   = { rows: raw.rows }
      variants = raw.variants ?? {}
    } else if (raw?.col_left || raw?.col_right) {
      // Legacy: { col_left, col_right } → convertir a filas en el frontend (devolver tal cual)
      layout   = { col_left: raw.col_left ?? [], col_right: raw.col_right ?? [] }
      variants = raw.variants ?? {}
    } else if (raw?.layout?.rows) {
      layout   = { rows: raw.layout.rows }
      variants = raw.variants ?? {}
    } else if (raw?.layout?.col_left || raw?.layout?.col_right) {
      layout   = raw.layout
      variants = raw.variants ?? {}
    } else {
      layout   = DEFAULT_LAYOUT
      variants = raw?.variants ?? {}
    }

    res.json({ layout, variants, es_default: false })
  } catch (err) {
    console.error('Error obteniendo layout:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/client/dashboard/layout
router.post('/layout', requireAuth, requireClientRole, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id
    const { layout, variants = {} } = req.body

    // Acepta nuevo { rows } o legacy { col_left, col_right }
    const isRows   = Array.isArray(layout?.rows)
    const isLegacy = layout?.col_left || layout?.col_right || Array.isArray(layout)
    if (!isRows && !isLegacy) {
      return res.status(400).json({ error: 'Layout inválido' })
    }

    const toStore = isRows
      ? { rows: layout.rows, variants }
      : { col_left: layout.col_left ?? [], col_right: layout.col_right ?? [], variants }

    try {
      await centralDB.execute(
        `INSERT INTO dashboard_layouts (user_id, widgets_config)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE widgets_config = VALUES(widgets_config)`,
        [userId, JSON.stringify(toStore)]
      )
    } catch {
      // dashboard_layouts table may not exist yet — silently ignore
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Error guardando layout:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/client/theme
router.get('/theme', requireAuth, requireClientRole, async (req, res) => {
  try {
    const companyId = req.user.company_id

    if (!companyId) {
      // Usuario DSTAC sin empresa → devolver tema por defecto
      return res.json({ theme_color: '#3C3489', theme_light: '#EEEDFE', theme_mid: '#534AB7' })
    }

    const [rows] = await centralDB.execute(
      'SELECT theme_color, theme_light, theme_mid FROM companies WHERE id = ?',
      [companyId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    res.json(rows[0])
  } catch (err) {
    console.error('Error obteniendo tema:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
