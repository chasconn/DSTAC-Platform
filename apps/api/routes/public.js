// Endpoints PÚBLICOS (sin auth de sesión) — captación del funnel del sitio dstac.cl
// (escáner web, autodiagnóstico, formularios de contacto y autoevaluaciones ISO)
// y seguimiento de las simulaciones de phishing (apertura/clic por token único).
const router = require('express').Router()
const centralDB = require('../db/central')
const { landingHtml, reportadoHtml } = require('../services/phishing/content')

// 1x1 GIF transparente para el píxel de apertura.
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')

function s(v, n) { return v == null ? null : (String(v).slice(0, n) || null) }

// Tipos de prospecto que acepta la plataforma.
const TIPOS_LEAD = ['web_scan', 'cuestionario', 'formulario_web', 'iso']

// POST /api/public/leads — guarda un prospecto desde el sitio público.
// Si PUBLIC_LEADS_SECRET está configurado, exige el header x-dstac-key (lo envía
// el reenvío server-side del sitio). Así randoms no pueden inyectar prospectos.
router.post('/leads', async (req, res) => {
  try {
    const secret = process.env.PUBLIC_LEADS_SECRET
    if (secret && req.headers['x-dstac-key'] !== secret) {
      return res.status(401).json({ ok: false, error: 'No autorizado' })
    }

    const b = req.body || {}
    const tipo = TIPOS_LEAD.includes(b.tipo) ? b.tipo : 'web_scan'
    const empresa  = s(b.empresa ?? b.nombre_empresa, 255)
    const contacto = s(b.contacto_nombre ?? b.nombre ?? b.name, 255)
    const email    = s(b.email, 255)
    const telefono = s(b.telefono ?? b.phone, 60)
    const dominio  = s(b.dominio ?? b.domain, 255)
    const score    = (b.score != null && !isNaN(parseInt(b.score))) ? parseInt(b.score) : null
    const grade    = s(b.grade, 10)
    const risk     = s(b.risk, 30)
    const payload  = b.data ?? b.report ?? null
    const data     = payload ? JSON.stringify(payload) : null
    // Si el reenvío server-side del sitio manda la IP/UA del visitante, se priorizan
    // (de lo contrario veríamos siempre la IP del servidor del sitio).
    const ip = s((b.ip || req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(), 64)
    const ua = s(b.user_agent || req.headers['user-agent'], 255)

    const [r] = await centralDB.execute(
      `INSERT INTO leads (tipo, empresa, contacto_nombre, email, telefono, dominio, score, grade, risk, data, ip, user_agent)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tipo, empresa, contacto, email, telefono, dominio, score, grade, risk, data, ip, ua]
    )
    res.json({ ok: true, id: r.insertId })
  } catch (e) {
    console.error('public/leads error:', e.message)
    res.status(500).json({ ok: false, error: 'No se pudo guardar el prospecto' })
  }
})

// GET /api/public/phishing/o/:token — píxel de apertura (1x1, sin caché).
// Responde el GIF siempre, exista o no el token, para no delatar nada al cliente de correo.
router.get('/phishing/o/:token', async (req, res) => {
  try {
    await centralDB.execute(
      `UPDATE phishing_destinatarios SET abierto_at = NOW() WHERE token = ? AND abierto_at IS NULL`,
      [req.params.token]
    )
  } catch (e) { console.error('public/phishing/o error:', e.message) }
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' })
  res.send(PIXEL_GIF)
})

// GET /api/public/phishing/c/:token — registra el clic y muestra la página educativa
// de la simulación (no pide ni guarda ninguna credencial).
router.get('/phishing/c/:token', async (req, res) => {
  let empresa = null
  try {
    const [[d]] = await centralDB.query(
      `SELECT c.company_id FROM phishing_destinatarios d
       JOIN phishing_campanas c ON c.id = d.campana_id WHERE d.token = ?`, [req.params.token]
    )
    if (d) {
      await centralDB.execute(
        `UPDATE phishing_destinatarios SET clic_at = NOW() WHERE token = ? AND clic_at IS NULL`, [req.params.token]
      )
      const [[c]] = await centralDB.query(`SELECT name FROM companies WHERE id = ?`, [d.company_id])
      empresa = c?.name || null
    }
  } catch (e) { console.error('public/phishing/c error:', e.message) }
  res.set('Cache-Control', 'no-store')
  res.send(landingHtml({ empresa, token: req.params.token }))
})

// GET /api/public/phishing/r/:token — el destinatario reporta el correo como
// sospechoso (en vez de hacer clic) — refuerza la conducta correcta y la mide.
router.get('/phishing/r/:token', async (req, res) => {
  let empresa = null
  try {
    const [[d]] = await centralDB.query(
      `SELECT c.company_id FROM phishing_destinatarios d
       JOIN phishing_campanas c ON c.id = d.campana_id WHERE d.token = ?`, [req.params.token]
    )
    if (d) {
      await centralDB.execute(
        `UPDATE phishing_destinatarios SET reportado_at = NOW() WHERE token = ? AND reportado_at IS NULL`, [req.params.token]
      )
      const [[c]] = await centralDB.query(`SELECT name FROM companies WHERE id = ?`, [d.company_id])
      empresa = c?.name || null
    }
  } catch (e) { console.error('public/phishing/r error:', e.message) }
  res.set('Cache-Control', 'no-store')
  res.send(reportadoHtml({ empresa }))
})

// POST /api/public/phishing/quiz/:token — respuestas del mini-quiz educativo
// mostrado tras el clic (no son datos sensibles, solo aprendizaje del ejercicio).
router.post('/phishing/quiz/:token', async (req, res) => {
  try {
    const respuestas = req.body?.respuestas
    await centralDB.execute(
      `UPDATE phishing_destinatarios SET quiz_respuestas = ?, quiz_completado_at = NOW()
       WHERE token = ? AND quiz_completado_at IS NULL`,
      [respuestas ? JSON.stringify(respuestas) : null, req.params.token]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error('public/phishing/quiz error:', e.message)
    res.status(500).json({ ok: false })
  }
})

// GET /api/public/verificar/:codigo — confirma la validez de un certificado
// de cumplimiento (Ley 21.663 o Ley 21.719) emitido, sin exponer datos
// sensibles, solo lo necesario para validar: empresa, ley, nivel, fecha.
const TABLAS_CERTIFICADO = [
  { tabla: 'ley21663_evaluaciones', ley: '21663', norma: 'Ley N° 21.663 · Ciberseguridad' },
  { tabla: 'ley21719_evaluaciones', ley: '21719', norma: 'Ley N° 21.719 · Protección de Datos Personales' },
]
router.get('/verificar/:codigo', async (req, res) => {
  try {
    for (const t of TABLAS_CERTIFICADO) {
      const [[ev]] = await centralDB.query(
        `SELECT e.nivel, e.score_total, e.certificado_emitido_at, c.name AS empresa
           FROM ${t.tabla} e JOIN companies c ON c.id = e.company_id
          WHERE e.certificado_codigo = ? LIMIT 1`,
        [req.params.codigo])
      if (ev) {
        return res.json({
          valido: true,
          empresa: ev.empresa,
          ley: t.norma,
          nivel: ev.nivel,
          score: ev.score_total,
          emitido_at: ev.certificado_emitido_at,
        })
      }
    }
    res.json({ valido: false })
  } catch (e) {
    console.error('public/verificar error:', e.message)
    res.status(500).json({ valido: false })
  }
})

module.exports = router
