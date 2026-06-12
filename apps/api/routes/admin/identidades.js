const express = require('express')
const router  = express.Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')

router.use(requireAuth, requireDstacRole, resolveTenant)

// GET /api/admin/identidades/stats
// IMPORTANTE: antes de /:id para que Express no confunda 'stats' con un id
router.get('/stats', async (req, res, next) => {
  try {
    const db = req.tenantDB

    const [[counts]] = await db.execute(`
      SELECT
        COUNT(*)                          AS total,
        SUM(estado = 'activa')            AS activas,
        SUM(estado = 'comprometida')      AS comprometidas,
        SUM(estado = 'expirada')          AS expiradas
      FROM identidades
    `)

    // Identidades activas que vencen en los próximos 30 días
    const [[{ por_vencer }]] = await db.execute(`
      SELECT COUNT(*) AS por_vencer
      FROM identidades
      WHERE fecha_expiracion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND estado = 'activa'
    `)

    res.json({
      total:         counts.total        ?? 0,
      activas:       counts.activas       ?? 0,
      comprometidas: counts.comprometidas ?? 0,
      expiradas:     counts.expiradas     ?? 0,
      por_vencer:    por_vencer           ?? 0,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/identidades
// Query params: search, tipo_identidad, estado, origen, propietario_id, page, limit
// Las identidades comprometidas y expiradas aparecen primero
router.get('/', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const {
      search, tipo_identidad, estado, origen,
      propietario_id, page = 1, limit = 20,
    } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (search) {
      where += ' AND (i.nombre LIKE ? OR i.identidad LIKE ? OR i.origen LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (tipo_identidad) { where += ' AND i.tipo_identidad = ?';     params.push(tipo_identidad) }
    if (estado)         { where += ' AND i.estado = ?';             params.push(estado) }
    if (origen)         { where += ' AND i.origen LIKE ?';          params.push(`%${origen}%`) }
    if (propietario_id) { where += ' AND i.propietario_id = ?';     params.push(propietario_id) }

    // Orden crítico primero: comprometidas → expiradas → pendientes → activas → inactivas
    const [rows] = await db.execute(`
      SELECT
        i.id, i.nombre, i.identidad, i.tipo_identidad, i.origen,
        i.estado, i.propietario_id,
        i.fecha_creacion, i.fecha_revision, i.fecha_expiracion,
        i.notas, i.created_at, i.updated_at,
        p.nombre          AS propietario_nombre,
        p.rol_empresarial AS propietario_rol
      FROM identidades i
      LEFT JOIN personal p ON i.propietario_id = p.id
      ${where}
      ORDER BY
        FIELD(i.estado, 'comprometida', 'expirada', 'pendiente', 'activa', 'inactiva'),
        i.nombre ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM identidades i ${where}`,
      params
    )

    res.json({
      identidades: rows,
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/identidades/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const [[identidad]] = await req.tenantDB.execute(`
      SELECT
        i.*, p.nombre AS propietario_nombre, p.rol_empresarial AS propietario_rol
      FROM identidades i
      LEFT JOIN personal p ON i.propietario_id = p.id
      WHERE i.id = ?
    `, [id])

    if (!identidad) return res.status(404).json({ error: 'Identidad no encontrada' })

    // Contar accesos vinculados
    const [[{ accesos }]] = await req.tenantDB.execute(
      'SELECT COUNT(*) AS accesos FROM accesos WHERE identidad_id = ?', [id]
    )

    res.json({ ...identidad, accesos })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/identidades
router.post('/', async (req, res, next) => {
  try {
    const {
      nombre, identidad, tipo_identidad, origen, estado,
      propietario_id, fecha_creacion, fecha_revision, fecha_expiracion, notas,
    } = req.body

    if (!nombre || !identidad) {
      return res.status(400).json({ error: 'Nombre e identidad son requeridos' })
    }

    const [result] = await req.tenantDB.execute(
      `INSERT INTO identidades
        (nombre, identidad, tipo_identidad, origen, estado,
         propietario_id, fecha_creacion, fecha_revision, fecha_expiracion, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        identidad,
        tipo_identidad  ?? null,
        origen          ?? null,
        estado          ?? 'activa',
        propietario_id  ?? null,
        fecha_creacion  ?? null,
        fecha_revision  ?? null,
        fecha_expiracion ?? null,
        notas           ?? null,
      ]
    )

    res.status(201).json({ id: result.insertId, message: 'Identidad creada' })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/identidades/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      nombre, identidad, tipo_identidad, origen, estado,
      propietario_id, fecha_creacion, fecha_revision, fecha_expiracion, notas,
    } = req.body

    if (!nombre || !identidad) {
      return res.status(400).json({ error: 'Nombre e identidad son requeridos' })
    }

    const [[existe]] = await req.tenantDB.execute(
      'SELECT id FROM identidades WHERE id = ?', [id]
    )
    if (!existe) return res.status(404).json({ error: 'Identidad no encontrada' })

    await req.tenantDB.execute(
      `UPDATE identidades SET
        nombre           = ?,
        identidad        = ?,
        tipo_identidad   = ?,
        origen           = ?,
        estado           = ?,
        propietario_id   = ?,
        fecha_creacion   = ?,
        fecha_revision   = ?,
        fecha_expiracion = ?,
        notas            = ?,
        updated_at       = NOW()
       WHERE id = ?`,
      [
        nombre,
        identidad,
        tipo_identidad   ?? null,
        origen           ?? null,
        estado           ?? 'activa',
        propietario_id   ?? null,
        fecha_creacion   ?? null,
        fecha_revision   ?? null,
        fecha_expiracion ?? null,
        notas            ?? null,
        id,
      ]
    )

    res.json({ message: 'Identidad actualizada' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/identidades/:id
// Sin ?force: verifica accesos asociados → 409 para confirmación extra en frontend
// Con ?force=true: elimina accesos vinculados y luego la identidad
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const force = req.query.force === 'true'

    const [[identidad]] = await req.tenantDB.execute(
      'SELECT id, nombre FROM identidades WHERE id = ?', [id]
    )
    if (!identidad) return res.status(404).json({ error: 'Identidad no encontrada' })

    const [[{ total }]] = await req.tenantDB.execute(
      'SELECT COUNT(*) AS total FROM accesos WHERE identidad_id = ?', [id]
    )

    if (total > 0 && !force) {
      return res.status(409).json({
        error:   'tiene_asociaciones',
        message: `Esta identidad tiene ${total} acceso(s) asociado(s).`,
        count:   total,
      })
    }

    if (total > 0 && force) {
      // Eliminar accesos vinculados antes de borrar la identidad
      await req.tenantDB.execute('DELETE FROM accesos WHERE identidad_id = ?', [id])
    }

    await req.tenantDB.execute('DELETE FROM identidades WHERE id = ?', [id])

    res.json({
      message: force
        ? 'Identidad y accesos asociados eliminados'
        : 'Identidad eliminada',
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
