const { normalizar, validarFecha } = require('../importador')

const COLUMNAS_REQUERIDAS = ['nombre', 'identidad', 'tipo_identidad']

const TIPOS_VALIDOS  = ['usuario', 'cuenta_servicio', 'api_key', 'certificado', 'grupo', 'otro']
const ESTADOS_VALIDOS = ['activa', 'inactiva', 'comprometida', 'expirada', 'pendiente', '']

// Valida una fila del Excel de Identidades.
// Necesita acceso a tenantDB para verificar si el propietario existe en Personal.
// Retorna { valido, errores, warnings, datos }
async function validarFilaIdentidad(fila, numFila, tenantDB) {
  const errores  = []
  const warnings = []

  const nombre            = normalizar(fila.nombre)
  const valor             = normalizar(fila.identidad)
  const tipo              = normalizar(fila.tipo_identidad).toLowerCase()
  const estado            = normalizar(fila.estado).toLowerCase()
  const propietarioNombre = normalizar(fila.propietario)

  if (!nombre)
    errores.push({ fila: numFila, campo: 'nombre', error: 'El nombre descriptivo es obligatorio', sugerencia: 'Ej: "Juan Pérez AD" o "API producción AWS"' })

  if (!valor)
    errores.push({ fila: numFila, campo: 'identidad', error: 'El valor de la identidad es obligatorio', sugerencia: 'Ej: jperez@empresa.cl o pk_live_xxx' })

  if (!tipo || !TIPOS_VALIDOS.includes(tipo))
    errores.push({ fila: numFila, campo: 'tipo_identidad', error: `Tipo inválido: "${tipo}"`, sugerencia: `Usa: ${TIPOS_VALIDOS.join(', ')}` })

  if (estado && !ESTADOS_VALIDOS.includes(estado))
    errores.push({ fila: numFila, campo: 'estado', error: `Estado inválido: "${estado}"`, sugerencia: 'Usa: activa, inactiva, comprometida, expirada o pendiente' })

  // Verificar propietario en BD — no es error bloqueante si no se encuentra
  let propietarioId = null
  if (propietarioNombre) {
    const [rows] = await tenantDB.execute(
      'SELECT id FROM personal WHERE nombre = ? LIMIT 1',
      [propietarioNombre]
    )
    if (rows.length > 0) {
      propietarioId = rows[0].id
    } else {
      // Warning, no error: se importa sin propietario
      warnings.push({
        fila:      numFila,
        campo:     'propietario',
        aviso:     `Propietario "${propietarioNombre}" no encontrado en Personal`,
        resultado: 'La identidad se importará sin propietario asignado',
      })
    }
  }

  const fechaCreacion   = validarFecha(fila.fecha_creacion)
  const fechaRevision   = validarFecha(fila.fecha_revision)
  const fechaExpiracion = validarFecha(fila.fecha_expiracion)

  if (fila.fecha_creacion && fila.fecha_creacion !== '' && !fechaCreacion)
    errores.push({ fila: numFila, campo: 'fecha_creacion', error: 'Formato de fecha inválido', sugerencia: 'Usa YYYY-MM-DD o DD/MM/YYYY' })

  if (fila.fecha_expiracion && fila.fecha_expiracion !== '' && !fechaExpiracion)
    errores.push({ fila: numFila, campo: 'fecha_expiracion', error: 'Formato de fecha inválido', sugerencia: 'Usa YYYY-MM-DD o DD/MM/YYYY' })

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    datos: errores.length === 0 ? {
      nombre,
      identidad:        valor,
      tipo_identidad:   tipo,
      origen:           normalizar(fila.origen) || null,
      estado:           estado || 'activa',
      propietario_id:   propietarioId,
      fecha_creacion:   fechaCreacion,
      fecha_revision:   fechaRevision,
      fecha_expiracion: fechaExpiracion,
      notas:            normalizar(fila.notas) || null,
    } : null,
  }
}

module.exports = { COLUMNAS_REQUERIDAS, validarFilaIdentidad }
