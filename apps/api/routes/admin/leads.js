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

// PATCH /api/admin/leads/:id  { estado?, company_id? }
// company_id se usa al convertir el prospecto en cliente (lo enlaza con la empresa creada).
router.patch('/:id', async (req, res, next) => {
  try {
    const { estado, company_id } = req.body
    const fields = [], params = []

    if (estado !== undefined) {
      if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
      fields.push('estado = ?'); params.push(estado)
    }
    if (company_id !== undefined) { fields.push('company_id = ?'); params.push(company_id || null) }

    if (!fields.length) return res.status(400).json({ error: 'Nada que actualizar' })

    params.push(req.params.id)
    const [r] = await centralDB.execute(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params)
    if (!r.affectedRows) return res.status(404).json({ error: 'Prospecto no encontrado' })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

module.exports = router
