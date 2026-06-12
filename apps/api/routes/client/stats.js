const router    = require('express').Router()
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB                          = require('../../db/central')

function nivelNist(pct) {
  if (pct === null) return null
  if (pct >= 70) return 'gestionado'
  if (pct >= 40) return 'parcial'
  return 'inicial'
}

// GET /api/client/stats/summary
router.get('/summary', requireAuth, requireClientRole, resolveTenant, async (req, res) => {
  try {
    const db = req.tenantDB

    // Todas las queries en paralelo para reducir latencia
    const [
      [activosRows],
      [incidentesRows],
      [incidentesRecientes],
      [identidadesRows],
      [nistRows],
      [activosCriticos],
      [identidadesRiesgo],
      [incidentesCriticos],
      [personalRows],
      [personalSecRows],
      [planRows],
      [isoEvalRows],
      [isoDomainRows],
    ] = await Promise.all([
      // Activos resumen
      db.execute(`
        SELECT
          COUNT(*) AS total,
          SUM(criticidad = 'critica') AS criticos,
          SUM(criticidad = 'alta')    AS alta,
          SUM(criticidad = 'media')   AS media,
          SUM(criticidad = 'baja')    AS baja,
          SUM(estado = 'operativo') AS operativos,
          SUM(estado = 'degradado') AS degradados,
          SUM(estado = 'fuera_de_servicio') AS fuera_servicio
        FROM activos
      `),

      // Incidentes resumen
      db.execute(`
        SELECT
          COUNT(*) AS total,
          SUM(estado = 'abierto') AS abiertos,
          SUM(estado = 'en_investigacion') AS en_investigacion,
          SUM(estado = 'cerrado') AS cerrados
        FROM incidentes
      `),

      // 5 incidentes más recientes
      db.execute(`
        SELECT id, tipo, severidad, estado, fecha_deteccion
        FROM incidentes
        ORDER BY fecha_deteccion DESC
        LIMIT 5
      `),

      // Identidades resumen
      db.execute(`
        SELECT
          COUNT(*) AS total,
          SUM(estado = 'activa') AS activas,
          SUM(estado = 'expirada') AS expiradas,
          SUM(estado = 'comprometida') AS comprometidas
        FROM identidades
      `),

      // NIST: scores desde la evaluación activa en db_dstac_core
      centralDB.execute(`
        SELECT LOWER(f.name) AS funcion,
               AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END) AS porcentaje
        FROM nist_functions f
        LEFT JOIN nist_categories ncat ON ncat.function_id = f.id
        LEFT JOIN nist_controls   nc   ON nc.category_id   = ncat.id
        LEFT JOIN nist_control_assessments nca
               ON nca.control_id = nc.id
              AND nca.evaluation_id = (
                    SELECT id FROM nist_evaluations
                    WHERE company_id = ? AND status = 'activa'
                    LIMIT 1
                  )
        GROUP BY f.id
        ORDER BY f.order_num
      `, [req.company.id]),

      // Para cálculo dinámico de score
      db.execute("SELECT COUNT(*) AS n FROM activos WHERE criticidad = 'critica' AND estado != 'operativo'"),
      db.execute("SELECT COUNT(*) AS n FROM identidades WHERE estado IN ('comprometida','expirada')"),
      db.execute("SELECT COUNT(*) AS n FROM incidentes WHERE estado = 'abierto' AND severidad = 'critica'"),

      // Personal resumen
      db.execute(`
        SELECT
          COUNT(*)                              AS total,
          SUM(estado = 'activo')                AS activos,
          SUM(estado = 'inactivo')              AS inactivos,
          SUM(estado = 'vacaciones')            AS en_vacaciones,
          SUM(estado = 'desvinculado')          AS desvinculados,
          SUM(nivel_responsabilidad = 'alto')   AS criticos,
          SUM(nivel_responsabilidad = 'medio')  AS nivel_medio,
          SUM(nivel_responsabilidad = 'bajo')   AS nivel_bajo
        FROM personal
      `),

      // Personal activo — indicadores de acceso
      db.execute(`
        SELECT
          COUNT(DISTINCT CASE WHEN i.estado = 'activa'
            THEN p.id END)                                            AS con_acceso,
          COUNT(DISTINCT CASE WHEN i.estado IN ('comprometida','expirada')
            THEN p.id END)                                            AS con_problemas,
          COUNT(DISTINCT CASE WHEN i.id IS NULL
            THEN p.id END)                                            AS sin_identidad
        FROM personal p
        LEFT JOIN identidades i ON i.propietario_id = p.id
        WHERE p.estado = 'activo'
      `),

      // Plan de la empresa
      centralDB.execute(
        `SELECT pl.name AS plan
         FROM companies c
         JOIN plans pl ON pl.id = c.plan_id
         WHERE c.id = ?`,
        [req.company.id]
      ),

      // ISO 27001: score y gap de la evaluación activa
      centralDB.execute(
        `SELECT score_total, gap_total FROM iso_evaluations
         WHERE company_id = ? AND status = 'activa' LIMIT 1`,
        [req.company.id]
      ),

      // ISO 27001: scores por dominio
      centralDB.execute(`
        SELECT d.id, d.name, d.color,
          ROUND(AVG(CASE WHEN ica.applies = 1 AND ica.status != 'no_aplica'
                         THEN ica.progress END), 1) AS score
        FROM iso_domains d
        LEFT JOIN iso_controls ic ON ic.domain_id = d.id
        LEFT JOIN iso_control_assessments ica
               ON ica.control_id = ic.id AND ica.evaluation_id = (
                    SELECT id FROM iso_evaluations
                    WHERE company_id = ? AND status = 'activa' LIMIT 1
                  )
        GROUP BY d.id
        ORDER BY d.order_num
      `, [req.company.id]),
    ])

    // ── Security Score (cálculo dinámico) ────────────────────────────────────
    const penalidad =
      (activosCriticos[0].n * 5) +
      (identidadesRiesgo[0].n * 3) +
      (incidentesCriticos[0].n * 2)
    const scoreValor = Math.max(0, 100 - penalidad)

    const nivelScore = scoreValor >= 70 ? 'alto' : scoreValor >= 40 ? 'medio' : 'bajo'

    // ── NIST ──────────────────────────────────────────────────────────────────
    const FUNCIONES = ['identificar', 'proteger', 'detectar', 'responder', 'recuperar']
    const nistMap = Object.fromEntries(nistRows.map(r => [r.funcion, Math.round(Number(r.porcentaje) || 0)]))
    const nistObj = {}
    let nistSuma = 0, nistCont = 0
    FUNCIONES.forEach(f => {
      const pct = nistMap[f] ?? null
      nistObj[f] = pct
      if (pct !== null) { nistSuma += pct; nistCont++ }
    })
    nistObj.promedio = nistCont > 0 ? Math.round(nistSuma / nistCont) : null

    const activosData = activosRows[0]
    const incData     = incidentesRows[0]
    const identData   = identidadesRows[0]

    res.json({
      security_score: {
        valor: scoreValor,
        nivel: nivelScore
      },
      activos: {
        total:          Number(activosData.total),
        criticos:       Number(activosData.criticos),
        alta:           Number(activosData.alta),
        media:          Number(activosData.media),
        baja:           Number(activosData.baja),
        operativos:     Number(activosData.operativos),
        degradados:     Number(activosData.degradados),
        fuera_servicio: Number(activosData.fuera_servicio),
      },
      incidentes: {
        total:            Number(incData.total),
        abiertos:         Number(incData.abiertos),
        en_investigacion: Number(incData.en_investigacion),
        cerrados:         Number(incData.cerrados),
        criticos:         Number(incidentesCriticos[0].n),
        recientes:        incidentesRecientes,
      },
      identidades: {
        total:        Number(identData.total),
        activas:      Number(identData.activas),
        expiradas:    Number(identData.expiradas),
        comprometidas: Number(identData.comprometidas),
      },
      nist: nistObj,
      personal: {
        total:          Number(personalRows[0]?.total         ?? 0),
        activos:        Number(personalRows[0]?.activos       ?? 0),
        inactivos:      Number(personalRows[0]?.inactivos     ?? 0),
        en_vacaciones:  Number(personalRows[0]?.en_vacaciones ?? 0),
        desvinculados:  Number(personalRows[0]?.desvinculados ?? 0),
        criticos:       Number(personalRows[0]?.criticos      ?? 0),
        nivel_medio:    Number(personalRows[0]?.nivel_medio   ?? 0),
        nivel_bajo:     Number(personalRows[0]?.nivel_bajo    ?? 0),
        con_acceso:     Number(personalSecRows[0]?.con_acceso    ?? 0),
        con_problemas:  Number(personalSecRows[0]?.con_problemas ?? 0),
        sin_identidad:  Number(personalSecRows[0]?.sin_identidad ?? 0),
      },
      empresa: {
        plan: planRows[0]?.plan ?? 'pyme',
      },
      iso: {
        score_total: isoEvalRows[0]?.score_total != null ? Math.round(Number(isoEvalRows[0].score_total)) : null,
        gap_total:   isoEvalRows[0]?.gap_total   != null ? Math.round(Number(isoEvalRows[0].gap_total))   : null,
        domains: isoDomainRows.map(d => ({
          id:    d.id,
          name:  d.name,
          color: d.color,
          score: Math.round(Number(d.score) || 0),
        })),
      },
    })
  } catch (err) {
    console.error('Error en stats/summary:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
