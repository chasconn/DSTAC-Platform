// Cotizaciones — documentos comerciales de DSTAC (BD central, cross-tenant).
// Solo personal DSTAC. Cabecera + líneas + catálogo de servicios reutilizable.
const router = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')

router.use(requireAuth, requireDstacRole)

const uid = (req) => req.user.id || req.user.user_id
const ESTADOS = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida']
const IVA_RATE = 0.19

// Calcula neto/iva/total a partir de las líneas (CLP, enteros).
function calcularTotales(items = []) {
  const neto = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0)
  const iva = Math.round(neto * IVA_RATE)
  return { neto, iva, total: neto + iva }
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
    const [rows] = await centralDB.execute(
      `SELECT * FROM cotizacion_catalogo WHERE activo = 1 ORDER BY orden, id`
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
    const { neto, iva, total } = calcularTotales(b.items)

    const [r] = await centralDB.execute(`
      INSERT INTO cotizaciones
        (numero, estado, company_id, lead_id, cliente_empresa, cliente_rut, cliente_contacto,
         cliente_email, cliente_telefono, fecha, validez_dias, forma_pago, plazo_ejecucion,
         notas, neto, iva, total, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      numero, ESTADOS.includes(b.estado) ? b.estado : 'borrador',
      b.company_id || null, b.lead_id || null,
      b.cliente_empresa ?? null, b.cliente_rut ?? null, b.cliente_contacto ?? null,
      b.cliente_email ?? null, b.cliente_telefono ?? null,
      b.fecha || new Date().toISOString().slice(0, 10),
      Number(b.validez_dias) || 15, b.forma_pago ?? null, b.plazo_ejecucion ?? null,
      b.notas ?? null, neto, iva, total, uid(req),
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

    const { neto, iva, total } = calcularTotales(b.items)
    await centralDB.execute(`
      UPDATE cotizaciones SET
        estado = ?, company_id = ?, lead_id = ?, cliente_empresa = ?, cliente_rut = ?,
        cliente_contacto = ?, cliente_email = ?, cliente_telefono = ?, fecha = ?,
        validez_dias = ?, forma_pago = ?, plazo_ejecucion = ?, notas = ?,
        neto = ?, iva = ?, total = ?
      WHERE id = ?
    `, [
      ESTADOS.includes(b.estado) ? b.estado : 'borrador',
      b.company_id || null, b.lead_id || null, b.cliente_empresa ?? null, b.cliente_rut ?? null,
      b.cliente_contacto ?? null, b.cliente_email ?? null, b.cliente_telefono ?? null,
      b.fecha || new Date().toISOString().slice(0, 10),
      Number(b.validez_dias) || 15, b.forma_pago ?? null, b.plazo_ejecucion ?? null, b.notas ?? null,
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
