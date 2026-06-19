// routes/admin/ley21663.js — Cumplimiento Ley N° 21.663 (Ley Marco de
// Ciberseguridad). Módulo independiente del módulo ISO, aunque reutiliza el
// motor de generación de políticas (buildEspecifica) y el patrón de
// cotizaciones desde brechas (igual que el diagnóstico de madurez).
const router    = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB = require('../../db/central')
const { POLITICA, PREGUNTAS, evaluar } = require('../../services/ley21663/content')
const { helpers } = require('./cotizaciones')

router.use(requireAuth, requireDstacRole, resolveTenant)
const uid = (req) => req.user.id || req.user.user_id

// Estructura del cuestionario.
router.get('/cuestionario', (req, res) => {
  res.json({ preguntas: PREGUNTAS })
})

// Historial de evaluaciones de la empresa activa.
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, fecha, score_total, nivel, cotizacion_id, created_at
         FROM ley21663_evaluaciones WHERE company_id = ? ORDER BY fecha DESC, id DESC LIMIT 20`,
      [req.company.id])
    res.json({ evaluaciones: rows })
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const [[d]] = await centralDB.query(
      `SELECT * FROM ley21663_evaluaciones WHERE id = ? AND company_id = ? LIMIT 1`,
      [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Evaluación no encontrada' })
    res.json(d)
  } catch (err) { next(err) }
})

// Guardar una evaluación (calcula score, nivel y brechas).
router.post('/', async (req, res, next) => {
  try {
    const { respuestas = {}, notas } = req.body || {}
    const ev = evaluar(respuestas)
    const [r] = await centralDB.execute(
      `INSERT INTO ley21663_evaluaciones
         (company_id, fecha, score_total, nivel, respuestas, brechas, notas, created_by)
       VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [req.company.id, ev.scoreTotal, ev.nivel,
       JSON.stringify(respuestas), JSON.stringify(ev.brechas), notas || null, uid(req)])
    res.json({ id: r.insertId, ...ev })
  } catch (err) { next(err) }
})

// Generar el documento .docx de la Política de Ciberseguridad (Ley 21.663).
router.get('/documento', async (req, res, next) => {
  try {
    const companyId = req.company.id
    const [[emp]] = await centralDB.query(`SELECT name FROM companies WHERE id = ?`, [companyId])
    const fecha   = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
    const prefijo = (req.company.slug || 'org').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ORG'

    const { buildEspecifica } = require('../../services/policies/buildEspecifica')
    const buffer = await buildEspecifica(POLITICA, {
      empresa: emp?.name || '',
      codigo:  `${prefijo}-PCB-001`,
      fecha,
      version: '1.0',
    })
    const fname = `Politica_Ciberseguridad_Ley21663_${req.company.slug}.docx`
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Content-Length':       buffer.length,
    })
    res.send(buffer)
  } catch (err) { next(err) }
})

// Generar una cotización (borrador) a partir de las brechas detectadas.
router.post('/:id/cotizacion', async (req, res, next) => {
  try {
    const [[d]] = await centralDB.query(
      `SELECT * FROM ley21663_evaluaciones WHERE id = ? AND company_id = ? LIMIT 1`,
      [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Evaluación no encontrada' })

    const keywords = ['Ley Marco de Ciberseguridad', 'Ley 21.663']
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
    if (!items.length) return res.status(400).json({ error: 'No se encontró el servicio de Ley 21.663 en el catálogo' })

    const [[emp]] = await centralDB.query(`SELECT name FROM companies WHERE id = ?`, [req.company.id])
    const numero = await helpers.siguienteNumero()
    const { neto, iva, total } = helpers.calcularTotales(items)
    const notas = `Cotización generada desde la evaluación de cumplimiento Ley 21.663 #${d.id} (nivel ${d.nivel}, score ${d.score_total}).`

    const [r] = await centralDB.execute(
      `INSERT INTO cotizaciones
         (numero, estado, company_id, lead_id, cliente_empresa, cliente_rut, cliente_contacto,
          cliente_email, cliente_telefono, fecha, validez_dias, forma_pago, plazo_ejecucion,
          notas, neto, iva, total, created_by)
       VALUES (?, 'borrador', ?, NULL, ?, NULL, NULL, NULL, NULL, NOW(), 15, NULL, NULL, ?, ?, ?, ?, ?)`,
      [numero, req.company.id, emp?.name || '', notas, neto, iva, total, uid(req)])
    const cotizacionId = r.insertId
    await helpers.guardarItems(cotizacionId, items)
    await centralDB.execute(`UPDATE ley21663_evaluaciones SET cotizacion_id = ? WHERE id = ?`, [cotizacionId, d.id])

    res.json({ cotizacion_id: cotizacionId, numero, items: items.length, neto, total })
  } catch (err) { next(err) }
})

module.exports = router
