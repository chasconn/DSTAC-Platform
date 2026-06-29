// Endpoints ADMIN del EDR — lectura por tenant (auth de sesión + empresa activa).
// El portal consume estos para mostrar agentes, alertas y estadísticas por cliente.
const router = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                 = require('../../middleware/tenant')
const centralDB                         = require('../../db/central')
const wazuhApi                          = require('../../services/wazuhApi')
const { registrarActividad }            = require('../../utils/activityLogger')
const { geoip }                         = require('../../services/geoip')

// Acciones de respuesta activa expuestas al portal → comando de Wazuh.
const ACCIONES_AR = {
  bloquear_ip:         { command: 'firewall-drop',   needsTarget: true,  label: 'bloquear IP' },
  desconectar_usuario: { command: 'disable-account', needsTarget: true,  label: 'desconectar usuario' },
  reiniciar_agente:    { command: 'restart-wazuh',   needsTarget: false, label: 'reiniciar agente' },
}

router.use(requireAuth, requireDstacRole, resolveTenant)

// ¿La empresa tiene la protección EDR activa? (servicio por pago)
async function proteccionActiva(companyId) {
  const [r] = await centralDB.execute(`SELECT edr_enabled FROM companies WHERE id = ? LIMIT 1`, [companyId])
  return !r.length || Number(r[0].edr_enabled) === 1
}

// PUT /proteccion — activa/desactiva la protección EDR de la empresa activa.
router.put('/proteccion', async (req, res, next) => {
  try {
    const enabled = !!(req.body && req.body.enabled)
    await centralDB.execute(`UPDATE companies SET edr_enabled = ? WHERE id = ?`, [enabled ? 1 : 0, req.company.id])
    await registrarActividad({
      req, accion: 'editar', modulo: 'edr', company_id: req.company.id,
      descripcion: `Protección EDR ${enabled ? 'ACTIVADA' : 'DESACTIVADA'}`,
    })
    res.json({ success: true, proteccion_activa: enabled })
  } catch (err) { next(err) }
})

