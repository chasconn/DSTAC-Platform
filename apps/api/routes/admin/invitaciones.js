// routes/admin/invitaciones.js — gestión de invitaciones a trabajadores.
// Solo personal DSTAC. Permite invitar trabajadores a cualquier empresa cliente,
// listar el equipo de una empresa y cancelar invitaciones pendientes.
const router  = require('express').Router()
const crypto  = require('crypto')
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { sendMail } = require('../../services/emailService')

router.use(requireAuth, requireDstacRole)

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
      <h2 style="margin:0 0 12px;font-size:20px;color:#2C2C2A">Fuiste invitado a la plataforma DSTAC</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#444441;line-height:1.7">
        <strong>${nombre_empresa}</strong> te invitó a completar tu capacitación de ciberseguridad
        en la plataforma DSTAC. Este es un correo único e intransferible asignado a <strong>${email}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#444441;line-height:1.7">
        Haz clic en el botón para crear tu contraseña y acceder a tu módulo de capacitación.
        El enlace expira en <strong>72 horas</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#3C3489;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
          Crear mi cuenta →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#888780;text-align:center">
        Si no esperabas este correo, puedes ignorarlo.<br>
        El enlace expira automáticamente el ${new Date(Date.now() + 72*60*60*1000).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })}.
      </p>
    </div>
    <p style="text-align:center;margin-top:20px;font-size:11px;color:#888780">
      DSTAC Security · www.dstac.cl
    </p>
  </div>`
}

// ─── Listar equipo de una empresa (usuarios + invitaciones pendientes) ─────────
router.get('/empresa/:companyId', async (req, res, next) => {
  try {
    const cid = Number(req.params.companyId)
    const [[company]] = await centralDB.execute('SELECT id, name FROM companies WHERE id = ?', [cid])
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' })

    const [usuarios] = await centralDB.execute(
      `SELECT id, email, first_name, last_name, role, status, last_login, created_at
       FROM users WHERE company_id = ? ORDER BY created_at DESC`, [cid])

    const [invitaciones] = await centralDB.execute(
      `SELECT id, email, role, expires_at, used_at, created_at
       FROM company_invitations WHERE company_id = ? ORDER BY created_at DESC`, [cid])

    res.json({ empresa: company, usuarios, invitaciones })
  } catch (err) { next(err) }
})

// ─── Crear invitación ─────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { company_id, email } = req.body || {}
    if (!company_id || !email?.trim()) return res.status(400).json({ error: 'Empresa y correo son obligatorios' })

    const [[company]] = await centralDB.execute('SELECT id, name FROM companies WHERE id = ?', [Number(company_id)])
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' })

    const [[existe]] = await centralDB.execute(
      'SELECT id FROM users WHERE email = ? AND company_id = ?', [email.trim().toLowerCase(), company.id])
    if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese correo en esta empresa' })

    const token  = crypto.randomBytes(32).toString('hex')
    const expira = new Date(Date.now() + 72 * 60 * 60 * 1000)

    await centralDB.execute(
      `INSERT INTO company_invitations (company_id, email, token, role, invited_by, invited_by_type, expires_at)
       VALUES (?, ?, ?, 'cliente_lectura', ?, 'admin', ?)`,
      [company.id, email.trim().toLowerCase(), token, req.user.id || null, expira])

    const link = `${PORTAL_URL}/invitacion/${token}`
    await sendMail(
      email.trim(),
      `Invitación a la plataforma DSTAC — ${company.name}`,
      buildInviteHtml({ nombre_empresa: company.name, email: email.trim(), link })
    )

    res.status(201).json({ ok: true })
  } catch (err) { next(err) }
})

// ─── Reenviar invitación ──────────────────────────────────────────────────────
router.post('/:id/reenviar', async (req, res, next) => {
  try {
    const [[inv]] = await centralDB.execute(
      'SELECT i.*, c.name AS company_name FROM company_invitations i JOIN companies c ON i.company_id = c.id WHERE i.id = ?',
      [req.params.id])
    if (!inv) return res.status(404).json({ error: 'Invitación no encontrada' })
    if (inv.used_at) return res.status(400).json({ error: 'Esta invitación ya fue usada' })

    const nuevaExp = new Date(Date.now() + 72 * 60 * 60 * 1000)
    await centralDB.execute('UPDATE company_invitations SET expires_at = ? WHERE id = ?', [nuevaExp, inv.id])

    const link = `${PORTAL_URL}/invitacion/${inv.token}`
    await sendMail(inv.email, `Recordatorio: Invitación a DSTAC — ${inv.company_name}`,
      buildInviteHtml({ nombre_empresa: inv.company_name, email: inv.email, link }))

    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── Cancelar invitación ──────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await centralDB.execute('DELETE FROM company_invitations WHERE id = ? AND used_at IS NULL', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
