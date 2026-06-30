const router = require('express').Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const centralDB = require('../db/central')
const { sendMFACode } = require('../services/emailService')
const { loginLimiter, mfaLimiter } = require('../middleware/rateLimit')
const { requireAuth, requireDstacRole } = require('../middleware/auth')
const { DSTAC_ROLES } = require('../../../shared/roles')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateMFACode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function validarPassword(password, email, companyName) {
  const errores = []
  if (password.length < 8)          errores.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(password))      errores.push('Al menos una mayúscula')
  if (!/[0-9]/.test(password))      errores.push('Al menos un número')
  if (!/[!@#$%^&*]/.test(password)) errores.push('Al menos un símbolo (!@#$%^&*)')
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase()))
    errores.push('No puede contener tu nombre de usuario')
  if (companyName && password.toLowerCase().includes(companyName.toLowerCase().slice(0, 4)))
    errores.push('No puede contener el nombre de la empresa')
  return errores
}

// Opciones de cookie HttpOnly — las mismas en verify-mfa, logout y /me si refrescara
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 horas (igual que JWT_EXPIRES_IN)
    path: '/'
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Paso 1: validar credenciales, enviar MFA, devolver temp_token
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Credenciales requeridas' })
    }

    // 1. Buscar usuario por email o username
    const [users] = await centralDB.execute(
      `SELECT u.*, c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE (u.email = ? OR u.username = ?)
       LIMIT 1`,
      [email, email]
    )

    // Error genérico — no revelar si el usuario existe o no
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const user = users[0]

    // 2. Validar contraseña
    const passwordOk = await bcrypt.compare(password, user.password_hash)
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // 3. Validar empresa activa (solo usuarios cliente)
    if (user.company_id && user.company_status !== 'active') {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // 4. Validar usuario activo
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Todo OK — generar código MFA
    const code = generateMFACode()
    const mfaExpires = new Date(Date.now() + parseInt(process.env.MFA_EXPIRES_MINUTES || 5) * 60 * 1000)

    // Invalidar códigos anteriores del mismo usuario
    await centralDB.execute(
      'UPDATE mfa_codes SET used = TRUE WHERE user_id = ? AND used = FALSE',
      [user.id]
    )
    await centralDB.execute(
      'INSERT INTO mfa_codes (user_id, code, expires_at) VALUES (?, ?, ?)',
      [user.id, code, mfaExpires]
    )

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Código MFA para ${user.email}: ${code}`)
    } else {
      await sendMFACode(user.email, code)
    }

    // temp_token: JWT de 5 minutos que identifica al usuario durante el flujo MFA
    // type: 'mfa_temp' lo diferencia de un token de sesión real
    const tempToken = jwt.sign(
      { user_id: user.id, type: 'mfa_temp' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    )

    res.json({
      message: 'Código enviado al correo',
      temp_token: tempToken
    })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/auth/verify-mfa ────────────────────────────────────────────────
// Paso 2: validar código MFA, emitir JWT de sesión como cookie HttpOnly
router.post('/verify-mfa', mfaLimiter, async (req, res) => {
  try {
    const { temp_token, codigo } = req.body

    if (!temp_token || !codigo) {
      return res.status(400).json({ error: 'Datos requeridos' })
    }

    // Verificar temp_token y extraer user_id
    let tempPayload
    try {
      tempPayload = jwt.verify(temp_token, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ error: 'Sesión MFA expirada. Vuelve a ingresar.' })
    }

    if (tempPayload.type !== 'mfa_temp') {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const userId = tempPayload.user_id

    // Validar formato del código
    if (!/^\d{6}$/.test(String(codigo))) {
      return res.status(400).json({ error: 'Código inválido' })
    }

    // Buscar código válido en BD
    const [codes] = await centralDB.execute(
      `SELECT id FROM mfa_codes
       WHERE user_id = ? AND code = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, String(codigo)]
    )

    if (codes.length === 0) {
      return res.status(401).json({ error: 'Código incorrecto o expirado' })
    }

    // Marcar código como usado (previene reutilización)
    await centralDB.execute(
      'UPDATE mfa_codes SET used = TRUE WHERE id = ?',
      [codes[0].id]
    )

    // Obtener datos completos del usuario + empresa + plan para el JWT
    const [users] = await centralDB.execute(
      `SELECT u.id, u.email, u.username, u.role, u.company_id, u.first_name, u.last_name,
              u.must_change_password, u.temp_password_expires_at,
              c.slug AS company_slug, c.name AS company_name,
              p.name AS plan_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       LEFT JOIN plans p ON c.plan_id = p.id
       WHERE u.id = ?`,
      [userId]
    )

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const user = users[0]

    // Si el usuario debe cambiar contraseña, emitir un token especial de cambio (no de sesión)
    if (user.must_change_password) {
      if (user.temp_password_expires_at && new Date(user.temp_password_expires_at) < new Date()) {
        return res.status(401).json({
          error: 'contrasena_expirada',
          message: 'Tu contraseña temporal ha expirado. Contacta a tu administrador.'
        })
      }

      const changeToken = jwt.sign(
        { user_id: user.id, action: 'change_password' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      )

      return res.json({ requires_password_change: true, change_token: changeToken })
    }

    // Generar JWT de sesión
    const jti = uuidv4()
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h'
    const token = jwt.sign(
      {
        jti,
        user_id: user.id,
        id: user.id,              // campo legacy — compatibilidad con rutas existentes
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        company_slug: user.company_slug || null,
        plan: user.plan_name || null,
        first_name: user.first_name
      },
      process.env.JWT_SECRET,
      { expiresIn }
    )

    // Registrar sesión en BD
    const sessionExpires = new Date(Date.now() + 8 * 60 * 60 * 1000)
    await centralDB.execute(
      'INSERT INTO sessions (id, user_id, company_id, expires_at) VALUES (?, ?, ?, ?)',
      [jti, user.id, user.company_id, sessionExpires]
    )

    // Actualizar último login
    await centralDB.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    )

    // Guardar JWT en cookie HttpOnly — el navegador la envía automáticamente en cada request
    res.cookie('dstac_token', token, cookieOptions())

    res.json({
      success: true,
      role: user.role
    })
  } catch (error) {
    console.error('Error en verify-mfa:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Invalida la sesión en BD y borra la cookie HttpOnly
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.dstac_token

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.jti) {
          await centralDB.execute(
            'DELETE FROM sessions WHERE id = ?',
            [decoded.jti]
          )
        }
      } catch {
        // Token inválido o expirado — eliminar la cookie de todas formas
      }
    }

    res.clearCookie('dstac_token', { path: '/' })
    res.json({ success: true })
  } catch (error) {
    console.error('Error en logout:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/auth/ver-como-cliente ─────────────────────────────────────────
// Un admin DSTAC entra al portal cliente de una empresa, para probar que todo
// funcione bien, sin perder su sesión: emite un token de cliente real
// (mismo shape que un login normal) y guarda la sesión admin para volver.
router.post('/ver-como-cliente', requireAuth, requireDstacRole, async (req, res) => {
  try {
    const { company_slug } = req.body || {}
    if (!company_slug) return res.status(400).json({ error: 'Falta company_slug' })

    const [[company]] = await centralDB.query(`
      SELECT c.id, c.slug, c.status, p.name AS plan_name
      FROM companies c JOIN plans p ON c.plan_id = p.id
      WHERE c.slug = ? AND c.status = 'active'
    `, [company_slug])
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada o inactiva' })

    const jti = uuidv4()
    const token = jwt.sign(
      {
        jti,
        user_id: req.user.user_id || req.user.id,
        id: req.user.user_id || req.user.id,
        email: req.user.email,
        role: 'cliente_admin',
        company_id: company.id,
        company_slug: company.slug,
        plan: company.plan_name || null,
        first_name: req.user.first_name,
        impersonado_por: req.user.user_id || req.user.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    )

    const sessionExpires = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await centralDB.execute(
      'INSERT INTO sessions (id, user_id, company_id, expires_at) VALUES (?, ?, ?, ?)',
      [jti, req.user.user_id || req.user.id, company.id, sessionExpires]
    )

    // Guarda la sesión admin original para "Volver al panel admin" (si ya había
    // una vista de cliente abierta, no la pisa: conserva la admin real).
    if (!req.cookies?.dstac_admin_token) {
      res.cookie('dstac_admin_token', req.cookies.dstac_token, cookieOptions())
    }
    res.cookie('dstac_token', token, { ...cookieOptions(), maxAge: 2 * 60 * 60 * 1000 })
    res.json({ success: true, company_slug: company.slug })
  } catch (error) {
    console.error('Error en ver-como-cliente:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/auth/volver-admin ──────────────────────────────────────────────
// Restaura la sesión admin guardada al entrar en "ver como cliente".
router.post('/volver-admin', async (req, res) => {
  try {
    const adminToken = req.cookies?.dstac_admin_token
    if (!adminToken) return res.status(400).json({ error: 'No hay una sesión admin guardada' })
    try { jwt.verify(adminToken, process.env.JWT_SECRET) }
    catch { res.clearCookie('dstac_admin_token', { path: '/' }); return res.status(400).json({ error: 'La sesión admin guardada ya expiró' }) }

    res.cookie('dstac_token', adminToken, cookieOptions())
    res.clearCookie('dstac_admin_token', { path: '/' })
    res.json({ success: true })
  } catch (error) {
    console.error('Error en volver-admin:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/auth/change-password ──────────────────────────────────────────
// Recibe el change_token emitido por verify-mfa y la nueva contraseña elegida
router.post('/change-password', async (req, res) => {
  try {
    const { change_token, new_password } = req.body

    if (!change_token || !new_password) {
      return res.status(400).json({ error: 'Datos requeridos' })
    }

    let decoded
    try {
      decoded = jwt.verify(change_token, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ error: 'El enlace expiró. Vuelve a iniciar sesión.' })
    }

    if (decoded.action !== 'change_password') {
      return res.status(400).json({ error: 'Token inválido' })
    }

    // Obtener usuario y empresa para la validación de la contraseña
    const [users] = await centralDB.execute(
      `SELECT u.*, c.name AS company_name
       FROM users u LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = ?`,
      [decoded.user_id]
    )
    const user = users[0]
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    // Validar la nueva contraseña
    const errores = validarPassword(new_password, user.email, user.company_name)
    if (errores.length) {
      return res.status(400).json({ error: 'contrasena_invalida', errores })
    }

    // Verificar que no sea la misma que la temporal
    const esTemporal = await bcrypt.compare(new_password, user.password_hash)
    if (esTemporal) {
      return res.status(400).json({
        error: 'contrasena_invalida',
        errores: ['La nueva contraseña no puede ser igual a la temporal']
      })
    }

    // Guardar nueva contraseña y limpiar flags de contraseña temporal
    const newHash = await bcrypt.hash(new_password, Number(process.env.BCRYPT_ROUNDS) || 12)
    await centralDB.execute(`
      UPDATE users
      SET password_hash = ?, must_change_password = 0, temp_password_expires_at = NULL
      WHERE id = ?
    `, [newHash, user.id])

    // Generar JWT completo de sesión (igual que verify-mfa)
    const [freshUsers] = await centralDB.execute(
      `SELECT u.id, u.email, u.username, u.role, u.company_id, u.first_name,
              c.slug AS company_slug, p.name AS plan_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       LEFT JOIN plans p ON c.plan_id = p.id
       WHERE u.id = ?`,
      [user.id]
    )
    const freshUser = freshUsers[0]

    const jti       = uuidv4()
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h'
    const token     = jwt.sign(
      {
        jti,
        user_id:      freshUser.id,
        id:           freshUser.id,
        email:        freshUser.email,
        role:         freshUser.role,
        company_id:   freshUser.company_id,
        company_slug: freshUser.company_slug || null,
        plan:         freshUser.plan_name    || null,
        first_name:   freshUser.first_name
      },
      process.env.JWT_SECRET,
      { expiresIn }
    )

    const sessionExpires = new Date(Date.now() + 8 * 60 * 60 * 1000)
    await centralDB.execute(
      'INSERT INTO sessions (id, user_id, company_id, expires_at) VALUES (?, ?, ?, ?)',
      [jti, freshUser.id, freshUser.company_id, sessionExpires]
    )
    await centralDB.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])

    res.cookie('dstac_token', token, cookieOptions())
    res.json({ success: true, role: freshUser.role, first_name: freshUser.first_name })
  } catch (error) {
    console.error('Error en change-password:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Datos del usuario autenticado (lee de la cookie via requireAuth)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [users] = await centralDB.execute(
      `SELECT u.id, u.email, u.username, u.role, u.first_name, u.last_name,
              u.company_id, c.name AS company_name, c.slug AS company_slug,
              c.theme_color, c.theme_light, c.theme_mid, c.plan_id,
              p.name AS plan_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       LEFT JOIN plans p ON c.plan_id = p.id
       WHERE u.id = ?`,
      [req.user.id]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.json(users[0])
  } catch (error) {
    console.error('Error en /me:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
