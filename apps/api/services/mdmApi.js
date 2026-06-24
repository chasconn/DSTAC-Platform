// services/mdmApi.js — Wrapper de la Android Management API (Google) para el MDM
// de DSTAC. El portal nunca habla con el teléfono: habla con Google, que empuja
// las políticas/comandos al dispositivo vía FCM.
//
// Configuración (env):
//   MDM_ENTERPRISE   enterprises/LC0xxxxxxx   (la "empresa" Android de DSTAC)
//   MDM_SA_JSON      JSON inline de la service account  (o…)
//   GOOGLE_APPLICATION_CREDENTIALS  ruta al archivo JSON de la service account
//
// googleapis es opcional en build: si no está instalado, isConfigured()=false y
// las rutas responden "MDM no configurado" sin romper el resto del API.
let google = null
try { ({ google } = require('googleapis')) } catch { /* dep opcional */ }

const SCOPE = 'https://www.googleapis.com/auth/androidmanagement'
let _client = null

function enterpriseName() {
  return process.env.MDM_ENTERPRISE || null
}

function hasCreds() {
  return !!(process.env.MDM_SA_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS)
}

function isConfigured() {
  return !!(google && enterpriseName() && hasCreds())
}

function getClient() {
  if (!google) throw new Error('googleapis no instalado (npm i googleapis)')
  if (!enterpriseName()) throw new Error('MDM no configurado: falta MDM_ENTERPRISE')
  if (!hasCreds()) throw new Error('MDM no configurado: falta la service account')
  if (_client) return _client
  const auth = process.env.MDM_SA_JSON
    ? new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.MDM_SA_JSON), scopes: [SCOPE] })
    : new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: [SCOPE] })
  _client = google.androidmanagement({ version: 'v1', auth })
  return _client
}

// Política base que se aplica al inscribir: exige bloqueo de pantalla numérico y
// activa el reporte de estado del dispositivo. Conservadora a propósito (MVP).
const BASELINE_POLICY = {
  passwordPolicies: [{
    passwordScope: 'SCOPE_DEVICE',
    passwordMinimumLength: 6,
    passwordQuality: 'NUMERIC',
  }],
  statusReportingSettings: {
    deviceSettingsEnabled: true,
    hardwareStatusEnabled: true,
    softwareInfoEnabled: true,
    memoryInfoEnabled: true,
  },
}

async function ensureBaselinePolicy(policyId = 'baseline') {
  const am = getClient()
  await am.enterprises.policies.patch({
    name: `${enterpriseName()}/policies/${policyId}`,
    requestBody: BASELINE_POLICY,
  })
  return policyId
}

// Crea (o reutiliza) un token de inscripción para una empresa. El additionalData
// viaja con el dispositivo al inscribirse → así sabemos a qué empresa pertenece.
// personalUsage=true → permite "perfil de trabajo" en un equipo YA en uso (BYOD),
// sin restaurarlo de fábrica. false → equipo totalmente gestionado (de fábrica).
async function createEnrollmentToken({ slug, companyId, policyId = 'baseline', personalUsage = false }) {
  const am = getClient()
  await ensureBaselinePolicy(policyId)
  const res = await am.enterprises.enrollmentTokens.create({
    parent: enterpriseName(),
    requestBody: {
      policyName: `${enterpriseName()}/policies/${policyId}`,
      additionalData: JSON.stringify({ slug, companyId }),
      duration: '3600s',          // 1 h de validez del QR
      oneTimeOnly: false,         // permite inscribir varios equipos con el mismo QR
      allowPersonalUsage: personalUsage ? 'PERSONAL_USAGE_ALLOWED' : 'PERSONAL_USAGE_DISALLOWED',
    },
  })
  return res.data // { name, value, qrCode, expirationTimestamp }
}

async function listDevices() {
  const am = getClient()
  let devices = [], pageToken
  do {
    const res = await am.enterprises.devices.list({ parent: enterpriseName(), pageSize: 100, pageToken })
    devices = devices.concat(res.data.devices || [])
    pageToken = res.data.nextPageToken
  } while (pageToken)
  return devices
}

async function getDevice(name) {
  const am = getClient()
  const res = await am.enterprises.devices.get({ name })
  return res.data
}

// Comandos sin borrado: LOCK | RESET_PASSWORD | REBOOT.
async function issueCommand(deviceName, type, extra = {}) {
  const am = getClient()
  const res = await am.enterprises.devices.issueCommand({ name: deviceName, requestBody: { type, ...extra } })
  return res.data
}

// Borrado remoto = eliminar el dispositivo de la empresa (lo restaura de fábrica).
async function wipeDevice(deviceName, reason = 'Borrado remoto desde DSTAC') {
  const am = getClient()
  await am.enterprises.devices.delete({
    name: deviceName,
    wipeDataFlags: ['WIPE_EXTERNAL_STORAGE'],
    wipeReasonMessage: reason,
  })
  return { wiped: true }
}

module.exports = {
  isConfigured, enterpriseName,
  ensureBaselinePolicy, createEnrollmentToken,
  listDevices, getDevice, issueCommand, wipeDevice,
}
