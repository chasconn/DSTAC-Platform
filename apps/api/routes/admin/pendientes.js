// Rutas del módulo Pendientes expandido — solo personal DSTAC.
//   GET    /api/admin/pendientes/eventos      lista eventos del calendario (por rango de mes)
//   POST   /api/admin/pendientes/eventos      crea un evento
//   PUT    /api/admin/pendientes/eventos/:id  edita un evento
//   DELETE /api/admin/pendientes/eventos/:id  elimina un evento
//   GET    /api/admin/pendientes/actividad    bitácora del sistema (filtros + paginación)
//
// El calendario es de DSTAC (no usa el chip de empresa activa); cada evento puede
// opcionalmente relacionarse con una empresa (company_id).
const router = require('express').Router()
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')

router.use(requireAuth, requireDstacRole)

const TIPOS = ['reunion', 'tarea', 'recordatorio', 'auditoria', 'vencimiento', 'otro']

// ─── CALENDARIO ───────────────────────────────────────────────────────────────

// GET /eventos?year=2026&month=6  → eventos cuya fecha cae en ese mes.
// Sin year/month devuelve los próximos 90 días (fallback defensivo).
router.get('/eventos', async (req, res, next) => {
  try {
    const { year, month } = req.query
    let where = ''
    const params = []

    if (year && month) {
      // Primer y último día del mes pedido (month es 1-12).
      const y = Number(year)
      const m = Number(month)
      const desde = `${y}-${String(m).padStart(2, '0')}-01`
      const hasta = new Date(y, m, 0).toISOString().slice(0, 10) // día 0 del mes siguiente = último del actual
      where = 'WHERE e.fecha BETWEEN ? AND ?'
      params.push(desde, hasta)
    } else {
      where = 'WHERE e.fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)'
    }

    const [rows] = await centralDB.execute(`
      SELECT e.id, e.titulo, e.descripcion, e.fecha, e.hora_inicio, e.hora_fin,
             e.todo_el_dia, e.tipo, e.company_id, e.created_at,
             c.name AS company_name
      FROM calendario_eventos e
      LEFT JOIN companies c ON e.company_id = c.id
      ${where}
      ORDER BY e.fecha ASC, e.hora_inicio ASC
    `, params)

    res.json({ eventos: rows })
  } catch (err) { next(err) }
})

// POST /eventos
router.post('/eventos', async (req, res, next) => {
  try {
    const { titulo, descripcion, fecha, hora_inicio, hora_fin, todo_el_dia, tipo, company_id } = req.body
    if (!titulo || !fecha) {
      return res.status(400).json({ error: 'Título y fecha son requeridos' })
    }
    const tipoFinal = TIPOS.includes(tipo) ? tipo : 'otro'
    const createdBy = req.user.id || req.user.user_id

    const [result] = await centralDB.execute(`
      INSERT INTO calendario_eventos
        (titulo, descripcion, fecha, hora_inicio, hora_fin, todo_el_dia, tipo, company_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      titulo,
      descripcion ?? null,
      fecha,
      hora_inicio || null,
      hora_fin || null,
      todo_el_dia ? 1 : 0,
      tipoFinal,
      company_id || null,
      createdBy,
    ])

    await registrarActividad({
      req, accion: 'crear', modulo: 'calendario',
      descripcion: `Creó el evento "${titulo}" (${fecha})`,
      entidad_id: result.insertId, company_id: company_id || null,
    })

    res.status(201).json({ id: result.insertId })
  } catch (err) { next(err) }
})

// PUT /eventos/:id
router.put('/eventos/:id', async (req, res, next) => {
  try {
    const { titulo, descripcion, fecha, hora_inicio, hora_fin, todo_el_dia, tipo, company_id } = req.body
    const fields = []
    const params = []

    if (titulo      !== undefined) { fields.push('titulo = ?');      params.push(titulo) }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); params.push(descripcion || null) }
    if (fecha       !== undefined) { fields.push('fecha = ?');       params.push(fecha) }
    if (hora_inicio !== undefined) { fields.push('hora_inicio = ?'); params.push(hora_inicio || null) }
    if (hora_fin    !== undefined) { fields.push('hora_fin = ?');    params.push(hora_fin || null) }
    if (todo_el_dia !== undefined) { fields.push('todo_el_dia = ?'); params.push(todo_el_dia ? 1 : 0) }
    if (tipo        !== undefined) { fields.push('tipo = ?');        params.push(TIPOS.includes(tipo) ? tipo : 'otro') }
    if (company_id  !== undefined) { fields.push('company_id = ?');  params.push(company_id || null) }

    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' })

    params.push(req.params.id)
    await centralDB.execute(`UPDATE calendario_eventos SET ${fields.join(', ')} WHERE id = ?`, params)

    await registrarActividad({
      req, accion: 'editar', modulo: 'calendario',
      descripcion: `Editó el evento #${req.params.id}${titulo ? ` ("${titulo}")` : ''}`,
      entidad_id: Number(req.params.id), company_id: company_id || null,
    })

    res.json({ message: 'Evento actualizado' })
  } catch (err) { next(err) }
})

