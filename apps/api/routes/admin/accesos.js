const express = require('express')
const router  = express.Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')
const { registrarActividad } = require('../../utils/activityLogger')

router.use(requireAuth, requireDstacRole, resolveTenant)

// POST /api/admin/accesos/expirar
// Marca como 'expirado' todos los accesos cuya fecha_expiracion < HOY y
// cuyo estado sea 'activo' o 'pendiente_revision'.
// Se llama automáticamente desde el frontend al montar la página — fallo silencioso.
// IMPORTANTE: antes de /:id y /stats para que Express no las interprete como id
router.post('/expirar', async (req, res, next) => {
  try {
    const [result] = await req.tenantDB.execute(`
      UPDATE accesos
      SET estado = 'expirado', updated_at = NOW()
      WHERE fecha_expiracion < CURDATE()
        AND estado IN ('activo', 'pendiente_revision')
        AND fecha_expiracion IS NOT NULL
    `)
    res.json({
      actualizados: result.affectedRows,
      mensaje: `${result.affectedRows} acceso(s) marcados como expirados`,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/accesos/stats
router.get('/stats', async (req, res, next) => {
  try {
    const db = req.tenantDB

    const [[counts]] = await db.execute(`
      SELECT
        COUNT(*)                                             AS total,
        SUM(estado = 'activo')                               AS activos,
        SUM(estado = 'expirado')                             AS expirados,
        SUM(criticidad = 'critica' AND estado = 'activo')    AS criticos
      FROM accesos
    `)

    // Accesos activos que vencen en los próximos 30 días
    const [[{ por_vencer }]] = await db.execute(`
      SELECT COUNT(*) AS por_vencer
      FROM accesos
      WHERE fecha_expiracion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND estado = 'activo'
    `)

    res.json({
      total:      counts.total      ?? 0,
      activos:    counts.activos    ?? 0,
      expirados:  counts.expirados  ?? 0,
      criticos:   counts.criticos   ?? 0,
      por_vencer: por_vencer        ?? 0,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/accesos
// Query params: search, nivel_acceso, estado, criticidad, entorno,
//               identidad_id, activo_id, page, limit
// JOIN completo: accesos → identidades → personal (propietario) + activos
router.get('/', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const {
      search, nivel_acceso, estado, criticidad,
      entorno, identidad_id, activo_id,
      page = 1, limit = 20,
    } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (search) {
      // Busca en nombre de identidad, valor de identidad, nombre de activo y propietario
      where += ' AND (i.nombre LIKE ? OR i.identidad LIKE ? OR a.nombre LIKE ? OR p.nombre LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (nivel_acceso) { where += ' AND ac.nivel_acceso = ?'; params.push(nivel_acceso) }
    if (estado)       { where += ' AND ac.estado = ?';       params.push(estado) }
    if (criticidad)   { where += ' AND ac.criticidad = ?';   params.push(criticidad) }
    if (entorno)      { where += ' AND ac.entorno = ?';      params.push(entorno) }
    if (identidad_id) { where += ' AND ac.identidad_id = ?'; params.push(identidad_id) }
    if (activo_id)    { where += ' AND ac.activo_id = ?';    params.push(activo_id) }

    // Orden: primero críticos y expirados para visibilidad inmediata
    const [rows] = await db.execute(`
      SELECT
        ac.id, ac.nivel_acceso, ac.entorno, ac.estado, ac.criticidad,
        ac.fecha_otorgamiento, ac.fecha_expiracion,
        ac.quien_autorizo, ac.justificacion,
        ac.created_at, ac.updated_at,
        i.id        AS identidad_id,
        i.nombre    AS identidad_nombre,
        i.identidad AS identidad_valor,
        i.tipo_identidad,
        p.id        AS propietario_id,
        p.nombre    AS propietario_nombre,
        p.rol_empresarial AS propietario_rol,
        a.id        AS activo_id,
        a.nombre    AS activo_nombre,
        a.tipo      AS activo_tipo,
        a.ambiente  AS activo_ambiente,
        a.criticidad AS activo_criticidad
      FROM accesos ac
      JOIN identidades i  ON ac.identidad_id = i.id
      JOIN activos     a  ON ac.activo_id    = a.id
      LEFT JOIN personal p ON i.propietario_id = p.id
      ${where}
      ORDER BY
        FIELD(ac.criticidad, 'critica', 'alta', 'media', 'baja'),
        FIELD(ac.estado, 'expirado', 'pendiente_revision', 'activo', 'suspendido', 'inactivo'),
        ac.fecha_expiracion ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    // COUNT usa el mismo WHERE pero sin los JOINs de selección de campos
    const [[{ total }]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM accesos ac
      JOIN identidades i ON ac.identidad_id = i.id
      JOIN activos     a ON ac.activo_id    = a.id
      LEFT JOIN personal p ON i.propietario_id = p.id
      ${where}
    `, params)

    res.json({
      accesos: rows,
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/accesos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const [[acceso]] = await req.tenantDB.execute(`
      SELECT
        ac.*,
        i.nombre    AS identidad_nombre,
        i.identidad AS identidad_valor,
        i.tipo_identidad,
        p.nombre    AS propietario_nombre,
        p.rol_empresarial AS propietario_rol,
        a.nombre    AS activo_nombre,
        a.tipo      AS activo_tipo,
        a.ambiente  AS activo_ambiente,
        a.criticidad AS activo_criticidad
      FROM accesos ac
      JOIN identidades i  ON ac.identidad_id = i.id
      JOIN activos     a  ON ac.activo_id    = a.id
      LEFT JOIN personal p ON i.propietario_id = p.id
      WHERE ac.id = ?
    `, [id])

    if (!acceso) return res.status(404).json({ error: 'Acceso no encontrado' })
    res.json(acceso)
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/accesos
router.post('/', async (req, res, next) => {
  try {
    const {
      identidad_id, activo_id, nivel_acceso, criticidad,
      entorno, estado, fecha_otorgamiento, fecha_expiracion,
      quien_autorizo, justificacion,
    } = req.body

    if (!identidad_id || !activo_id || !nivel_acceso) {
      return res.status(400).json({ error: 'Identidad, activo y nivel de acceso son requeridos' })
    }

    const [result] = await req.tenantDB.execute(
      `INSERT INTO accesos
        (identidad_id, activo_id, nivel_acceso, criticidad, entorno, estado,
         fecha_otorgamiento, fecha_expiracion, quien_autorizo, justificacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        identidad_id,
        activo_id,
        nivel_acceso,
        criticidad         ?? null,
        entorno            ?? null,
        estado             ?? 'activo',
        fecha_otorgamiento ?? null,
        fecha_expiracion   ?? null,
        quien_autorizo     ?? null,
        justificacion      ?? null,
      ]
    )

    await registrarActividad({
      req, accion: 'crear', modulo: 'accesos',
      descripcion: `Otorgó un acceso (identidad #${identidad_id} → activo #${activo_id})`,
      entidad_id: result.insertId, company_id: req.company?.id,
    })

    res.status(201).json({ id: result.insertId, message: 'Acceso creado' })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/accesos/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      identidad_id, activo_id, nivel_acceso, criticidad,
      entorno, estado, fecha_otorgamiento, fecha_expiracion,
      quien_autorizo, justificacion,
    } = req.body

    if (!identidad_id || !activo_id || !nivel_acceso) {
      return res.status(400).json({ error: 'Identidad, activo y nivel de acceso son requeridos' })
    }

    const [[existe]] = await req.tenantDB.execute('SELECT id FROM accesos WHERE id = ?', [id])
    if (!existe) return res.status(404).json({ error: 'Acceso no encontrado' })

    await req.tenantDB.execute(
      `UPDATE accesos SET
        identidad_id       = ?,
        activo_id          = ?,
        nivel_acceso       = ?,
        criticidad         = ?,
        entorno            = ?,
        estado             = ?,
        fecha_otorgamiento = ?,
        fecha_expiracion   = ?,
        quien_autorizo     = ?,
        justificacion      = ?,
        updated_at         = NOW()
       WHERE id = ?`,
      [
        identidad_id,
        activo_id,
        nivel_acceso,
        criticidad         ?? null,
        entorno            ?? null,
        estado             ?? 'activo',
        fecha_otorgamiento ?? null,
        fecha_expiracion   ?? null,
        quien_autorizo     ?? null,
        justificacion      ?? null,
        id,
      ]
    )

    await registrarActividad({
      req, accion: 'editar', modulo: 'accesos',
      descripcion: `Editó el acceso #${id}`,
      entidad_id: Number(id), company_id: req.company?.id,
    })

    res.json({ message: 'Acceso actualizado' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/accesos/:id
// Los accesos son el nivel más bajo de la cadena relacional — sin dependencias que bloqueen
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const [[existe]] = await req.tenantDB.execute('SELECT id FROM accesos WHERE id = ?', [id])
    if (!existe) return res.status(404).json({ error: 'Acceso no encontrado' })

    await req.tenantDB.execute('DELETE FROM accesos WHERE id = ?', [id])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'accesos',
      descripcion: `Eliminó el acceso #${id}`,
      entidad_id: Number(id), company_id: req.company?.id,
    })

    res.json({ message: 'Acceso eliminado' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