// GET /agents — agentes asignados a la empresa activa.
// El estado se toma EN VIVO de la API de Wazuh (active/disconnected/never_connected);
// si la API no responde, se usa el estado almacenado como respaldo.
router.get('/agents', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT a.*,
             (SELECT COUNT(*) FROM edr_alerts e WHERE e.wazuh_id = a.wazuh_id) AS total_alertas
      FROM edr_agents a
      WHERE a.company_id = ?
      ORDER BY a.last_keepalive DESC
    `, [req.company.id])

    let liveById = {}
    try {
      const live = await wazuhApi.listAgents()
      live.forEach(a => { liveById[a.id] = a.status })
    } catch { /* API Wazuh no disponible → usamos el estado almacenado */ }

    const agents = rows.map(r => ({ ...r, status: liveById[r.wazuh_id] || r.status }))
    res.json({ agents })
  } catch (err) { next(err) }
})

// GET /dispositivos-red — inventario de equipos detectados pasivamente (ARP)
// por los agentes de la empresa activa, sin necesitar agente propio en cada
// dispositivo. "Conectado ahora" = visto en los últimos 3 minutos (ventana de
// 1 min de escaneo + margen).
router.get('/dispositivos-red', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT id, mac, ip, vendor, tipo, hostname, primera_vez, ultima_vez,
             (ultima_vez >= (NOW() - INTERVAL 3 MINUTE)) AS conectado
      FROM edr_network_devices
      WHERE company_id = ?
      ORDER BY conectado DESC, ultima_vez DESC
    `, [req.company.id])
    res.json({ dispositivos: rows.map(r => ({ ...r, conectado: !!r.conectado })) })
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
    const limit  = Math.min(parseInt(req.query.limit, 10) || 200, 1000)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)

    let where = 'WHERE company_id = ?'
    const params = [req.company.id]

    if (nivel_min) { where += ' AND rule_level >= ?'; params.push(parseInt(nivel_min, 10) || 0) }
    if (agent)     { where += ' AND wazuh_id = ?';    params.push(agent) }
    if (date_from) { where += ' AND event_time >= ?'; params.push(date_from) }
    if (date_to)   { where += ' AND event_time <= ?'; params.push(date_to + ' 23:59:59') }
    if (q)         { where += ' AND (rule_description LIKE ? OR full_log LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }

    const [[{ total }]] = await centralDB.query(
      `SELECT COUNT(*) AS total FROM edr_alerts ${where}`, params
    )

    const [rows] = await centralDB.execute(`
      SELECT id, wazuh_id, agent_name, rule_id, rule_level, rule_description,
             rule_groups, mitre_ids, mitre_tactics, mitre_techniques,
             location, src_ip, full_log, event_time, incidente_id, count, last_seen
      FROM edr_alerts
      ${where}
      ORDER BY event_time DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params)

    // IPs ya bloqueadas (alerta 651 "Host Blocked"): para ocultar el botón.
    const [blk] = await centralDB.execute(
      `SELECT DISTINCT wazuh_id, src_ip FROM edr_alerts
       WHERE company_id = ? AND rule_id = 651 AND src_ip IS NOT NULL`, [req.company.id]
    )
    const bloqueadas = new Set(blk.map(b => `${b.wazuh_id}|${b.src_ip}`))
    const alerts = rows.map(r => ({ ...r, bloqueada: r.src_ip ? bloqueadas.has(`${r.wazuh_id}|${r.src_ip}`) : false }))

    res.json({ alerts, total: Number(total), offset, limit })
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
             SUM(incidente_id IS NOT NULL)               AS incidentes,
             SUM(event_time >= (NOW() - INTERVAL 24 HOUR)) AS ultimas_24h
      FROM edr_alerts WHERE company_id = ?
    `, [companyId])

    // Distribución por severidad y top tácticas MITRE — SIEMPRE sobre las
    // últimas 24h (mismo universo que el donut/barras del panel), para que
    // las tarjetas KPI y los gráficos cuenten exactamente lo mismo. Antes el
    // donut se calculaba con las alertas paginadas de la tabla (máx. 20-1000)
    // mientras las tarjetas mostraban el total histórico → números que no
    // coincidían entre sí.
    const [[sev]] = await centralDB.query(`
      SELECT SUM(rule_level >= 12)              AS critico,
             SUM(rule_level BETWEEN 7 AND 11)    AS alto,
             SUM(rule_level BETWEEN 4 AND 6)     AS medio,
             SUM(rule_level < 4)                 AS bajo
      FROM edr_alerts
      WHERE company_id = ? AND event_time >= (NOW() - INTERVAL 24 HOUR)
    `, [companyId])

    const [mitreRows] = await centralDB.execute(`
      SELECT mitre_tactics FROM edr_alerts
      WHERE company_id = ? AND event_time >= (NOW() - INTERVAL 24 HOUR) AND mitre_tactics IS NOT NULL
    `, [companyId])
    const tacticCount = {}
    mitreRows.forEach(r => {
      let arr = r.mitre_tactics
      if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { arr = [] } }
      if (Array.isArray(arr)) arr.forEach(t => { tacticCount[t] = (tacticCount[t] || 0) + 1 })
    })
    const mitreTop24h = Object.entries(tacticCount)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6)

    const [sinAsignar] = await centralDB.execute(
      `SELECT COUNT(*) AS n FROM edr_agents WHERE company_id IS NULL`
    )

    // Correcciones (respuestas activas): total + serie de los últimos 7 días.
    const [[corr]] = await centralDB.query(
      `SELECT COUNT(*) AS total FROM edr_responses WHERE company_id = ?`, [companyId]
    )
    const [serieRows] = await centralDB.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS dia, COUNT(*) AS n
      FROM edr_responses
      WHERE company_id = ? AND created_at >= (CURRENT_DATE - INTERVAL 6 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    `, [companyId])
    const byDay = {}
    serieRows.forEach(s => { byDay[s.dia] = Number(s.n) })
    const serie = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      serie.push({ dia: d, n: byDay[d] || 0 })
    }

    res.json({
      agentes: {
        total:         Number(ag.total || 0),
        activos:       Number(ag.activos || 0),
        desconectados: Number(ag.desconectados || 0),
      },
      alertas: {
        total:       Number(al.total || 0),
        criticas:    Number(sev.critico || 0),
        altas:       Number(sev.alto || 0),
        incidentes:  Number(al.incidentes || 0),
        ultimas_24h: Number(al.ultimas_24h || 0),
        distribucion_24h: {
          critico: Number(sev.critico || 0), alto: Number(sev.alto || 0),
          medio: Number(sev.medio || 0), bajo: Number(sev.bajo || 0),
        },
      },
      mitre_top_24h: mitreTop24h,
      correcciones: { total: Number(corr.total || 0), serie },
      sin_asignar: Number(sinAsignar[0].n || 0),
      proteccion_activa: await proteccionActiva(companyId),
    })
  } catch (err) { next(err) }
})

// POST /bloquear-todo — bloquea todas las IPs de origen disponibles en las alertas
// del tenant (únicas por agente; excluye loopback y la IP del manager). Requiere
// que el agente esté activo; reporta cuántas se bloquearon y cuántas fallaron.
router.post('/bloquear-todo', async (req, res) => {
  try {
    const companyId = req.company.id
    if (!(await proteccionActiva(companyId))) {
      return res.status(403).json({ error: 'Protección EDR desactivada para esta empresa' })
    }
    // IPs de origen únicas a bloquear, EXCLUYENDO las ya bloqueadas en los últimos
    // 10 min (evita re-bloquear lo mismo en clics repetidos).
    const [rows] = await centralDB.execute(`
      SELECT DISTINCT a.wazuh_id, a.src_ip
      FROM edr_alerts a
      WHERE a.company_id = ? AND a.src_ip IS NOT NULL AND a.src_ip <> ''
        AND a.src_ip NOT LIKE '127.%' AND a.src_ip <> '::1' AND a.src_ip <> '2.25.183.242'
        AND NOT EXISTS (
          SELECT 1 FROM edr_responses r
          WHERE r.company_id = a.company_id AND r.action = 'bloquear_ip'
            AND r.target = a.src_ip AND r.wazuh_id = a.wazuh_id
            AND r.created_at >= (NOW() - INTERVAL 10 MINUTE)
        )
      LIMIT 100
    `, [companyId])

    const osCache = {}
    async function cmdFor(agentId) {
      if (!(agentId in osCache)) {
        const os = await wazuhApi.getAgentOs(agentId).catch(() => '')
        osCache[agentId] = /windows|microsoft/.test(os) ? 'netsh' : 'firewall-drop'
      }
      return osCache[agentId]
    }

    let ok = 0, fail = 0
    for (const r of rows) {
      try {
        await wazuhApi.activeResponse(r.wazuh_id, await cmdFor(r.wazuh_id), [r.src_ip])
        await centralDB.execute(
          `INSERT INTO edr_responses (company_id, wazuh_id, action, target) VALUES (?, ?, 'bloquear_ip', ?)`,
          [companyId, r.wazuh_id, r.src_ip]
        )
        ok++
      } catch { fail++ }
    }

    await registrarActividad({
      req, accion: 'editar', modulo: 'edr', company_id: companyId,
      descripcion: `Bloqueo masivo: ${ok} IP(s) bloqueada(s)${fail ? `, ${fail} fallida(s)` : ''}`,
    })

    res.json({
      success: true, total: rows.length, bloqueadas: ok, fallidas: fail,
      message: rows.length === 0
        ? 'No hay IPs nuevas para bloquear (ya están bloqueadas o no hay alertas con IP de origen)'
        : `${ok} IP(s) nueva(s) bloqueada(s)${fail ? `, ${fail} fallida(s) (agentes desconectados)` : ''}`,
    })
  } catch (err) {
    res.status(502).json({ error: err.message || 'No se pudo ejecutar el bloqueo masivo' })
  }
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

// POST /agents/:wazuhId/responder — respuesta activa sobre un agente del tenant.
// Body: { action: 'bloquear_ip'|'desconectar_usuario'|'reiniciar_agente', target }
router.post('/agents/:wazuhId/responder', async (req, res) => {
  try {
    const { wazuhId } = req.params
    const { action, target } = req.body || {}
    if (!(await proteccionActiva(req.company.id))) {
      return res.status(403).json({ error: 'Protección EDR desactivada para esta empresa' })
    }

    const cfg = ACCIONES_AR[action]
    if (!cfg) return res.status(400).json({ error: 'Acción no válida' })
    if (cfg.needsTarget && !target) return res.status(400).json({ error: 'Falta el objetivo (IP o usuario)' })

    // Salvaguarda: nunca bloquear loopback ni la IP del manager (rompería el endpoint).
    if (action === 'bloquear_ip') {
      const ip = String(target).trim()
      const PROHIBIDAS = ['127.0.0.1', '::1', '0.0.0.0', '2.25.183.242']
      if (PROHIBIDAS.includes(ip) || ip.startsWith('127.')) {
        return res.status(400).json({ error: `No se permite bloquear ${ip} (loopback/manager)` })
      }
    }

    // Seguridad multi-tenant: el agente DEBE pertenecer a la empresa activa.
    const [ag] = await centralDB.execute(
      `SELECT wazuh_id, name FROM edr_agents WHERE wazuh_id = ? AND company_id = ? LIMIT 1`,
      [wazuhId, req.company.id]
    )
    if (!ag.length) return res.status(404).json({ error: 'Agente no encontrado en esta empresa' })

    const args = cfg.needsTarget ? [String(target)] : []
    // Bloqueo de IP: comando según el SO del agente (Linux=firewall-drop, Windows=netsh).
    let command = cfg.command
    if (action === 'bloquear_ip') {
      const os = await wazuhApi.getAgentOs(wazuhId).catch(() => '')
      command = /windows|microsoft/.test(os) ? 'netsh' : 'firewall-drop'
    }
    await wazuhApi.activeResponse(wazuhId, command, args)

    // Registrar la corrección (para el contador/gráfico del panel)
    await centralDB.execute(
      `INSERT INTO edr_responses (company_id, wazuh_id, action, target) VALUES (?, ?, ?, ?)`,
      [req.company.id, wazuhId, action, target ?? null]
    ).catch(() => {})

    await registrarActividad({
      req, accion: 'editar', modulo: 'edr',
      descripcion: `Respuesta activa: ${cfg.label}${target ? ' ' + target : ''} en agente ${ag[0].name || wazuhId}`,
      company_id: req.company.id,
      metadata: { wazuh_id: wazuhId, action, target: target ?? null },
    })

    res.json({ success: true, message: `Acción "${cfg.label}" enviada al agente ${ag[0].name || wazuhId}` })
  } catch (err) {
    res.status(502).json({ error: err.message || 'No se pudo ejecutar la respuesta activa' })
  }
})

// POST /agents/:wazuhId/desactivar — da de baja un equipo (robado, quemado,
// reemplazado…): lo elimina del manager Wazuh y del portal.
router.post('/agents/:wazuhId/desactivar', async (req, res) => {
  try {
    const { wazuhId } = req.params
    const [ag] = await centralDB.execute(
      `SELECT name FROM edr_agents WHERE wazuh_id = ? AND company_id = ? LIMIT 1`,
      [wazuhId, req.company.id]
    )
    if (!ag.length) return res.status(404).json({ error: 'Equipo no encontrado en esta empresa' })

    try { await wazuhApi.deleteAgent(wazuhId) } catch (e) { /* puede que ya no exista en Wazuh */ }
    await centralDB.execute(`DELETE FROM edr_agents WHERE wazuh_id = ? AND company_id = ?`, [wazuhId, req.company.id])

    await registrarActividad({
      req, accion: 'eliminar', modulo: 'edr', company_id: req.company.id,
      descripcion: `Equipo dado de baja: ${ag[0].name || wazuhId}`,
    })
    res.json({ success: true, message: `Equipo ${ag[0].name || wazuhId} dado de baja` })
  } catch (err) {
    res.status(502).json({ error: err.message || 'No se pudo dar de baja el equipo' })
  }
})

// GET /agents/:wazuhId/ubicacion — geolocaliza el equipo por su IP (nivel de red).
router.get('/agents/:wazuhId/ubicacion', async (req, res) => {
  try {
    const [ag] = await centralDB.execute(
      `SELECT name, ip FROM edr_agents WHERE wazuh_id = ? AND company_id = ? LIMIT 1`,
      [req.params.wazuhId, req.company.id]
    )
    if (!ag.length) return res.status(404).json({ error: 'Equipo no encontrado' })
    res.json(await geoip(ag[0].ip))
  } catch (err) { res.status(502).json({ error: err.message }) }
})

// GET /alerts/origen — geolocaliza la IP de ORIGEN de una alerta (el posible
// atacante), no la del agente. Útil para responder "¿desde dónde nos atacaron?"
// directamente desde la tabla de alertas, sin salir del portal.
router.get('/alerts/origen', async (req, res) => {
  try {
    const ip = String(req.query.ip || '').trim()
    if (!ip) return res.status(400).json({ error: 'Falta la IP de origen' })
    res.json(await geoip(ip))
  } catch (err) { res.status(502).json({ error: err.message || 'No se pudo geolocalizar la IP' }) }
})

// GET /empresas — lista para el selector de "mover equipo".
router.get('/empresas', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, name, slug FROM companies WHERE status = 'active' ORDER BY name`
    )
    res.json({ empresas: rows })
  } catch (err) { next(err) }
})

