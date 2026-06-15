const { normalizar, validarFecha } = require('../importador')

// Incidentes. El activo es opcional (por nombre). Las fechas aceptan fecha y hora.
const COLUMNAS_REQUERIDAS = ['tipo', 'severidad']

const SEVERIDADES_VALIDAS = ['critica', 'alta', 'media', 'baja']
const IMPACTOS_VALIDOS    = ['critico', 'alto', 'medio', 'bajo', '']
const ESTADOS_VALIDOS     = ['abierto', 'en_investigacion', 'en_respuesta', 'cerrado', 'falso_positivo', '']

async function validarFilaIncidente(fila, numFila, tenantDB) {
  const errores  = []
  const warnings = []

  const tipo      = normalizar(fila.tipo)
  const severidad = normalizar(fila.severidad).toLowerCase()
  const impacto   = normalizar(fila.impacto).toLowerCase()
  const estado    = normalizar(fila.estado).toLowerCase()
  const activoTxt = normalizar(fila.activo)

  if (!tipo) errores.push({ fila: numFila, campo: 'tipo', error: 'El tipo es obligatorio', sugerencia: 'Ej: "Phishing", "Malware", "Acceso no autorizado"' })
  if (!SEVERIDADES_VALIDAS.includes(severidad)) errores.push({ fila: numFila, campo: 'severidad', error: `Severidad inválida: "${severidad}"`, sugerencia: `Usa: ${SEVERIDADES_VALIDAS.join(', ')}` })
  if (impacto && !IMPACTOS_VALIDOS.includes(impacto)) errores.push({ fila: numFila, campo: 'impacto', error: `Impacto inválido: "${impacto}"`, sugerencia: 'Usa: critico, alto, medio o bajo' })
  if (estado && !ESTADOS_VALIDOS.includes(estado)) errores.push({ fila: numFila, campo: 'estado', error: `Estado inválido: "${estado}"`, sugerencia: 'Usa: abierto, en_investigacion, en_respuesta, cerrado o falso_positivo' })

  let cvss = null
  if (fila.cvss !== '' && fila.cvss != null) {
    const n = parseFloat(normalizar(fila.cvss))
    if (isNaN(n) || n < 0 || n > 10) errores.push({ fila: numFila, campo: 'cvss', error: `CVSS inválido: "${normalizar(fila.cvss)}"`, sugerencia: 'Número del 0.0 al 10.0' })
    else cvss = n
  }

  // Activo opcional — warning si no existe
  let activoId = null
  if (activoTxt) {
    const [rows] = await tenantDB.execute('SELECT id FROM activos WHERE nombre = ? LIMIT 1', [activoTxt])
    if (rows.length) activoId = rows[0].id
    else warnings.push({ fila: numFila, campo: 'activo', aviso: `Activo "${activoTxt}" no encontrado`, resultado: 'El incidente se importará sin activo asociado' })
  }

  const fechaDet = validarFecha(fila.fecha_deteccion)
  const fechaResp = validarFecha(fila.fecha_respuesta)

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    datos: errores.length === 0 ? {
      tipo,
      categoria:        normalizar(fila.categoria) || null,
      estado:           estado || 'abierto',
      severidad,
      impacto:          impacto || null,
      descripcion:      normalizar(fila.descripcion) || null,
      causa_raiz:       normalizar(fila.causa_raiz) || null,
      vulnerabilidades: normalizar(fila.vulnerabilidades) || null,
      cvss,
      activo_id:        activoId,
      proyecto:         normalizar(fila.proyecto) || null,
      responsable:      normalizar(fila.responsable) || null,
      fecha_deteccion:  fechaDet,
      fecha_respuesta:  fechaResp,
      requiere_notificacion_legal: /^(s[ií]|si|true|1|x)$/i.test(normalizar(fila.requiere_notificacion_legal)) ? 1 : 0,
    } : null,
  }
}

module.exports = { COLUMNAS_REQUERIDAS, validarFilaIncidente }
