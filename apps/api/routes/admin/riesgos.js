// Módulo de Riesgos — panel interno DSTAC (solo DSTAC gestiona riesgos).
// Tablas riesgos + riesgos_historial viven en la BD operacional del cliente (req.tenantDB).
// La evidencia ISO se crea en la BD central (centralDB), reutilizando el almacenamiento
// del módulo ISO (uploads + tabla iso_evidences).
const router  = require('express').Router()
const path    = require('path')
const fs      = require('fs')
const PDFDocument = require('pdfkit')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant } = require('../../middleware/tenant')
const centralDB = require('../../db/central')
const { getOrCreateEvaluation } = require('../../services/isoService')
const { registrarActividad } = require('../../utils/activityLogger')

router.use(requireAuth, requireDstacRole, resolveTenant)

// id de usuario (el JWT trae user_id o id según el flujo)
const uid = (req) => req.user.user_id || req.user.id

// ─── Catálogo de controles ISO (para el selector múltiple y mostrar nombres) ───
// GET /api/admin/riesgos/iso-controls
router.get('/iso-controls', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, domain_id, name FROM iso_controls ORDER BY order_num, id`
    )
    res.json({ controles: rows })
  } catch (err) { next(err) }
})

// ─── Stats + datos de la matriz 5×5 ───────────────────────────────────────────
// GET /api/admin/riesgos/stats
router.get('/stats', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const [[c]] = await db.execute(`
      SELECT
        COUNT(*)                                              AS total,
        SUM(nivel_categoria = 'critico')                      AS criticos,
        SUM(nivel_categoria = 'alto')                         AS altos,
        SUM(nivel_categoria = 'medio')                        AS medios,
        SUM(nivel_categoria = 'bajo')                         AS bajos,
        SUM(estado = 'en_tratamiento')                        AS en_tratamiento,
        SUM(estado IN ('mitigado','aceptado','cerrado'))      AS mitigados,
        SUM(estado = 'identificado' AND tipo_tratamiento IS NULL) AS sin_tratar
      FROM riesgos
    `)
    // Todos los riesgos para plotear en la matriz (probabilidad × impacto)
    const [matriz] = await db.execute(
      `SELECT id, nombre, probabilidad, impacto, nivel_categoria, estado FROM riesgos`
    )
    res.json({
      total:          Number(c.total),
      criticos:       Number(c.criticos),
      altos:          Number(c.altos),
      medios:         Number(c.medios),
      bajos:          Number(c.bajos),
      en_tratamiento: Number(c.en_tratamiento),
      mitigados:      Number(c.mitigados),
      sin_tratar:     Number(c.sin_tratar),
      matriz,
    })
  } catch (err) { next(err) }
})

// ─── Listar con filtros ───────────────────────────────────────────────────────
// GET /api/admin/riesgos?search&categoria&estado&nivel_categoria&activo_id&page&limit
router.get('/', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const { search, categoria, estado, nivel_categoria, activo_id, page = 1, limit = 30 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const cond = [], params = []
    if (search)          { cond.push('(r.nombre LIKE ? OR r.amenaza LIKE ? OR r.descripcion LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    if (categoria)       { cond.push('r.categoria = ?');        params.push(categoria) }
    if (estado)          { cond.push('r.estado = ?');           params.push(estado) }
    if (nivel_categoria) { cond.push('r.nivel_categoria = ?');  params.push(nivel_categoria) }
    if (activo_id)       { cond.push('r.activo_id = ?');        params.push(activo_id) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''

    const [rows] = await db.execute(`
      SELECT r.*, a.nombre AS activo_nombre_actual, a.tipo AS activo_tipo, a.criticidad AS activo_criticidad
      FROM riesgos r
      LEFT JOIN activos a ON r.activo_id = a.id
      ${where}
      ORDER BY
        FIELD(r.nivel_categoria,'critico','alto','medio','bajo'),
        FIELD(r.estado,'identificado','en_tratamiento','mitigado','aceptado','cerrado'),
        r.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, params)

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM riesgos r ${where}`, params)
    res.json({ riesgos: rows, total: Number(total), page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// ─── Detalle (incluye historial) ──────────────────────────────────────────────
// GET /api/admin/riesgos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const [[riesgo]] = await db.execute(`
      SELECT r.*, a.nombre AS activo_nombre_actual, a.tipo AS activo_tipo, a.criticidad AS activo_criticidad
      FROM riesgos r LEFT JOIN activos a ON r.activo_id = a.id
      WHERE r.id = ?
    `, [req.params.id])
    if (!riesgo) return res.status(404).json({ error: 'Riesgo no encontrado' })

    const [historial] = await db.execute(
      `SELECT * FROM riesgos_historial WHERE riesgo_id = ? ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    )
    res.json({ ...riesgo, historial })
  } catch (err) { next(err) }
})

