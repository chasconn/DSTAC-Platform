// routes/client/equipo.js — el representante (cliente_admin) gestiona su equipo.
// Solo accesible para usuarios con rol cliente_admin — los trabajadores (cliente_lectura)
// no pueden invitar ni ver el equipo de la empresa.
const router  = require('express').Router()
const crypto  = require('crypto')
const centralDB = require('../../db/central')
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                   = require('../../middleware/tenant')
const { sendMail } = require('../../services/emailService')

router.use(requireAuth, requireClientRole, resolveTenant)

function soloAdmin(req, res, next) {
  if (req.user.role !== 'cliente_admin') return res.status(403).json({ error: 'Solo el administrador de la empresa puede gestionar el equipo' })
  next()
}

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.dstac.cl'

function buildInviteHtml({ nombre_empresa, email, link }) {
  return `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8f7f4;padding:32px 24px;border-radius:16px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="background:#3C3489;display:inline-block;padding:10px 20px;border-radius:8px">
        <span style="color:#fff;font-weight:700;font-size:18px;letter-spacing:1px">DSTAC</span>
      </div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e2e0d8">
      <h2 style="margin:0 0 12px;font-size:20px;color:#2C2C2A">Fuiste invitado a capacitarte en ciberseguridad</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#444441;line-height:1.7">
        <strong>${nombre_empresa}</strong> te invitó a completar tu capacitación de ciberseguridad
        en la plataforma DSTAC. Este acceso es personal e intransferible, asignado a <strong>${email}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#444441;line-height:1.7">
        Haz clic para crear tu contraseña y acceder a tu módulo de capacitación.
        El enlace expira en <strong>72 horas</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#3C3489;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
          Crear mi cuenta →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#888780;text-align:center">
        Si no esperabas este correo, puedes ignorarlo con tranquilidad.
      </p>
    </div>
    <p style="text-align:center;margin-top:20px;font-size:11px;color:#888780">DSTAC Security · www.dstac.cl</p>
  </div>`
}

// ─── Listar equipo propio ─────────────────────────────────────────────────────
router.get('/', soloAdmin, async (req, res, next) => {
  try {
    const cid = req.company.id
    const [usuarios] = await centralDB.execute(
      `SELECT id, email, first_name, last_name, role, status, last_login, created_at
       FROM users WHERE company_id = ? AND role = 'cliente_lectura' ORDER BY created_at DESC`, [cid])

    const [invitaciones] = await centralDB.execute(
      `SELECT id, email, expires_at, used_at, created_at
       FROM company_invitations WHERE company_id = ? ORDER BY created_at DESC`, [cid])

    res.json({ usuarios, invitaciones })
  } catch (err) { next(err) }
})

// ─── Invitar trabajador ───────────────────────────────────────────────────────
router.post('/invitar', soloAdmin, async (req, res, next) => {
  try {
    const { email } = req.body || {}
    if (!email?.trim()) return res.status(400).json({ error: 'El correo es obligatorio' })

    const [[existe]] = await centralDB.execute(
      'SELECT id FROM users WHERE email = ? AND company_id = ?',
      [email.trim().toLowerCase(), req.company.id])
    if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese correo en tu empresa' })

    const [[invPendiente]] = await centralDB.execute(
      'SELECT id FROM company_invitations WHERE email = ? AND company_id = ? AND used_at IS NULL AND expires_at > NOW()',
      [email.trim().toLowerCase(), req.company.id])
    if (invPendiente) return res.status(409).json({ error: 'Ya hay una invitación pendiente para ese correo' })

    const token  = crypto.randomBytes(32).toString('hex')
    const expira = new Date(Date.now() + 72 * 60 * 60 * 1000)

    await centralDB.execute(
      `INSERT INTO company_invitations (company_id, email, token, role, invited_by, invited_by_type, expires_at)
       VALUES (?, ?, ?, 'cliente_lectura', ?, 'cliente', ?)`,
      [req.company.id, email.trim().toLowerCase(), token, req.user.id || null, expira])

    const link = `${PORTAL_URL}/invitacion/${token}`
    await sendMail(
      email.trim(),
      `${req.company.name} te invita a capacitarte en ciberseguridad — DSTAC`,
      buildInviteHtml({ nombre_empresa: req.company.name, email: email.trim(), link })
    )

    res.status(201).json({ ok: true })
  } catch (err) { next(err) }
})

// ─── Cancelar invitación pendiente ────────────────────────────────────────────
router.delete('/invitaciones/:id', soloAdmin, async (req, res, next) => {
  try {
    await centralDB.execute(
      'DELETE FROM company_invitations WHERE id = ? AND company_id = ? AND used_at IS NULL',
      [req.params.id, req.company.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── Desactivar un trabajador ─────────────────────────────────────────────────
router.patch('/usuarios/:id/estado', soloAdmin, async (req, res, next) => {
  try {
    const { estado } = req.body || {}
    if (!['active','inactive'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
    await centralDB.execute(
      `UPDATE users SET status = ? WHERE id = ? AND company_id = ? AND role = 'cliente_lectura'`,
      [estado, req.params.id, req.company.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
