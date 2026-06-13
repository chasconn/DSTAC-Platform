// activityLogger — registro central de actividad del sistema.
//
// Filosofía de diseño:
//   registrarActividad() NUNCA debe romper la operación principal. Si el INSERT
//   en activity_log falla (BD caída, columna faltante, etc.) el error se traga
//   en silencio y solo se loguea por consola. Por eso TODAS las llamadas pueden
//   hacerse con `await` sin try/catch en el sitio de la llamada — o incluso sin
//   await (fire-and-forget), porque la función jamás lanza.
//
// Uso típico desde un endpoint:
//   const { registrarActividad } = require('../../utils/activityLogger')
//   ...
//   await registrarActividad({
//     req,                         // se extrae usuario e IP automáticamente
//     accion: 'crear',             // crear | editar | eliminar | login | exportar | otro
//     modulo: 'activos',           // nombre del módulo afectado
//     descripcion: `Creó el activo "${nombre}"`,
//     entidad_id: result.insertId, // id del registro afectado (opcional)
//     company_id,                  // empresa relacionada (opcional)
//     company_nombre,              // nombre de la empresa (opcional, para mostrar sin JOIN)
//     metadata: { ... },           // datos extra arbitrarios (opcional)
//   })

const centralDB = require('../db/central')

// Acciones válidas según el ENUM de la tabla; cualquier otra cae en 'otro'.
const ACCIONES_VALIDAS = ['crear', 'editar', 'eliminar', 'login', 'exportar', 'otro']

/**
 * Deriva nombre legible del usuario a partir de req.user.
 * Acepta variaciones de forma (first_name/last_name, name, email).
 */
function nombreDesdeUser(user) {
  if (!user) return null
  const nombre = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return nombre || user.name || user.email || null
}

/**
 * Inserta una fila en activity_log. No lanza nunca.
 * @param {object} opts
 * @param {object} [opts.req]            request de Express (de aquí salen usuario e IP)
 * @param {number} [opts.usuario_id]     override explícito del id de usuario
 * @param {string} [opts.usuario_nombre] override explícito del nombre de usuario
 * @param {string}  opts.accion          crear | editar | eliminar | login | exportar | otro
 * @param {string}  opts.modulo          módulo afectado (ej. 'activos')
 * @param {string} [opts.descripcion]    texto legible de lo ocurrido
 * @param {number} [opts.entidad_id]     id del registro afectado
 * @param {number} [opts.company_id]     empresa relacionada
 * @param {string} [opts.company_nombre] nombre de la empresa (denormalizado)
 * @param {object} [opts.metadata]       objeto extra (se guarda como JSON)
 */
async function registrarActividad(opts = {}) {
  try {
    const {
      req,
      accion,
      modulo,
      descripcion = null,
      entidad_id = null,
      company_id = null,
      company_nombre = null,
      metadata = null,
    } = opts

    // Usuario e IP: explícitos si vienen, si no se derivan del req.
    const usuario_id =
      opts.usuario_id ?? req?.user?.id ?? req?.user?.user_id ?? null
    const usuario_nombre =
      opts.usuario_nombre ?? nombreDesdeUser(req?.user)
    const ip = opts.ip ?? req?.ip ?? null

    // Normalizar acción al ENUM.
    const accionFinal = ACCIONES_VALIDAS.includes(accion) ? accion : 'otro'

    await centralDB.execute(
      `INSERT INTO activity_log
         (usuario_id, usuario_nombre, accion, modulo, descripcion,
          entidad_id, company_id, company_nombre, metadata, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        usuario_nombre,
        accionFinal,
        modulo || 'desconocido',
        descripcion,
        entidad_id,
        company_id,
        company_nombre,
        metadata ? JSON.stringify(metadata) : null,
        ip,
      ]
    )
  } catch (err) {
    // Silencioso: jamás interrumpe la operación principal.
    console.error('[activityLogger] no se pudo registrar actividad:', err.message)
  }
}

module.exports = { registrarActividad }
