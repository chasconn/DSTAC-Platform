// routes/invitacion.js — rutas públicas para aceptar invitaciones de trabajadores.
// Sin autenticación — el token en la URL es la credencial.
const router  = require('express').Router()
const bcrypt  = require('bcrypt')
const centralDB = require('../db/central')

// ─── Validar token (GET /api/invitacion/:token) ────────────────────────────────
// Devuelve datos básicos de la invitación para pre-rellenar el formulario.
router.get('/:token', async (req, res, next) => {
  try {
    const [[inv]] = await centralDB.execute(
      `SELECT i.id, i.email, i.expires_at, i.used_at, c.name AS company_name
       FROM company_invitations i JOIN companies c ON i.company_id = c.id
       WHERE i.token = ?`, [req.params.token])

    if (!inv) return res.status(404).json({ error: 'Invitación no válida o ya expirada' })
    if (inv.used_at) return res.status(409).json({ error: 'Esta invitación ya fue utilizada' })
    if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Esta invitación expiró. Pide al administrador que te reenvíe el acceso.' })

    res.json({ email: inv.email, company_name: inv.company_name })
  } catch (err) { next(err) }
})

// ─── Aceptar invitación (POST /api/invitacion/:token/aceptar) ──────────────────
router.post('/:token/aceptar', async (req, res, next) => {
  try {
    const { nombre, apellido, password } = req.body || {}
    if (!nombre?.trim() || !password?.trim()) return res.status(400).json({ error: 'Nombre y contraseña son obligatorios' })
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })

    const [[inv]] = await centralDB.execute(
      `SELECT i.*, c.name AS company_name FROM company_invitations i
       JOIN companies c ON i.company_id = c.id WHERE i.token = ?`, [req.params.token])

    if (!inv) return res.status(404).json({ error: 'Invitación no válida' })
    if (inv.used_at) return res.status(409).json({ error: 'Esta invitación ya fue utilizada' })
    if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Esta invitación expiró' })

    const [[yaExiste]] = await centralDB.execute(
      'SELECT id FROM users WHERE email = ?', [inv.email])
    if (yaExiste) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' })

    const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 12)
    const username = inv.email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').slice(0, 40)
      + '_' + Math.random().toString(36).slice(2, 6)

    await centralDB.execute(
      `INSERT INTO users (company_id, email, username, password_hash, role, status, first_name, last_name, mfa_enabled)
       VALUES (?, ?, ?, ?, 'cliente_lectura', 'active', ?, ?, 0)`,
      [inv.company_id, inv.email, username, hash, nombre.trim(), apellido?.trim() || ''])

    await centralDB.execute(
      'UPDATE company_invitations SET used_at = NOW() WHERE id = ?', [inv.id])

    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
