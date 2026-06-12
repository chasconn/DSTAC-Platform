const XLSX = require('xlsx')

function crearWorkbook(hojaDatos, nombreHoja, instrucciones) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(hojaDatos)
  const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones)
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function generarPlantillaPersonal() {
  const datos = [
    ['nombre', 'rol_empresarial', 'nivel_responsabilidad', 'estado', 'fecha_ingreso', 'correo', 'telefono'],
    ['Juan Pérez', 'Jefe de TI', 'alto', 'activo', '2024-01-15', 'jperez@empresa.cl', '+56912345678'],
  ]

  const instrucciones = [
    ['PLANTILLA — PERSONAL'],
    [''],
    ['1. Completa los datos a partir de la fila 3 (la fila 2 es solo un ejemplo)'],
    ['2. No modifiques los nombres de las columnas (fila 1)'],
    ['3. Campos obligatorios: nombre'],
    ['4. nivel_responsabilidad: alto / medio / bajo'],
    ['5. estado: activo / inactivo / vacaciones / desvinculado'],
    ['6. fecha_ingreso: formato YYYY-MM-DD o DD/MM/YYYY'],
    ['7. correo: formato nombre@dominio.com (opcional)'],
    ['8. telefono: cualquier formato (opcional)'],
    ['9. Las filas con errores NO se importan; las válidas sí'],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(datos)
  ws['!cols'] = [{ wch: 28 }, { wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Personal')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instrucciones), 'Instrucciones')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function generarPlantillaActivos() {
  const datos = [
    ['nombre', 'tipo', 'criticidad', 'estado', 'ambiente', 'proveedor', 'proyecto', 'ip', 'sistema_operativo', 'version', 'documentacion'],
    ['Servidor Web', 'servidor', 'critica', 'operativo', 'produccion', 'AWS', 'Web principal', '10.0.1.45', 'Ubuntu 22.04', '22.04.3', 'Servidor nginx principal'],
  ]

  const instrucciones = [
    ['PLANTILLA — ACTIVOS'],
    [''],
    ['1. Completa los datos a partir de la fila 3 (la fila 2 es solo un ejemplo)'],
    ['2. No modifiques los nombres de las columnas (fila 1)'],
    ['3. Campos obligatorios: nombre, tipo, criticidad'],
    ['4. tipo: servidor / base de datos / red / aplicación / nube / endpoint / otro'],
    ['5. criticidad: critica / alta / media / baja'],
    ['6. estado: operativo / degradado / fuera_de_servicio / en_mantencion'],
    ['7. ambiente: produccion / desarrollo / testing / staging / otro'],
    ['8. ip, sistema_operativo, version, documentacion: opcionales'],
    ['9. Las filas con errores NO se importan; las válidas sí'],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(datos)
  ws['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 28 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Activos')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instrucciones), 'Instrucciones')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function generarPlantillaIdentidades() {
  const datos = [
    ['nombre', 'identidad', 'tipo_identidad', 'origen', 'estado', 'propietario', 'fecha_creacion', 'fecha_revision', 'fecha_expiracion', 'notas'],
    ['Juan Pérez AD', 'jperez@empresa.cl', 'usuario', 'Active Directory', 'activa', 'Juan Pérez', '2024-01-15', '2024-07-15', '2025-01-15', 'Cuenta corporativa'],
  ]

  const instrucciones = [
    ['PLANTILLA — IDENTIDADES'],
    [''],
    ['1. Completa los datos a partir de la fila 3 (la fila 2 es solo un ejemplo)'],
    ['2. No modifiques los nombres de las columnas (fila 1)'],
    ['3. Campos obligatorios: nombre, identidad, tipo_identidad'],
    ['4. tipo_identidad: usuario / cuenta_servicio / api_key / certificado / grupo / otro'],
    ['5. estado: activa / inactiva / comprometida / expirada / pendiente'],
    ['6. propietario: nombre exacto como aparece en el módulo Personal'],
    ['   Si no se encuentra, la identidad se importa sin propietario (advertencia)'],
    ['7. fechas: formato YYYY-MM-DD o DD/MM/YYYY (opcionales)'],
    ['8. Las filas con errores NO se importan; las válidas sí'],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(datos)
  ws['!cols'] = [
    { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
    { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 28 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Identidades')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instrucciones), 'Instrucciones')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { generarPlantillaPersonal, generarPlantillaActivos, generarPlantillaIdentidades }
