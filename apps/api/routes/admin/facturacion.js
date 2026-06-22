// Facturación — facturas/boletas emitidas a empresas clientes (BD central,
// cross-tenant). Solo personal DSTAC. Cabecera (facturas) + líneas (factura_items).
// La emisión real del DTE ante el SII se hace vía el microservicio LibreDTE
// (ver apps/dte/README.md); hasta que DTE_SERVICE_URL esté configurado, el
// endpoint /emitir-sii devuelve un error explicando qué falta.
const router = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')
const { emitirDTE } = require('../../services/facturacion/dteClient')

router.use(requireAuth, requireDstacRole)

const uid = (req) => req.user.id || req.user.user_id
const ESTADOS = ['borrador', 'emitida', 'timbrada', 'pagada', 'anulada', 'rechazada']
const IVA_RATE = 0.19

function calcularTotales(items = []) {
  const neto = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0)
  const iva = Math.round(neto * IVA_RATE)
  return { neto, iva, total: neto + iva }
}

async function siguienteNumero() {
  const year = new Date().getFullYear()
  const [[{ n }]] = await centralDB.execute(
    `SELECT COUNT(*) AS n FROM facturas WHERE numero LIKE ?`, [`FAC-${year}-%`]
  )
  return `FAC-${year}-${String(n + 1).padStart(3, '0')}`
}

async function guardarItems(facturaId, items = []) {
  let orden = 0
  for (const it of items) {
    if (!it.descripcion || !String(it.descripcion).trim()) continue
    await centralDB.execute(
      `INSERT INTO factura_items (factura_id, descripcion, cantidad, precio_unitario, orden)
       VALUES (?,?,?,?,?)`,
      [facturaId, String(it.descripcion).slice(0, 255), Number(it.cantidad) || 1, Number(it.precio_unitario) || 0, orden++]
    )
  }
}

