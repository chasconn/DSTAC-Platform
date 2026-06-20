// Envío de correo vía Microsoft Graph (OAuth2 client-credentials).
// Sin contraseñas ni SMTP básico → no requiere bajar Security Defaults de M365.
// Variables de entorno necesarias:
//   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, MAIL_FROM (buzón emisor)

const TENANT        = process.env.GRAPH_TENANT_ID
const CLIENT_ID     = process.env.GRAPH_CLIENT_ID
const CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET
const MAIL_FROM     = process.env.MAIL_FROM || process.env.SMTP_USER

let _token = null
let _exp = 0

async function getToken() {
  if (_token && Date.now() < _exp - 60000) return _token
  if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Faltan GRAPH_TENANT_ID / GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET en el entorno')
  }
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  })
  const r = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error('Graph token error: ' + (j.error_description || JSON.stringify(j)))
  _token = j.access_token
  _exp = Date.now() + (parseInt(j.expires_in || 3600) * 1000)
  return _token
}

// to: string o array de strings (uno o varios destinatarios).
// attachments opcional: [{ name, contentType, contentBytes (base64) }]
async function sendMail(to, subject, html, attachments = []) {
  const token = await getToken()
  const destinatarios = (Array.isArray(to) ? to : [to]).filter(Boolean)
  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: destinatarios.map(addr => ({ emailAddress: { address: addr } }))
  }
  if (attachments.length) {
    message.attachments = attachments.map(a => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentType: a.contentType || 'application/octet-stream',
      contentBytes: a.contentBytes,
    }))
  }
  const r = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_FROM)}/sendMail`,
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: false })
    }
  )
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    throw new Error('Graph sendMail error ' + r.status + ': ' + t)
  }
}

async function sendMFACode(email, code) {
  const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #3C3489;">Código de verificación</h2>
        <p>Ingresa el siguiente código para acceder a tu cuenta:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px;
                    color: #3C3489; padding: 24px; background: #EEEDFE;
                    border-radius: 8px; text-align: center; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888780; font-size: 14px;">
          Este código expira en 5 minutos. Si no solicitaste este acceso, ignora este correo.
        </p>
      </div>
    `
  await sendMail(email, 'Tu código de verificación DSTAC', html)
}

module.exports = { sendMFACode, sendMail }
