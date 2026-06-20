// routes/admin/phishing.js — Simulaciones de phishing para concientización del personal.
// Solo DSTAC. Empresa desde X-Company-Slug (resolveTenant → req.company / req.tenantDB).
const router = require('express').Router()
const { v4: uuidv4 } = require('uuid')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')
const centralDB = require('../../db/central')
const { registrarActividad } = require('../../utils/activityLogger')
const { sendMail } = require('../../services/emailService')
const { PLANTILLAS, porId, resolverAsunto } = require('../../services/phishing/content')

router.use(requireAuth, requireDstacRole, resolveTenant)
const uid = (req) => req.user.id || req.user.user_id
// Sin APP_URL configurada en el entorno, el link caería a localhost
// (inalcanzable para el destinatario real) — se usa el dominio de producción
// como respaldo en vez de localhost, que nunca es correcto fuera de dev local.
const APP_URL = process.env.APP_URL || 'https://portal.dstac.cl'
// Buzón compartido dedicado al phishing (ej. soporte-ti@dstac.cl), para no
// enviar siempre desde la casilla personal del admin. Necesita permiso
// "Enviar como" en M365. Sin configurar, cae al buzón general (MAIL_FROM).
const PHISHING_MAIL_FROM = process.env.PHISHING_MAIL_FROM || null

router.get('/plantillas', (req, res) => {
  res.json({ plantillas: PLANTILLAS.map(p => ({ id: p.id, nombre: p.nombre, asunto: resolverAsunto(p, '') })) })
})

// Campañas de la empresa activa, con conteo de enviados/abiertos/clics/reportes/quiz.
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT c.id, c.nombre, c.plantilla_id, c.estado, c.recurrente, c.proxima_ejecucion, c.enviado_at, c.created_at,
        COUNT(d.id) AS total,
        SUM(d.enviado_at IS NOT NULL) AS enviados,
        SUM(d.abierto_at IS NOT NULL) AS abiertos,
        SUM(d.clic_at IS NOT NULL) AS clics,
        SUM(d.reportado_at IS NOT NULL) AS reportados,
        SUM(d.quiz_completado_at IS NOT NULL) AS quiz_completados
      FROM phishing_campanas c
      LEFT JOIN phishing_destinatarios d ON d.campana_id = c.id
      WHERE c.company_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC, c.id DESC
    `, [req.company.id])
    res.json({ campanas: rows })
  } catch (err) { next(err) }
})

// Ranking por área/cargo (acumulado de todas las campañas de la empresa) —
// para saber qué áreas necesitan más capacitación en concientización.
router.get('/ranking-areas', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT COALESCE(d.cargo, 'Sin área registrada') AS cargo,
        COUNT(*) AS total,
        SUM(d.clic_at IS NOT NULL) AS clics,
        SUM(d.reportado_at IS NOT NULL) AS reportados
      FROM phishing_destinatarios d
      JOIN phishing_campanas c ON c.id = d.campana_id
      WHERE c.company_id = ? AND d.enviado_at IS NOT NULL
      GROUP BY cargo
      ORDER BY (SUM(d.clic_at IS NOT NULL) / COUNT(*)) DESC
    `, [req.company.id])
    res.json({
      areas: rows.map(r => ({
        cargo: r.cargo, total: Number(r.total),
        clics: Number(r.clics), reportados: Number(r.reportados),
        tasa_clic: r.total ? Math.round((Number(r.clics) / r.total) * 100) : 0,
      })),
    })
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const [[c]] = await centralDB.query(
      `SELECT * FROM phishing_campanas WHERE id = ? AND company_id = ?`, [req.params.id, req.company.id])
    if (!c) return res.status(404).json({ error: 'Campaña no encontrada' })
    const [destinatarios] = await centralDB.execute(
      `SELECT id, nombre, cargo, correo, enviado_at, abierto_at, clic_at, reportado_at, quiz_completado_at, quiz_respuestas, error
       FROM phishing_destinatarios WHERE campana_id = ? ORDER BY id`, [c.id])
    res.json({ ...c, destinatarios })
  } catch (err) { next(err) }
})

