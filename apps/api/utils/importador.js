const XLSX = require('xlsx')

// Lee un buffer de Excel y devuelve array de objetos (una fila = un objeto)
function leerExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet    = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

// Verifica que el archivo tiene las columnas mínimas esperadas para el módulo
function validarColumnas(filas, columnasRequeridas) {
  if (!filas.length) return { valido: false, error: 'El archivo está vacío' }
  const columnasArchivo = Object.keys(filas[0]).map(c => c.toLowerCase().trim())
  const faltantes = columnasRequeridas.filter(
    col => !columnasArchivo.includes(col.toLowerCase())
  )
  if (faltantes.length) {
    return {
      valido: false,
      error: `El archivo no corresponde a esta plantilla. Columnas faltantes: ${faltantes.join(', ')}`,
    }
  }
  return { valido: true }
}

// Convierte cualquier valor de celda a string limpio
function normalizar(valor) {
  if (valor === null || valor === undefined) return ''
  return String(valor).trim()
}

// Parsea fechas en YYYY-MM-DD, DD/MM/YYYY, o número serial de Excel
function validarFecha(valor) {
  if (!valor && valor !== 0) return null
  const str = normalizar(valor)

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }

  // Excel puede pasar fechas como número serial (días desde 1900-01-01)
  if (typeof valor === 'number' && valor > 1000) {
    const fecha = new Date((valor - 25569) * 86400 * 1000)
    if (!isNaN(fecha.getTime())) return fecha.toISOString().split('T')[0]
  }

  return null
}

// Valida formato de email; retorna true si es vacío (campo opcional)
function validarEmail(valor) {
  if (!valor) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizar(valor))
}

module.exports = { leerExcel, validarColumnas, normalizar, validarFecha, validarEmail }
