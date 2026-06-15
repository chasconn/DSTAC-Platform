const { normalizar, validarFecha } = require('../importador')

// Riesgos: probabilidad e impacto en escala 1-5 (el nivel se calcula solo en BD).
// El activo es opcional y se resuelve por nombre (warning si no existe).
const COLUMNAS_REQUERIDAS = ['nombre', 'categoria', 'amenaza', 'probabilidad', 'impacto']

const CATEGORIAS_VALIDAS  = ['tecnico', 'operacional', 'humano', 'externo', 'legal']
const TRATAMIENTOS_VALIDOS = ['mitigar', 'aceptar', 'transferir', 'evitar', '']

const escala = (v) => { const n = parseInt(normalizar(v), 10); return (n >= 1 && n <= 5) ? n : null }

async function validarFilaRiesgo(fila, numFila, tenantDB) {
  const errores  = []
  const warnings = []

  const nombre    = normalizar(fila.nombre)
  const categoria = normalizar(fila.categoria).toLowerCase()
  const amenaza   = normalizar(fila.amenaza)
  const prob      = escala(fila.probabilidad)
  const imp       = escala(fila.impacto)
  const trat      = normalizar(fila.tipo_tratamiento).toLowerCase()
  const activoTxt = normalizar(fila.activo)

  if (!nombre)  errores.push({ fila: numFila, campo: 'nombre', error: 'El nombre es obligatorio', sugerencia: 'Ej: "Acceso no autorizado a la BD"' })
  if (!CATEGORIAS_VALIDAS.includes(categoria)) errores.push({ fila: numFila, campo: 'categoria', error: `Categoría inválida: "${categoria}"`, sugerencia: `Usa: ${CATEGORIAS_VALIDAS.join(', ')}` })
  if (!amenaza) errores.push({ fila: numFila, campo: 'amenaza', error: 'La amenaza es obligatoria', sugerencia: 'Ej: "Atacante externo, ransomware"' })
  if (prob === null) errores.push({ fila: numFila, campo: 'probabilidad', error: `Probabilidad inválida: "${normalizar(fila.probabilidad)}"`, sugerencia: 'Número entero del 1 al 5' })
  if (imp === null)  errores.push({ fila: numFila, campo: 'impacto', error: `Impacto inválido: "${normalizar(fila.impacto)}"`, sugerencia: 'Número entero del 1 al 5' })
  if (trat && !TRATAMIENTOS_VALIDOS.includes(trat)) errores.push({ fila: numFila, campo: 'tipo_tratamiento', error: `Tratamiento inválido: "${trat}"`, sugerencia: 'Usa: mitigar, aceptar, transferir o evitar' })

  const rprob = fila.residual_probabilidad !== '' && fila.residual_probabilidad != null ? escala(fila.residual_probabilidad) : null
  const rimp  = fila.residual_impacto !== '' && fila.residual_impacto != null ? escala(fila.residual_impacto) : null
  if (fila.residual_probabilidad && fila.residual_probabilidad !== '' && rprob === null) errores.push({ fila: numFila, campo: 'residual_probabilidad', error: 'Debe ser 1 a 5', sugerencia: 'Número entero del 1 al 5' })
  if (fila.residual_impacto && fila.residual_impacto !== '' && rimp === null) errores.push({ fila: numFila, campo: 'residual_impacto', error: 'Debe ser 1 a 5', sugerencia: 'Número entero del 1 al 5' })

  // Activo opcional — warning si no existe
  let activoId = null, activoNombre = null
  if (activoTxt) {
    const [rows] = await tenantDB.execute('SELECT id, nombre FROM activos WHERE nombre = ? LIMIT 1', [activoTxt])
    if (rows.length) { activoId = rows[0].id; activoNombre = rows[0].nombre }
    else { activoNombre = activoTxt; warnings.push({ fila: numFila, campo: 'activo', aviso: `Activo "${activoTxt}" no encontrado`, resultado: 'Se guardará el nombre sin enlazar al activo' }) }
  }

  const fechaLimite = validarFecha(fila.fecha_limite)
  if (fila.fecha_limite && fila.fecha_limite !== '' && !fechaLimite) errores.push({ fila: numFila, campo: 'fecha_limite', error: 'Fecha inválida', sugerencia: 'Usa YYYY-MM-DD o DD/MM/YYYY' })

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    datos: errores.length === 0 ? {
      nombre,
      descripcion:      normalizar(fila.descripcion) || null,
      categoria,
      activo_id:        activoId,
      activo_nombre:    activoNombre,
      amenaza,
      vulnerabilidad:   normalizar(fila.vulnerabilidad) || null,
      probabilidad:     prob,
      impacto:          imp,
      tipo_tratamiento: trat || null,
      plan_tratamiento: normalizar(fila.plan_tratamiento) || null,
      responsable:      normalizar(fila.responsable) || null,
      fecha_limite:     fechaLimite,
      residual_probabilidad: rprob,
      residual_impacto:      rimp,
      notas_dstac:      normalizar(fila.notas_dstac) || null,
    } : null,
  }
}

module.exports = { COLUMNAS_REQUERIDAS, validarFilaRiesgo }
