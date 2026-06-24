// routes/admin/oportunidades.js — Detección de licitaciones de Mercado Público
// relevantes para ciberseguridad. Solo personal DSTAC.
//
// Este módulo NUNCA envía postulaciones: detecta, puntúa y prepara un borrador
// para que un analista DSTAC revise y postule manualmente en el portal oficial.
const router = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')
const { sincronizarOportunidades } = require('../../services/mercadoPublico/sync')
const { generarBorrador } = require('../../services/mercadoPublico/borrador')

router.use(requireAuth, requireDstacRole)

// ─── GET /api/admin/oportunidades/stats ──────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [[row]] = await centralDB.execute(`
      SELECT
        COUNT(*)                                  AS total,
        SUM(estado_interno = 'nueva')              AS nuevas,
        SUM(estado_interno = 'revisando')          AS revisando,
        SUM(estado_interno = 'en_preparacion')      AS en_preparacion,
        SUM(estado_interno = 'postulada')           AS postuladas,
        SUM(estado_interno NOT IN ('descartada','no_adjudicada')
            AND fecha_cierre IS NOT NULL AND fecha_cierre < NOW()) AS por_vencer_perdidas,
        AVG(score)                                 AS score_promedio
      FROM oportunidades_licitaciones
    `)
    res.json({
      total: Number(row.total), nuevas: Number(row.nuevas), revisando: Number(row.revisando),
      en_preparacion: Number(row.en_preparacion), postuladas: Number(row.postuladas),
      por_vencer_perdidas: Number(row.por_vencer_perdidas),
      score_promedio: row.score_promedio ? Math.round(row.score_promedio) : 0,
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/oportunidades/keywords ───────────────────────────────────
router.get('/keywords', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute('SELECT * FROM oportunidades_keywords ORDER BY peso DESC, palabra ASC')
    res.json({ keywords: rows })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/oportunidades/keywords ──────────────────────────────────
router.post('/keywords', async (req, res, next) => {
  try {
    const { palabra, peso = 10 } = req.body
    if (!palabra?.trim()) return res.status(400).json({ error: 'La palabra clave es requerida' })

    await centralDB.execute(
      'INSERT INTO oportunidades_keywords (palabra, peso) VALUES (?, ?)',
      [palabra.trim().toLowerCase(), peso]
    )
    res.status(201).json({ message: 'Palabra clave agregada' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esa palabra clave ya existe' })
    next(err)
  }
})

// ─── PUT /api/admin/oportunidades/keywords/:id ────────────────────────────────
router.put('/keywords/:id', async (req, res, next) => {
  try {
    const { peso, activo } = req.body
    const fields = [], params = []
    if (peso !== undefined)  { fields.push('peso = ?');  params.push(peso) }
    if (activo !== undefined) { fields.push('activo = ?'); params.push(activo ? 1 : 0) }
    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' })

    params.push(req.params.id)
    await centralDB.execute(`UPDATE oportunidades_keywords SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json({ message: 'Palabra clave actualizada' })
  } catch (err) { next(err) }
})

// ─── DELETE /api/admin/oportunidades/keywords/:id ────────────────────────────
router.delete('/keywords/:id', async (req, res, next) => {
  try {
    await centralDB.execute('DELETE FROM oportunidades_keywords WHERE id = ?', [req.params.id])
    res.json({ message: 'Palabra clave eliminada' })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/oportunidades/sync ──────────────────────────────────────
// Dispara manualmente la búsqueda en Mercado Público (además de la corrida automática periódica).
router.post('/sync', async (req, res, next) => {
  try {
    const resultado = await sincronizarOportunidades()
    await registrarActividad({
      req, accion: 'otro', modulo: 'oportunidades',
      descripcion: `Sincronizó manualmente con Mercado Público (${resultado.relevantes} relevantes de ${resultado.revisadas})`,
    })
    res.json(resultado)
  } catch (err) { next(err) }
})

// ─── GET /api/admin/oportunidades ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { estado_interno, search, score_min, page = 1, limit = 30 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const conditions = [], params = []

    if (estado_interno) { conditions.push('o.estado_interno = ?'); params.push(estado_interno) }
    if (score_min)       { conditions.push('o.score >= ?');        params.push(Number(score_min)) }
    if (search)          { conditions.push('(o.nombre LIKE ? OR o.organismo LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await centralDB.execute(`
      SELECT o.id, o.codigo_externo, o.nombre, o.organismo, o.fecha_cierre, o.score,
             o.estado_interno, o.monto_estimado, o.link_ficha,
             CONCAT(u.first_name, ' ', IFNULL(u.last_name,'')) AS asignado_nombre
      FROM oportunidades_licitaciones o
      LEFT JOIN users u ON o.asignado_a = u.id
      ${where}
      ORDER BY o.score DESC, o.fecha_cierre ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, params)

    const [[{ total }]] = await centralDB.execute(
      `SELECT COUNT(*) AS total FROM oportunidades_licitaciones o ${where}`, params
    )

    res.json({ oportunidades: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/oportunidades/:id ────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[op]] = await centralDB.execute(`
      SELECT o.*, CONCAT(u.first_name, ' ', IFNULL(u.last_name,'')) AS asignado_nombre
      FROM oportunidades_licitaciones o
      LEFT JOIN users u ON o.asignado_a = u.id
      WHERE o.id = ?
    `, [req.params.id])

    if (!op) return res.status(404).json({ error: 'Oportunidad no encontrada' })
    res.json(op)
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/oportunidades/:id ────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { estado_interno, asignado_a, notas } = req.body
    const fields = [], params = []

    if (estado_interno !== undefined) { fields.push('estado_interno = ?'); params.push(estado_interno) }
    if (asignado_a     !== undefined) { fields.push('asignado_a = ?');     params.push(asignado_a || null) }
    if (notas          !== undefined) { fields.push('notas = ?');          params.push(notas) }

    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' })

    params.push(req.params.id)
    await centralDB.execute(`UPDATE oportunidades_licitaciones SET ${fields.join(', ')} WHERE id = ?`, params)

    await registrarActividad({
      req, accion: 'editar', modulo: 'oportunidades',
      descripcion: estado_interno
        ? `Cambió el estado de la oportunidad #${req.params.id} a "${estado_interno}"`
        : `Editó la oportunidad #${req.params.id}`,
      entidad_id: Number(req.params.id),
    })

    res.json({ message: 'Oportunidad actualizada' })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/oportunidades/:id/borrador ──────────────────────────────
// Genera (o regenera) el borrador de propuesta. SIEMPRE requiere revisión humana.
router.post('/:id/borrador', async (req, res, next) => {
  try {
    const [[op]] = await centralDB.execute('SELECT * FROM oportunidades_licitaciones WHERE id = ?', [req.params.id])
    if (!op) return res.status(404).json({ error: 'Oportunidad no encontrada' })

    const borrador = generarBorrador(op)
    await centralDB.execute(
      `UPDATE oportunidades_licitaciones SET borrador_generado = ?,
        estado_interno = IF(estado_interno = 'nueva', 'en_preparacion', estado_interno) WHERE id = ?`,
      [borrador, req.params.id]
    )

    await registrarActividad({
      req, accion: 'otro', modulo: 'oportunidades',
      descripcion: `Generó borrador de propuesta para "${op.nombre}"`,
      entidad_id: Number(req.params.id),
    })

    res.json({ borrador })
  } catch (err) { next(err) }
})

module.exports = router
