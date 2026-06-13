const router = require('express').Router()
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { enviarEmailBienvenida, enviarEmailResetPassword } = require('../../utils/email')
const { registrarActividad } = require('../../utils/activityLogger')

router.use(requireAuth, requireDstacRole)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generarPasswordTemporal() {
  const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'  // sin I y O
  const minusculas = 'abcdefghjkmnpqrstuvwxyz'    // sin i, l, o
  const numeros    = '23456789'                    // sin 0 y 1
  const simbolos   = '!@#$%&*'
  const todos = mayusculas + minusculas + numeros + simbolos

  const password = [
    mayusculas[crypto.randomInt(mayusculas.length)],
    minusculas[crypto.randomInt(minusculas.length)],
    numeros[crypto.randomInt(numeros.length)],
    simbolos[crypto.randomInt(simbolos.length)],
  ]
  for (let i = 4; i < 12; i++) {
    password.push(todos[crypto.randomInt(todos.length)])
  }
  return password.sort(() => crypto.randomInt(3) - 1).join('')
}

// ─── GET /api/admin/usuarios/stats ──────────────────────────────────────────
// Debe ir antes de /:id para que Express no interprete 'stats' como un id

router.get('/stats', async (req, res, next) => {
  try {
    const [[row]] = await centralDB.execute(`
      SELECT
        COUNT(*)                                        AS total,
        SUM(role IN ('cliente_admin','cliente_lectura')) AS clientes,
        SUM(company_id IS NULL)                         AS equipo_dstac,
        SUM(must_change_password = 1)                   AS pendientes,
        SUM(status = 'suspended')                       AS suspendidos
      FROM users
    `)
    res.json({
      total:        Number(row.total),
      clientes:     Number(row.clientes),
      equipo_dstac: Number(row.equipo_dstac),
      pendientes:   Number(row.pendientes),
      suspendidos:  Number(row.suspendidos),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/usuarios ─────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { search, role, company_id, status, page = 1, limit = 25 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const conditions = []
    const params = []

    if (search) {
      conditions.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (role)                { conditions.push('u.role = ?');         params.push(role)       }
    if (company_id === 'dstac') {
      conditions.push('u.company_id IS NULL')
    } else if (company_id) {
      conditions.push('u.company_id = ?')
      params.push(company_id)
    }
    if (status)              { conditions.push('u.status = ?');       params.push(status)     }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await centralDB.execute(`
      SELECT
        u.id, u.email, u.username, u.role, u.status,
        u.first_name, u.last_name,
        u.must_change_password,
        u.temp_password_expires_at,
        u.last_login,
        u.created_at, u.updated_at,
        c.name AS company_name,
        c.slug AS company_slug
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      ${where}
      ORDER BY
        FIELD(u.role,'super_admin','admin_dstac','analista_dstac','consultor_dstac','cliente_admin','cliente_lectura'),
        c.name ASC, u.first_name ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await centralDB.execute(
      `SELECT COUNT(*) AS total FROM users u LEFT JOIN companies c ON u.company_id = c.id ${where}`,
      params
    )

    res.json({ usuarios: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/usuarios/:id ─────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const [[user]] = await centralDB.execute(`
      SELECT
        u.id, u.email, u.username, u.role, u.status,
        u.first_name, u.last_name,
        u.must_change_password, u.temp_password_expires_at,
        u.mfa_enabled, u.last_login,
        u.created_at, u.updated_at,
        c.name AS company_name, c.slug AS company_slug
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `, [req.params.id])

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(user)
  } catch (err) { next(err) }
})

// ─── POST /api/admin/usuarios ─────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  const { email, first_name, last_name, role, company_id, username } = req.body

  if (!email || !first_name || !role) {
    return res.status(400).json({ error: 'Email, nombre y rol son requeridos' })
  }
  if (role === 'super_admin') {
    return res.status(403).json({ error: 'No se puede crear un super_admin desde este módulo' })
  }

  let insertId = null

  try {
    const [existe] = await centralDB.execute('SELECT id FROM users WHERE email = ?', [email])
    if (existe.length) return res.status(409).json({ error: 'El email ya está registrado' })

    if (company_id) {
      const [[empresa]] = await centralDB.execute(
        'SELECT id FROM companies WHERE id = ? AND status = "active"',
        [company_id]
      )
      if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada o inactiva' })
    }

    const tempPassword = generarPasswordTemporal()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const expiresAt    = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const [result] = await centralDB.execute(`
      INSERT INTO users
        (company_id, email, username, password_hash, role,
         first_name, last_name, status,
         must_change_password, temp_password_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, ?)
    `, [
      company_id ?? null,
      email,
      username ?? null,
      passwordHash,
      role,
      first_name,
      last_name ?? null,
      expiresAt,
    ])

    insertId = result.insertId

    await registrarActividad({
      req, accion: 'crear', modulo: 'usuarios',
      descripcion: `Creó al usuario ${email} (${role})`,
      entidad_id: insertId, company_id: company_id ?? null,
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Contraseña temporal para ${email}: ${tempPassword}`)
      res.status(201).json({
        id: insertId,
        message: 'Usuario creado (desarrollo — email no enviado).',
        _dev_password: tempPassword,
      })
    } else {
      await enviarEmailBienvenida({
        to: email,
        first_name,
        tempPassword,
        role,
        loginUrl:     (process.env.APP_URL || 'http://localhost:3000') + '/login',
        expiresHoras: 48,
      })
      res.status(201).json({ id: insertId, message: 'Usuario creado. Credenciales enviadas por correo.' })
    }
  } catch (err) {
    if (insertId) {
      try { await centralDB.execute('DELETE FROM users WHERE id = ?', [insertId]) } catch {}
    }
    next(err)
  }
})

// ─── PUT /api/admin/usuarios/:id ─────────────────────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const { first_name, last_name, role, status } = req.body
    const userId = Number(req.params.id)
    const meId   = req.user.id || req.user.user_id

    if (userId === meId && (role !== undefined || status !== undefined)) {
      return res.status(403).json({ error: 'No puedes modificar tu propio rol o estado' })
    }
    if (role === 'super_admin') {
      return res.status(403).json({ error: 'No se puede asignar el rol super_admin' })
    }

    const fields = []
    const params = []
    if (first_name !== undefined) { fields.push('first_name = ?'); params.push(first_name) }
    if (last_name  !== undefined) { fields.push('last_name = ?');  params.push(last_name)  }
    if (role       !== undefined) { fields.push('role = ?');       params.push(role)       }
    if (status     !== undefined) { fields.push('status = ?');     params.push(status)     }

    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' })

    params.push(userId)
    await centralDB.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params)

    await registrarActividad({
      req, accion: 'editar', modulo: 'usuarios',
      descripcion: `Editó al usuario #${userId}`,
      entidad_id: userId,
    })

    res.json({ message: 'Usuario actualizado' })
  } catch (err) { next(err) }
})

