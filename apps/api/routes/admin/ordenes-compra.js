// routes/admin/ordenes-compra.js — registro de OC recibidas de clientes.
// Guarda el número de OC del cliente, lo vincula a una cotización existente,
// permite adjuntar el PDF de la OC y el PDF de la cotización DSTAC, y lleva
// el ciclo de facturación: pendiente_factura → facturada → pagada.
const router = require('express').Router()
const multer = require('multer')
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')

router.use(requireAuth, requireDstacRole)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) return cb(null, true)
    cb(new Error('Solo PDF o imagen'))
  },
})

const ESTADOS = ['pendiente_factura', 'facturada', 'pagada', 'anulada']

// ─── STATS ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [[s]] = await centralDB.execute(`
      SELECT
        COUNT(*)                                    AS total,
        SUM(estado = 'pendiente_factura')           AS pendientes,
        SUM(estado = 'facturada')                   AS facturadas,
        SUM(estado = 'pagada')                      AS pagadas,
        COALESCE(SUM(monto_total),0)                AS monto_total_acumulado,
        COALESCE(SUM(CASE WHEN estado = 'pendiente_factura' THEN monto_total ELSE 0 END),0) AS monto_por_facturar,
        COALESCE(SUM(CASE WHEN estado = 'pagada' THEN monto_total ELSE 0 END),0)            AS monto_cobrado
      FROM ordenes_compra
    `)
    res.json({
      total: Number(s.total),
      pendientes: Number(s.pendientes),
      facturadas: Number(s.facturadas),
      pagadas: Number(s.pagadas),
      monto_total_acumulado: Number(s.monto_total_acumulado),
      monto_por_facturar: Number(s.monto_por_facturar),
      monto_cobrado: Number(s.monto_cobrado),
    })
  } catch (err) { next(err) }
})

// ─── LISTAR ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { estado, search } = req.query
    const cond = [], params = []
    if (estado) { cond.push('oc.estado = ?'); params.push(estado) }
    if (search?.trim()) {
      cond.push('(oc.numero_oc LIKE ? OR oc.empresa LIKE ? OR oc.numero_factura LIKE ?)')
      const l = `%${search.trim()}%`
      params.push(l, l, l)
    }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
    const [rows] = await centralDB.execute(`
      SELECT oc.id, oc.numero_oc, oc.empresa, oc.rut, oc.contacto,
             oc.monto_neto, oc.monto_total, oc.estado,
             oc.fecha_recepcion, oc.fecha_factura, oc.numero_factura,
             oc.cotizacion_id, co.numero AS cotizacion_numero,
             oc.created_at
      FROM ordenes_compra oc
      LEFT JOIN cotizaciones co ON oc.cotizacion_id = co.id
      ${where}
      ORDER BY oc.created_at DESC, oc.id DESC
    `, params)
    res.json({ ordenes: rows })
  } catch (err) { next(err) }
})

// ─── DETALLE ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[oc]] = await centralDB.execute(`
      SELECT oc.*, co.numero AS cotizacion_numero, co.cliente_empresa
      FROM ordenes_compra oc
      LEFT JOIN cotizaciones co ON oc.cotizacion_id = co.id
      WHERE oc.id = ?
    `, [req.params.id])
    if (!oc) return res.status(404).json({ error: 'Orden no encontrada' })
    // no exponer bytes aquí — archivos por ruta separada
    const { archivo_oc, archivo_cotizacion, ...ocSin } = oc
    res.json({
      ...ocSin,
      tiene_archivo_oc: !!archivo_oc,
      tiene_archivo_cotizacion: !!archivo_cotizacion,
    })
  } catch (err) { next(err) }
})

// ─── CREAR (multipart: campos + hasta 2 archivos) ──────────────────────────────
router.post('/', upload.fields([
  { name: 'archivo_oc', maxCount: 1 },
  { name: 'archivo_cotizacion', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.empresa?.trim()) return res.status(400).json({ error: 'La empresa es obligatoria' })
    if (!b.numero_oc?.trim()) return res.status(400).json({ error: 'El número de OC es obligatorio' })

    const archivoOc  = req.files?.archivo_oc?.[0]
    const archivoCot = req.files?.archivo_cotizacion?.[0]

    const [r] = await centralDB.execute(`
      INSERT INTO ordenes_compra
        (numero_oc, empresa, rut, contacto, cotizacion_id,
         monto_neto, monto_total,
         archivo_oc, archivo_oc_nombre, archivo_oc_mime,
         archivo_cotizacion, archivo_cotizacion_nombre, archivo_cotizacion_mime,
         fecha_recepcion, notas, estado, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pendiente_factura',?)
    `, [
      b.numero_oc.trim(),
      b.empresa.trim(),
      b.rut?.trim() || null,
      b.contacto?.trim() || null,
      b.cotizacion_id ? Number(b.cotizacion_id) : null,
      b.monto_neto ? Number(b.monto_neto) : null,
      b.monto_total ? Number(b.monto_total) : null,
      archivoOc  ? archivoOc.buffer  : null,
      archivoOc  ? archivoOc.originalname : null,
      archivoOc  ? archivoOc.mimetype : null,
      archivoCot ? archivoCot.buffer  : null,
      archivoCot ? archivoCot.originalname : null,
      archivoCot ? archivoCot.mimetype : null,
      b.fecha_recepcion || new Date().toISOString().slice(0, 10),
      b.notas?.trim() || null,
      req.user?.id || null,
    ])
    res.status(201).json({ id: r.insertId })
  } catch (err) { next(err) }
})

// ─── ACTUALIZAR (estado, factura, notas — sin archivos) ───────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const b = req.body || {}
    const f = [], p = []
    if (b.estado !== undefined) {
      if (!ESTADOS.includes(b.estado)) return res.status(400).json({ error: 'Estado inválido' })
      f.push('estado = ?'); p.push(b.estado)
    }
    if (b.numero_factura !== undefined) { f.push('numero_factura = ?'); p.push(b.numero_factura || null) }
    if (b.fecha_factura  !== undefined) { f.push('fecha_factura = ?');  p.push(b.fecha_factura  || null) }
    if (b.notas          !== undefined) { f.push('notas = ?');          p.push(b.notas || null) }
    if (b.monto_neto     !== undefined) { f.push('monto_neto = ?');     p.push(b.monto_neto ? Number(b.monto_neto) : null) }
    if (b.monto_total    !== undefined) { f.push('monto_total = ?');    p.push(b.monto_total ? Number(b.monto_total) : null) }
    if (!f.length) return res.status(400).json({ error: 'Sin cambios' })
    p.push(req.params.id)
    await centralDB.execute(`UPDATE ordenes_compra SET ${f.join(', ')} WHERE id = ?`, p)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── SUBIR / REEMPLAZAR un archivo ya creado ──────────────────────────────────
router.post('/:id/archivo/:tipo', upload.single('archivo'), async (req, res, next) => {
  try {
    const { tipo } = req.params
    if (!['oc', 'cotizacion'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' })
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' })
    const col = tipo === 'oc' ? 'archivo_oc' : 'archivo_cotizacion'
    await centralDB.execute(
      `UPDATE ordenes_compra SET
         ${col} = ?, ${col}_nombre = ?, ${col}_mime = ?
       WHERE id = ?`,
      [req.file.buffer, req.file.originalname, req.file.mimetype, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── DESCARGAR archivo ─────────────────────────────────────────────────────────
router.get('/:id/archivo/:tipo', async (req, res, next) => {
  try {
    const { tipo } = req.params
    if (!['oc', 'cotizacion'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' })
    const col = tipo === 'oc' ? 'archivo_oc' : 'archivo_cotizacion'
    const [[row]] = await centralDB.execute(
      `SELECT ${col} AS datos, ${col}_nombre AS nombre, ${col}_mime AS mime FROM ordenes_compra WHERE id = ?`,
      [req.params.id]
    )
    if (!row?.datos) return res.status(404).json({ error: 'Archivo no disponible' })
    res.setHeader('Content-Type', row.mime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${row.nombre || `${tipo}.pdf`}"`)
    res.send(row.datos)
  } catch (err) { next(err) }
})

// ─── ELIMINAR ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await centralDB.execute('DELETE FROM ordenes_compra WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
