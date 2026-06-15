const { normalizar, validarFecha } = require('../importador')

// Accesos: relacional. La identidad y el activo se indican por nombre en el Excel
// y se resuelven a sus IDs contra la BD del tenant (ambos son obligatorios).
const COLUMNAS_REQUERIDAS = ['identidad', 'activo', 'nivel_acceso']

const NIVELES_VALIDOS    = ['lectura', 'escritura', 'administrador', 'root']
const CRITICIDAD_VALIDAS = ['critica', 'alta', 'media', 'baja', '']
const ENTORNOS_VALIDOS   = ['produccion', 'desarrollo', 'testing', 'staging', '']
const ESTADOS_VALIDOS    = ['activo', 'inactivo', 'suspendido', 'expirado', '']

async function validarFilaAcceso(fila, numFila, tenantDB) {
  const errores = []

  const identidadTxt = normalizar(fila.identidad)
  const activoTxt    = normalizar(fila.activo)
  const nivel        = normalizar(fila.nivel_acceso).toLowerCase()
  const criticidad   = normalizar(fila.criticidad).toLowerCase()
  const entorno      = normalizar(fila.entorno).toLowerCase()
  const estado       = normalizar(fila.estado).toLowerCase()

  if (!nivel || !NIVELES_VALIDOS.includes(nivel))
    errores.push({ fila: numFila, campo: 'nivel_acceso', error: `Nivel inválido: "${nivel}"`, sugerencia: `Usa: ${NIVELES_VALIDOS.join(', ')}` })
  if (criticidad && !CRITICIDAD_VALIDAS.includes(criticidad))
    errores.push({ fila: numFila, campo: 'criticidad', error: `Criticidad inválida: "${criticidad}"`, sugerencia: 'Usa: critica, alta, media o baja' })
  if (entorno && !ENTORNOS_VALIDOS.includes(entorno))
    errores.push({ fila: numFila, campo: 'entorno', error: `Entorno inválido: "${entorno}"`, sugerencia: 'Usa: produccion, desarrollo, testing o staging' })
  if (estado && !ESTADOS_VALIDOS.includes(estado))
    errores.push({ fila: numFila, campo: 'estado', error: `Estado inválido: "${estado}"`, sugerencia: 'Usa: activo, inactivo, suspendido o expirado' })

  // Resolver identidad (por su valor o por su nombre descriptivo) — obligatorio
  let identidadId = null
  if (!identidadTxt) {
    errores.push({ fila: numFila, campo: 'identidad', error: 'La identidad es obligatoria', sugerencia: 'Usa el valor o nombre exacto de una identidad existente' })
  } else {
    const [rows] = await tenantDB.execute('SELECT id FROM identidades WHERE identidad = ? OR nombre = ? LIMIT 1', [identidadTxt, identidadTxt])
    if (rows.length) identidadId = rows[0].id
    else errores.push({ fila: numFila, campo: 'identidad', error: `Identidad "${identidadTxt}" no encontrada`, sugerencia: 'Debe coincidir con una identidad ya cargada (créala o impórtala primero)' })
  }

  // Resolver activo (por nombre) — obligatorio
  let activoId = null
  if (!activoTxt) {
    errores.push({ fila: numFila, campo: 'activo', error: 'El activo es obligatorio', sugerencia: 'Usa el nombre exacto de un activo existente' })
  } else {
    const [rows] = await tenantDB.execute('SELECT id FROM activos WHERE nombre = ? LIMIT 1', [activoTxt])
    if (rows.length) activoId = rows[0].id
    else errores.push({ fila: numFila, campo: 'activo', error: `Activo "${activoTxt}" no encontrado`, sugerencia: 'Debe coincidir con un activo ya cargado (créalo o impórtalo primero)' })
  }

  const fechaOtorg = validarFecha(fila.fecha_otorgamiento)
  if (fila.fecha_otorgamiento && fila.fecha_otorgamiento !== '' && !fechaOtorg)
    errores.push({ fila: numFila, campo: 'fecha_otorgamiento', error: 'Fecha inválida', sugerencia: 'Usa YYYY-MM-DD o DD/MM/YYYY' })
  const fechaExp = validarFecha(fila.fecha_expiracion)
  if (fila.fecha_expiracion && fila.fecha_expiracion !== '' && !fechaExp)
    errores.push({ fila: numFila, campo: 'fecha_expiracion', error: 'Fecha inválida', sugerencia: 'Usa YYYY-MM-DD o DD/MM/YYYY' })

  return {
    valido: errores.length === 0,
    errores,
    datos: errores.length === 0 ? {
      identidad_id:       identidadId,
      activo_id:          activoId,
      nivel_acceso:       nivel,
      criticidad:         criticidad || null,
      entorno:            entorno || null,
      estado:             estado || 'activo',
      fecha_otorgamiento: fechaOtorg,
      fecha_expiracion:   fechaExp,
      quien_autorizo:     normalizar(fila.quien_autorizo) || null,
      justificacion:      normalizar(fila.justificacion) || null,
    } : null,
  }
}

module.exports = { COLUMNAS_REQUERIDAS, validarFilaAcceso }
