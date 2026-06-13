const express = require('express')
const router = express.Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')
const { registrarActividad } = require('../../utils/activityLogger')

// Todas las rutas de este archivo requieren: sesión válida + rol DSTAC + tenant resuelto
router.use(requireAuth, requireDstacRole, resolveTenant)

// GET /api/admin/activos/stats
// Devuelve métricas rápidas del panel: total, críticos, degradados, operativos y desglose por tipo
// IMPORTANTE: esta ruta debe estar ANTES de /:id para que Express no la interprete como id='stats'
router.get('/stats', async (req, res, next) => {
  try {
    const db = req.tenantDB

    // Conteos principales en una sola query para minimizar round-trips
    const [[counts]] = await db.execute(`
      SELECT
        COUNT(*)                                          AS total,
        SUM(criticidad = 'critica')                      AS criticos,
        SUM(estado = 'degradado')                        AS degradados,
        SUM(estado = 'operativo')                        AS operativos
      FROM activos
    `)

    // Desglose por tipo ordenado de mayor a menor
    const [por_tipo] = await db.execute(`
      SELECT tipo, COUNT(*) AS cantidad
      FROM activos
      GROUP BY tipo
      ORDER BY cantidad DESC
    `)

    res.json({
      total:      counts.total      ?? 0,
      criticos:   counts.criticos   ?? 0,
      degradados: counts.degradados ?? 0,
      operativos: counts.operativos ?? 0,
      por_tipo
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/activos
// Query params: search, tipo, criticidad, estado, ambiente, page, limit
// Devuelve lista paginada con JOIN a personal para el nombre del responsable
router.get('/', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const { search, tipo, criticidad, estado, ambiente, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (search) {
      where += ' AND (a.nombre LIKE ? OR a.proveedor LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    if (tipo)       { where += ' AND a.tipo = ?';        params.push(tipo) }
    if (criticidad) { where += ' AND a.criticidad = ?';  params.push(criticidad) }
    if (estado)     { where += ' AND a.estado = ?';      params.push(estado) }
    if (ambiente)   { where += ' AND a.ambiente = ?';    params.push(ambiente) }

    // ORDER BY: primero por criticidad (critica → alta → media → baja), luego nombre A-Z
    const [rows] = await db.execute(`
      SELECT
        a.id, a.tipo, a.nombre, a.proveedor, a.estado, a.criticidad,
        a.ambiente, a.proyecto, a.documentacion, a.metadata,
        a.responsable_id, a.created_at, a.updated_at,
        p.nombre AS responsable_nombre
      FROM activos a
      LEFT JOIN personal p ON a.responsable_id = p.id
      ${where}
      ORDER BY
        FIELD(a.criticidad, 'critica', 'alta', 'media', 'baja'),
        a.nombre ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [...params])

    // Extraer campos técnicos del JSON metadata para exponerlos como campos planos
    const activos = rows.map(row => ({
      ...row,
      metadata:          row.metadata ? JSON.parse(row.metadata) : null,
      ip:                row.metadata ? (JSON.parse(row.metadata)?.ip ?? null) : null,
      sistema_operativo: row.metadata ? (JSON.parse(row.metadata)?.sistema_operativo ?? null) : null,
      version:           row.metadata ? (JSON.parse(row.metadata)?.version ?? null) : null,
    }))

    const [[{ total }]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM activos a
      ${where}
    `, params)

    res.json({
      activos,
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/activos
// Crea un nuevo activo en la BD del tenant activo
// ip, sistema_operativo y version se guardan en el campo metadata (JSON)
router.post('/', async (req, res, next) => {
  try {
    const {
      tipo, nombre, proveedor, estado, criticidad, ambiente,
      responsable_id, proyecto, documentacion,
      ip, sistema_operativo, version
    } = req.body

    if (!tipo || !nombre || !criticidad) {
      return res.status(400).json({ error: 'Nombre, tipo y criticidad son requeridos' })
    }

    // Solo incluir en metadata los campos técnicos que el usuario completó
    const metadataObj = {}
    if (ip)                metadataObj.ip = ip
    if (sistema_operativo) metadataObj.sistema_operativo = sistema_operativo
    if (version)           metadataObj.version = version

    const metadata = Object.keys(metadataObj).length > 0
      ? JSON.stringify(metadataObj)
      : null

    const [result] = await req.tenantDB.execute(
      `INSERT INTO activos
        (tipo, nombre, proveedor, estado, criticidad, ambiente,
         responsable_id, proyecto, documentacion, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo,
        nombre,
        proveedor        ?? null,
        estado           ?? 'operativo',
        criticidad,
        ambiente         ?? null,
        responsable_id   ?? null,
        proyecto         ?? null,
        documentacion    ?? null,
        metadata
      ]
    )

    await registrarActividad({
      req, accion: 'crear', modulo: 'activos',
      descripcion: `Creó el activo "${nombre}"`,
      entidad_id: result.insertId, company_id: req.company?.id,
    })

    res.status(201).json({ id: result.insertId, message: 'Activo creado' })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/activos/:id
// Actualiza un activo existente. Reconstruye metadata desde los campos técnicos enviados.
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      tipo, nombre, proveedor, estado, criticidad, ambiente,
      responsable_id, proyecto, documentacion,
      ip, sistema_operativo, version
    } = req.body

    if (!tipo || !nombre || !criticidad) {
      return res.status(400).json({ error: 'Nombre, tipo y criticidad son requeridos' })
    }

    // Verificar que el activo existe en este tenant
    const [[activo]] = await req.tenantDB.execute(
      'SELECT id FROM activos WHERE id = ?', [id]
    )
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' })
    }

    // Reconstruir metadata desde los valores enviados en esta edición
    // Si el campo llega vacío o undefined se omite — borra el valor anterior
    const metadataObj = {}
    if (ip)                metadataObj.ip = ip
    if (sistema_operativo) metadataObj.sistema_operativo = sistema_operativo
    if (version)           metadataObj.version = version

    const metadata = Object.keys(metadataObj).length > 0
      ? JSON.stringify(metadataObj)
      : null

    await req.tenantDB.execute(
      `UPDATE activos SET
        tipo           = ?,
        nombre         = ?,
        proveedor      = ?,
        estado         = ?,
        criticidad     = ?,
        ambiente       = ?,
        responsable_id = ?,
        proyecto       = ?,
        documentacion  = ?,
        metadata       = ?,
        updated_at     = NOW()
       WHERE id = ?`,
      [
        tipo,
        nombre,
        proveedor        ?? null,
        estado           ?? 'operativo',
        criticidad,
        ambiente         ?? null,
        responsable_id   ?? null,
        proyecto         ?? null,
        documentacion    ?? null,
        metadata,
        id
      ]
    )

    await registrarActividad({
      req, accion: 'editar', modulo: 'activos',
      descripcion: `Editó el activo "${nombre}"`,
      entidad_id: Number(id), company_id: req.company?.id,
    })

    res.json({ message: 'Activo actualizado' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/activos/:id
// Sin ?force: verifica asociaciones. Si hay accesos vinculados responde 409 para que el
// frontend muestre la confirmación extra con ingreso del nombre del activo.
// Con ?force=true: elimina primero los accesos vinculados y luego el activo.
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const force = req.query.force === 'true'

    // Verificar que el activo existe en este tenant
    const [[activo]] = await req.tenantDB.execute(
      'SELECT id, nombre FROM activos WHERE id = ?', [id]
    )
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' })
    }

    // Contar accesos vinculados a este activo
    const [[{ total }]] = await req.tenantDB.execute(
      'SELECT COUNT(*) AS total FROM accesos WHERE activo_id = ?', [id]
    )

    if (total > 0 && !force) {
      // Primera llamada: informar al frontend para mostrar confirmación extra
      return res.status(409).json({
        error: 'tiene_asociaciones',
        message: `Este activo tiene ${total} acceso(s) asociado(s). ¿Confirmar eliminación?`,
        count: total
      })
    }

    if (total > 0 && force) {
      // Segunda confirmación: eliminar accesos vinculados antes de borrar el activo
      await req.tenantDB.execute('DELETE FROM accesos WHERE activo_id = ?', [id])
    }

    await req.tenantDB.execute('DELETE FROM activos WHERE id = ?', [id])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'activos',
      descripcion: `Eliminó el activo "${activo.nombre}"`,
      entidad_id: Number(id), company_id: req.company?.id,
    })

    res.json({
      message: force
        ? 'Activo y accesos asociados eliminados'
        : 'Activo eliminado'
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
