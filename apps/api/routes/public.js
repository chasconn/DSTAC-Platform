// Endpoints PÚBLICOS (sin auth de sesión) — captación del funnel del sitio dstac.cl
// (escáner web, autodiagnóstico, formularios de contacto y autoevaluaciones ISO).
const router = require('express').Router()
const centralDB = require('../db/central')

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
    const ip = s((req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(), 64)
    const ua = s(req.headers['user-agent'], 255)

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

module.exports = router
