// Cotizaciones — documentos comerciales de DSTAC (BD central, cross-tenant).
// Solo personal DSTAC. Cabecera + líneas + catálogo de servicios reutilizable.
const router = require('express').Router()
const multer = require('multer')
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')
const { leerExcel } = require('../../utils/importador')
const { generarPlantillaCotizacionLineas } = require('../../utils/plantillas')
const { htmlToPDF } = require('../../services/reportService')
const { sendMail } = require('../../services/emailService')
const { buildQuoteHtml } = require('../../services/cotizaciones/quoteHtml')

router.use(requireAuth, requireDstacRole)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (['xlsx', 'xls'].includes(ext)) return cb(null, true)
    cb(new Error('Solo se aceptan archivos Excel (.xlsx o .xls)'))
  },
})

// Plantilla de líneas para importar a una cotización
router.get('/plantilla-lineas', (req, res) => {
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="plantilla_lineas_cotizacion.xlsx"' })
  res.send(generarPlantillaCotizacionLineas())
})

// Parsea un Excel de líneas y las devuelve (NO inserta; el modal las agrega a la cotización)
router.post('/importar-lineas', upload.single('archivo'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })
    const filas = leerExcel(req.file.buffer)
    const lineas = [], errores = []
    filas.forEach((f, i) => {
      const servicio = String(f.servicio ?? '').trim()
      if (!servicio) { errores.push({ fila: i + 2, error: 'La columna "servicio" está vacía' }); return }
      const tipo = String(f.tipo ?? '').toLowerCase().trim() === 'mensual' ? 'mensual' : 'unico'
      const cantidad = parseInt(String(f.cantidad ?? '1').replace(/[^0-9]/g, ''), 10) || 1
      const precio = parseInt(String(f.precio_unitario ?? '0').replace(/[^0-9]/g, ''), 10) || 0
      lineas.push({ servicio: servicio.slice(0, 255), detalle: String(f.detalle ?? '').trim() || '', tipo, cantidad, precio_unitario: precio })
    })
    res.json({ lineas, errores, total: filas.length })
  } catch (err) { next(err) }
})

const uid = (req) => req.user.id || req.user.user_id
const ESTADOS = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida']
const IVA_RATE = 0.19

// Calcula neto/iva/total a partir de las líneas (CLP, enteros), aplicando un
// descuento opcional sobre el neto bruto antes de IVA (porcentaje 0-100 o monto fijo en CLP).
function calcularTotales(items = [], descuento = {}) {
  const netoBruto = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0)
  const valor = Number(descuento?.valor) || 0
  let descuentoMonto = 0
  if (valor > 0) {
    descuentoMonto = descuento?.tipo === 'monto'
      ? Math.min(valor, netoBruto)
      : Math.round(netoBruto * (Math.min(valor, 100) / 100))
  }
  const neto = netoBruto - descuentoMonto
  const iva = Math.round(neto * IVA_RATE)
  return { netoBruto, descuentoMonto, neto, iva, total: neto + iva }
}

// Genera el siguiente número COT-AAAA-NNN del año en curso.
async function siguienteNumero() {
  const year = new Date().getFullYear()
  const [[{ n }]] = await centralDB.execute(
    `SELECT COUNT(*) AS n FROM cotizaciones WHERE numero LIKE ?`, [`COT-${year}-%`]
  )
  return `COT-${year}-${String(n + 1).padStart(3, '0')}`
}

// Inserta las líneas de una cotización.
async function guardarItems(cotizacionId, items = []) {
  let orden = 0
  for (const it of items) {
    if (!it.servicio || !String(it.servicio).trim()) continue
    await centralDB.execute(
      `INSERT INTO cotizacion_items (cotizacion_id, servicio, detalle, tipo, cantidad, precio_unitario, orden)
       VALUES (?,?,?,?,?,?,?)`,
      [cotizacionId, String(it.servicio).slice(0, 255), it.detalle ?? null,
       it.tipo === 'mensual' ? 'mensual' : 'unico',
       Number(it.cantidad) || 1, Number(it.precio_unitario) || 0, orden++]
    )
  }
}

