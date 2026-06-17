// mdm_signup.js — alta (una sola vez) de la Enterprise de DSTAC en la Android
// Management API. Flujo en dos pasos porque requiere una redirección de Google.
//
//   1) node apps/api/db/mdm_signup.js
//        → imprime una URL. Ábrela, completa el alta de Managed Google Play.
//          Al terminar te redirige a una URL que en la barra trae
//          ?enterpriseToken=XXXX  → copia ese token y el signupUrlName impreso.
//
//   2) node apps/api/db/mdm_signup.js <signupUrlName> <enterpriseToken>
//        → crea la Enterprise e imprime enterprises/LC0xxxxxxxx
//          (ese valor va en la env MDM_ENTERPRISE).
//
// Requiere MDM_SA_JSON (o GOOGLE_APPLICATION_CREDENTIALS) ya configurada.
const { google } = require('googleapis')

const SCOPE = 'https://www.googleapis.com/auth/androidmanagement'
const CALLBACK = process.env.MDM_CALLBACK_URL || 'https://portal.dstac.cl/mdm-callback'

function creds() {
  if (process.env.MDM_SA_JSON) return JSON.parse(process.env.MDM_SA_JSON)
  // Clave montada como archivo (GOOGLE_APPLICATION_CREDENTIALS): la leemos para
  // poder sacar el project_id.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try { return JSON.parse(require('fs').readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')) } catch {}
  }
  return null
}

function client() {
  const c = creds()
  const auth = c
    ? new google.auth.GoogleAuth({ credentials: c, scopes: [SCOPE] })
    : new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: [SCOPE] })
  return google.androidmanagement({ version: 'v1', auth })
}

function projectId() {
  const c = creds()
  if (c && c.project_id) return c.project_id
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT
  throw new Error('No pude determinar el projectId (define MDM_SA_JSON con project_id o GOOGLE_CLOUD_PROJECT)')
}

async function paso1() {
  const am = client()
  const res = await am.signupUrls.create({ projectId: projectId(), callbackUrl: CALLBACK })
  console.log('\n› Paso 1 — abre esta URL y completa el alta (Managed Google Play, gratis):\n')
  console.log('   ' + res.data.url + '\n')
  console.log('› Al terminar, Google te redirige a una URL que en la barra trae ?enterpriseToken=...')
  console.log('› Copia ese token y vuelve a correr:\n')
  console.log('   node apps/api/db/mdm_signup.js ' + res.data.name + ' <enterpriseToken>\n')
}

async function paso2(signupUrlName, enterpriseToken) {
  const am = client()
  const res = await am.enterprises.create({
    projectId: projectId(),
    signupUrlName,
    enterpriseToken,
    requestBody: { enterpriseDisplayName: 'DSTAC CIBERSECURITY' },
  })
  console.log('\n✓ Enterprise creada. Pon esto en la env MDM_ENTERPRISE:\n')
  console.log('   MDM_ENTERPRISE=' + res.data.name + '\n')
}

async function main() {
  const [a, b] = process.argv.slice(2)
  if (a && b) await paso2(a, b)
  else        await paso1()
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