// POST /agents/:wazuhId/mover — reasigna un equipo a otra empresa (corrige errores).
router.post('/agents/:wazuhId/mover', async (req, res) => {
  try {
    const { wazuhId } = req.params
    const companyId = parseInt(req.body?.company_id, 10)
    if (!companyId) return res.status(400).json({ error: 'Empresa destino requerida' })

    const [dest] = await centralDB.execute(`SELECT id, name FROM companies WHERE id = ? AND status = 'active' LIMIT 1`, [companyId])
    if (!dest.length) return res.status(404).json({ error: 'Empresa destino no encontrada' })

    const [ag] = await centralDB.execute(`SELECT name FROM edr_agents WHERE wazuh_id = ? AND company_id = ? LIMIT 1`, [wazuhId, req.company.id])
    if (!ag.length) return res.status(404).json({ error: 'Equipo no encontrado en esta empresa' })

    await centralDB.execute(`UPDATE edr_agents SET company_id = ? WHERE wazuh_id = ?`, [companyId, wazuhId])
    await centralDB.execute(`UPDATE edr_alerts SET company_id = ? WHERE wazuh_id = ?`, [companyId, wazuhId])

    await registrarActividad({ req, accion: 'editar', modulo: 'edr', company_id: req.company.id,
      descripcion: `Equipo ${ag[0].name || wazuhId} movido a ${dest[0].name}` })
    res.json({ success: true, message: `Equipo movido a ${dest[0].name}` })
  } catch (err) { res.status(502).json({ error: err.message || 'No se pudo mover el equipo' }) }
})