// ─── Crear ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const {
      nombre, descripcion, categoria, activo_id, amenaza, vulnerabilidad,
      probabilidad, impacto, tipo_tratamiento, plan_tratamiento, responsable, fecha_limite,
      residual_probabilidad, residual_impacto, incidente_id, incidente_nombre,
      iso_control_ids, notas_dstac,
    } = req.body

    if (!nombre || !categoria || !amenaza || !probabilidad || !impacto) {
      return res.status(400).json({ error: 'Nombre, categoría, amenaza, probabilidad e impacto son requeridos' })
    }

    // Copia del nombre del activo (por si luego se elimina el activo)
    let activoNombre = null
    if (activo_id) {
      const [[act]] = await db.execute('SELECT nombre FROM activos WHERE id = ?', [activo_id])
      activoNombre = act?.nombre ?? null
    }

    const [result] = await db.execute(`
      INSERT INTO riesgos
        (nombre, descripcion, categoria, activo_id, activo_nombre, amenaza, vulnerabilidad,
         probabilidad, impacto, tipo_tratamiento, plan_tratamiento, responsable, fecha_limite,
         residual_probabilidad, residual_impacto, incidente_id, incidente_nombre,
         iso_control_ids, notas_dstac, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nombre, descripcion ?? null, categoria, activo_id ?? null, activoNombre,
      amenaza, vulnerabilidad ?? null, probabilidad, impacto,
      tipo_tratamiento ?? null, plan_tratamiento ?? null, responsable ?? null, fecha_limite ?? null,
      residual_probabilidad ?? null, residual_impacto ?? null,
      incidente_id ?? null, incidente_nombre ?? null,
      iso_control_ids ? JSON.stringify(iso_control_ids) : null,
      notas_dstac ?? null, uid(req),
    ])

    await db.execute(
      `INSERT INTO riesgos_historial (riesgo_id, user_id, campo_cambiado, valor_nuevo, comentario)
       VALUES (?, ?, 'estado', 'identificado', 'Riesgo creado')`,
      [result.insertId, uid(req)]
    )
    await registrarActividad({
      req, accion: 'crear', modulo: 'riesgos',
      descripcion: `Creó el riesgo "${nombre}"`,
      entidad_id: result.insertId, company_id: req.company.id,
    })

    res.status(201).json({ id: result.insertId, message: 'Riesgo creado' })
  } catch (err) { next(err) }
})

// ─── Editar ───────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const { id } = req.params

    const [[prev]] = await db.execute('SELECT * FROM riesgos WHERE id = ?', [id])
    if (!prev) return res.status(404).json({ error: 'Riesgo no encontrado' })

    // Campos editables (nivel_* son generados, no se tocan)
    const EDITABLES = ['nombre','descripcion','categoria','activo_id','amenaza','vulnerabilidad',
      'probabilidad','impacto','tipo_tratamiento','plan_tratamiento','responsable','fecha_limite',
      'residual_probabilidad','residual_impacto','iso_control_ids','notas_dstac','estado']

    const fields = [], params = []
    for (const k of EDITABLES) {
      if (req.body[k] === undefined) continue
      if (k === 'iso_control_ids') {
        fields.push('iso_control_ids = ?'); params.push(req.body[k] ? JSON.stringify(req.body[k]) : null)
      } else {
        fields.push(`${k} = ?`); params.push(req.body[k] === '' ? null : req.body[k])
      }
    }
    // Si cambia el activo, refrescar la copia del nombre
    if (req.body.activo_id !== undefined) {
      let nom = null
      if (req.body.activo_id) {
        const [[act]] = await db.execute('SELECT nombre FROM activos WHERE id = ?', [req.body.activo_id])
        nom = act?.nombre ?? null
      }
      fields.push('activo_nombre = ?'); params.push(nom)
    }

    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' })

    params.push(id)
    await db.execute(`UPDATE riesgos SET ${fields.join(', ')} WHERE id = ?`, params)

    // Historial: registrar el cambio de estado (campo clave)
    if (req.body.estado !== undefined && req.body.estado !== prev.estado) {
      await db.execute(
        `INSERT INTO riesgos_historial (riesgo_id, user_id, campo_cambiado, valor_anterior, valor_nuevo, comentario)
         VALUES (?, ?, 'estado', ?, ?, 'Cambio de estado')`,
        [id, uid(req), prev.estado, req.body.estado]
      )
    }
    await registrarActividad({
      req, accion: 'editar', modulo: 'riesgos',
      descripcion: `Editó el riesgo "${prev.nombre}"`,
      entidad_id: Number(id), company_id: req.company.id,
    })

    res.json({ message: 'Riesgo actualizado' })
  } catch (err) { next(err) }
})

// ─── Eliminar ─────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const [[r]] = await db.execute('SELECT nombre FROM riesgos WHERE id = ?', [req.params.id])
    await db.execute('DELETE FROM riesgos WHERE id = ?', [req.params.id])  // historial cae por CASCADE
    await registrarActividad({
      req, accion: 'eliminar', modulo: 'riesgos',
      descripcion: `Eliminó el riesgo${r?.nombre ? ` "${r.nombre}"` : ` #${req.params.id}`}`,
      entidad_id: Number(req.params.id), company_id: req.company.id,
    })
    res.json({ message: 'Riesgo eliminado' })
  } catch (err) { next(err) }
})

// ─── Generar PDF y adjuntarlo como evidencia en ISO 27001 ──────────────────────
// POST /api/admin/riesgos/:id/generar-pdf
// El PDF se guarda en uploads/riesgos/{slug} y se inserta una evidencia en
// iso_evidences (BD central) por cada control ISO relacionado.
router.post('/:id/generar-pdf', async (req, res, next) => {
  try {
    const db = req.tenantDB
    const { id } = req.params

    const [[riesgo]] = await db.execute('SELECT * FROM riesgos WHERE id = ?', [id])
    if (!riesgo) return res.status(404).json({ error: 'Riesgo no encontrado' })

    // Solo se documenta un riesgo que ya pasó de la mera identificación
    const ESTADOS_OK = ['en_tratamiento','mitigado','aceptado','cerrado']
    if (!ESTADOS_OK.includes(riesgo.estado)) {
      return res.status(400).json({ error: 'Solo se puede generar PDF de riesgos en tratamiento, mitigados, aceptados o cerrados' })
    }

    // Datos de la empresa y del analista que firma
    const [[empresa]]  = await centralDB.execute('SELECT name FROM companies WHERE id = ?', [req.company.id])
    const [[analista]] = await centralDB.execute('SELECT first_name, last_name FROM users WHERE id = ?', [uid(req)])

    // ── Construcción del PDF con pdfkit ──────────────────────────────────────
    const doc      = new PDFDocument({ margin: 50 })
    const fileName = `riesgo_${id}_${Date.now()}.pdf`
    const dirPath  = path.join(__dirname, '../../uploads/riesgos', req.company.slug)
    const filePath = path.join(dirPath, fileName)
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })

    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    const NIVEL  = { critico: 'CRÍTICO', alto: 'ALTO', medio: 'MEDIO', bajo: 'BAJO' }
    const TRAT   = { mitigar: 'Mitigar', aceptar: 'Aceptar', transferir: 'Transferir', evitar: 'Evitar' }
    const ESTADO = { en_tratamiento: 'En tratamiento', mitigado: 'Mitigado', aceptado: 'Aceptado', cerrado: 'Cerrado' }
    const cap    = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
    const hoy    = new Date().toLocaleDateString('es-CL')

    // Encabezado
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#26215C').text('INFORME DE GESTIÓN DE RIESGO', { align: 'center' })
    doc.moveDown(0.4)
    doc.fontSize(10).font('Helvetica').fillColor('#666')
    doc.text(`Empresa: ${empresa?.name ?? req.company.slug}`, { align: 'center' })
    doc.text(`Fecha: ${hoy}`, { align: 'center' })
    doc.text(`Elaborado por: ${analista ? `${analista.first_name ?? ''} ${analista.last_name ?? ''}`.trim() : ''} — DSTAC`, { align: 'center' })
    doc.moveDown(1)

    // Helpers de sección y campo
    const seccion = (t) => { doc.moveDown(0.5).fontSize(13).font('Helvetica-Bold').fillColor('#26215C').text(t); doc.moveDown(0.2).fontSize(10.5).font('Helvetica').fillColor('#333') }
    const campo   = (l, v) => { doc.font('Helvetica-Bold').text(`${l}: `, { continued: true }); doc.font('Helvetica').text(v ?? 'No especificado') }

    seccion('1. IDENTIFICACIÓN DEL RIESGO')
    campo('Nombre', riesgo.nombre)
    if (riesgo.descripcion) campo('Descripción', riesgo.descripcion)
    campo('Categoría', cap(riesgo.categoria))
    if (riesgo.activo_nombre) campo('Activo afectado', riesgo.activo_nombre)
    campo('Amenaza identificada', riesgo.amenaza)
    if (riesgo.vulnerabilidad) campo('Vulnerabilidad', riesgo.vulnerabilidad)
    if (riesgo.incidente_nombre) campo('Origen (incidente)', riesgo.incidente_nombre)

    seccion('2. EVALUACIÓN DEL RIESGO')
    campo('Probabilidad', `${riesgo.probabilidad}/5`)
    campo('Impacto', `${riesgo.impacto}/5`)
    campo('Nivel de riesgo inherente', `${riesgo.nivel_riesgo}/25 — ${NIVEL[riesgo.nivel_categoria] ?? riesgo.nivel_categoria}`)

    seccion('3. PLAN DE TRATAMIENTO')
    campo('Tipo de tratamiento', TRAT[riesgo.tipo_tratamiento] ?? 'Sin asignar')
    if (riesgo.plan_tratamiento) campo('Plan', riesgo.plan_tratamiento)
    if (riesgo.responsable)      campo('Responsable', riesgo.responsable)
    if (riesgo.fecha_limite)     campo('Fecha límite', new Date(riesgo.fecha_limite).toLocaleDateString('es-CL'))
    if (riesgo.residual_probabilidad && riesgo.residual_impacto) {
      campo('Riesgo residual esperado', `${riesgo.residual_nivel}/25 (P:${riesgo.residual_probabilidad} × I:${riesgo.residual_impacto})`)
    }

    // Controles ISO relacionados (la columna puede venir ya parseada por mysql2)
    let controles = riesgo.iso_control_ids || []
    if (typeof controles === 'string') { try { controles = JSON.parse(controles) } catch { controles = [] } }
    if (!Array.isArray(controles)) controles = []
    if (controles.length) {
      seccion('4. CONTROLES ISO 27001 RELACIONADOS')
      controles.forEach(c => doc.text(`• ${c}`))
    }

    seccion('5. ESTADO ACTUAL')
    campo('Estado', ESTADO[riesgo.estado] ?? riesgo.estado)
    campo('Fecha del informe', hoy)
    if (riesgo.notas_dstac) campo('Notas DSTAC', riesgo.notas_dstac)

    doc.moveDown(2).fontSize(8).fillColor('#999')
    doc.text('Documento generado automáticamente por DSTAC Platform', { align: 'center' })
    doc.text('Confidencial — uso interno', { align: 'center' })

    doc.end()
    await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject) })
    const fileSize = fs.statSync(filePath).size

    // ── Adjuntar como evidencia en cada control ISO relacionado ──────────────
    let adjuntados = 0
    if (controles.length) {
      const evalId = await getOrCreateEvaluation(req.company.id, uid(req))
      const original = `Informe_Riesgo_${String(riesgo.nombre).slice(0, 40).replace(/[^\w\s-]/g, '')}.pdf`
      let firstEvId = null
      for (const controlId of controles) {
        const [ev] = await centralDB.execute(`
          INSERT INTO iso_evidences
            (evaluation_id, control_id, company_id, filename, original_name, file_type,
             file_size, file_path, status, uploaded_by, comments)
          VALUES (?, ?, ?, ?, ?, 'application/pdf', ?, ?, 'aprobada', ?, ?)
        `, [evalId, controlId, req.company.id, fileName, original, fileSize, filePath, uid(req),
            `Generado desde el módulo de Riesgos (riesgo #${id})`])
        if (firstEvId === null) firstEvId = ev.insertId
        // Dejar traza en el historial ISO del control
        await centralDB.execute(`
          INSERT INTO iso_history (evaluation_id, control_id, company_id, event_type, user_id, new_data)
          VALUES (?, ?, ?, 'evidencia_agregada', ?, ?)
        `, [evalId, controlId, req.company.id, uid(req),
            JSON.stringify({ filename: original, origen: 'riesgo', riesgo_id: Number(id) })])
        adjuntados++
      }
      // Guardar referencia en el riesgo
      await db.execute('UPDATE riesgos SET iso_evidencia_id = ? WHERE id = ?', [firstEvId, id])
    }

    await db.execute(
      `INSERT INTO riesgos_historial (riesgo_id, user_id, campo_cambiado, valor_nuevo, comentario)
       VALUES (?, ?, 'documento', ?, 'PDF generado y adjuntado a ISO 27001')`,
      [id, uid(req), fileName]
    )
    await registrarActividad({
      req, accion: 'exportar', modulo: 'riesgos',
      descripcion: `Generó el PDF del riesgo "${riesgo.nombre}" y lo adjuntó a ${adjuntados} control(es) ISO`,
      entidad_id: Number(id), company_id: req.company.id,
    })

    // Devolver el PDF en base64 para que el frontend lo abra/descargue.
    const pdfBase64 = fs.readFileSync(filePath).toString('base64')

    res.json({
      success: true,
      message: adjuntados > 0
        ? `PDF generado y adjuntado a ${adjuntados} control(es) ISO 27001`
        : 'PDF generado (el riesgo no tiene controles ISO relacionados)',
      filename: fileName,
      controles_actualizados: adjuntados,
      pdf_base64: pdfBase64,
    })
  } catch (err) { next(err) }
})

module.exports = router
