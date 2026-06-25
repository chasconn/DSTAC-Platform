// routes/admin/marketing.js — envio manual, contacto por contacto, de correos
// de marketing/prospeccion. Solo DSTAC. Soporta varias campanas, cada una con
// su propia plantilla:
//   - exponor-2026: seguimiento a contactos conocidos en la feria Exponor
//   - pymes-chile:  prospeccion fria, candidatos encontrados via Google Places
const router  = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const centralDB = require('../../db/central')
const { sendMail } = require('../../services/emailService')
const { renderExponorEmail } = require('../../services/marketing/exponorTemplate')
const { renderPymesEmail } = require('../../services/marketing/pymesTemplate')
const { leerTarjeta } = require('../../services/marketing/cardOcr')
const { buscarEmpresas } = require('../../services/marketing/buscarEmpresas')

router.use(requireAuth, requireDstacRole)

const CAMPANAS = {
  'exponor-2026': {
    render: renderExponorEmail,
    asunto: (nombre) => `${nombre}, un gusto haberte conocido en Exponor — DSTAC`,
  },
  'pymes-chile': {
    render: renderPymesEmail,
    asunto: () => 'Ciberseguridad aplicada para tu empresa — DSTAC',
  },
}

function campanaValida(c) { return Object.prototype.hasOwnProperty.call(CAMPANAS, c) }

// ── Vista previa del HTML (no envia nada) ─────────────────────────────────────
router.post('/preview', (req, res) => {
  const { empresa, nombre, campana = 'exponor-2026' } = req.body || {}
  if (!campanaValida(campana)) return res.status(400).json({ error: 'Campaña inválida' })
  res.json({ html: CAMPANAS[campana].render({ empresa, nombre }) })
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

// ── Buscar empresas por rubro+ciudad (Google Places + correo del propio sitio) ─
router.post('/candidatos/buscar', async (req, res, next) => {
  try {
    const { rubro, ciudad } = req.body || {}
    if (!rubro?.trim() || !ciudad?.trim()) {
      return res.status(400).json({ error: 'Rubro y ciudad son obligatorios' })
    }
    const encontrados = await buscarEmpresas(rubro.trim(), ciudad.trim())

    let nuevos = 0
    for (const e of encontrados) {
      try {
        await centralDB.execute(
          `INSERT INTO marketing_candidatos (campana, empresa, sitio_web, email_sugerido, rubro, ciudad)
           VALUES ('pymes-chile', ?, ?, ?, ?, ?)`,
          [e.empresa, e.sitioWeb, e.email, e.rubro, e.ciudad]
        )
        nuevos++
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err // ya existia ese sitio web para esta campaña, se omite
      }
    }
    res.json({ encontrados: encontrados.length, nuevos })
  } catch (err) { next(err) }
})

// ── Listar candidatos pendientes de revision ──────────────────────────────────
router.get('/candidatos', async (req, res, next) => {
  try {
    const { campana = 'pymes-chile', estado = 'pendiente' } = req.query
    const [rows] = await centralDB.execute(
      `SELECT id, empresa, sitio_web, email_sugerido, rubro, ciudad, estado, created_at
         FROM marketing_candidatos WHERE campana = ? AND estado = ? ORDER BY id DESC`,
      [campana, estado]
    )
    res.json({ candidatos: rows })
  } catch (err) { next(err) }
})

// ── Descartar un candidato ────────────────────────────────────────────────────
router.post('/candidatos/:id/descartar', async (req, res, next) => {
  try {
    await centralDB.execute(`UPDATE marketing_candidatos SET estado = 'descartado' WHERE id = ?`, [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Enviar a un contacto y dejar registro (con el HTML exacto enviado) ────────
router.post('/enviar', async (req, res, next) => {
  try {
    const { empresa, nombre, email, campana = 'exponor-2026', candidatoId } = req.body || {}
    if (!campanaValida(campana)) return res.status(400).json({ error: 'Campaña inválida' })
    if (!empresa?.trim() || !email?.trim() || (campana === 'exponor-2026' && !nombre?.trim())) {
      return res.status(400).json({ error: 'Empresa y correo son obligatorios (y nombre, para Exponor)' })
    }

    const nombreFinal = nombre?.trim() || 'equipo'
    const { render, asunto } = CAMPANAS[campana]
    const html = render({ empresa, nombre: nombreFinal })

    try {
      await sendMail(email.trim(), asunto(nombreFinal), html)
      await centralDB.execute(
        `INSERT INTO marketing_envios (campana, empresa, contacto_nombre, contacto_email, estado, html_enviado, created_by)
         VALUES (?,?,?,?,'enviado',?,?)`,
        [campana, empresa.trim(), nombreFinal, email.trim(), html, req.user?.id || null]
      )
      if (candidatoId) {
        await centralDB.execute(`UPDATE marketing_candidatos SET estado = 'usado' WHERE id = ?`, [candidatoId])
      }
      res.json({ ok: true })
    } catch (sendErr) {
      await centralDB.execute(
        `INSERT INTO marketing_envios (campana, empresa, contacto_nombre, contacto_email, estado, error_detail, html_enviado, created_by)
         VALUES (?,?,?,?,'error',?,?,?)`,
        [campana, empresa.trim(), nombreFinal, email.trim(), String(sendErr.message).slice(0, 500), html, req.user?.id || null]
      )
      res.status(502).json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' })
    }
  } catch (err) { next(err) }
})

// ── Historial con busqueda y filtro de estado, por campana ───────────────────
router.get('/envios', async (req, res, next) => {
  try {
    const { q, estado, campana = 'exponor-2026' } = req.query
    const conditions = ['campana = ?']
    const params = [campana]
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
    const { campana = 'exponor-2026' } = req.query
    const ExcelJS = require('exceljs')
    const [rows] = await centralDB.execute(
      `SELECT empresa, contacto_nombre, contacto_email, estado, created_at
         FROM marketing_envios WHERE campana = ? ORDER BY id DESC`,
      [campana]
    )

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(campana)
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
    res.setHeader('Content-Disposition', `attachment; filename="dstac-${campana}-envios.xlsx"`)
    await wb.xlsx.write(res)
    res.end()
  } catch (err) { next(err) }
})

// ── HTML exacto que se envio a un contacto (para "Ver correo") ────────────────
router.get('/envios/:id/html', async (req, res, next) => {
  try {
    const { campana = 'exponor-2026' } = req.query
    const [[row]] = await centralDB.execute(
      'SELECT html_enviado FROM marketing_envios WHERE id = ? AND campana = ?',
      [req.params.id, campana]
    )
    if (!row) return res.status(404).json({ error: 'No encontrado' })
    res.json({ html: row.html_enviado })
  } catch (err) { next(err) }
})

module.exports = router