// PUT /agents/:wazuhId/renombrar — cambia el nombre visible del equipo en el
// portal. NO toca Wazuh: el agente Wazuh sigue identificandose por su ID
// interno (wazuh_id), el nombre original en client.keys no cambia (Wazuh no
// re-ejecuta el enrolamiento si el MSI ya esta instalado). Esto es lo que
// permite corregir el nombre sin reinstalar el agente.
router.put('/agents/:wazuhId/renombrar', async (req, res) => {
  try {
    const { wazuhId } = req.params
    const nombre = (req.body?.name || '').trim().slice(0, 255)
    if (!nombre) return res.status(400).json({ error: 'El nombre no puede estar vacio' })

    const [ag] = await centralDB.execute(`SELECT name FROM edr_agents WHERE wazuh_id = ? AND company_id = ? LIMIT 1`, [wazuhId, req.company.id])
    if (!ag.length) return res.status(404).json({ error: 'Equipo no encontrado en esta empresa' })

    await centralDB.execute(`UPDATE edr_agents SET name = ? WHERE wazuh_id = ?`, [nombre, wazuhId])

    await registrarActividad({ req, accion: 'editar', modulo: 'edr', company_id: req.company.id,
      descripcion: `Equipo renombrado de "${ag[0].name || wazuhId}" a "${nombre}"` })
    res.json({ success: true, name: nombre })
  } catch (err) { res.status(502).json({ error: err.message || 'No se pudo renombrar el equipo' }) }
})

module.exports = router
