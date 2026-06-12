const { PERMISSIONS } = require('../../../shared/roles')

function requirePermission(permission) {
  return (req, res, next) => {
    const allowed = PERMISSIONS[permission]
    if (!allowed || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' })
    }
    next()
  }
}

module.exports = { requirePermission }
