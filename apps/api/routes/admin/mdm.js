// routes/admin/mdm.js — MDM Android (Android Management API). Solo DSTAC.
// La empresa sale del header X-Company-Slug (resolveTenant → req.company).
const router    = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB = require('../../db/central')
const mdm       = require('../../services/mdmApi')
let QRCode = null
try { QRCode = require('qrcode') } catch { /* dep opcional */ }

router.use(requireAuth, requireDstacRole, resolveTenant)

// ISO → 'YYYY-MM-DD HH:MM:SS' (UTC) para columnas DATETIME.
function toMysqlDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ')
}

// ── Estado de configuración del MDM ───────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({ configured: mdm.isConfigured(), enterprise: mdm.enterpriseName() })
})

// ── Dispositivos de la empresa activa (cache local; usar /sync para refrescar) ─
router.get('/devices', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, device_name, brand, model, os_version, state, applied_state,
              policy_name, security, last_sync
         FROM mdm_devices
        WHERE company_id = ?
        ORDER BY last_sync DESC, id DESC`,
      [req.company.id]
    )
    res.json({ configured: mdm.isConfigured(), devices: rows })
  } catch (err) { next(err) }
})

// ── Sincronizar con Google: trae todos los dispositivos y los mapea a empresa ──
router.post('/sync', async (req, res, next) => {
  try {
    if (!mdm.isConfigured()) return res.status(400).json({ error: 'MDM no configurado' })
    const devices = await mdm.listDevices()
    for (const d of devices) {
      let companyId = null
      try { companyId = JSON.parse(d.enrollmentTokenData || '{}').companyId ?? null } catch {}
      const hw = d.hardwareInfo || {}, sw = d.softwareInfo || {}
      const security = {
        passwordCompliant: d.appliedState === 'ACTIVE',
        encryptionStatus:  (d.hardwareStatus && d.hardwareStatus.length) ? 'ok' : null,
        policyCompliant:   d.policyCompliant ?? null,
        nonComplianceReasons: (d.nonComplianceDetails || []).map(n => n.nonComplianceReason),
      }
      await centralDB.execute(
        `INSERT INTO mdm_devices
           (device_name, company_id, brand, model, os_version, state, applied_state, policy_name, security, last_sync, raw)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           company_id    = COALESCE(VALUES(company_id), company_id),
           brand=VALUES(brand), model=VALUES(model), os_version=VALUES(os_version),
           state=VALUES(state), applied_state=VALUES(applied_state),
           policy_name=VALUES(policy_name), security=VALUES(security),
           last_sync=VALUES(last_sync), raw=VALUES(raw)`,
        [d.name, companyId, hw.brand || null, hw.model || null, sw.androidVersion || null,
         d.state || null, d.appliedState || null, d.policyName || null,
         JSON.stringify(security), toMysqlDate(d.lastStatusReportTime), JSON.stringify(d)]
      )
    }
    res.json({ synced: devices.length })
  } catch (err) { next(err) }
})

// ── Generar token + QR de inscripción para la empresa activa ───────────────────
router.post('/enroll', async (req, res, next) => {
  try {
    if (!mdm.isConfigured()) return res.status(400).json({ error: 'MDM no configurado' })
    const personalUsage = (req.body && req.body.mode === 'work_profile')
    const tok = await mdm.createEnrollmentToken({ slug: req.company.slug, companyId: req.company.id, personalUsage })
    await centralDB.execute(
      `INSERT INTO mdm_enrollment_tokens (company_id, token_name, token_value, qr_json, policy_id, expiration, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [req.company.id, tok.name || null, tok.value || null, tok.qrCode || null, 'baseline',
       toMysqlDate(tok.expirationTimestamp), req.user?.id || null]
    )
    let qrPng = null
    if (QRCode && tok.qrCode) qrPng = await QRCode.toDataURL(tok.qrCode, { width: 320, margin: 1 })
    res.json({ value: tok.value, qrJson: tok.qrCode, qrPng, expiration: tok.expirationTimestamp })
  } catch (err) { next(err) }
})

// ── Comando a un dispositivo (LOCK | RESET_PASSWORD | REBOOT | WIPE) ────────────
const COMANDOS = new Set(['LOCK', 'RESET_PASSWORD', 'REBOOT', 'WIPE'])
router.post('/devices/comando', async (req, res, next) => {
  try {
    if (!mdm.isConfigured()) return res.status(400).json({ error: 'MDM no configurado' })
    const { device_name, type } = req.body || {}
    if (!device_name || !COMANDOS.has(type)) return res.status(400).json({ error: 'Comando inválido' })

    // Seguridad multi-tenant: el dispositivo debe pertenecer a la empresa activa.
    const [[dev]] = await centralDB.query(
      `SELECT id FROM mdm_devices WHERE device_name = ? AND company_id = ? LIMIT 1`,
      [device_name, req.company.id]
    )
    if (!dev) return res.status(404).json({ error: 'Dispositivo no encontrado en esta empresa' })

    let detail = 'ok'
    if (type === 'WIPE') { await mdm.wipeDevice(device_name); detail = 'wipe enviado' }
    else                 { const r = await mdm.issueCommand(device_name, type); detail = r?.name || 'enviado' }

    await centralDB.execute(
      `INSERT INTO mdm_commands (company_id, device_name, type, status, detail, created_by)
       VALUES (?,?,?,?,?,?)`,
      [req.company.id, device_name, type, 'enviado', String(detail).slice(0, 500), req.user?.id || null]
    )
    res.json({ ok: true, type })
  } catch (err) { next(err) }
})

module.exports = router
