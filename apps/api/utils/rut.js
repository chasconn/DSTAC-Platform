// Normaliza un RUT chileno a formato NNNNNNNN-X (sin puntos, con guión,
// verificador en mayúscula). Devuelve null si queda vacío.
function normalizarRut(rut) {
  if (!rut) return null
  const limpio = String(rut).toUpperCase().replace(/[^0-9K-]/g, '').replace(/-+/g, '-')
  return limpio || null
}

module.exports = { normalizarRut }