// ─── DELETE /api/admin/usuarios/:id ──────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    const meId   = req.user.id || req.user.user_id

    if (userId === meId) {
      return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' })
    }

    const [[user]] = await centralDB.execute('SELECT role, email FROM users WHERE id = ?', [userId])
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (user.role === 'super_admin') {
      return res.status(403).json({ error: 'No se puede eliminar al super_admin' })
    }

    await centralDB.execute('DELETE FROM sessions WHERE user_id = ?', [userId])
    await centralDB.execute('DELETE FROM users WHERE id = ?', [userId])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'usuarios',
      descripcion: `Eliminó al usuario ${user.email}`,
      entidad_id: userId,
    })

    res.json({ message: 'Usuario eliminado' })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/usuarios/:id/reset-password ─────────────────────────────

router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const [[user]] = await centralDB.execute(
      'SELECT email, first_name FROM users WHERE id = ?',
      [req.params.id]
    )
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const tempPassword = generarPasswordTemporal()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const expiresAt    = new Date(Date.now() + 48 * 60 * 60 * 1000)

    await centralDB.execute(`
      UPDATE users
      SET password_hash = ?, must_change_password = 1, temp_password_expires_at = ?
      WHERE id = ?
    `, [passwordHash, expiresAt, req.params.id])

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Nueva contraseña temporal para ${user.email}: ${tempPassword}`)
      res.json({ message: 'Contraseña reseteada (desarrollo — email no enviado).', _dev_password: tempPassword })
    } else {
      await enviarEmailResetPassword({
        to:          user.email,
        first_name:  user.first_name,
        tempPassword,
        loginUrl:    (process.env.APP_URL || 'http://localhost:3000') + '/login',
        expiresHoras: 48,
      })
      res.json({ message: 'Nueva contraseña enviada por correo.' })
    }
  } catch (err) { next(err) }
})

module.exports = router
