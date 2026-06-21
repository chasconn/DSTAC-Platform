// routes/admin/onboarding.js — Checklist de onboarding de clientes nuevos.
// El catálogo de pasos (onboarding_pasos) es el mismo para todas las
// empresas; el progreso (onboarding_progreso) es por empresa, para que cada
// cliente tenga su propio avance.
const router = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')
const centralDB = require('../../db/central')

router.use(requireAuth, requireDstacRole)
const uid = (req) => req.user.id || req.user.user_id

// Catálogo completo de pasos (no depende de la empresa).
router.get('/pasos', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`SELECT * FROM onboarding_pasos ORDER BY orden`)
    res.json({ pasos: rows })
  } catch (err) { next(err) }
})

// Progreso de la empresa activa: catálogo + estado completado/no por paso.
router.get('/', resolveTenant, async (req, res, next) => {
  try {
    const [pasos] = await centralDB.execute(`SELECT * FROM onboarding_pasos ORDER BY orden`)
    const [progreso] = await centralDB.execute(
      `SELECT paso_id, completado, completado_at, notas FROM onboarding_progreso WHERE company_id = ?`,
      [req.company.id])
    const porPaso = new Map(progreso.map(p => [p.paso_id, p]))
    res.json({
      pasos: pasos.map(p => ({ ...p, ...(porPaso.get(p.id) || { completado: 0, completado_at: null, notas: null }) })),
    })
  } catch (err) { next(err) }
})

// Marcar un paso completado/no completado para la empresa activa.
router.post('/:pasoId/toggle', resolveTenant, async (req, res, next) => {
  try {
    const { completado, notas } = req.body || {}
    await centralDB.execute(
      `INSERT INTO onboarding_progreso (company_id, paso_id, completado, completado_at, completado_por, notas)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE completado = ?, completado_at = ?, completado_por = ?, notas = ?`,
      [req.company.id, req.params.pasoId, completado ? 1 : 0, completado ? new Date() : null, uid(req), notas || null,
       completado ? 1 : 0, completado ? new Date() : null, uid(req), notas || null]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
