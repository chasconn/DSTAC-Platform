// Helpers compartidos del módulo de Cotizaciones.

// Formato de pesos chilenos: 1234567 → "$1.234.567"
export function clp(n) {
  const v = Number(n) || 0
  return '$' + new Intl.NumberFormat('es-CL').format(v)
}

export const ESTADO = {
  borrador:  { label: 'Borrador',  bg: '#F1EFE8', text: '#444441' },
  enviada:   { label: 'Enviada',   bg: '#E6F1FB', text: '#0C447C' },
  aceptada:  { label: 'Aceptada',  bg: '#EAF3DE', text: '#27500A' },
  rechazada: { label: 'Rechazada', bg: '#FCEBEB', text: '#791F1F' },
  vencida:   { label: 'Vencida',   bg: '#FEF3E2', text: '#633806' },
}

export const TIPO_LINEA = { unico: 'Único', mensual: 'Mensual' }

// Calcula neto / IVA 19% / total a partir de las líneas.
export function totales(items = []) {
  const neto = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0)
  const iva = Math.round(neto * 0.19)
  return { neto, iva, total: neto + iva }
}