// DELETE /eventos/:id
router.delete('/eventos/:id', async (req, res, next) => {
  try {
    // Leer el título antes de borrar para dejar constancia legible en la bitácora.
    const [[ev]] = await centralDB.execute('SELECT titulo, company_id FROM calendario_eventos WHERE id = ?', [req.params.id])
    await centralDB.execute('DELETE FROM calendario_eventos WHERE id = ?', [req.params.id])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'calendario',
      descripcion: `Eliminó el evento${ev?.titulo ? ` "${ev.titulo}"` : ` #${req.params.id}`}`,
      entidad_id: Number(req.params.id), company_id: ev?.company_id || null,
    })

    res.json({ message: 'Evento eliminado' })
  } catch (err) { next(err) }
})

// ─── ACTIVIDAD ──────────────────────────────────────────────────────────────

// GET /actividad?modulo=&accion=&usuario_id=&search=&page=1
// Bitácora paginada (20 por página). Devuelve también la lista de módulos
// distintos presentes para alimentar el filtro del frontend.
router.get('/actividad', async (req, res, next) => {
  try {
    const { modulo, accion, usuario_id, search } = req.query
    const page  = Math.max(1, Number(req.query.page) || 1)
    const LIMIT = 20
    const offset = (page - 1) * LIMIT

    const conditions = []
    const params = []
    // Columnas calificadas con el alias `al` porque el listado hace JOIN a companies.
    if (modulo)     { conditions.push('al.modulo = ?');      params.push(modulo) }
    if (accion)     { conditions.push('al.accion = ?');      params.push(accion) }
    if (usuario_id) { conditions.push('al.usuario_id = ?');  params.push(usuario_id) }
    if (search)     { conditions.push('(al.descripcion LIKE ? OR al.usuario_nombre LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // LEFT JOIN a companies para resolver el nombre cuando solo se registró company_id
    // (los módulos multi-tenant loguean el id; el calendario/clientes guardan el nombre).
    const [rows] = await centralDB.execute(`
      SELECT al.id, al.usuario_id, al.usuario_nombre, al.accion, al.modulo, al.descripcion,
             al.entidad_id, al.company_id,
             COALESCE(al.company_nombre, c.name) AS company_nombre,
             al.metadata, al.ip, al.created_at
      FROM activity_log al
      LEFT JOIN companies c ON al.company_id = c.id
      ${where}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ${LIMIT} OFFSET ${offset}
    `, params)

    const [[{ total }]] = await centralDB.execute(
      `SELECT COUNT(*) AS total FROM activity_log al ${where}`, params
    )

    // Módulos distintos (para el <select> de filtro). Sin filtros aplicados.
    const [modulos] = await centralDB.execute(
      `SELECT DISTINCT modulo FROM activity_log ORDER BY modulo ASC`
    )

    res.json({
      actividad: rows,
      total: Number(total),
      page,
      limit: LIMIT,
      total_pages: Math.ceil(Number(total) / LIMIT),
      modulos: modulos.map(m => m.modulo),
    })
  } catch (err) { next(err) }
})

module.exports = router
