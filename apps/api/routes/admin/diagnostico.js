// routes/admin/diagnostico.js — Diagnóstico de madurez interno (por cliente).
// Solo DSTAC. Empresa desde X-Company-Slug (resolveTenant → req.company).
const router    = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB = require('../../db/central')
const { DOMINIOS, TAMANOS, evaluar, planDeRespuestas } = require('../../services/diagnostico/cuestionario')
const { helpers } = require('./cotizaciones')

router.use(requireAuth, requireDstacRole, resolveTenant)
const uid = (req) => req.user.id || req.user.user_id

// Estructura del cuestionario (para pintar el formulario).
router.get('/cuestionario', (req, res) => {
  res.json({
    dominios: DOMINIOS.map(d => ({ id: d.id, nombre: d.nombre, preguntas: d.preguntas })),
    tamanos: TAMANOS,
  })
})

// Último diagnóstico + historial de la empresa activa.
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, fecha, score_total, nivel, cotizacion_id, created_at
         FROM diagnosticos WHERE company_id = ? ORDER BY fecha DESC, id DESC LIMIT 20`,
      [req.company.id])
    res.json({ diagnosticos: rows })
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const [[d]] = await centralDB.query(
      `SELECT * FROM diagnosticos WHERE id = ? AND company_id = ? LIMIT 1`,
      [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Diagnóstico no encontrado' })
    res.json(d)
  } catch (err) { next(err) }
})

// Guardar un diagnóstico (calcula score, nivel, brechas y servicios recomendados).
router.post('/', async (req, res, next) => {
  try {
    const { respuestas = {}, notas } = req.body || {}
    const ev = evaluar(respuestas)
    const [r] = await centralDB.execute(
      `INSERT INTO diagnosticos
         (company_id, fecha, score_total, nivel, respuestas, dominios, brechas, servicios, notas, created_by)
       VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.company.id, ev.scoreTotal, ev.nivel,
       JSON.stringify(respuestas), JSON.stringify(ev.dominios), JSON.stringify(ev.brechas),
       JSON.stringify(ev.proyectos), notas || null, uid(req)])
    res.json({ id: r.insertId, ...ev })
  } catch (err) { next(err) }
})

// Generar una cotización (borrador) para el cliente, desde los servicios recomendados.
router.post('/:id/cotizacion', async (req, res, next) => {
  try {
    const [[d]] = await centralDB.query(
      `SELECT * FROM diagnosticos WHERE id = ? AND company_id = ? LIMIT 1`,
      [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Diagnóstico no encontrado' })

    // mysql2 devuelve columnas JSON ya parseadas (array); tolera string.
    const proyectos = Array.isArray(d.servicios) ? d.servicios
      : (typeof d.servicios === 'string' && d.servicios ? (() => { try { return JSON.parse(d.servicios) || [] } catch { return [] } })() : [])
    let resp = d.respuestas
    if (typeof resp === 'string') { try { resp = JSON.parse(resp) } catch { resp = {} } }
    const planKw = planDeRespuestas(resp || {})
    // Cotización = PLAN recomendado (según tamaño) + diagnóstico de onboarding + proyectos puntuales.
    const keywords = [planKw, 'Diagnóstico de Postura', ...proyectos]

    // Buscar en el catálogo los servicios que cierran las brechas (por keyword).
    const seen = new Set(), items = []
    for (const kw of keywords) {
      const [rows] = await centralDB.execute(
        `SELECT nombre, detalle, tipo, precio_sugerido FROM cotizacion_catalogo
         WHERE activo = 1 AND nombre LIKE ? ORDER BY orden LIMIT 5`, [`%${kw}%`])
      for (const r of rows) {
        if (seen.has(r.nombre)) continue
        seen.add(r.nombre)
        items.push({ servicio: r.nombre, detalle: r.detalle, tipo: r.tipo, cantidad: 1, precio_unitario: r.precio_sugerido || 0 })
      }
    }
    if (!items.length) return res.status(400).json({ error: 'No se encontraron servicios en el catálogo para las brechas detectadas' })

    const [[emp]] = await centralDB.query(`SELECT name FROM companies WHERE id = ?`, [req.company.id])
    const numero = await helpers.siguienteNumero()
    const { neto, iva, total } = helpers.calcularTotales(items)
    const notas = `Cotización generada desde el diagnóstico de madurez #${d.id} (nivel ${d.nivel}, score ${d.score_total}). Servicios recomendados para cerrar las brechas detectadas.`

    const [r] = await centralDB.execute(
      `INSERT INTO cotizaciones
         (numero, estado, company_id, lead_id, cliente_empresa, cliente_rut, cliente_contacto,
          cliente_email, cliente_telefono, fecha, validez_dias, forma_pago, plazo_ejecucion,
          notas, neto, iva, total, created_by)
       VALUES (?, 'borrador', ?, NULL, ?, NULL, NULL, NULL, NULL, NOW(), 15, NULL, NULL, ?, ?, ?, ?, ?)`,
      [numero, req.company.id, emp?.name || '', notas, neto, iva, total, uid(req)])
    const cotizacionId = r.insertId
    await helpers.guardarItems(cotizacionId, items)
    await centralDB.execute(`UPDATE diagnosticos SET cotizacion_id = ? WHERE id = ?`, [cotizacionId, d.id])

    res.json({ cotizacion_id: cotizacionId, numero, items: items.length, neto, total })
  } catch (err) { next(err) }
})

module.exports = router
