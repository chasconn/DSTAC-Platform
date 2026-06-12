const router = require('express').Router()
const { requireAuth, requireDstacRole } = require('../middleware/auth')
const { resolveTenant } = require('../middleware/tenant')

router.use(requireAuth, requireDstacRole, resolveTenant)

// GET /api/incidents/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [[row]] = await req.tenantDB.execute(`
      SELECT
        COUNT(*)                         AS total,
        SUM(estado = 'abierto')          AS abiertos,
        SUM(estado = 'en_investigacion') AS en_investigacion,
        SUM(estado = 'en_respuesta')     AS en_respuesta,
        SUM(estado = 'cerrado')          AS cerrados,
        SUM(estado = 'falso_positivo')   AS falsos_positivos,
        SUM(severidad = 'critica')       AS criticos,
        SUM(severidad = 'alta')          AS altos,
        SUM(requiere_notificacion_legal = 1) AS requieren_notificacion
      FROM incidentes
    `)
    res.json({
      total:                  Number(row.total),
      abiertos:               Number(row.abiertos),
      en_investigacion:       Number(row.en_investigacion),
      en_respuesta:           Number(row.en_respuesta),
      cerrados:               Number(row.cerrados),
      falsos_positivos:       Number(row.falsos_positivos),
      criticos:               Number(row.criticos),
      altos:                  Number(row.altos),
      requieren_notificacion: Number(row.requieren_notificacion),
    })
  } catch (err) { next(err) }
})

// GET /api/incidents
router.get('/', async (req, res, next) => {
  try {
    const { estado, severidad, search, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const conditions = []
    const params = []

    if (estado)   { conditions.push('i.estado = ?');    params.push(estado)   }
    if (severidad){ conditions.push('i.severidad = ?'); params.push(severidad)}
    if (search)   {
      conditions.push('(i.tipo LIKE ? OR i.descripcion LIKE ? OR i.responsable LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await req.tenantDB.execute(`
      SELECT i.id, i.tipo, i.categoria, i.estado, i.severidad, i.impacto,
             i.fecha_deteccion, i.fecha_respuesta, i.tiempo_resolucion,
             i.descripcion, i.responsable, i.proyecto, i.cvss,
             i.requiere_notificacion_legal, i.created_at,
             a.nombre AS activo_nombre
      FROM incidentes i
      LEFT JOIN activos a ON a.id = i.activo_id
      ${where}
      ORDER BY
        FIELD(i.severidad,'critica','alta','media','baja'),
        FIELD(i.estado,'abierto','en_investigacion','en_respuesta','cerrado','falso_positivo'),
        i.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await req.tenantDB.execute(
      `SELECT COUNT(*) AS total FROM incidentes i ${where}`, params
    )

    res.json({ incidentes: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// GET /api/incidents/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [[inc]] = await req.tenantDB.execute(`
      SELECT i.*, a.nombre AS activo_nombre
      FROM incidentes i
      LEFT JOIN activos a ON a.id = i.activo_id
      WHERE i.id = ?
    `, [req.params.id])
    if (!inc) return res.status(404).json({ error: 'Incidente no encontrado' })
    res.json(inc)
  } catch (err) { next(err) }
})

// POST /api/incidents
router.post('/', async (req, res, next) => {
  try {
    const {
      tipo, categoria, estado = 'abierto', severidad, impacto,
      descripcion, causa_raiz, vulnerabilidades, cvss,
      activo_id, proyecto, responsable,
      fecha_deteccion, fecha_respuesta, tiempo_resolucion,
      requiere_notificacion_legal = false,
    } = req.body

    if (!tipo || !severidad) {
      return res.status(400).json({ error: 'tipo y severidad son obligatorios' })
    }

    const [result] = await req.tenantDB.execute(`
      INSERT INTO incidentes
        (tipo, categoria, estado, severidad, impacto, descripcion, causa_raiz,
         vulnerabilidades, cvss, activo_id, proyecto, responsable,
         fecha_deteccion, fecha_respuesta, tiempo_resolucion, requiere_notificacion_legal)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      tipo, categoria || null, estado, severidad, impacto || null,
      descripcion || null, causa_raiz || null, vulnerabilidades || null,
      cvss != null ? Number(cvss) : null,
      activo_id ? Number(activo_id) : null,
      proyecto || null, responsable || null,
      fecha_deteccion || null, fecha_respuesta || null,
      tiempo_resolucion != null ? Number(tiempo_resolucion) : null,
      requiere_notificacion_legal ? 1 : 0,
    ])

    res.status(201).json({ id: result.insertId, message: 'Incidente creado' })
  } catch (err) { next(err) }
})

// PUT /api/incidents/:id
router.put('/:id', async (req, res, next) => {
  try {
    const {
      tipo, categoria, estado, severidad, impacto,
      descripcion, causa_raiz, vulnerabilidades, cvss,
      activo_id, proyecto, responsable,
      fecha_deteccion, fecha_respuesta, tiempo_resolucion,
      requiere_notificacion_legal,
    } = req.body

    const [[existing]] = await req.tenantDB.execute('SELECT id FROM incidentes WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Incidente no encontrado' })

    const fields = []
    const values = []

    if (tipo       !== undefined) { fields.push('tipo = ?');        values.push(tipo) }
    if (categoria  !== undefined) { fields.push('categoria = ?');   values.push(categoria || null) }
    if (estado     !== undefined) { fields.push('estado = ?');      values.push(estado) }
    if (severidad  !== undefined) { fields.push('severidad = ?');   values.push(severidad) }
    if (impacto    !== undefined) { fields.push('impacto = ?');     values.push(impacto || null) }
    if (descripcion!== undefined) { fields.push('descripcion = ?'); values.push(descripcion || null) }
    if (causa_raiz !== undefined) { fields.push('causa_raiz = ?');  values.push(causa_raiz || null) }
    if (vulnerabilidades !== undefined) { fields.push('vulnerabilidades = ?'); values.push(vulnerabilidades || null) }
    if (cvss       !== undefined) { fields.push('cvss = ?');        values.push(cvss != null ? Number(cvss) : null) }
    if (activo_id  !== undefined) { fields.push('activo_id = ?');   values.push(activo_id ? Number(activo_id) : null) }
    if (proyecto   !== undefined) { fields.push('proyecto = ?');    values.push(proyecto || null) }
    if (responsable!== undefined) { fields.push('responsable = ?'); values.push(responsable || null) }
    if (fecha_deteccion  !== undefined) { fields.push('fecha_deteccion = ?');  values.push(fecha_deteccion || null) }
    if (fecha_respuesta  !== undefined) { fields.push('fecha_respuesta = ?');  values.push(fecha_respuesta || null) }
    if (tiempo_resolucion!== undefined) { fields.push('tiempo_resolucion = ?'); values.push(tiempo_resolucion != null ? Number(tiempo_resolucion) : null) }
    if (requiere_notificacion_legal !== undefined) {
      fields.push('requiere_notificacion_legal = ?')
      values.push(requiere_notificacion_legal ? 1 : 0)
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' })

    values.push(req.params.id)
    await req.tenantDB.execute(`UPDATE incidentes SET ${fields.join(', ')} WHERE id = ?`, values)
    res.json({ message: 'Incidente actualizado' })
  } catch (err) { next(err) }
})

// DELETE /api/incidents/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [[existing]] = await req.tenantDB.execute('SELECT id FROM incidentes WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Incidente no encontrado' })
    await req.tenantDB.execute('DELETE FROM incidentes WHERE id = ?', [req.params.id])
    res.json({ message: 'Incidente eliminado' })
  } catch (err) { next(err) }
})

module.exports = router