// Crea la campaña (borrador) a partir de personal de la empresa activa.
router.post('/', async (req, res, next) => {
  try {
    const { nombre, plantilla_id, personal_ids, recurrente } = req.body || {}
    if (!nombre?.trim()) return res.status(400).json({ error: 'Indica un nombre para la campaña' })
    if (!porId(plantilla_id)) return res.status(400).json({ error: 'Plantilla inválida' })
    if (!Array.isArray(personal_ids) || personal_ids.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos una persona' })
    }

    const [personas] = await req.tenantDB.query(
      `SELECT id, nombre, correo, rol_empresarial FROM personal WHERE id IN (?) AND correo IS NOT NULL AND correo != ''`,
      [personal_ids]
    )
    if (!personas.length) return res.status(400).json({ error: 'Ninguna de las personas seleccionadas tiene correo registrado' })

    const esRecurrente = !!recurrente
    const proximaEjecucion = esRecurrente
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null

    const [r] = await centralDB.execute(
      `INSERT INTO phishing_campanas (company_id, nombre, plantilla_id, created_by, recurrente, personal_ids, proxima_ejecucion)
       VALUES (?,?,?,?,?,?,?)`,
      [req.company.id, nombre.trim().slice(0, 255), plantilla_id, uid(req), esRecurrente ? 1 : 0, JSON.stringify(personal_ids), proximaEjecucion]
    )
    const campanaId = r.insertId
    for (const p of personas) {
      await centralDB.execute(
        `INSERT INTO phishing_destinatarios (campana_id, nombre, cargo, correo, token) VALUES (?,?,?,?,?)`,
        [campanaId, p.nombre || null, p.rol_empresarial || null, p.correo, uuidv4()]
      )
    }

    await registrarActividad({
      req, accion: 'crear', modulo: 'phishing',
      descripcion: `Creó la campaña de phishing "${nombre.trim()}" (${personas.length} destinatarios)${esRecurrente ? ' · recurrente mensual' : ''}`,
      entidad_id: campanaId, company_id: req.company.id,
    })
    res.status(201).json({ id: campanaId, destinatarios: personas.length })
  } catch (err) { next(err) }
})

// Envía los correos pendientes de la campaña (Microsoft Graph).
router.post('/:id/enviar', async (req, res, next) => {
  try {
    const [[c]] = await centralDB.query(
      `SELECT * FROM phishing_campanas WHERE id = ? AND company_id = ?`, [req.params.id, req.company.id])
    if (!c) return res.status(404).json({ error: 'Campaña no encontrada' })
    const plantilla = porId(c.plantilla_id)
    if (!plantilla) return res.status(400).json({ error: 'Plantilla de la campaña ya no existe' })

    const [pendientes] = await centralDB.execute(
      `SELECT id, nombre, correo, token FROM phishing_destinatarios WHERE campana_id = ? AND enviado_at IS NULL`, [c.id]
    )
    const [[empresa]] = await centralDB.query(`SELECT name FROM companies WHERE id = ?`, [req.company.id])

    let enviados = 0, errores = 0
    for (const d of pendientes) {
      const link = `${APP_URL}/api/public/phishing/c/${d.token}`
      const reportLink = `${APP_URL}/api/public/phishing/r/${d.token}`
      const html = plantilla.render({ nombre: d.nombre, empresa: empresa?.name, link, reportLink, correo: d.correo })
        + `<img src="${APP_URL}/api/public/phishing/o/${d.token}" width="1" height="1" style="display:none" alt="">`
      try {
        await sendMail(d.correo, resolverAsunto(plantilla, d.nombre), html, [], PHISHING_MAIL_FROM)
        await centralDB.execute(`UPDATE phishing_destinatarios SET enviado_at = NOW(), error = NULL WHERE id = ?`, [d.id])
        enviados++
      } catch (e) {
        await centralDB.execute(`UPDATE phishing_destinatarios SET error = ? WHERE id = ?`, [String(e.message || e).slice(0, 500), d.id])
        errores++
      }
    }
    await centralDB.execute(
      `UPDATE phishing_campanas SET estado = 'enviada', enviado_at = COALESCE(enviado_at, NOW()) WHERE id = ?`, [c.id]
    )

    await registrarActividad({
      req, accion: 'editar', modulo: 'phishing',
      descripcion: `Envió la campaña de phishing "${c.nombre}" (${enviados} enviados, ${errores} errores)`,
      entidad_id: c.id, company_id: req.company.id,
    })
    res.json({ enviados, errores, total: pendientes.length })
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const [[c]] = await centralDB.query(
      `SELECT nombre FROM phishing_campanas WHERE id = ? AND company_id = ?`, [req.params.id, req.company.id])
    if (!c) return res.status(404).json({ error: 'Campaña no encontrada' })
    await centralDB.execute(`DELETE FROM phishing_campanas WHERE id = ?`, [req.params.id]) // destinatarios por CASCADE
    await registrarActividad({
      req, accion: 'eliminar', modulo: 'phishing',
      descripcion: `Eliminó la campaña de phishing "${c.nombre}"`,
      entidad_id: Number(req.params.id), company_id: req.company.id,
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
