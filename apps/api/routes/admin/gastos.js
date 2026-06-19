// routes/admin/gastos.js — Registro de gastos INTERNOS de DSTAC (no es por
// cliente). Solo personal DSTAC, sin resolveTenant.
const router = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')
const { CATEGORIAS, METODOS_PAGO } = require('../../services/gastos/categorias')

router.use(requireAuth, requireDstacRole)
const uid = (req) => req.user.id || req.user.user_id
const nombreCompleto = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email

// ─── GET /api/admin/gastos/categorias ────────────────────────────────────────
router.get('/categorias', (req, res) => {
  res.json({ categorias: CATEGORIAS, metodos_pago: METODOS_PAGO })
})

// ─── GET /api/admin/gastos/stats ─────────────────────────────────────────────
// Debe ir antes de /:id para que Express no lo confunda con un id.
router.get('/stats', async (req, res, next) => {
  try {
    const { desde, hasta } = req.query
    const cond = [], params = [], condG = [], paramsG = []
    if (desde) { cond.push('fecha >= ?'); params.push(desde); condG.push('g.fecha >= ?'); paramsG.push(desde) }
    if (hasta) { cond.push('fecha <= ?'); params.push(hasta); condG.push('g.fecha <= ?'); paramsG.push(hasta) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
    const whereG = condG.length ? `WHERE ${condG.join(' AND ')}` : ''

    const hoy = new Date()
    const mesActual = hoy.toISOString().slice(0, 7)
    const inicioAno = `${hoy.getFullYear()}-01-01`

    const [[totales]] = await centralDB.execute(
      `SELECT COALESCE(SUM(monto),0) AS total, COUNT(*) AS cantidad FROM gastos ${where}`, params)
    const [[mesRow]] = await centralDB.execute(
      `SELECT COALESCE(SUM(monto),0) AS total FROM gastos WHERE DATE_FORMAT(fecha,'%Y-%m') = ?`, [mesActual])
    const [[anoRow]] = await centralDB.execute(
      `SELECT COALESCE(SUM(monto),0) AS total FROM gastos WHERE fecha >= ?`, [inicioAno])
    const [promRow] = await centralDB.execute(
      `SELECT DATE_FORMAT(fecha,'%Y-%m') AS mes, SUM(monto) AS total FROM gastos
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY mes`)
    const promedioMensual = promRow.length ? promRow.reduce((a, r) => a + Number(r.total), 0) / promRow.length : 0

    const [porCategoria] = await centralDB.execute(
      `SELECT categoria, SUM(monto) AS total, COUNT(*) AS cantidad FROM gastos ${where}
       GROUP BY categoria ORDER BY total DESC`, params)

    const [evolucion] = await centralDB.execute(
      `SELECT DATE_FORMAT(fecha,'%Y-%m') AS mes, SUM(monto) AS total FROM gastos
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
       GROUP BY mes ORDER BY mes`)

    const [porPersona] = await centralDB.execute(
      `SELECT u.id, COALESCE(CONCAT(u.first_name,' ',u.last_name), u.email) AS nombre,
              SUM(g.monto) AS total, COUNT(*) AS cantidad
       FROM gastos g JOIN users u ON g.pagado_por = u.id
       ${whereG}
       GROUP BY u.id ORDER BY total DESC`, paramsG)

    const [porMetodo] = await centralDB.execute(
      `SELECT metodo_pago, SUM(monto) AS total FROM gastos ${where} GROUP BY metodo_pago ORDER BY total DESC`, params)

    res.json({
      total: Number(totales.total), cantidad: Number(totales.cantidad),
      totalMesActual: Number(mesRow.total), totalAnoActual: Number(anoRow.total),
      promedioMensual: Math.round(promedioMensual),
      porCategoria: porCategoria.map(r => ({ categoria: r.categoria, total: Number(r.total), cantidad: Number(r.cantidad) })),
      evolucion: evolucion.map(r => ({ mes: r.mes, total: Number(r.total) })),
      porPersona: porPersona.map(r => ({ id: r.id, nombre: r.nombre, total: Number(r.total), cantidad: Number(r.cantidad) })),
      porMetodo: porMetodo.map(r => ({ metodo: r.metodo_pago, total: Number(r.total) })),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/gastos ────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { desde, hasta, categoria, metodo_pago, pagado_por, realizado_por, search, page = 1, limit = 25 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const cond = [], params = []
    if (desde)         { cond.push('g.fecha >= ?');       params.push(desde) }
    if (hasta)         { cond.push('g.fecha <= ?');       params.push(hasta) }
    if (categoria)     { cond.push('g.categoria = ?');    params.push(categoria) }
    if (metodo_pago)   { cond.push('g.metodo_pago = ?');  params.push(metodo_pago) }
    if (pagado_por)    { cond.push('g.pagado_por = ?');   params.push(pagado_por) }
    if (realizado_por) { cond.push('g.realizado_por = ?'); params.push(realizado_por) }
    if (search)        { cond.push('(g.proveedor LIKE ? OR g.descripcion LIKE ? OR g.comprobante LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''

    const [rows] = await centralDB.execute(`
      SELECT g.*,
        CONCAT(ur.first_name,' ',ur.last_name) AS realizado_por_nombre,
        CONCAT(up.first_name,' ',up.last_name) AS pagado_por_nombre
      FROM gastos g
      LEFT JOIN users ur ON g.realizado_por = ur.id
      LEFT JOIN users up ON g.pagado_por = up.id
      ${where}
      ORDER BY g.fecha DESC, g.id DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, params)

    const [[{ total }]] = await centralDB.execute(`SELECT COUNT(*) AS total FROM gastos g ${where}`, params)
    const [[{ suma }]] = await centralDB.execute(`SELECT COALESCE(SUM(g.monto),0) AS suma FROM gastos g ${where}`, params)

    res.json({ gastos: rows, total: Number(total), suma: Number(suma), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/gastos/:id ───────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[g]] = await centralDB.execute(`
      SELECT g.*,
        CONCAT(ur.first_name,' ',ur.last_name) AS realizado_por_nombre,
        CONCAT(up.first_name,' ',up.last_name) AS pagado_por_nombre
      FROM gastos g
      LEFT JOIN users ur ON g.realizado_por = ur.id
      LEFT JOIN users up ON g.pagado_por = up.id
      WHERE g.id = ?`, [req.params.id])
    if (!g) return res.status(404).json({ error: 'Gasto no encontrado' })
    res.json(g)
  } catch (err) { next(err) }
})

// ─── POST /api/admin/gastos ───────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { fecha, monto, categoria, proveedor, descripcion, metodo_pago, realizado_por, pagado_por, comprobante, notas } = req.body || {}
    if (!fecha || !monto || !categoria) {
      return res.status(400).json({ error: 'Fecha, monto y categoría son requeridos' })
    }
    if (!CATEGORIAS.includes(categoria)) return res.status(400).json({ error: 'Categoría no válida' })

    const [r] = await centralDB.execute(`
      INSERT INTO gastos
        (fecha, monto, categoria, proveedor, descripcion, metodo_pago, realizado_por, pagado_por, comprobante, notas, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha, monto, categoria, proveedor || null, descripcion || null, metodo_pago || 'transferencia',
       realizado_por || null, pagado_por || null, comprobante || null, notas || null, uid(req)])

    await registrarActividad({
      req, accion: 'crear', modulo: 'gastos',
      descripcion: `Registró un gasto de $${Number(monto).toLocaleString('es-CL')} (${categoria})`,
      entidad_id: r.insertId, company_id: null,
    })

    res.status(201).json({ id: r.insertId, message: 'Gasto registrado' })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/gastos/:id ────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { fecha, monto, categoria, proveedor, descripcion, metodo_pago, realizado_por, pagado_por, comprobante, notas } = req.body || {}
    if (categoria && !CATEGORIAS.includes(categoria)) return res.status(400).json({ error: 'Categoría no válida' })

    const fields = [], params = []
    const set = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); params.push(val === '' ? null : val) } }
    set('fecha', fecha); set('monto', monto); set('categoria', categoria); set('proveedor', proveedor)
    set('descripcion', descripcion); set('metodo_pago', metodo_pago); set('realizado_por', realizado_por || null)
    set('pagado_por', pagado_por || null); set('comprobante', comprobante); set('notas', notas)
    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' })

    params.push(req.params.id)
    await centralDB.execute(`UPDATE gastos SET ${fields.join(', ')} WHERE id = ?`, params)

    await registrarActividad({
      req, accion: 'editar', modulo: 'gastos',
      descripcion: `Editó el gasto #${req.params.id}`,
      entidad_id: req.params.id, company_id: null,
    })

    res.json({ message: 'Gasto actualizado' })
  } catch (err) { next(err) }
})

// ─── DELETE /api/admin/gastos/:id ────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const [[g]] = await centralDB.execute('SELECT monto, categoria FROM gastos WHERE id = ?', [req.params.id])
    if (!g) return res.status(404).json({ error: 'Gasto no encontrado' })

    await centralDB.execute('DELETE FROM gastos WHERE id = ?', [req.params.id])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'gastos',
      descripcion: `Eliminó el gasto de $${Number(g.monto).toLocaleString('es-CL')} (${g.categoria})`,
      entidad_id: req.params.id, company_id: null,
    })

    res.json({ message: 'Gasto eliminado' })
  } catch (err) { next(err) }
})

module.exports = router
