// routes/admin/marketing.js — envio manual, contacto por contacto, de correos de
// seguimiento a empresas conocidas en ferias/eventos (ej. Exponor). Solo DSTAC.
const router  = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const centralDB = require('../../db/central')
const { sendMail } = require('../../services/emailService')
const { renderExponorEmail } = require('../../services/marketing/exponorTemplate')

router.use(requireAuth, requireDstacRole)

const CAMPANA = 'exponor-2026'

// ── Vista previa del HTML (no envia nada) ─────────────────────────────────────
router.post('/preview', (req, res) => {
  const { empresa, nombre } = req.body || {}
  res.json({ html: renderExponorEmail({ empresa, nombre }) })
})

// ── Enviar a un contacto y dejar registro ─────────────────────────────────────
router.post('/enviar', async (req, res, next) => {
  try {
    const { empresa, nombre, email } = req.body || {}
    if (!empresa?.trim() || !nombre?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Empresa, nombre y correo son obligatorios' })
    }

    const html = renderExponorEmail({ empresa, nombre })
    const asunto = `${nombre}, un gusto haberte conocido en Exponor — DSTAC`

    try {
      await sendMail(email.trim(), asunto, html)
      await centralDB.execute(
        `INSERT INTO marketing_envios (campana, empresa, contacto_nombre, contacto_email, estado, created_by)
         VALUES (?,?,?,?,'enviado',?)`,
        [CAMPANA, empresa.trim(), nombre.trim(), email.trim(), req.user?.id || null]
      )
      res.json({ ok: true })
    } catch (sendErr) {
      await centralDB.execute(
        `INSERT INTO marketing_envios (campana, empresa, contacto_nombre, contacto_email, estado, error_detail, created_by)
         VALUES (?,?,?,?,'error',?,?)`,
        [CAMPANA, empresa.trim(), nombre.trim(), email.trim(), String(sendErr.message).slice(0, 500), req.user?.id || null]
      )
      res.status(502).json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' })
    }
  } catch (err) { next(err) }
})

// ── Historial de envios de la campana ─────────────────────────────────────────
router.get('/envios', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, empresa, contacto_nombre, contacto_email, estado, created_at
         FROM marketing_envios
        WHERE campana = ?
        ORDER BY id DESC`,
      [CAMPANA]
    )
    res.json({ envios: rows })
  } catch (err) { next(err) }
})

module.exports = router
