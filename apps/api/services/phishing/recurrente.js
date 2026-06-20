// Motor de campañas de phishing recurrentes — revisa periódicamente (desde
// index.js) si alguna campaña marcada "recurrente" ya debe volver a
// dispararse, genera una nueva tanda (mismas personas, plantilla al azar
// para variar el pretexto) y la envía sola, sin que un admin tenga que
// crearla a mano cada vez.
const { v4: uuidv4 } = require('uuid')
const centralDB = require('../../db/central')
const { getTenantDB } = require('../../db/tenant')
const { PLANTILLAS } = require('./content')
const { sendMail } = require('../emailService')

const APP_URL = process.env.APP_URL || 'https://portal.dstac.cl'
const DIAS_CICLO = 30

function plantillaAlAzar() {
  return PLANTILLAS[Math.floor(Math.random() * PLANTILLAS.length)]
}

async function ejecutarCampana(origen) {
  const personalIds = Array.isArray(origen.personal_ids) ? origen.personal_ids
    : (typeof origen.personal_ids === 'string' ? JSON.parse(origen.personal_ids) : [])
  if (!personalIds.length) return

  const [[company]] = await centralDB.query(`SELECT id, name, slug FROM companies WHERE id = ? AND status = 'active'`, [origen.company_id])
  if (!company) return

  const tenantDB = await getTenantDB(company.slug)
  const [personas] = await tenantDB.query(
    `SELECT id, nombre, correo, rol_empresarial FROM personal WHERE id IN (?) AND correo IS NOT NULL AND correo != ''`,
    [personalIds]
  )
  if (!personas.length) return

  const plantilla = plantillaAlAzar()
  const fecha = new Date().toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
  const nombreNueva = `${origen.nombre} · ${fecha}`.slice(0, 255)

  const [r] = await centralDB.execute(
    `INSERT INTO phishing_campanas (company_id, nombre, plantilla_id, created_by, recurrente) VALUES (?,?,?,?,0)`,
    [company.id, nombreNueva, plantilla.id, origen.created_by]
  )
  const campanaId = r.insertId

  const destinatarios = []
  for (const p of personas) {
    const token = uuidv4()
    await centralDB.execute(
      `INSERT INTO phishing_destinatarios (campana_id, nombre, cargo, correo, token) VALUES (?,?,?,?,?)`,
      [campanaId, p.nombre || null, p.rol_empresarial || null, p.correo, token]
    )
    destinatarios.push({ correo: p.correo, nombre: p.nombre, token })
  }

  let enviados = 0
  for (const d of destinatarios) {
    const link = `${APP_URL}/api/public/phishing/c/${d.token}`
    const reportLink = `${APP_URL}/api/public/phishing/r/${d.token}`
    const html = plantilla.render({ nombre: d.nombre, empresa: company.name, link, reportLink })
      + `<img src="${APP_URL}/api/public/phishing/o/${d.token}" width="1" height="1" style="display:none" alt="">`
    try {
      await sendMail(d.correo, plantilla.asunto, html)
      await centralDB.execute(`UPDATE phishing_destinatarios SET enviado_at = NOW() WHERE campana_id = ? AND token = ?`, [campanaId, d.token])
      enviados++
    } catch (e) {
      await centralDB.execute(`UPDATE phishing_destinatarios SET error = ? WHERE campana_id = ? AND token = ?`, [String(e.message || e).slice(0, 500), campanaId, d.token])
    }
  }
  await centralDB.execute(`UPDATE phishing_campanas SET estado = 'enviada', enviado_at = NOW() WHERE id = ?`, [campanaId])

  const proxima = new Date(Date.now() + DIAS_CICLO * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await centralDB.execute(`UPDATE phishing_campanas SET proxima_ejecucion = ? WHERE id = ?`, [proxima, origen.id])

  console.log(`[phishing-recurrente] "${origen.nombre}" → nueva tanda "${nombreNueva}" (${enviados}/${destinatarios.length} enviados), próxima: ${proxima}`)
}

async function verificarRecurrentes() {
  try {
    const [pendientes] = await centralDB.execute(
      `SELECT * FROM phishing_campanas WHERE recurrente = 1 AND proxima_ejecucion IS NOT NULL AND proxima_ejecucion <= CURDATE()`
    )
    for (const c of pendientes) {
      try { await ejecutarCampana(c) }
      catch (e) { console.error('[phishing-recurrente] error en campaña', c.id, e.message) }
    }
  } catch (e) {
    console.error('[phishing-recurrente] error general:', e.message)
  }
}

module.exports = { verificarRecurrentes }
