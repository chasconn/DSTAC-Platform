const { normalizar } = require('../importador')

const COLUMNAS_REQUERIDAS = ['nombre', 'tipo', 'criticidad']

const TIPOS_VALIDOS       = ['servidor', 'base de datos', 'red', 'aplicación', 'aplicacion', 'nube', 'endpoint', 'otro']
const CRITICIDADES_VALIDAS = ['critica', 'alta', 'media', 'baja']
const ESTADOS_VALIDOS     = ['operativo', 'degradado', 'fuera_de_servicio', 'en_mantencion', '']
const AMBIENTES_VALIDOS   = ['produccion', 'desarrollo', 'testing', 'staging', 'otro', '']

// Normaliza "aplicación" → "aplicacion" para la BD (sin tilde, como lo guarda el sistema)
function normalizarTipo(tipo) {
  return tipo.replace('aplicación', 'aplicacion')
}

// Valida una fila del Excel de Activos y devuelve { valido, errores, datos }
function validarFilaActivo(fila, numFila) {
  const errores = []

  const nombre     = normalizar(fila.nombre)
  const tipo       = normalizar(fila.tipo).toLowerCase()
  const criticidad = normalizar(fila.criticidad).toLowerCase()
  const estado     = normalizar(fila.estado).toLowerCase()
  const ambiente   = normalizar(fila.ambiente).toLowerCase()

  if (!nombre)
    errores.push({ fila: numFila, campo: 'nombre', error: 'El nombre es obligatorio', sugerencia: 'Ingresa el nombre del activo' })

  if (!tipo || !TIPOS_VALIDOS.includes(tipo))
    errores.push({ fila: numFila, campo: 'tipo', error: `Tipo inválido: "${tipo}"`, sugerencia: 'Usa: servidor, base de datos, red, aplicación, nube, endpoint u otro' })

  if (!criticidad || !CRITICIDADES_VALIDAS.includes(criticidad))
    errores.push({ fila: numFila, campo: 'criticidad', error: `Criticidad inválida: "${criticidad}"`, sugerencia: 'Usa: critica, alta, media o baja' })

  if (estado && !ESTADOS_VALIDOS.includes(estado))
    errores.push({ fila: numFila, campo: 'estado', error: `Estado inválido: "${estado}"`, sugerencia: 'Usa: operativo, degradado, fuera_de_servicio o en_mantencion' })

  if (ambiente && !AMBIENTES_VALIDOS.includes(ambiente))
    errores.push({ fila: numFila, campo: 'ambiente', error: `Ambiente inválido: "${ambiente}"`, sugerencia: 'Usa: produccion, desarrollo, testing, staging u otro' })

  if (errores.length > 0) return { valido: false, errores, datos: null }

  // Campos técnicos opcionales — se guardan en metadata JSON
  const ip      = normalizar(fila.ip) || null
  const so      = normalizar(fila.sistema_operativo) || null
  const version = normalizar(fila.version) || null
  const metadata = {}
  if (ip)      metadata.ip = ip
  if (so)      metadata.sistema_operativo = so
  if (version) metadata.version = version

  return {
    valido: true,
    errores: [],
    datos: {
      nombre,
      tipo:         normalizarTipo(tipo),
      criticidad,
      estado:       estado || 'operativo',
      ambiente:     ambiente || null,
      proveedor:    normalizar(fila.proveedor) || null,
      proyecto:     normalizar(fila.proyecto)  || null,
      documentacion: normalizar(fila.documentacion) || null,
      metadata:     Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
    },
  }
}

module.exports = { COLUMNAS_REQUERIDAS, validarFilaActivo }
