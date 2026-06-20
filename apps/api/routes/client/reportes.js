const router     = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB  = require('../../db/central')
const { htmlToPDF } = require('../../services/reportService')

// ── Plan permission map ───────────────────────────────────────────────────────
const REPORT_PLAN = {
  executive:   null,          // todos los planes
  activos:     null,
  identidades: null,
  incidentes:  'profesional',
  riesgos:     'profesional',
  certificado: null,
}

const PLAN_RANK = { pyme: 0, profesional: 1, enterprise: 2 }

function planAllows(userPlan, required) {
  if (!required) return true
  return (PLAN_RANK[userPlan] ?? 0) >= (PLAN_RANK[required] ?? 99)
}

// ── Report modules ────────────────────────────────────────────────────────────
const REPORT_MODULES = {
  executive:   () => require('../../services/reports/ejecutivo'),
  activos:     () => require('../../services/reports/activos'),
  identidades: () => require('../../services/reports/identidades'),
  incidentes:  () => require('../../services/reports/incidentes'),
  riesgos:     () => require('../../services/reports/riesgos'),
  certificado: () => require('../../services/reports/certificado'),
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.get('/:reporteId', requireAuth, requireClientRole, resolveTenant, async (req, res, next) => {
  try {
    const { reporteId } = req.params

    // Validate report id
    if (!REPORT_PLAN.hasOwnProperty(reporteId)) {
      return res.status(404).json({ error: 'Reporte no encontrado' })
    }

    // Validate plan access
    const [planRows] = await centralDB.execute(
      `SELECT pl.name AS plan, pl.display_name
       FROM companies c JOIN plans pl ON pl.id = c.plan_id
       WHERE c.id = ?`,
      [req.company.id]
    )
    const userPlan = planRows[0]?.plan ?? 'pyme'
    const required = REPORT_PLAN[reporteId]

    if (!planAllows(userPlan, required)) {
      const reqName = required.charAt(0).toUpperCase() + required.slice(1)
      return res.status(403).json({
        error:        'modulo_no_disponible',
        message:      `Este reporte está disponible desde el Plan ${reqName}. Para acceder, actualiza tu plan con el equipo DSTAC.`,
        plan_required: required,
      })
    }

    // Load module and generate PDF. Nota: para 'certificado' nunca se reenvía
    // ?preview — el cliente solo puede ver/descargar certificados ya emitidos
    // (aprobados por DSTAC), nunca una vista previa de uno sin emitir.
    const mod = REPORT_MODULES[reporteId]()
    const query = reporteId === 'certificado'
      ? { evaluacionId: req.query.evaluacionId, ley: req.query.ley }
      : req.query
    const data = await mod.getData(req.tenantDB, centralDB, req.company.id, req.company, query)
    const html = mod.buildHTML(data)
    const pdf  = await htmlToPDF(html)

    const fecha    = new Date().toISOString().split('T')[0]
    const filename = `DSTAC_${reporteId}_${fecha}.pdf`

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':       pdf.length,
    })
    res.send(pdf)

  } catch (err) {
    next(err)
  }
})

module.exports = router
