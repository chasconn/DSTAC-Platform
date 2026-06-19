// Informes PDF para el panel admin (DSTAC). Reutiliza los generadores HTML de
// services/reports/* y los convierte a PDF. La empresa sale del header
// X-Company-Slug (resolveTenant). Sin restricción de plan (DSTAC ve todo).
const router = require('express').Router()
const { requireAuth, requireDstacRole } = require('../middleware/auth')
const { resolveTenant }                 = require('../middleware/tenant')
const centralDB                         = require('../db/central')
const { htmlToPDF }                     = require('../services/reportService')

const REPORT_MODULES = {
  executive:   () => require('../services/reports/ejecutivo'),
  activos:     () => require('../services/reports/activos'),
  identidades: () => require('../services/reports/identidades'),
  incidentes:  () => require('../services/reports/incidentes'),
  riesgos:     () => require('../services/reports/riesgos'),
  iso:         () => require('../services/reports/iso'),
  soa:         () => require('../services/reports/soa'),
  nist:        () => require('../services/reports/nist'),
  edr:         () => require('../services/reports/edr'),
  diagnostico: () => require('../services/reports/diagnostico'),
  brochure:    () => require('../services/reports/brochure'),
}

router.get('/:reporteId', requireAuth, requireDstacRole, resolveTenant, async (req, res, next) => {
  try {
    const mod = REPORT_MODULES[req.params.reporteId]
    if (!mod) return res.status(404).json({ error: 'Reporte no encontrado' })

    const m    = mod()
    const data = await m.getData(req.tenantDB, centralDB, req.company.id, req.company)
    const html = m.buildHTML(data)

    // Vista previa en el navegador (overlay tipo Prospectos): devuelve el HTML.
    if (req.query.format === 'html') {
      return res.set('Content-Type', 'text/html; charset=utf-8').send(html)
    }

    const pdf  = await htmlToPDF(html, m.pdfOptions)

    const fecha = new Date().toISOString().split('T')[0]
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="DSTAC_${req.params.reporteId}_${fecha}.pdf"`,
      'Content-Length':       pdf.length,
    })
    res.send(pdf)
  } catch (err) { next(err) }
})

module.exports = router
