const router = require('express').Router()
const centralDB = require('../db/central')
const { createTenantDB, dropTenantDB, VALID_SLUG, slugToDbName } = require('../db/tenantMigrate')
const { getTenantDB, releaseTenantDB } = require('../db/tenant')
const { requireAuth, requireRole } = require('../middleware/auth')
const { getOrCreateEvaluation } = require('../services/nistService')
const { registrarActividad } = require('../utils/activityLogger')

const READERS  = ['super_admin', 'admin_dstac', 'analista_dstac']
const MANAGERS = ['super_admin', 'admin_dstac']
const VALID_STATUS = ['active', 'suspended', 'setup', 'cancelled']
const VALID_PLANS  = [1, 2, 3]

// ─── GET /api/companies ───────────────────────────────────────────────────────
// Listar empresas con filtros opcionales: ?search=&plan=&status=
// TODO: paginación cuando supere 20 clientes
router.get('/', requireAuth, requireRole(...READERS), async (req, res) => {
  try {
    const { search, plan, status } = req.query

    const conditions = ["c.status != 'cancelled'", "c.is_internal = 0"]
    const params = []

    if (search) {
      conditions.push('(c.name LIKE ? OR c.slug LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }
    if (plan) {
      conditions.push('p.name = ?')
      params.push(plan)
    }
    if (status) {
      conditions.push('c.status = ?')
      params.push(status)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await centralDB.execute(
      `SELECT c.id, c.name, c.slug, c.status,
              c.theme_color, c.theme_light, c.theme_mid,
              c.billing_email, c.contact_phone, c.max_users,
              c.created_at, c.updated_at,
              p.name AS plan_name, p.display_name AS plan_display
       FROM companies c
       JOIN plans p ON c.plan_id = p.id
       ${where}
       ORDER BY c.created_at DESC`,
      params
    )

    res.json(rows)
  } catch (err) {
    console.error('Error listando empresas:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── GET /api/companies/:slug ─────────────────────────────────────────────────
router.get('/:slug', requireAuth, requireRole(...READERS), async (req, res) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT c.*, p.name AS plan_name, p.display_name AS plan_display, p.modules
       FROM companies c
       JOIN plans p ON c.plan_id = p.id
       WHERE c.slug = ?`,
      [req.params.slug]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' })
    res.json(rows[0])
  } catch (err) {
    console.error('Error obteniendo empresa:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/companies ──────────────────────────────────────────────────────
// Crear empresa y provisionar su BD operacional
router.post('/', requireAuth, requireRole(...MANAGERS), async (req, res) => {
  try {
    const { name, slug, plan_id, billing_email, contact_phone, max_users,
            theme_color, theme_light, theme_mid } = req.body

    if (!name || !slug || !plan_id) {
      return res.status(400).json({ error: 'name, slug y plan_id son requeridos' })
    }
    if (!VALID_SLUG.test(slug)) {
      return res.status(400).json({ error: 'El slug solo puede contener letras minúsculas, números y guiones' })
    }
    if (!VALID_PLANS.includes(parseInt(plan_id, 10))) {
      return res.status(400).json({ error: 'Plan inválido' })
    }

    const [existing] = await centralDB.execute(
      'SELECT id FROM companies WHERE slug = ?', [slug]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El slug ya está en uso' })
    }

    const dbName = await createTenantDB(slug)

    const [result] = await centralDB.execute(
      `INSERT INTO companies
         (name, slug, plan_id, db_name, status, billing_email, contact_phone,
          max_users, theme_color, theme_light, theme_mid)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [
        name, slug, parseInt(plan_id, 10), dbName,
        billing_email  || null,
        contact_phone  || null,
        max_users ? parseInt(max_users, 10) : 5,
        theme_color || '#3C3489',
        theme_light || '#EEEDFE',
        theme_mid   || '#534AB7'
      ]
    )

    // Auto-inicializar evaluación NIST para la nueva empresa
    const userId = req.user.user_id || req.user.id
    try {
      await getOrCreateEvaluation(result.insertId, userId)
    } catch (err) {
      console.warn(`NIST auto-init skipped for ${slug}:`, err.message)
    }

    await registrarActividad({
      req, accion: 'crear', modulo: 'clientes',
      descripcion: `Creó la empresa "${name}" (${slug})`,
      entidad_id: result.insertId, company_id: result.insertId, company_nombre: name,
    })

    res.status(201).json({
      id: result.insertId,
      name, slug, db_name: dbName,
      message: `Empresa creada y BD ${dbName} provisionada`
    })
  } catch (err) {
    console.error('Error creando empresa:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── PUT /api/companies/:slug ─────────────────────────────────────────────────
// Editar datos generales de la empresa
router.put('/:slug', requireAuth, requireRole(...MANAGERS), async (req, res) => {
  try {
    const { name, plan_id, billing_email, contact_phone, max_users,
            theme_color, theme_light, theme_mid } = req.body

    if (plan_id && !VALID_PLANS.includes(parseInt(plan_id, 10))) {
      return res.status(400).json({ error: 'Plan inválido' })
    }

    // Construir SET dinámico solo con campos enviados (todos literales, valores por ?)
    const fields = []
    const values = []

    if (name          !== undefined) { fields.push('name = ?');          values.push(name) }
    if (plan_id       !== undefined) { fields.push('plan_id = ?');       values.push(parseInt(plan_id, 10)) }
    if (billing_email !== undefined) { fields.push('billing_email = ?'); values.push(billing_email) }
    if (contact_phone !== undefined) { fields.push('contact_phone = ?'); values.push(contact_phone) }
    if (max_users     !== undefined) { fields.push('max_users = ?');     values.push(parseInt(max_users, 10)) }
    if (theme_color   !== undefined) { fields.push('theme_color = ?');   values.push(theme_color) }
    if (theme_light   !== undefined) { fields.push('theme_light = ?');   values.push(theme_light) }
    if (theme_mid     !== undefined) { fields.push('theme_mid = ?');     values.push(theme_mid) }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' })
    }

    values.push(req.params.slug)
    const [result] = await centralDB.execute(
      `UPDATE companies SET ${fields.join(', ')} WHERE slug = ?`,
      values
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    await registrarActividad({
      req, accion: 'editar', modulo: 'clientes',
      descripcion: `Editó la empresa "${name ?? req.params.slug}"`,
      company_nombre: name ?? null,
    })

    res.json({ message: 'Empresa actualizada' })
  } catch (err) {
    console.error('Error actualizando empresa:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── PATCH /api/companies/:slug/status ───────────────────────────────────────
// Cambiar solo el status (suspender / reactivar)
router.patch('/:slug/status', requireAuth, requireRole(...MANAGERS), async (req, res) => {
  try {
    const { status } = req.body

    if (!status || !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Valores: ${VALID_STATUS.join(', ')}` })
    }

    const [result] = await centralDB.execute(
      'UPDATE companies SET status = ? WHERE slug = ?',
      [status, req.params.slug]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    // Liberar pool del tenant si se suspende o cancela
    if (status === 'suspended' || status === 'cancelled') {
      releaseTenantDB(req.params.slug)
    }

    await registrarActividad({
      req, accion: 'editar', modulo: 'clientes',
      descripcion: `Cambió el estado de "${req.params.slug}" a ${status}`,
    })

    res.json({ message: `Estado actualizado a ${status}` })
  } catch (err) {
    console.error('Error cambiando status:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── GET /api/companies/:slug/stats ──────────────────────────────────────────
// Stats rápidas para el panel lateral: score, incidentes abiertos, activos, usuarios
router.get('/:slug/stats', requireAuth, requireRole(...READERS), async (req, res) => {
  try {
    // Usuarios del cliente en BD central
    const [companyRows] = await centralDB.execute(
      'SELECT id FROM companies WHERE slug = ?', [req.params.slug]
    )
    if (companyRows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    const [usersCount] = await centralDB.execute(
      "SELECT COUNT(*) AS total FROM users WHERE company_id = ? AND status = 'active'",
      [companyRows[0].id]
    )

    // NIST score desde BD central (módulo nuevo)
    let score = 0
    try {
      const [[nistRow]] = await centralDB.execute(
        `SELECT ROUND(ne.score_total) AS score
         FROM nist_evaluations ne
         WHERE ne.company_id = ? AND ne.status = 'activa'
         LIMIT 1`,
        [companyRows[0].id]
      )
      score = Number(nistRow?.score) || 0
    } catch { /* sin evaluación aún */ }

    // Stats operacionales desde BD del tenant
    let activos = 0, incidentes = 0

    try {
      const tenantDB = await getTenantDB(req.params.slug)
      const [[activosRow]]    = await tenantDB.execute('SELECT COUNT(*) AS total FROM activos')
      const [[incidentesRow]] = await tenantDB.execute("SELECT COUNT(*) AS total FROM incidentes WHERE estado = 'abierto'")
      activos    = Number(activosRow.total)    || 0
      incidentes = Number(incidentesRow.total) || 0
    } catch { /* tenant sin datos aún */ }

    res.json({
      score,
      incidentes,
      activos,
      usuarios: usersCount[0].total
    })
  } catch (err) {
    console.error('Error obteniendo stats:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── GET /api/companies/:slug/nist ───────────────────────────────────────────
// Obtener últimos puntajes NIST por función
router.get('/:slug/nist', requireAuth, requireRole(...READERS), async (req, res) => {
  try {
    const tenantDB = await getTenantDB(req.params.slug)

    // El último registro por función (MAX id = más reciente, sin importar fecha)
    const [rows] = await tenantDB.execute(`
      SELECT n1.funcion, n1.porcentaje, n1.notas, n1.fecha_evaluacion, n1.evaluado_por
      FROM nist_scores n1
      INNER JOIN (
        SELECT funcion, MAX(id) AS ultimo_id
        FROM nist_scores
        GROUP BY funcion
      ) n2 ON n1.id = n2.ultimo_id
      ORDER BY FIELD(n1.funcion, 'identificar','proteger','detectar','responder','recuperar')
    `)

    // Asegurar que vengan las 5 funciones aunque no haya datos
    const FUNCIONES = ['identificar', 'proteger', 'detectar', 'responder', 'recuperar']
    const mapa = Object.fromEntries(rows.map(r => [r.funcion, r]))

    const resultado = FUNCIONES.map(f => mapa[f] || {
      funcion: f, porcentaje: 0, notas: '', fecha_evaluacion: null, evaluado_por: ''
    })

    res.json(resultado)
  } catch (err) {
    console.error('Error obteniendo NIST:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── PUT /api/companies/:slug/nist ───────────────────────────────────────────
// Guardar puntajes NIST (inserta nuevas filas — historial queda intacto)
router.put('/:slug/nist', requireAuth, requireRole(...MANAGERS), async (req, res) => {
  try {
    const { scores } = req.body
    // scores: [{ funcion, porcentaje, notas }]

    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ error: 'scores requerido' })
    }

    const FUNCIONES = ['identificar', 'proteger', 'detectar', 'responder', 'recuperar']
    const hoy = new Date().toISOString().slice(0, 10)
    const evaluador = req.user.email

    for (const s of scores) {
      if (!FUNCIONES.includes(s.funcion)) continue
      const pct = Math.min(100, Math.max(0, parseInt(s.porcentaje, 10) || 0))

      const tenantDB = await getTenantDB(req.params.slug)
      await tenantDB.execute(
        `INSERT INTO nist_scores (funcion, porcentaje, notas, fecha_evaluacion, evaluado_por)
         VALUES (?, ?, ?, ?, ?)`,
        [s.funcion, pct, s.notas || '', hoy, evaluador]
      )
    }

    res.json({ message: 'Puntajes NIST guardados' })
  } catch (err) {
    console.error('Error guardando NIST:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── DELETE /api/companies/:slug ─────────────────────────────────────────────
// Eliminar empresa y su BD — solo super_admin
router.delete('/:slug', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const [rows] = await centralDB.execute(
      'SELECT id FROM companies WHERE slug = ?', [req.params.slug]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' })

    releaseTenantDB(req.params.slug)
    await dropTenantDB(req.params.slug)
    await centralDB.execute('DELETE FROM companies WHERE slug = ?', [req.params.slug])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'clientes',
      descripcion: `Eliminó la empresa "${req.params.slug}" y su BD`,
    })

    res.json({ message: 'Empresa y BD eliminadas' })
  } catch (err) {
    console.error('Error eliminando empresa:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
