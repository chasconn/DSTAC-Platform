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

// Construye una plantilla genérica (hoja de datos + hoja de instrucciones).
function plantilla(nombreHoja, encabezados, ejemplo, anchos, instrucciones) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ejemplo])
  ws['!cols'] = anchos.map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instrucciones), 'Instrucciones')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function generarPlantillaAccesos() {
  return plantilla('Accesos',
    ['identidad', 'activo', 'nivel_acceso', 'criticidad', 'entorno', 'estado', 'fecha_otorgamiento', 'fecha_expiracion', 'quien_autorizo', 'justificacion'],
    ['jperez@empresa.cl', 'Servidor Web', 'administrador', 'alta', 'produccion', 'activo', '2024-01-15', '2025-01-15', 'Jefe de TI', 'Administración del servidor'],
    [26, 24, 16, 12, 14, 12, 18, 18, 20, 30],
    [
      ['PLANTILLA — ACCESOS'], [''],
      ['1. Completa los datos a partir de la fila 3 (la fila 2 es solo un ejemplo)'],
      ['2. No modifiques los nombres de las columnas (fila 1)'],
      ['3. Obligatorios: identidad, activo, nivel_acceso'],
      ['4. identidad: valor o nombre EXACTO de una identidad ya cargada'],
      ['5. activo: nombre EXACTO de un activo ya cargado'],
      ['   (Si la identidad o el activo no existen, la fila NO se importa)'],
      ['6. nivel_acceso: lectura / escritura / administrador / root'],
      ['7. criticidad: critica / alta / media / baja'],
      ['8. entorno: produccion / desarrollo / testing / staging'],
      ['9. estado: activo / inactivo / suspendido / expirado'],
      ['10. fechas: YYYY-MM-DD o DD/MM/YYYY (opcionales)'],
    ])
}

function generarPlantillaRiesgos() {
  return plantilla('Riesgos',
    ['nombre', 'descripcion', 'categoria', 'activo', 'amenaza', 'vulnerabilidad', 'probabilidad', 'impacto', 'tipo_tratamiento', 'plan_tratamiento', 'responsable', 'fecha_limite', 'residual_probabilidad', 'residual_impacto', 'notas_dstac'],
    ['Acceso no autorizado a la BD', 'Exposición de datos de clientes', 'tecnico', 'Servidor Web', 'Atacante externo', 'Falta de MFA', 4, 5, 'mitigar', 'Implementar MFA y segmentar', 'Jefe de TI', '2025-03-01', 2, 4, ''],
    [30, 30, 14, 22, 24, 22, 13, 10, 16, 28, 18, 14, 20, 16, 24],
    [
      ['PLANTILLA — RIESGOS'], [''],
      ['1. Completa los datos a partir de la fila 3 (la fila 2 es solo un ejemplo)'],
      ['2. No modifiques los nombres de las columnas (fila 1)'],
      ['3. Obligatorios: nombre, categoria, amenaza, probabilidad, impacto'],
      ['4. categoria: tecnico / operacional / humano / externo / legal'],
      ['5. probabilidad e impacto: número entero del 1 al 5'],
      ['   (El nivel de riesgo se calcula solo = probabilidad × impacto)'],
      ['6. activo: nombre de un activo existente (opcional; si no existe se guarda el texto)'],
      ['7. tipo_tratamiento: mitigar / aceptar / transferir / evitar (opcional)'],
      ['8. residual_probabilidad / residual_impacto: 1 a 5 (opcionales)'],
      ['9. fecha_limite: YYYY-MM-DD o DD/MM/YYYY (opcional)'],
    ])
}

function generarPlantillaIncidentes() {
  return plantilla('Incidentes',
    ['tipo', 'categoria', 'severidad', 'impacto', 'estado', 'descripcion', 'causa_raiz', 'vulnerabilidades', 'cvss', 'activo', 'proyecto', 'responsable', 'fecha_deteccion', 'fecha_respuesta', 'requiere_notificacion_legal'],
    ['Phishing', 'Ingeniería social', 'alta', 'alto', 'abierto', 'Correo malicioso a finanzas', 'Falta de filtro anti-phishing', 'Usuario sin capacitación', 7.5, 'Servidor de correo', 'Operación', 'Analista DSTAC', '2024-06-01', '', 'no'],
    [18, 18, 12, 10, 16, 30, 24, 24, 8, 20, 16, 18, 18, 18, 14],
    [
      ['PLANTILLA — INCIDENTES'], [''],
      ['1. Completa los datos a partir de la fila 3 (la fila 2 es solo un ejemplo)'],
      ['2. No modifiques los nombres de las columnas (fila 1)'],
      ['3. Obligatorios: tipo, severidad'],
      ['4. severidad: critica / alta / media / baja'],
      ['5. impacto: critico / alto / medio / bajo (opcional)'],
      ['6. estado: abierto / en_investigacion / en_respuesta / cerrado / falso_positivo'],
      ['7. cvss: número del 0.0 al 10.0 (opcional)'],
      ['8. activo: nombre de un activo existente (opcional)'],
      ['9. fechas: YYYY-MM-DD o DD/MM/YYYY (opcionales)'],
      ['10. requiere_notificacion_legal: si / no'],
    ])
}

function generarPlantillaCotizacionLineas() {
  return plantilla('Lineas',
    ['servicio', 'detalle', 'tipo', 'cantidad', 'precio_unitario'],
    ['Diagnóstico de Postura de Seguridad', 'Evaluación inicial (2-3 semanas)', 'unico', 1, 1200000],
    [36, 36, 12, 10, 16],
    [
      ['PLANTILLA — LÍNEAS DE COTIZACIÓN'], [''],
      ['1. Completa los datos a partir de la fila 3 (la fila 2 es solo un ejemplo)'],
      ['2. No modifiques los nombres de las columnas (fila 1)'],
      ['3. Obligatorio: servicio'],
      ['4. tipo: unico / mensual'],
      ['5. cantidad: número entero (por defecto 1)'],
      ['6. precio_unitario: número en CLP, sin puntos ni símbolo $ (ej: 1200000)'],
    ])
}

module.exports = {
  generarPlantillaPersonal, generarPlantillaActivos, generarPlantillaIdentidades,
  generarPlantillaAccesos, generarPlantillaRiesgos, generarPlantillaIncidentes,
  generarPlantillaCotizacionLineas,
}
