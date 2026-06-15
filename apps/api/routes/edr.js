// Webhook PÚBLICO del EDR — recibe las alertas que el Wazuh Manager reenvía
// (daemon integrator → script custom-dstac → POST aquí). Sin auth de sesión:
// se valida con el header x-edr-key contra EDR_WEBHOOK_SECRET (si está configurado).
const router = require('express').Router()
const centralDB = require('../db/central')

function s(v, n) { return v == null ? null : (String(v).slice(0, n) || null) }
function j(v) { return v == null ? null : JSON.stringify(v) }
function intOrNull(v) { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n }

// Convierte el timestamp ISO de Wazuh a DATETIME UTC ('YYYY-MM-DD HH:MM:SS').
function toMysqlDate(ts) {
  if (!ts) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

// POST /api/edr/alerts — ingesta de una alerta de Wazuh.
router.post('/alerts', async (req, res) => {
  try {
    const secret = process.env.EDR_WEBHOOK_SECRET
    if (secret && req.headers['x-edr-key'] !== secret) {
      return res.status(401).json({ ok: false, error: 'No autorizado' })
    }

    const a     = req.body || {}
    const agent = a.agent || {}
    const rule  = a.rule  || {}
    const mitre = rule.mitre || {}
    const data  = a.data  || {}

    const wazuhId   = s(agent.id, 10) || '000'
    const agentName = s(agent.name, 255)
    const agentIp   = s(agent.ip, 64)

    // 1) Upsert del agente — conserva company_id si ya estaba asignado.
    await centralDB.execute(`
      INSERT INTO edr_agents (wazuh_id, name, ip, last_keepalive, status)
      VALUES (?, ?, ?, NOW(), 'active')
      ON DUPLICATE KEY UPDATE
        name           = COALESCE(VALUES(name), name),
        ip             = COALESCE(VALUES(ip), ip),
        last_keepalive = NOW(),
        status         = 'active'
    `, [wazuhId, agentName, agentIp])

    // 2) Resolver el tenant del agente (NULL = sin asignar todavía).
    const [agRows] = await centralDB.execute(
      `SELECT company_id FROM edr_agents WHERE wazuh_id = ? LIMIT 1`, [wazuhId]
    )
    const companyId = agRows[0]?.company_id ?? null

    // 3) Guardar la alerta.
    await centralDB.execute(`
      INSERT INTO edr_alerts
        (company_id, wazuh_id, agent_name, rule_id, rule_level, rule_description,
         rule_groups, mitre_ids, mitre_tactics, mitre_techniques,
         location, decoder, src_ip, full_log, event_time, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, wazuhId, agentName,
      intOrNull(rule.id), intOrNull(rule.level), s(rule.description, 1024),
      j(rule.groups), j(mitre.id), j(mitre.tactic), j(mitre.technique),
      s(a.location, 255), s(a.decoder?.name, 120),
      s(data.srcip || data.src_ip, 64), s(a.full_log, 65000),
      toMysqlDate(a.timestamp), j(a),
    ])

    res.json({ ok: true })
  } catch (e) {
    console.error('edr/alerts error:', e.message)
    res.status(500).json({ ok: false, error: 'No se pudo guardar la alerta' })
  }
})

module.exports = router
