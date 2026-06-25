// Webhook PÚBLICO del EDR — recibe las alertas que el Wazuh Manager reenvía
// (daemon integrator → script custom-dstac → POST aquí). Sin auth de sesión:
// se valida con el header x-edr-key contra EDR_WEBHOOK_SECRET (si está configurado).
const router = require('express').Router()
const centralDB = require('../db/central')
const { getTenantDB } = require('../db/tenant')
const { sendMail } = require('../services/emailService')
const { clasificar } = require('../utils/macVendor')

// Nivel mínimo de regla Wazuh para abrir un incidente automáticamente (12 = crítico).
const INCIDENT_MIN_LEVEL = parseInt(process.env.EDR_INCIDENT_MIN_LEVEL, 10) || 12
// Ventana de deduplicación: alertas idénticas (mismo agente+regla+IP) dentro de
// este lapso solo incrementan un contador en vez de crear una fila nueva (ruido).
const DEDUPE_WINDOW_MIN = parseInt(process.env.EDR_DEDUPE_WINDOW_MIN, 10) || 5
const NOTIFY_TO = process.env.EDR_NOTIFY_EMAIL || process.env.MAIL_FROM

// Notificación por correo al equipo DSTAC (nunca lanza: no debe romper el webhook).
async function notificar(asunto, html) {
  if (!NOTIFY_TO) return
  try { await sendMail(NOTIFY_TO, asunto, html) } catch (e) { console.error('edr notificar:', e.message) }
}

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

  const [comp] = await centralDB.execute(`SELECT name, slug FROM companies WHERE id = ? LIMIT 1`, [companyId])
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

  await notificar(
    `🚨 EDR: incidente ${severidad} — ${comp[0]?.name || slug}`,
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a">
       <p>Se escaló un incidente automático del EDR.</p>
       <p><b>Empresa:</b> ${comp[0]?.name || slug}<br>
          <b>Agente:</b> ${agentName || wazuhId} (${wazuhId})<br>
          <b>Regla:</b> ${rule.id} · nivel ${level}: ${rule.description || ''}<br>
          ${tactics ? `<b>MITRE táctica:</b> ${tactics}<br>` : ''}
          ${srcIp ? `<b>Origen:</b> ${srcIp}<br>` : ''}</p>
       <p>Revísalo en el portal: módulo Incidentes de ${comp[0]?.name || slug}.</p>
     </div>`
  )
}

// Procesa un reporte de descubrimiento de red (lista de IP/MAC vistas en la
// tabla ARP del agente) y actualiza el inventario de dispositivos del tenant.
async function ingerirNetscan(companyId, wazuhId, jsonTexto) {
  if (!companyId) return // agente aún sin asignar a una empresa: no hay dónde mostrarlo
  let payload
  try { payload = JSON.parse(jsonTexto) } catch { return }
  const items = Array.isArray(payload?.items) ? payload.items : []
  if (!items.length) return

  for (const it of items) {
    const mac = s(it.mac, 17)?.toUpperCase()
    if (!mac) continue
    const { vendor, tipo } = clasificar(mac)
    await centralDB.execute(`
      INSERT INTO edr_network_devices (company_id, wazuh_id, mac, ip, vendor, tipo, hostname, primera_vez, ultima_vez)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        wazuh_id = VALUES(wazuh_id), ip = VALUES(ip), vendor = VALUES(vendor),
        tipo = VALUES(tipo), hostname = COALESCE(VALUES(hostname), hostname), ultima_vez = NOW()
    `, [companyId, wazuhId, mac, s(it.ip, 64), vendor, tipo, s(it.hostname, 255)])
  }
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

    // Servicio por pago: si la empresa tiene la protección EDR desactivada,
    // el agente queda registrado (keepalive) pero NO se ingestan sus alertas.
    if (companyId) {
      const [ce] = await centralDB.execute(`SELECT edr_enabled FROM companies WHERE id = ? LIMIT 1`, [companyId])
      if (ce[0] && Number(ce[0].edr_enabled) === 0) {
        return res.json({ ok: true, skipped: 'edr_disabled' })
      }
    }

    // Reporte de descubrimiento de red (tabla ARP, sin agente en cada equipo):
    // el script en el agente loguea "DSTAC_NETSCAN {json}" cada minuto; no es
    // una alerta de seguridad, así que se procesa aparte y se corta aquí.
    if (typeof a.full_log === 'string' && a.full_log.startsWith('DSTAC_NETSCAN ')) {
      try { await ingerirNetscan(companyId, wazuhId, a.full_log.slice('DSTAC_NETSCAN '.length)) }
      catch (e) { console.error('edr netscan:', e.message) }
      return res.json({ ok: true, netscan: true })
    }

    // 3) Guardar la alerta — deduplicando repeticiones idénticas (mismo agente+regla+IP)
    //    dentro de una ventana corta: solo se incrementa el contador, no se crea ruido.
    const srcIp = s(data.srcip || data.src_ip, 64)
    const eventTime = toMysqlDate(a.timestamp)
    const ruleId = intOrNull(rule.id)

    const [dupe] = await centralDB.execute(`
      SELECT id FROM edr_alerts
      WHERE company_id <=> ? AND wazuh_id <=> ? AND rule_id <=> ? AND src_ip <=> ?
        AND last_seen >= (NOW() - INTERVAL ? MINUTE)
      ORDER BY id DESC LIMIT 1
    `, [companyId, wazuhId, ruleId, srcIp, DEDUPE_WINDOW_MIN])

    if (dupe.length) {
      await centralDB.execute(
        `UPDATE edr_alerts SET count = count + 1, last_seen = NOW(), event_time = COALESCE(?, event_time) WHERE id = ?`,
        [eventTime, dupe[0].id]
      )
      return res.json({ ok: true, deduped: true })
    }

    const [ins] = await centralDB.execute(`
      INSERT INTO edr_alerts
        (company_id, wazuh_id, agent_name, rule_id, rule_level, rule_description,
         rule_groups, mitre_ids, mitre_tactics, mitre_techniques,
         location, decoder, src_ip, full_log, event_time, raw, count, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `, [
      companyId, wazuhId, agentName,
      ruleId, intOrNull(rule.level), s(rule.description, 1024),
      j(rule.groups), j(mitre.id), j(mitre.tactic), j(mitre.technique),
      s(a.location, 255), s(a.decoder?.name, 120),
      srcIp, s(a.full_log, 65000),
      eventTime, j(a),
    ])

    // 4) Escalar a incidente si la alerta es grave y el agente pertenece a un tenant.
    const level = intOrNull(rule.level) || 0
    if (companyId && level >= INCIDENT_MIN_LEVEL) {
      try {
        await escalarIncidente({
          companyId, wazuhId, agentName, alertId: ins.insertId,
          rule, mitre, srcIp, fullLog: a.full_log, eventTime,
        })
      } catch (e) {
        console.error('edr escalada incidente:', e.message)
      }
    }

    // Registrar bloqueos AUTOMÁTICOS (Active Response del manager): alerta 651
    // "Host Blocked" con command=add. Dedup contra una respuesta manual reciente
    // (la misma IP) para no contar dos veces.
    if (companyId && intOrNull(rule.id) === 651 && data.command === 'add' && srcIp) {
      const [prev] = await centralDB.execute(
        `SELECT id FROM edr_responses WHERE company_id = ? AND target = ? AND created_at >= (NOW() - INTERVAL 2 MINUTE) LIMIT 1`,
        [companyId, srcIp]
      )
      if (!prev.length) {
        await centralDB.execute(
          `INSERT INTO edr_responses (company_id, wazuh_id, action, target) VALUES (?, ?, 'bloqueo_auto', ?)`,
          [companyId, wazuhId, srcIp]
        ).catch(() => {})
        const [comp] = await centralDB.execute(`SELECT name FROM companies WHERE id = ? LIMIT 1`, [companyId])
        notificar(
          `⚡ EDR: auto-bloqueo de IP — ${comp[0]?.name || companyId}`,
          `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a">
             <p>El EDR bloqueó automáticamente una IP por fuerza bruta SSH.</p>
             <p><b>Empresa:</b> ${comp[0]?.name || companyId}<br>
                <b>Agente:</b> ${agentName || wazuhId} (${wazuhId})<br>
                <b>IP bloqueada:</b> ${srcIp}</p>
           </div>`
        ).catch(() => {})
      }
    }

    res.json({ ok: true })
  } catch (e) {
    console.error('edr/alerts error:', e.message)
    res.status(500).json({ ok: false, error: 'No se pudo guardar la alerta' })
  }
})

// POST /api/edr/agentes/registrar — endpoint público para que el instalador
// registre el agente inmediatamente después de enrolarse, sin esperar a que llegue
// una alerta. Valida con el header x-edr-key igual que /alerts.
router.post('/agentes/registrar', async (req, res) => {
  try {
    const secret = process.env.EDR_WEBHOOK_SECRET
    if (secret && req.headers['x-edr-key'] !== secret) {
      return res.status(401).json({ ok: false, error: 'No autorizado' })
    }

    const { wazuh_id, agent_name, agent_ip, dstac_company } = req.body || {}

    // Validar wazuh_id (requerido)
    const wazuhId = s(wazuh_id, 10)
    if (!wazuhId) {
      return res.status(400).json({ ok: false, error: 'wazuh_id es requerido' })
    }

    const agentName = s(agent_name, 255)
    const agentIp = s(agent_ip, 64)

    // Resolver la empresa si viene el slug
    let companyId = null
    if (dstac_company) {
      const [c] = await centralDB.execute(
        `SELECT id FROM companies WHERE slug = ? AND status = 'active' LIMIT 1`,
        [dstac_company]
      )
      companyId = c[0]?.id ?? null
    }

    // Upsert del agente (igual que en el webhook de alertas)
    await centralDB.execute(`
      INSERT INTO edr_agents (wazuh_id, name, ip, company_id, last_keepalive, status)
      VALUES (?, ?, ?, ?, NOW(), 'active')
      ON DUPLICATE KEY UPDATE
        name           = COALESCE(VALUES(name), name),
        ip             = COALESCE(VALUES(ip), ip),
        company_id     = COALESCE(company_id, VALUES(company_id)),
        last_keepalive = NOW(),
        status         = 'active'
    `, [wazuhId, agentName, agentIp, companyId])

    res.json({ ok: true, registered: true })
  } catch (e) {
    console.error('edr/agentes/registrar error:', e.message)
    res.status(500).json({ ok: false, error: 'No se pudo registrar el agente' })
  }
})

// GET /api/edr/empresas — lista pública de empresas activas (id, name, slug),
// para que el instalador (GUI) ofrezca un selector en vez de pedir el slug a mano.
router.get('/empresas', async (req, res) => {
  try {
    const secret = process.env.EDR_WEBHOOK_SECRET
    if (secret && req.headers['x-edr-key'] !== secret) {
      return res.status(401).json({ ok: false, error: 'No autorizado' })
    }
    const [rows] = await centralDB.execute(
      `SELECT slug, name FROM companies WHERE status = 'active' ORDER BY name`
    )
    res.json({ ok: true, empresas: rows })
  } catch (e) {
    console.error('edr/empresas error:', e.message)
    res.status(500).json({ ok: false, error: 'No se pudo obtener la lista de empresas' })
  }
})

module.exports = router
