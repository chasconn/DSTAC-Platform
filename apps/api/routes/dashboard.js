const router = require('express').Router()
const centralDB = require('../db/central')
const { getTenantDB } = require('../db/tenant')
const { requireAuth, requireRole } = require('../middleware/auth')

const READERS = ['super_admin', 'admin_dstac', 'analista_dstac']

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
router.get('/stats', requireAuth, requireRole(...READERS), async (req, res) => {
  try {
    // ── 1. Stats de empresas desde BD central ──────────────────────────────────
    const [[resumen]] = await centralDB.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN c.status = 'active'    THEN 1 ELSE 0 END) AS activas,
        SUM(CASE WHEN c.status = 'suspended' THEN 1 ELSE 0 END) AS suspendidas,
        SUM(CASE WHEN c.status = 'setup'     THEN 1 ELSE 0 END) AS en_setup
      FROM companies c
      WHERE c.status != 'cancelled'
    `)

    const [porPlan] = await centralDB.execute(`
      SELECT p.name AS plan, p.display_name, COUNT(*) AS total
      FROM companies c
      JOIN plans p ON c.plan_id = p.id
      WHERE c.status = 'active'
      GROUP BY p.id, p.name, p.display_name
      ORDER BY p.id
    `)

    // ── 2. Últimas 5 empresas creadas ─────────────────────────────────────────
    const [ultimas] = await centralDB.execute(`
      SELECT c.id, c.name, c.slug, c.status, c.theme_color, c.created_at,
             p.name AS plan_name, p.display_name AS plan_display
      FROM companies c
      JOIN plans p ON c.plan_id = p.id
      WHERE c.status != 'cancelled'
      ORDER BY c.created_at DESC
      LIMIT 5
    `)

    // ── 3. Incidentes abiertos (sigue en BD por tenant) ───────────────────────
    const [empresasActivas] = await centralDB.execute(
      "SELECT slug FROM companies WHERE status = 'active'"
    )

    let incidentesTotal = 0
    await Promise.allSettled(
      empresasActivas.map(async (emp) => {
        try {
          const tenantDB = await getTenantDB(emp.slug)
          const [[row]] = await tenantDB.execute(
            "SELECT COUNT(*) AS total FROM incidentes WHERE estado = 'abierto'"
          )
          incidentesTotal += Number(row.total) || 0
        } catch { /* tenant sin tabla aún */ }
      })
    )

    // ── 4. NIST desde BD central (módulo nuevo) ───────────────────────────────

    // Score promedio global de cartera (score_total está en escala 0-100)
    const [[scoreRow]] = await centralDB.execute(`
      SELECT ROUND(AVG(ne.score_total)) AS promedio
      FROM nist_evaluations ne
      JOIN companies c ON ne.company_id = c.id AND c.status = 'active'
      WHERE ne.status = 'activa' AND ne.score_total IS NOT NULL AND ne.score_total > 0
    `)
    const scorePromedio = scoreRow.promedio ?? null

    // Promedio por función (cartera entera)
    const [nistFunciones] = await centralDB.execute(`
      SELECT f.id, f.name, f.color, f.code,
        ROUND(AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END)) AS promedio,
        COUNT(CASE WHEN nca.status = 'pendiente'    AND ne.status = 'activa' THEN 1 END) AS pendientes,
        COUNT(CASE WHEN nca.status = 'implementado' AND ne.status = 'activa' THEN 1 END) AS implementados
      FROM nist_functions f
      LEFT JOIN nist_categories ncat ON ncat.function_id = f.id
      LEFT JOIN nist_controls nc     ON nc.category_id   = ncat.id
      LEFT JOIN nist_control_assessments nca ON nca.control_id = nc.id
      LEFT JOIN nist_evaluations ne ON nca.evaluation_id = ne.id AND ne.status = 'activa'
      LEFT JOIN companies c ON ne.company_id = c.id AND c.status = 'active'
      GROUP BY f.id, f.name, f.color, f.code, f.order_num
      ORDER BY f.order_num
    `)

    // Score por empresa
    const [nistPorEmpresa] = await centralDB.execute(`
      SELECT c.id, c.name, c.slug, c.theme_color,
        ne.id AS eval_id,
        ROUND(ne.score_total) AS score_total,
        ne.updated_at AS ultima_eval
      FROM companies c
      LEFT JOIN nist_evaluations ne ON ne.company_id = c.id AND ne.status = 'activa'
      WHERE c.status = 'active'
      ORDER BY ISNULL(ne.score_total), ne.score_total DESC, c.name ASC
    `)

    // Stats globales NIST
    const [[nistStats]] = await centralDB.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN nca.status = 'pendiente'    THEN 1 ELSE 0 END), 0) AS controles_pendientes,
        COALESCE(SUM(CASE WHEN nca.status = 'implementado' THEN 1 ELSE 0 END), 0) AS controles_implementados,
        COALESCE(COUNT(DISTINCT ne.company_id), 0) AS empresas_con_eval
      FROM nist_control_assessments nca
      JOIN nist_evaluations ne ON nca.evaluation_id = ne.id AND ne.status = 'activa'
      JOIN companies c ON ne.company_id = c.id AND c.status = 'active'
    `).catch(() => [{ controles_pendientes: 0, controles_implementados: 0, empresas_con_eval: 0 }])

    // Evidencias pendientes de revisión
    const [[evidRow]] = await centralDB.execute(`
      SELECT COALESCE(COUNT(*), 0) AS evidencias_pendientes
      FROM nist_evidences e
      JOIN companies c ON e.company_id = c.id AND c.status = 'active'
      WHERE e.status = 'pendiente'
    `).catch(() => [{ evidencias_pendientes: 0 }])

    res.json({
      empresas: {
        total:       resumen.total,
        activas:     resumen.activas,
        suspendidas: resumen.suspendidas,
        en_setup:    resumen.en_setup,
        por_plan:    porPlan,
      },
      score_promedio:      scorePromedio,
      incidentes_abiertos: incidentesTotal,
      nist:                nistFunciones,
      nist_por_empresa:    nistPorEmpresa,
      nist_stats: {
        controles_pendientes:    Number(nistStats.controles_pendientes)    || 0,
        controles_implementados: Number(nistStats.controles_implementados) || 0,
        empresas_con_eval:       Number(nistStats.empresas_con_eval)       || 0,
        evidencias_pendientes:   Number(evidRow.evidencias_pendientes)     || 0,
      },
      ultimas_empresas: ultimas,
    })
  } catch (err) {
    console.error('Error en dashboard stats:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
