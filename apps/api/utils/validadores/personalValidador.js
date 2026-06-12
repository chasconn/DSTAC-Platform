const { normalizar, validarFecha, validarEmail } = require('../importador')

const COLUMNAS_REQUERIDAS = ['nombre']

const NIVELES_VALIDOS = ['alto', 'medio', 'bajo', '']
const ESTADOS_VALIDOS = ['activo', 'inactivo', 'vacaciones', 'desvinculado', '']

// Valida una fila del Excel de Personal y devuelve { valido, errores, datos }
function validarFilaPersonal(fila, numFila) {
  const errores = []

  const nombre  = normalizar(fila.nombre)
  const nivel   = normalizar(fila.nivel_responsabilidad).toLowerCase()
  const estado  = normalizar(fila.estado).toLowerCase()
  const correo  = normalizar(fila.correo)

  if (!nombre)
    errores.push({ fila: numFila, campo: 'nombre', error: 'El nombre es obligatorio', sugerencia: 'Ingresa el nombre completo de la persona' })

  if (nivel && !NIVELES_VALIDOS.includes(nivel))
    errores.push({ fila: numFila, campo: 'nivel_responsabilidad', error: `Valor inválido: "${nivel}"`, sugerencia: 'Usa: alto, medio o bajo' })

  if (estado && !ESTADOS_VALIDOS.includes(estado))
    errores.push({ fila: numFila, campo: 'estado', error: `Valor inválido: "${estado}"`, sugerencia: 'Usa: activo, inactivo, vacaciones o desvinculado' })

  if (correo && !validarEmail(correo))
    errores.push({ fila: numFila, campo: 'correo', error: `Email inválido: "${correo}"`, sugerencia: 'Formato esperado: nombre@dominio.com' })

  const fechaIngreso = validarFecha(fila.fecha_ingreso)
  if (fila.fecha_ingreso && !fechaIngreso)
    errores.push({ fila: numFila, campo: 'fecha_ingreso', error: 'Formato de fecha inválido', sugerencia: 'Usa formato YYYY-MM-DD o DD/MM/YYYY' })

  return {
    valido: errores.length === 0,
    errores,
    datos: errores.length === 0 ? {
      nombre,
      rol_empresarial:       normalizar(fila.rol_empresarial) || null,
      nivel_responsabilidad: nivel || null,
      estado:                estado || 'activo',
      fecha_ingreso:         fechaIngreso,
      correo:                correo || null,
      telefono:              normalizar(fila.telefono) || null,
    } : null,
  }
}

module.exports = { COLUMNAS_REQUERIDAS, validarFilaPersonal }
