// routes/client/certificados.js — Certificados de cumplimiento ya emitidos
// (aprobados por DSTAC) para la empresa del cliente autenticado. Las
// evaluaciones sin certificado_codigo (pendientes o sin emitir) no se listan.
const router = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB = require('../../db/central')

router.get('/', requireAuth, requireClientRole, resolveTenant, async (req, res, next) => {
  try {
    const [r1] = await centralDB.execute(
      `SELECT id, 'Ley N° 21.663 · Ciberseguridad' AS ley, '21663' AS ley_codigo, nivel, score_total, certificado_codigo, certificado_emitido_at
         FROM ley21663_evaluaciones WHERE company_id = ? AND certificado_codigo IS NOT NULL`,
      [req.company.id])
    const [r2] = await centralDB.execute(
      `SELECT id, 'Ley N° 21.719 · Protección de Datos' AS ley, '21719' AS ley_codigo, nivel, score_total, certificado_codigo, certificado_emitido_at
         FROM ley21719_evaluaciones WHERE company_id = ? AND certificado_codigo IS NOT NULL`,
      [req.company.id])
    const certificados = [...r1, ...r2].sort((a, b) => new Date(b.certificado_emitido_at) - new Date(a.certificado_emitido_at))
    res.json({ certificados })
  } catch (err) { next(err) }
})

module.exports = router
