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
// El descuento (porcentaje 0-100 o monto fijo CLP) se aplica sobre el neto bruto antes
// de IVA, repartido proporcionalmente entre único y mensual según su peso.
export function totales(items = [], descuento = {}) {
  const sub = (it) => (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)
  const netoUnicoBruto = items.filter(it => it.tipo !== 'mensual').reduce((s, it) => s + sub(it), 0)
  const netoMensualBruto = items.filter(it => it.tipo === 'mensual').reduce((s, it) => s + sub(it), 0)
  const netoBruto = netoUnicoBruto + netoMensualBruto

  const valor = Number(descuento?.valor) || 0
  let descuentoMonto = 0
  if (valor > 0) {
    descuentoMonto = descuento?.tipo === 'monto'
      ? Math.min(valor, netoBruto)
      : Math.round(netoBruto * (Math.min(valor, 100) / 100))
  }
  const shareUnico = netoBruto > 0 ? netoUnicoBruto / netoBruto : 0
  const descUnico = Math.round(descuentoMonto * shareUnico)
  const descMensual = descuentoMonto - descUnico

  const netoUnico = netoUnicoBruto - descUnico
  const netoMensual = netoMensualBruto - descMensual
  const ivaUnico = Math.round(netoUnico * 0.19)
  const ivaMensual = Math.round(netoMensual * 0.19)
  const neto = netoUnico + netoMensual
  const iva = ivaUnico + ivaMensual
  return {
    netoBruto, descuentoMonto,
    neto, iva, total: neto + iva,
    netoUnicoBruto, descUnico, netoUnico, ivaUnico, totalUnico: netoUnico + ivaUnico,
    netoMensualBruto, descMensual, netoMensual, ivaMensual, totalMensual: netoMensual + ivaMensual,
  }
}
