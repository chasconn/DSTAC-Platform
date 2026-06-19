// Categorías de gasto interno DSTAC + métodos de pago. Lista cerrada para
// mantener reportes y gráficos consistentes (evita variantes de texto libre).
const CATEGORIAS = [
  'Infraestructura y Hosting',
  'Software y Licencias',
  'Marketing y Publicidad',
  'Oficina y Suministros',
  'Viáticos y Movilización',
  'Capacitación',
  'Servicios Profesionales',
  'Sueldos y Honorarios',
  'Equipamiento',
  'Impuestos',
  'Otros',
]

const METODOS_PAGO = [
  { value: 'transferencia',     label: 'Transferencia' },
  { value: 'tarjeta_empresa',   label: 'Tarjeta empresa' },
  { value: 'tarjeta_personal',  label: 'Tarjeta personal (reembolso)' },
  { value: 'efectivo',          label: 'Efectivo' },
  { value: 'otro',              label: 'Otro' },
]

module.exports = { CATEGORIAS, METODOS_PAGO }