// ─── GET /api/admin/facturacion/stats ────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [[totales]] = await centralDB.execute(
      `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad FROM facturas WHERE estado != 'anulada'`)
    const [[porPagar]] = await centralDB.execute(
      `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad FROM facturas WHERE estado IN ('emitida','timbrada')`)
    const [[pagado]] = await centralDB.execute(
      `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad FROM facturas WHERE estado = 'pagada'`)
    const [[vencidas]] = await centralDB.execute(
      `SELECT COUNT(*) AS cantidad FROM facturas WHERE estado IN ('emitida','timbrada') AND fecha_vencimiento < CURDATE()`)
    res.json({
      total: Number(totales.total), cantidad: Number(totales.cantidad),
      porPagar: Number(porPagar.total), porPagarCantidad: Number(porPagar.cantidad),
      pagado: Number(pagado.total), pagadoCantidad: Number(pagado.cantidad),
      vencidas: Number(vencidas.cantidad),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/facturacion ──────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { estado, company_id, search, page = 1, limit = 25 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const cond = [], params = []
    if (estado)     { cond.push('f.estado = ?');     params.push(estado) }
    if (company_id) { cond.push('f.company_id = ?'); params.push(company_id) }
    if (search)      { cond.push('(f.numero LIKE ? OR c.name LIKE ? OR f.glosa LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''

    const [rows] = await centralDB.execute(`
      SELECT f.*, c.name AS empresa_nombre, c.slug AS empresa_slug
      FROM facturas f
      JOIN companies c ON f.company_id = c.id
      ${where}
      ORDER BY f.fecha_emision DESC, f.id DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, params)

    const [[{ total }]] = await centralDB.execute(`SELECT COUNT(*) AS total FROM facturas f JOIN companies c ON f.company_id = c.id ${where}`, params)

    res.json({ facturas: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/facturacion/:id ──────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[f]] = await centralDB.execute(`
      SELECT f.*, c.name AS empresa_nombre, c.slug AS empresa_slug
      FROM facturas f JOIN companies c ON f.company_id = c.id
      WHERE f.id = ?`, [req.params.id])
    if (!f) return res.status(404).json({ error: 'Factura no encontrada' })
    const [items] = await centralDB.execute('SELECT * FROM factura_items WHERE factura_id = ? ORDER BY orden, id', [req.params.id])
    res.json({ ...f, items })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/facturacion ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { company_id, tipo_dte, fecha_emision, fecha_vencimiento, glosa, notas, items } = req.body || {}
    if (!company_id || !fecha_emision) return res.status(400).json({ error: 'Empresa y fecha de emisión son requeridos' })
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Debe agregar al menos una línea' })

    const [[empresa]] = await centralDB.execute('SELECT id FROM companies WHERE id = ?', [company_id])
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' })

    const { neto, iva, total } = calcularTotales(items)
    const numero = await siguienteNumero()

    const [r] = await centralDB.execute(`
      INSERT INTO facturas (numero, company_id, tipo_dte, fecha_emision, fecha_vencimiento, glosa, notas, neto, iva, total, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [numero, company_id, ['33', '39', '61', '56'].includes(tipo_dte) ? tipo_dte : '33',
       fecha_emision, fecha_vencimiento || null, glosa || null, notas || null, neto, iva, total, uid(req)])

    await guardarItems(r.insertId, items)

    await registrarActividad({
      req, accion: 'crear', modulo: 'facturacion',
      descripcion: `Creó la factura ${numero} por $${total.toLocaleString('es-CL')}`,
      entidad_id: r.insertId, company_id,
    })

    res.status(201).json({ id: r.insertId, numero, message: 'Factura creada' })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/facturacion/:id ──────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const [[f]] = await centralDB.execute('SELECT estado FROM facturas WHERE id = ?', [req.params.id])
    if (!f) return res.status(404).json({ error: 'Factura no encontrada' })
    if (!['borrador', 'rechazada'].includes(f.estado)) {
      return res.status(400).json({ error: 'Solo se pueden editar facturas en borrador o rechazadas' })
    }

    const { fecha_emision, fecha_vencimiento, glosa, notas, items } = req.body || {}
    let neto = null, iva = null, total = null
    if (Array.isArray(items) && items.length) {
      ;({ neto, iva, total } = calcularTotales(items))
      await centralDB.execute('DELETE FROM factura_items WHERE factura_id = ?', [req.params.id])
      await guardarItems(req.params.id, items)
    }

    const fields = [], params = []
    const set = (col, val) => { if (val !== undefined && val !== null) { fields.push(`${col} = ?`); params.push(val) } }
    set('fecha_emision', fecha_emision); set('fecha_vencimiento', fecha_vencimiento || null)
    set('glosa', glosa); set('notas', notas); set('neto', neto); set('iva', iva); set('total', total)
    if (fields.length) {
      params.push(req.params.id)
      await centralDB.execute(`UPDATE facturas SET ${fields.join(', ')} WHERE id = ?`, params)
    }

    await registrarActividad({
      req, accion: 'editar', modulo: 'facturacion',
      descripcion: `Editó la factura #${req.params.id}`,
      entidad_id: req.params.id, company_id: null,
    })

    res.json({ message: 'Factura actualizada' })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/facturacion/:id/estado ───────────────────────────────────
router.put('/:id/estado', async (req, res, next) => {
  try {
    const { estado, fecha_pago } = req.body || {}
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado no válido' })

    const [[f]] = await centralDB.execute('SELECT numero FROM facturas WHERE id = ?', [req.params.id])
    if (!f) return res.status(404).json({ error: 'Factura no encontrada' })

    await centralDB.execute(
      'UPDATE facturas SET estado = ?, fecha_pago = ? WHERE id = ?',
      [estado, estado === 'pagada' ? (fecha_pago || new Date().toISOString().slice(0, 10)) : null, req.params.id]
    )

    await registrarActividad({
      req, accion: 'editar', modulo: 'facturacion',
      descripcion: `Cambió la factura ${f.numero} a estado "${estado}"`,
      entidad_id: req.params.id, company_id: null,
    })

    res.json({ message: 'Estado actualizado' })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/facturacion/:id/emitir-sii ──────────────────────────────
// Emite el DTE real ante el SII a través del microservicio LibreDTE.
router.post('/:id/emitir-sii', async (req, res, next) => {
  try {
    const [[factura]] = await centralDB.execute('SELECT * FROM facturas WHERE id = ?', [req.params.id])
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' })
    if (factura.estado !== 'borrador') return res.status(400).json({ error: 'Solo se puede emitir una factura en borrador' })

    const [items] = await centralDB.execute('SELECT * FROM factura_items WHERE factura_id = ? ORDER BY orden, id', [req.params.id])
    const [[company]] = await centralDB.execute('SELECT * FROM companies WHERE id = ?', [factura.company_id])

    const resultado = await emitirDTE({ factura, items, company })

    await centralDB.execute(
      `UPDATE facturas SET estado = 'timbrada', folio = ?, track_id = ?, estado_sii = ?, pdf_url = ? WHERE id = ?`,
      [resultado.folio || null, resultado.track_id || null, resultado.estado_sii || null, resultado.pdf_url || null, req.params.id]
    )

    await registrarActividad({
      req, accion: 'editar', modulo: 'facturacion',
      descripcion: `Emitió ante el SII la factura ${factura.numero} (folio ${resultado.folio})`,
      entidad_id: req.params.id, company_id: null,
    })

    res.json({ message: 'Factura emitida ante el SII', ...resultado })
  } catch (err) {
    // No es un error de servidor: es la falta de configuración del DTE_SERVICE_URL
    // o un rechazo del SII/microservicio. Se informa como 422 con el detalle.
    res.status(422).json({ error: err.message })
  }
})

// ─── DELETE /api/admin/facturacion/:id ───────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const [[f]] = await centralDB.execute('SELECT numero, estado FROM facturas WHERE id = ?', [req.params.id])
    if (!f) return res.status(404).json({ error: 'Factura no encontrada' })
    if (f.estado !== 'borrador') return res.status(400).json({ error: 'Solo se pueden eliminar facturas en borrador' })

    await centralDB.execute('DELETE FROM facturas WHERE id = ?', [req.params.id])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'facturacion',
      descripcion: `Eliminó la factura ${f.numero}`,
      entidad_id: req.params.id, company_id: null,
    })

    res.json({ message: 'Factura eliminada' })
  } catch (err) { next(err) }
})

module.exports = router
