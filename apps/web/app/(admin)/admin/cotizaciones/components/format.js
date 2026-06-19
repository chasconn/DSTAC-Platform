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

// Calcula neto / IVA 19% / total a partir de las líneas, separando lo de pago
// único de lo mensual recurrente (mezclarlos en una sola cifra confunde al cliente).
export function totales(items = []) {
  const sub = (it) => (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)
  const netoUnico = items.filter(it => it.tipo !== 'mensual').reduce((s, it) => s + sub(it), 0)
  const netoMensual = items.filter(it => it.tipo === 'mensual').reduce((s, it) => s + sub(it), 0)
  const ivaUnico = Math.round(netoUnico * 0.19)
  const ivaMensual = Math.round(netoMensual * 0.19)
  const neto = netoUnico + netoMensual
  const iva = ivaUnico + ivaMensual
  return {
    neto, iva, total: neto + iva,
    netoUnico, ivaUnico, totalUnico: netoUnico + ivaUnico,
    netoMensual, ivaMensual, totalMensual: netoMensual + ivaMensual,
  }
}
