// Gestión de prospectos (leads) — panel interno DSTAC.
const router = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')

router.use(requireAuth, requireDstacRole)

const ESTADOS = ['nuevo', 'contactado', 'convertido', 'descartado']

// GET /api/admin/leads?tipo=&estado=
router.get('/', async (req, res, next) => {
  try {
    const { tipo, estado } = req.query
    const where = [], params = []
    if (tipo)   { where.push('tipo = ?');   params.push(tipo) }
    if (estado) { where.push('estado = ?'); params.push(estado) }
    const [rows] = await centralDB.execute(
      `SELECT id, tipo, empresa, contacto_nombre, email, telefono, dominio,
              score, grade, risk, estado, company_id, created_at
       FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY created_at DESC, id DESC`,
      params
    )
    // contadores por estado (para badges del panel)
    const [counts] = await centralDB.execute(
      `SELECT estado, COUNT(*) AS n FROM leads GROUP BY estado`
    )
    res.json({ leads: rows, counts })
  } catch (e) { next(e) }
})

// GET /api/admin/leads/:id  (incluye data JSON con el detalle del scan/cuestionario)
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute('SELECT * FROM leads WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Prospecto no encontrado' })
    const lead = rows[0]
    if (typeof lead.data === 'string') { try { lead.data = JSON.parse(lead.data) } catch {} }
    res.json(lead)
  } catch (e) { next(e) }
})

// PATCH /api/admin/leads/:id  { estado }
router.patch('/:id', async (req, res, next) => {
  try {
    const { estado } = req.body
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
    const [r] = await centralDB.execute('UPDATE leads SET estado = ? WHERE id = ?', [estado, req.params.id])
    if (!r.affectedRows) return res.status(404).json({ error: 'Prospecto no encontrado' })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

module.exports = router
