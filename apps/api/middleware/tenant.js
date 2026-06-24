const { getTenantDB } = require('../db/tenant')
const centralDB = require('../db/central')

const CLIENT_ROLES = ['cliente_admin', 'cliente_lectura']

async function resolveTenant(req, res, next) {
  try {
    const { role } = req.user
    let slugAUsar

    if (CLIENT_ROLES.includes(role)) {
      // Clientes: SIEMPRE usar el slug del JWT — nunca del request (previene IDOR)
      slugAUsar = req.forced_company_slug || req.user.company_slug

      if (!slugAUsar) {
        return res.status(403).json({ error: 'Sin empresa asociada' })
      }

      // Si alguien manipuló la URL o el header para pedir un slug distinto: bloquear y loggear
      const slugDelRequest = req.params.companySlug || req.headers['x-company-slug']
      if (slugDelRequest && slugDelRequest !== slugAUsar) {
        console.warn('[SECURITY] Intento de IDOR detectado:', {
          user_id: req.user.user_id || req.user.id,
          slug_propio: slugAUsar,
          slug_pedido: slugDelRequest,
          path: req.path,
          ip: req.ip
        })
        return res.status(403).json({ error: 'Acceso denegado' })
      }
    } else {
      // DSTAC: puede operar en cualquier empresa, slug viene del request
      slugAUsar = req.params.companySlug || req.headers['x-company-slug']
      if (!slugAUsar) {
        return res.status(400).json({ error: 'Empresa no especificada' })
      }
    }

    // Verificar que la empresa existe y está activa (usando valor de BD, no del request)
    // OJO: 'name' es obligatorio aquí — varios informes (ejecutivo, EDR, NIST,
    // ISO, certificado, etc.) usan req.company.name para el encabezado del PDF;
    // si falta, el documento queda con "Preparado para" vacío, sin avisar nada.
    const [companies] = await centralDB.execute(
      'SELECT id, name, slug, plan_id, status FROM companies WHERE slug = ?',
      [slugAUsar]
    )

    if (companies.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    const company = companies[0]

    if (company.status !== 'active') {
      return res.status(403).json({ error: 'Cuenta suspendida o inactiva' })
    }

    // Usar company.slug de la BD para abrir el pool — nunca el valor crudo del request
    req.tenantDB = await getTenantDB(company.slug)
    req.company = company
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { resolveTenant }
