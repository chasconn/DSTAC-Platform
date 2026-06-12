const express = require('express')
const router = express.Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')

// Todas las rutas requieren: sesión válida + rol DSTAC + tenant resuelto
router.use(requireAuth, requireDstacRole, resolveTenant)

// GET /api/admin/personal/stats
// IMPORTANTE: debe estar ANTES de /:id para que Express no interprete 'stats' como un id
router.get('/stats', async (req, res, next) => {
  try {
    const db = req.tenantDB

    // Conteos principales en una sola query
    const [[counts]] = await db.execute(`
      SELECT
        COUNT(*)                     AS total,
        SUM(estado = 'activo')       AS activos,
        SUM(estado = 'desvinculado') AS desvinculados
      FROM personal
    `)

    // Personas que tienen al menos una identidad asociada
    const [[identidades]] = await db.execute(`
      SELECT COUNT(DISTINCT propietario_id) AS total
      FROM identidades
      WHERE propietario_id IS NOT NULL
    `)

    res.json({
      total:           counts.total        ?? 0,
      activos:         counts.activos       ?? 0,
      desvinculados:   counts.desvinculados ?? 0,
      con_identidades: identidades.total    ?? 0,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/personal
// Query params: search, estado, nivel_responsabilidad, page, limit
// search busca por nombre, correo o rol_empresarial
router.get('/', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const { search, estado, nivel_responsabilidad, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (search) {
      where += ' AND (nombre LIKE ? OR correo LIKE ? OR rol_empresarial LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (estado)               { where += ' AND estado = ?';                params.push(estado) }
    if (nivel_responsabilidad) { where += ' AND nivel_responsabilidad = ?'; params.push(nivel_responsabilidad) }

    // Orden: activos primero, luego vacaciones, inactivos, desvinculados — dentro de cada grupo A-Z
    const [rows] = await db.execute(`
      SELECT
        id, nombre, rol_empresarial, nivel_responsabilidad,
        estado, fecha_ingreso, correo, telefono,
        created_at, updated_at
      FROM personal
      ${where}
      ORDER BY
        FIELD(estado, 'activo', 'vacaciones', 'inactivo', 'desvinculado'),
        nombre ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM personal ${where}`,
      params
    )

    res.json({
      personal: rows,
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/personal/:id
// Devuelve el detalle completo de una persona + count de identidades asociadas
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const [[persona]] = await req.tenantDB.execute(
      `SELECT id, nombre, rol_empresarial, nivel_responsabilidad,
              estado, fecha_ingreso, correo, telefono, created_at, updated_at
       FROM personal WHERE id = ?`,
      [id]
    )
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' })

    // Contar identidades vinculadas para mostrarlo en el panel de detalle
    const [[{ identidades }]] = await req.tenantDB.execute(
      'SELECT COUNT(*) AS identidades FROM identidades WHERE propietario_id = ?',
      [id]
    )

    res.json({ ...persona, identidades })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/personal
router.post('/', async (req, res, next) => {
  try {
    const {
      nombre, rol_empresarial, nivel_responsabilidad,
      estado, fecha_ingreso, correo, telefono,
    } = req.body

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const [result] = await req.tenantDB.execute(
      `INSERT INTO personal
        (nombre, rol_empresarial, nivel_responsabilidad, estado, fecha_ingreso, correo, telefono)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        rol_empresarial       ?? null,
        nivel_responsabilidad ?? null,
        estado                ?? 'activo',
        fecha_ingreso         ?? null,
        correo                ?? null,
        telefono              ?? null,
      ]
    )

    res.status(201).json({ id: result.insertId, message: 'Persona creada' })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/personal/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      nombre, rol_empresarial, nivel_responsabilidad,
      estado, fecha_ingreso, correo, telefono,
    } = req.body

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const [[persona]] = await req.tenantDB.execute(
      'SELECT id FROM personal WHERE id = ?', [id]
    )
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' })

    await req.tenantDB.execute(
      `UPDATE personal SET
        nombre                = ?,
        rol_empresarial       = ?,
        nivel_responsabilidad = ?,
        estado                = ?,
        fecha_ingreso         = ?,
        correo                = ?,
        telefono              = ?,
        updated_at            = NOW()
       WHERE id = ?`,
      [
        nombre,
        rol_empresarial       ?? null,
        nivel_responsabilidad ?? null,
        estado                ?? 'activo',
        fecha_ingreso         ?? null,
        correo                ?? null,
        telefono              ?? null,
        id,
      ]
    )

    res.json({ message: 'Persona actualizada' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/personal/:id
// Sin ?force: verifica si tiene identidades asociadas → 409 para confirmación extra en frontend
// Con ?force=true: desasocia identidades (propietario_id = NULL) y luego elimina la persona
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const force = req.query.force === 'true'

    const [[persona]] = await req.tenantDB.execute(
      'SELECT id, nombre FROM personal WHERE id = ?', [id]
    )
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' })

    const [[{ total }]] = await req.tenantDB.execute(
      'SELECT COUNT(*) AS total FROM identidades WHERE propietario_id = ?', [id]
    )

    if (total > 0 && !force) {
      return res.status(409).json({
        error:   'tiene_asociaciones',
        message: `Esta persona tiene ${total} identidad(es) asociada(s).`,
        count:   total,
      })
    }

    if (total > 0 && force) {
      // Las identidades no se eliminan — solo quedan sin propietario asignado
      await req.tenantDB.execute(
        'UPDATE identidades SET propietario_id = NULL WHERE propietario_id = ?', [id]
      )
    }

    await req.tenantDB.execute('DELETE FROM personal WHERE id = ?', [id])

    res.json({
      message: force
        ? 'Persona eliminada e identidades desasociadas'
        : 'Persona eliminada',
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