// ─── CATÁLOGO de servicios ─────────────────────────────────────────────────────
router.get('/catalogo', async (req, res, next) => {
  try {
    // ?todos=1 → incluye también los servicios desactivados (gestión del catálogo).
    // Por defecto solo activos (para armar cotizaciones).
    const where = req.query.todos ? '' : 'WHERE activo = 1'
    const [rows] = await centralDB.execute(
      `SELECT * FROM cotizacion_catalogo ${where} ORDER BY orden, id`
    )
    res.json({ catalogo: rows })
  } catch (err) { next(err) }
})

router.post('/catalogo', async (req, res, next) => {
  try {
    const { nombre, detalle, tipo, precio_sugerido, nivel, orden } = req.body
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
    const [r] = await centralDB.execute(
      `INSERT INTO cotizacion_catalogo (nombre, detalle, tipo, precio_sugerido, nivel, orden)
       VALUES (?,?,?,?,?,?)`,
      [nombre, detalle ?? null, tipo === 'mensual' ? 'mensual' : 'unico',
       precio_sugerido != null && precio_sugerido !== '' ? Number(precio_sugerido) : null,
       nivel ?? null, Number(orden) || 0]
    )
    res.status(201).json({ id: r.insertId })
  } catch (err) { next(err) }
})

router.put('/catalogo/:id', async (req, res, next) => {
  try {
    const { nombre, detalle, tipo, precio_sugerido, nivel, activo } = req.body
    const f = [], p = []
    if (nombre !== undefined)         { f.push('nombre = ?');          p.push(nombre) }
    if (detalle !== undefined)        { f.push('detalle = ?');         p.push(detalle || null) }
    if (tipo !== undefined)           { f.push('tipo = ?');            p.push(tipo === 'mensual' ? 'mensual' : 'unico') }
    if (precio_sugerido !== undefined){ f.push('precio_sugerido = ?'); p.push(precio_sugerido === '' || precio_sugerido == null ? null : Number(precio_sugerido)) }
    if (nivel !== undefined)          { f.push('nivel = ?');           p.push(nivel || null) }
    if (activo !== undefined)         { f.push('activo = ?');          p.push(activo ? 1 : 0) }
    if (!f.length) return res.status(400).json({ error: 'Sin cambios' })
    p.push(req.params.id)
    await centralDB.execute(`UPDATE cotizacion_catalogo SET ${f.join(', ')} WHERE id = ?`, p)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.delete('/catalogo/:id', async (req, res, next) => {
  try {
    await centralDB.execute('DELETE FROM cotizacion_catalogo WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── STATS ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [[c]] = await centralDB.execute(`
      SELECT
        COUNT(*)                       AS total,
        SUM(estado = 'borrador')       AS borradores,
        SUM(estado = 'enviada')        AS enviadas,
        SUM(estado = 'aceptada')       AS aceptadas,
        SUM(estado = 'rechazada')      AS rechazadas,
        COALESCE(SUM(CASE WHEN estado = 'aceptada' THEN total ELSE 0 END),0) AS monto_aceptado
      FROM cotizaciones
    `)
    res.json({
      total: Number(c.total), borradores: Number(c.borradores), enviadas: Number(c.enviadas),
      aceptadas: Number(c.aceptadas), rechazadas: Number(c.rechazadas),
      monto_aceptado: Number(c.monto_aceptado),
    })
  } catch (err) { next(err) }
})

// ─── LISTAR ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { estado, search } = req.query
    const cond = [], params = []
    if (estado) { cond.push('co.estado = ?'); params.push(estado) }
    if (search) { cond.push('(co.numero LIKE ? OR co.cliente_empresa LIKE ? OR co.cliente_contacto LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
    const [rows] = await centralDB.execute(`
      SELECT co.id, co.numero, co.estado, co.cliente_empresa, co.cliente_contacto,
             co.fecha, co.total, co.company_id, co.lead_id, co.created_at,
             c.name AS company_name
      FROM cotizaciones co
      LEFT JOIN companies c ON co.company_id = c.id
      ${where}
      ORDER BY co.created_at DESC, co.id DESC
    `, params)
    res.json({ cotizaciones: rows })
  } catch (err) { next(err) }
})

// ─── DETALLE (con líneas) ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[co]] = await centralDB.execute(`
      SELECT co.*, c.name AS company_name FROM cotizaciones co
      LEFT JOIN companies c ON co.company_id = c.id WHERE co.id = ?
    `, [req.params.id])
    if (!co) return res.status(404).json({ error: 'Cotización no encontrada' })
    const [items] = await centralDB.execute(
      `SELECT * FROM cotizacion_items WHERE cotizacion_id = ? ORDER BY orden, id`, [req.params.id]
    )
    res.json({ ...co, items })
  } catch (err) { next(err) }
})

// ─── CREAR ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.cliente_empresa && !b.company_id && !b.lead_id) {
      return res.status(400).json({ error: 'Indica el cliente (empresa o datos manuales)' })
    }
    const numero = await siguienteNumero()
    const descuentoTipo = ['porcentaje', 'monto'].includes(b.descuento_tipo) ? b.descuento_tipo : null
    const descuentoValor = descuentoTipo ? (Number(b.descuento_valor) || 0) : 0
    const { neto, iva, total } = calcularTotales(b.items, { tipo: descuentoTipo, valor: descuentoValor })

    const [r] = await centralDB.execute(`
      INSERT INTO cotizaciones
        (numero, estado, company_id, lead_id, cliente_empresa, cliente_rut, cliente_contacto,
         cliente_email, cliente_telefono, fecha, validez_dias, forma_pago, plazo_ejecucion,
         notas, descuento_tipo, descuento_valor, descuento_motivo, neto, iva, total, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      numero, ESTADOS.includes(b.estado) ? b.estado : 'borrador',
      b.company_id || null, b.lead_id || null,
      b.cliente_empresa ?? null, b.cliente_rut ?? null, b.cliente_contacto ?? null,
      b.cliente_email ?? null, b.cliente_telefono ?? null,
      b.fecha || new Date().toISOString().slice(0, 10),
      Number(b.validez_dias) || 15, b.forma_pago ?? null, b.plazo_ejecucion ?? null,
      b.notas ?? null, descuentoTipo, descuentoValor, b.descuento_motivo ?? null, neto, iva, total, uid(req),
    ])

    await guardarItems(r.insertId, b.items)
    await registrarActividad({
      req, accion: 'crear', modulo: 'cotizaciones',
      descripcion: `Creó la cotización ${numero}${b.cliente_empresa ? ` para ${b.cliente_empresa}` : ''}`,
      entidad_id: r.insertId, company_id: b.company_id || null,
    })
    res.status(201).json({ id: r.insertId, numero })
  } catch (err) { next(err) }
})

// ─── EDITAR (reemplaza líneas) ─────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const b = req.body || {}
    const [[prev]] = await centralDB.execute('SELECT numero FROM cotizaciones WHERE id = ?', [req.params.id])
    if (!prev) return res.status(404).json({ error: 'Cotización no encontrada' })

    const descuentoTipo = ['porcentaje', 'monto'].includes(b.descuento_tipo) ? b.descuento_tipo : null
    const descuentoValor = descuentoTipo ? (Number(b.descuento_valor) || 0) : 0
    const { neto, iva, total } = calcularTotales(b.items, { tipo: descuentoTipo, valor: descuentoValor })
    await centralDB.execute(`
      UPDATE cotizaciones SET
        estado = ?, company_id = ?, lead_id = ?, cliente_empresa = ?, cliente_rut = ?,
        cliente_contacto = ?, cliente_email = ?, cliente_telefono = ?, fecha = ?,
        validez_dias = ?, forma_pago = ?, plazo_ejecucion = ?, notas = ?,
        descuento_tipo = ?, descuento_valor = ?, descuento_motivo = ?,
        neto = ?, iva = ?, total = ?
      WHERE id = ?
    `, [
      ESTADOS.includes(b.estado) ? b.estado : 'borrador',
      b.company_id || null, b.lead_id || null, b.cliente_empresa ?? null, b.cliente_rut ?? null,
      b.cliente_contacto ?? null, b.cliente_email ?? null, b.cliente_telefono ?? null,
      b.fecha || new Date().toISOString().slice(0, 10),
      Number(b.validez_dias) || 15, b.forma_pago ?? null, b.plazo_ejecucion ?? null, b.notas ?? null,
      descuentoTipo, descuentoValor, b.descuento_motivo ?? null,
      neto, iva, total, req.params.id,
    ])
    // Reemplazar líneas
    await centralDB.execute('DELETE FROM cotizacion_items WHERE cotizacion_id = ?', [req.params.id])
    await guardarItems(req.params.id, b.items)

    await registrarActividad({
      req, accion: 'editar', modulo: 'cotizaciones',
      descripcion: `Editó la cotización ${prev.numero}`,
      entidad_id: Number(req.params.id), company_id: b.company_id || null,
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── ENVIAR AL CLIENTE (correo con PDF adjunto) ────────────────────────────────
router.post('/:id/enviar', async (req, res) => {
  try {
    const [[co]] = await centralDB.query(`SELECT * FROM cotizaciones WHERE id = ?`, [req.params.id])
    if (!co) return res.status(404).json({ error: 'Cotización no encontrada' })

    const destinatario = String(req.body?.to || co.cliente_email || '').trim()
    if (!destinatario) {
      return res.status(400).json({ error: 'No hay un correo de destino. Agrega el correo del cliente en la cotización o indícalo al enviar.' })
    }

    const [items] = await centralDB.execute(
      `SELECT * FROM cotizacion_items WHERE cotizacion_id = ? ORDER BY orden, id`, [co.id]
    )

    const html = buildQuoteHtml({ ...co, items })
    const pdf = await htmlToPDF(html)

    const mensaje = String(req.body?.mensaje || '').trim()
    const bodyHtml = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.5">
        <p>Hola${co.cliente_contacto ? ' ' + co.cliente_contacto : ''},</p>
        <p>Adjuntamos la cotización <b>${co.numero}</b>${co.cliente_empresa ? ` para ${co.cliente_empresa}` : ''}.</p>
        ${mensaje ? `<p>${mensaje}</p>` : ''}
        <p>Quedamos atentos a cualquier consulta.</p>
        <p style="color:#888780;font-size:12px;margin-top:18px">DSTAC Ciberseguridad · contacto@dstac.cl · www.dstac.cl</p>
      </div>`

    await sendMail(destinatario, `Cotización ${co.numero} · DSTAC Ciberseguridad`, bodyHtml, [
      { name: `${co.numero}.pdf`, contentType: 'application/pdf', contentBytes: pdf.toString('base64') },
    ])

    if (co.estado === 'borrador') {
      await centralDB.execute(`UPDATE cotizaciones SET estado = 'enviada' WHERE id = ?`, [co.id])
    }

    await registrarActividad({
      req, accion: 'editar', modulo: 'cotizaciones',
      descripcion: `Envió la cotización ${co.numero} a ${destinatario}`,
      entidad_id: co.id, company_id: co.company_id,
    })

    res.json({ ok: true, enviado_a: destinatario })
  } catch (err) {
    res.status(502).json({ error: err.message || 'No se pudo enviar la cotización' })
  }
})

// ─── CAMBIAR ESTADO ────────────────────────────────────────────────────────────
router.patch('/:id/estado', async (req, res, next) => {
  try {
    const { estado } = req.body
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
    const [r] = await centralDB.execute('UPDATE cotizaciones SET estado = ? WHERE id = ?', [estado, req.params.id])
    if (!r.affectedRows) return res.status(404).json({ error: 'No encontrada' })
    await registrarActividad({
      req, accion: 'editar', modulo: 'cotizaciones',
      descripcion: `Cambió la cotización #${req.params.id} a "${estado}"`,
      entidad_id: Number(req.params.id),
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── ELIMINAR ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const [[co]] = await centralDB.execute('SELECT numero FROM cotizaciones WHERE id = ?', [req.params.id])
    await centralDB.execute('DELETE FROM cotizaciones WHERE id = ?', [req.params.id]) // items por CASCADE
    await registrarActividad({
      req, accion: 'eliminar', modulo: 'cotizaciones',
      descripcion: `Eliminó la cotización${co?.numero ? ` ${co.numero}` : ` #${req.params.id}`}`,
      entidad_id: Number(req.params.id),
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
// Helpers reutilizables (p. ej. generación de cotización desde el diagnóstico).
module.exports.helpers = { siguienteNumero, calcularTotales, guardarItems }
