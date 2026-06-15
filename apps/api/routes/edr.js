// Webhook PÚBLICO del EDR — recibe las alertas que el Wazuh Manager reenvía
// (daemon integrator → script custom-dstac → POST aquí). Sin auth de sesión:
// se valida con el header x-edr-key contra EDR_WEBHOOK_SECRET (si está configurado).
const router = require('express').Router()
const centralDB = require('../db/central')
const { getTenantDB } = require('../db/tenant')

// Nivel mínimo de regla Wazuh para abrir un incidente automáticamente (12 = crítico).
const INCIDENT_MIN_LEVEL = parseInt(process.env.EDR_INCIDENT_MIN_LEVEL, 10) || 12

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

// Abre un incidente en la BD del tenant a partir de una alerta grave del EDR.
// Idempotente por ventana: no duplica si ya se escaló esa firma (empresa+agente+regla)
// en las últimas 6 horas. Nunca lanza (el webhook no debe fallar por esto).
async function escalarIncidente({ companyId, wazuhId, agentName, alertId, rule, mitre, srcIp, fullLog, eventTime }) {
  // Dedupe: ¿ya hay un incidente reciente para esta misma firma?
  const [dup] = await centralDB.execute(`
    SELECT id FROM edr_alerts
    WHERE company_id = ? AND wazuh_id = ? AND rule_id = ? AND incidente_id IS NOT NULL
      AND created_at >= (NOW() - INTERVAL 6 HOUR)
    LIMIT 1
  `, [companyId, wazuhId, intOrNull(rule.id)])
  if (dup.length) return

  const [comp] = await centralDB.execute(`SELECT slug FROM companies WHERE id = ? LIMIT 1`, [companyId])
  const slug = comp[0]?.slug
  if (!slug) return

  const level     = intOrNull(rule.level) || 0
  const severidad = level >= 14 ? 'critica' : 'alta'
  const impacto   = level >= 14 ? 'critico' : 'alto'
  const tipo      = (`EDR: ${rule.description || 'Alerta de seguridad'}`).slice(0, 100)
  const tactics    = Array.isArray(mitre.tactic) ? mitre.tactic.join(', ') : ''
  const techniques = Array.isArray(mitre.technique) ? mitre.technique.join(', ') : ''
  const descripcion = [
    'Detección automática del EDR (Wazuh).',
    `Agente: ${agentName || wazuhId} (${wazuhId})`,
    `Regla ${rule.id} · nivel ${level}: ${rule.description || ''}`,
    tactics    ? `MITRE táctica: ${tactics}` : '',
    techniques ? `MITRE técnica: ${techniques}` : '',
    srcIp      ? `Origen: ${srcIp}` : '',
    fullLog    ? `Log: ${String(fullLog).slice(0, 500)}` : '',
  ].filter(Boolean).join('\n')

  const tdb = await getTenantDB(slug)
  const [ins] = await tdb.execute(`
    INSERT INTO incidentes (tipo, categoria, estado, severidad, impacto, descripcion, fecha_deteccion)
    VALUES (?, ?, 'abierto', ?, ?, ?, ?)
  `, [tipo, 'Endpoint / EDR', severidad, impacto, descripcion, eventTime || null])

  await centralDB.execute(
    `UPDATE edr_alerts SET incidente_id = ?, incidente_slug = ? WHERE id = ?`,
    [ins.insertId, slug, alertId]
  )
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

    // Auto-mapeo a empresa: si el agente trae la label dstac_company=<slug>
    // (puesta por el instalador), resolvemos la empresa para asignarlo solo.
    const labelSlug = agent.labels?.dstac_company || null
    let labelCompanyId = null
    if (labelSlug) {
      const [c] = await centralDB.execute(
        `SELECT id FROM companies WHERE slug = ? AND status = 'active' LIMIT 1`, [labelSlug]
      )
      labelCompanyId = c[0]?.id ?? null
    }

    // 1) Upsert del agente. company_id se asigna desde la label SOLO si aún
    //    estaba sin asignar (COALESCE conserva una asignación manual previa).
    await centralDB.execute(`
      INSERT INTO edr_agents (wazuh_id, name, ip, group_name, company_id, last_keepalive, status)
      VALUES (?, ?, ?, ?, ?, NOW(), 'active')
      ON DUPLICATE KEY UPDATE
        name           = COALESCE(VALUES(name), name),
        ip             = COALESCE(VALUES(ip), ip),
        group_name     = COALESCE(VALUES(group_name), group_name),
        company_id     = COALESCE(company_id, VALUES(company_id)),
        last_keepalive = NOW(),
        status         = 'active'
    `, [wazuhId, agentName, agentIp, labelSlug, labelCompanyId])

    // 2) Resolver el tenant del agente (NULL = sin asignar todavía).
    const [agRows] = await centralDB.execute(
      `SELECT company_id FROM edr_agents WHERE wazuh_id = ? LIMIT 1`, [wazuhId]
    )
    const companyId = agRows[0]?.company_id ?? null

    // 3) Guardar la alerta.
    const srcIp = s(data.srcip || data.src_ip, 64)
    const [ins] = await centralDB.execute(`
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
      srcIp, s(a.full_log, 65000),
      toMysqlDate(a.timestamp), j(a),
    ])

    // 4) Escalar a incidente si la alerta es grave y el agente pertenece a un tenant.
    const level = intOrNull(rule.level) || 0
    if (companyId && level >= INCIDENT_MIN_LEVEL) {
      try {
        await escalarIncidente({
          companyId, wazuhId, agentName, alertId: ins.insertId,
          rule, mitre, srcIp, fullLog: a.full_log, eventTime: toMysqlDate(a.timestamp),
        })
      } catch (e) {
        console.error('edr escalada incidente:', e.message)
      }
    }

    res.json({ ok: true })
  } catch (e) {
    console.error('edr/alerts error:', e.message)
    res.status(500).json({ ok: false, error: 'No se pudo guardar la alerta' })
  }
})

module.exports = router
