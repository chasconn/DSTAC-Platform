// routes/admin/marketing.js — envio manual, contacto por contacto, de correos de
// seguimiento a empresas conocidas en ferias/eventos (ej. Exponor). Solo DSTAC.
const router  = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const centralDB = require('../../db/central')
const { sendMail } = require('../../services/emailService')
const { renderExponorEmail } = require('../../services/marketing/exponorTemplate')
const { leerTarjeta } = require('../../services/marketing/cardOcr')

router.use(requireAuth, requireDstacRole)

const CAMPANA = 'exponor-2026'

// ── Vista previa del HTML (no envia nada) ─────────────────────────────────────
router.post('/preview', (req, res) => {
  const { empresa, nombre } = req.body || {}
  res.json({ html: renderExponorEmail({ empresa, nombre }) })
})

// ── OCR de tarjeta de presentacion (foto desde el celular) ────────────────────
router.post('/escanear-tarjeta', async (req, res, next) => {
  try {
    const { imageDataUrl } = req.body || {}
    if (!imageDataUrl) return res.status(400).json({ error: 'Falta la imagen' })
    const resultado = await leerTarjeta(imageDataUrl)
    res.json(resultado)
  } catch (err) { next(err) }
})

// ── Enviar a un contacto y dejar registro (con el HTML exacto enviado) ────────
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
        `INSERT INTO marketing_envios (campana, empresa, contacto_nombre, contacto_email, estado, html_enviado, created_by)
         VALUES (?,?,?,?,'enviado',?,?)`,
        [CAMPANA, empresa.trim(), nombre.trim(), email.trim(), html, req.user?.id || null]
      )
      res.json({ ok: true })
    } catch (sendErr) {
      await centralDB.execute(
        `INSERT INTO marketing_envios (campana, empresa, contacto_nombre, contacto_email, estado, error_detail, html_enviado, created_by)
         VALUES (?,?,?,?,'error',?,?,?)`,
        [CAMPANA, empresa.trim(), nombre.trim(), email.trim(), String(sendErr.message).slice(0, 500), html, req.user?.id || null]
      )
      res.status(502).json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' })
    }
  } catch (err) { next(err) }
})

// ── Historial con busqueda y filtro de estado ─────────────────────────────────
router.get('/envios', async (req, res, next) => {
  try {
    const { q, estado } = req.query
    const conditions = ['campana = ?']
    const params = [CAMPANA]
    if (estado)        { conditions.push('estado = ?'); params.push(estado) }
    if (q && q.trim()) {
      conditions.push('(empresa LIKE ? OR contacto_nombre LIKE ? OR contacto_email LIKE ?)')
      const like = `%${q.trim()}%`
      params.push(like, like, like)
    }

    const [rows] = await centralDB.execute(
      `SELECT id, empresa, contacto_nombre, contacto_email, estado, created_at
         FROM marketing_envios
        WHERE ${conditions.join(' AND ')}
        ORDER BY id DESC`,
      params
    )
    res.json({ envios: rows })
  } catch (err) { next(err) }
})

// ── Excel con todo el historial de la campana ─────────────────────────────────
router.get('/envios/export', async (req, res, next) => {
  try {
    const ExcelJS = require('exceljs')
    const [rows] = await centralDB.execute(
      `SELECT empresa, contacto_nombre, contacto_email, estado, created_at
         FROM marketing_envios WHERE campana = ? ORDER BY id DESC`,
      [CAMPANA]
    )

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Exponor')
    ws.columns = [
      { header: 'Empresa',  key: 'empresa',         width: 32 },
      { header: 'Contacto', key: 'contacto_nombre', width: 26 },
      { header: 'Correo',   key: 'contacto_email',  width: 32 },
      { header: 'Estado',   key: 'estado',          width: 12 },
      { header: 'Fecha',    key: 'created_at',      width: 20 },
    ]
    ws.getRow(1).font = { bold: true }
    rows.forEach(r => ws.addRow(r))

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="dstac-exponor-envios.xlsx"')
    await wb.xlsx.write(res)
    res.end()
  } catch (err) { next(err) }
})

// ── HTML exacto que se envio a un contacto (para "Ver correo") ────────────────
router.get('/envios/:id/html', async (req, res, next) => {
  try {
    const [[row]] = await centralDB.execute(
      'SELECT html_enviado FROM marketing_envios WHERE id = ? AND campana = ?',
      [req.params.id, CAMPANA]
    )
    if (!row) return res.status(404).json({ error: 'No encontrado' })
    res.json({ html: row.html_enviado })
  } catch (err) { next(err) }
})

module.exports = router
