// wazuhApi — cliente de la API REST del Wazuh Manager (puerto 55000).
// Se usa para la RESPUESTA ACTIVA (Fase 3): aislar/bloquear desde el portal.
//
// El 55000 está firewallado a localhost + red Docker; el contenedor del API
// alcanza al manager en https://172.16.0.1:55000 (cert autofirmado → no se
// verifica TLS). Credenciales por entorno; default wazuh:wazuh (ROTAR).
const https = require('https')

const WAZUH_API_URL  = process.env.WAZUH_API_URL  || 'https://172.16.0.1:55000'
const WAZUH_API_USER = process.env.WAZUH_API_USER || 'wazuh'
const WAZUH_API_PASS = process.env.WAZUH_API_PASS || 'wazuh'

// Agente HTTPS que no verifica el cert autofirmado del manager.
const agent = new https.Agent({ rejectUnauthorized: false })

let cachedToken = null
let tokenExp    = 0

// Petición JSON cruda a la API de Wazuh.
function req(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(WAZUH_API_URL + path)
    const data = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    else headers.Authorization = 'Basic ' + Buffer.from(`${WAZUH_API_USER}:${WAZUH_API_PASS}`).toString('base64')
    if (data) headers['Content-Length'] = Buffer.byteLength(data)

    const r = https.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers, agent, timeout: 10000 },
      res => {
        let buf = ''
        res.on('data', c => (buf += c))
        res.on('end', () => {
          let json = null
          try { json = JSON.parse(buf) } catch { /* respuesta no-JSON */ }
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json ?? buf)
          else reject(new Error(`Wazuh API ${res.statusCode}: ${json?.detail || json?.title || buf.slice(0, 200)}`))
        })
      }
    )
    r.on('error', reject)
    r.on('timeout', () => { r.destroy(new Error('Wazuh API timeout')) })
    if (data) r.write(data)
    r.end()
  })
}

// Devuelve un JWT válido (cacheado ~10 min).
async function getToken() {
  const now = Date.now()
  if (cachedToken && now < tokenExp) return cachedToken
  const tok = await req('POST', '/security/user/authenticate?raw=true')
  cachedToken = (typeof tok === 'string' ? tok : tok?.data?.token || '').trim()
  if (!cachedToken) throw new Error('No se pudo autenticar contra la API de Wazuh')
  tokenExp = now + 10 * 60 * 1000
  return cachedToken
}

// Lista agentes (con estado) desde la API de Wazuh.
async function listAgents() {
  const token = await getToken()
  const res = await req('GET', '/agents?limit=500&select=id,name,ip,status,os.name,version', { token })
  return res?.data?.affected_items ?? []
}

// Dispara una respuesta activa (command) sobre un agente.
// command: firewall-drop | route-null | host-deny | disable-account | restart-wazuh
async function activeResponse(agentId, command, args = []) {
  const token = await getToken()
  // El prefijo '!' indica a Wazuh que es un nombre de SCRIPT (active-response/bin),
  // lo que evita la validación get_commands() de la API (que devuelve 1652 aunque
  // el comando esté configurado). Es la forma fiable de disparar AR manual por API.
  const cmd = command.startsWith('!') ? command : `!${command}`
  const body = {
    command: cmd,
    arguments: args,
    alert: { data: { srcip: args[0] || '' } },
  }
  const res = await req('PUT', `/active-response?agents_list=${encodeURIComponent(agentId)}`, { token, body })
  const sent = res?.data?.total_affected_items ?? 0
  if (!sent) {
    const reason = res?.message || 'el agente no recibió el comando (¿desconectado?)'
    throw new Error(`Respuesta activa no enviada: ${reason}`)
  }
  return res
}

// Elimina (da de baja) un agente del manager.
async function deleteAgent(agentId) {
  const token = await getToken()
  // Wazuh 4.x exige 'status' y 'older_than' en el DELETE.
  return req('DELETE', `/agents?agents_list=${encodeURIComponent(agentId)}&older_than=0s&status=active,pending,never_connected,disconnected`, { token })
}

// Devuelve la plataforma del agente en minúsculas (p.ej. 'windows', 'ubuntu').
async function getAgentOs(agentId) {
  const token = await getToken()
  const res = await req('GET', `/agents?agents_list=${encodeURIComponent(agentId)}&select=os.platform,os.name,os.uname`, { token })
  const a = res?.data?.affected_items?.[0]?.os || {}
  return `${a.platform || ''} ${a.name || ''} ${a.uname || ''}`.toLowerCase()
}

// Resumen de conexión de agentes (cuántos endpoints monitoreados/activos).
// No expone nombres, IPs ni nada identificable — solo conteos.
async function getAgentsSummary() {
  const token = await getToken()
  const res = await req('GET', '/agents/summary/status', { token })
  const c = res?.data?.connection || {}
  return {
    total: c.total || 0,
    activos: c.active || 0,
    desconectados: c.disconnected || 0,
  }
}

// Stats del manager (alertas/eventos del día actual, agregadas por hora).
// Se suman las horas para un total del día — sin desglose por agente ni sigid.
async function getTodayStats() {
  const token = await getToken()
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const res = await req('GET', `/manager/stats?date=${date}`, { token })
  const horas = res?.data?.affected_items || []
  const totales = horas.reduce((acc, h) => ({
    alertas: acc.alertas + (h.totalAlerts || 0),
    eventos: acc.eventos + (h.events || 0),
  }), { alertas: 0, eventos: 0 })
  // Serie horaria (solo conteos por hora, para graficar tendencia del día)
  const serie = horas.map(h => ({ hora: h.hour, alertas: h.totalAlerts || 0 }))
  return { ...totales, serie }
}

module.exports = { listAgents, activeResponse, deleteAgent, getAgentOs, getToken, getAgentsSummary, getTodayStats }
