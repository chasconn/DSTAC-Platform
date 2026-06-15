// Endpoints ADMIN del EDR — lectura por tenant (auth de sesión + empresa activa).
// El portal consume estos para mostrar agentes, alertas y estadísticas por cliente.
const router = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                 = require('../../middleware/tenant')
const centralDB                         = require('../../db/central')

router.use(requireAuth, requireDstacRole, resolveTenant)

// GET /agents — agentes asignados a la empresa activa.
router.get('/agents', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT a.*,
             (SELECT COUNT(*) FROM edr_alerts e WHERE e.wazuh_id = a.wazuh_id) AS total_alertas
      FROM edr_agents a
      WHERE a.company_id = ?
      ORDER BY a.last_keepalive DESC
    `, [req.company.id])
    res.json({ agents: rows })
  } catch (err) { next(err) }
})

// GET /agents/sin-asignar — agentes que aún no pertenecen a ninguna empresa.
// Sirve para que un admin DSTAC los vincule al tenant correcto.
router.get('/agents/sin-asignar', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT * FROM edr_agents WHERE company_id IS NULL ORDER BY last_keepalive DESC
    `)
    res.json({ agents: rows })
  } catch (err) { next(err) }
})

// POST /agents/:wazuhId/asignar — vincula un agente a la empresa activa
// y retro-asigna las alertas previas de ese agente que estaban sin empresa.
router.post('/agents/:wazuhId/asignar', async (req, res, next) => {
  try {
    const { wazuhId } = req.params
    const companyId   = req.company.id

    const [r] = await centralDB.execute(
      `UPDATE edr_agents SET company_id = ? WHERE wazuh_id = ?`, [companyId, wazuhId]
    )
    if (!r.affectedRows) return res.status(404).json({ error: 'Agente no encontrado' })

    await centralDB.execute(
      `UPDATE edr_alerts SET company_id = ? WHERE wazuh_id = ? AND company_id IS NULL`,
      [companyId, wazuhId]
    )
    res.json({ success: true })
  } catch (err) { next(err) }
})

// GET /alerts — alertas de la empresa activa. Filtros: nivel mínimo, q, fechas, límite.
router.get('/alerts', async (req, res, next) => {
  try {
    const { nivel_min, q, date_from, date_to, agent } = req.query
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000)

    let where = 'WHERE company_id = ?'
    const params = [req.company.id]

    if (nivel_min) { where += ' AND rule_level >= ?'; params.push(parseInt(nivel_min, 10) || 0) }
    if (agent)     { where += ' AND wazuh_id = ?';    params.push(agent) }
    if (date_from) { where += ' AND event_time >= ?'; params.push(date_from) }
    if (date_to)   { where += ' AND event_time <= ?'; params.push(date_to + ' 23:59:59') }
    if (q)         { where += ' AND (rule_description LIKE ? OR full_log LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }

    const [rows] = await centralDB.execute(`
      SELECT id, wazuh_id, agent_name, rule_id, rule_level, rule_description,
             rule_groups, mitre_ids, mitre_tactics, mitre_techniques,
             location, src_ip, full_log, event_time, incidente_id
      FROM edr_alerts
      ${where}
      ORDER BY event_time DESC, id DESC
      LIMIT ${limit}
    `, params)

    res.json({ alerts: rows })
  } catch (err) { next(err) }
})

// GET /stats — resumen para las tarjetas del módulo.
router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.company.id

    const [[ag]] = await centralDB.query(`
      SELECT COUNT(*) AS total,
             SUM(status = 'active')       AS activos,
             SUM(status = 'disconnected') AS desconectados
      FROM edr_agents WHERE company_id = ?
    `, [companyId])

    const [[al]] = await centralDB.query(`
      SELECT COUNT(*) AS total,
             SUM(rule_level >= 12)                       AS criticas,
             SUM(rule_level BETWEEN 7 AND 11)            AS altas,
             SUM(incidente_id IS NOT NULL)               AS incidentes,
             SUM(event_time >= (NOW() - INTERVAL 24 HOUR)) AS ultimas_24h
      FROM edr_alerts WHERE company_id = ?
    `, [companyId])

    const [sinAsignar] = await centralDB.execute(
      `SELECT COUNT(*) AS n FROM edr_agents WHERE company_id IS NULL`
    )

    res.json({
      agentes: {
        total:         Number(ag.total || 0),
        activos:       Number(ag.activos || 0),
        desconectados: Number(ag.desconectados || 0),
      },
      alertas: {
        total:       Number(al.total || 0),
        criticas:    Number(al.criticas || 0),
        altas:       Number(al.altas || 0),
        incidentes:  Number(al.incidentes || 0),
        ultimas_24h: Number(al.ultimas_24h || 0),
      },
      sin_asignar: Number(sinAsignar[0].n || 0),
    })
  } catch (err) { next(err) }
})

// GET /sca — cumplimiento CIS/SCA por agente. Se arma desde el último resumen
// SCA (regla 19004) ingestado por cada (agente, política), extrayendo el score
// y los conteos del JSON `raw`. No requiere la API de Wazuh (55000).
router.get('/sca', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT a.wazuh_id, a.agent_name, a.event_time,
             JSON_UNQUOTE(JSON_EXTRACT(a.raw, '$.data.sca.policy'))       AS policy,
             JSON_UNQUOTE(JSON_EXTRACT(a.raw, '$.data.sca.policy_id'))    AS policy_id,
             JSON_UNQUOTE(JSON_EXTRACT(a.raw, '$.data.sca.score'))        AS score,
             JSON_UNQUOTE(JSON_EXTRACT(a.raw, '$.data.sca.passed'))       AS passed,
             JSON_UNQUOTE(JSON_EXTRACT(a.raw, '$.data.sca.failed'))       AS failed,
             JSON_UNQUOTE(JSON_EXTRACT(a.raw, '$.data.sca.total_checks')) AS total_checks
      FROM edr_alerts a
      JOIN (
        SELECT wazuh_id,
               JSON_UNQUOTE(JSON_EXTRACT(raw, '$.data.sca.policy_id')) AS pid,
               MAX(id) AS max_id
        FROM edr_alerts
        WHERE rule_id = 19004 AND company_id = ?
        GROUP BY wazuh_id, pid
      ) latest ON latest.max_id = a.id
      ORDER BY a.wazuh_id, policy
    `, [req.company.id])

    const sca = rows.map(r => ({
      wazuh_id:     r.wazuh_id,
      agent_name:   r.agent_name,
      policy:       r.policy,
      policy_id:    r.policy_id,
      score:        Number(r.score) || 0,
      passed:       Number(r.passed) || 0,
      failed:       Number(r.failed) || 0,
      total_checks: Number(r.total_checks) || 0,
      scanned_at:   r.event_time,
    }))

    res.json({ sca })
  } catch (err) { next(err) }
})

module.exports = router
