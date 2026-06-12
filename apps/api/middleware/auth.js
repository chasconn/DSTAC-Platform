const jwt = require('jsonwebtoken')
const centralDB = require('../db/central')

async function requireAuth(req, res, next) {
  try {
    // Cookie HttpOnly tiene prioridad; fallback al header Bearer para compatibilidad
    let token = req.cookies?.dstac_token
    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Rechazar si es un temp_token de MFA (no es un token de sesión completo)
    if (decoded.type === 'mfa_temp') {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const [sessions] = await centralDB.execute(
      'SELECT id FROM sessions WHERE id = ? AND expires_at > NOW()',
      [decoded.jti]
    )

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Sesión expirada' })
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' })
    }
    next()
  }
}

const DSTAC_ROLES  = ['super_admin', 'admin_dstac', 'analista_dstac', 'consultor_dstac']
const CLIENT_ROLES = ['cliente_admin', 'cliente_lectura']

// Solo personal DSTAC puede acceder — loggea intentos de cliente
function requireDstacRole(req, res, next) {
  if (!DSTAC_ROLES.includes(req.user.role)) {
    console.warn('[SECURITY] Acceso no autorizado a ruta admin:', {
      user_id: req.user.user_id || req.user.id,
      role: req.user.role,
      path: req.path,
      ip: req.ip
    })
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  next()
}

// Cualquier usuario autenticado puede acceder; para clientes inyecta company_slug del JWT
function requireClientRole(req, res, next) {
  const ALL_VALID = [...DSTAC_ROLES, ...CLIENT_ROLES]
  if (!ALL_VALID.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  // Para clientes: fijar el slug desde el JWT — resolveTenant lo usará y bloqueará intentos de IDOR
  if (CLIENT_ROLES.includes(req.user.role)) {
    req.forced_company_slug = req.user.company_slug
  }
  next()
}

module.exports = { requireAuth, requireRole, requireDstacRole, requireClientRole }
