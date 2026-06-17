// migrate_mdm.js — crea las tablas del módulo MDM (Android Management API) en la
// BD central. Idempotente (CREATE TABLE IF NOT EXISTS). Correr dentro del api:
//   node apps/api/db/migrate_mdm.js
const centralDB = require('./central')

async function main() {
  console.log('› Creando tablas MDM…')

  // Dispositivos móviles gestionados. company_id se resuelve desde el
  // additionalData del token de inscripción (mapeo multi-tenant).
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS mdm_devices (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      device_name   VARCHAR(255) NOT NULL,          -- enterprises/X/devices/Y
      company_id    INT          NULL,
      brand         VARCHAR(120) NULL,
      model         VARCHAR(120) NULL,
      os_version    VARCHAR(60)  NULL,
      state         VARCHAR(40)  NULL,              -- ACTIVE, DISABLED, DELETED…
      applied_state VARCHAR(40)  NULL,
      policy_name   VARCHAR(255) NULL,
      security      JSON         NULL,              -- cumplimiento de política, cifrado…
      last_sync     DATETIME     NULL,
      raw           JSON         NULL,
      created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_device (device_name),
      KEY idx_company (company_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Tokens de inscripción emitidos (uno por empresa, reutilizable durante su vigencia).
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS mdm_enrollment_tokens (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT          NULL,
      token_name  VARCHAR(255) NULL,
      token_value TEXT         NULL,
      qr_json     TEXT         NULL,                -- JSON que se pinta como QR
      policy_id   VARCHAR(120) NULL,
      expiration  DATETIME     NULL,
      created_by  INT          NULL,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      KEY idx_company (company_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Auditoría de comandos enviados (bloqueo, reset PIN, borrado…).
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS mdm_commands (
      id          BIGINT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT          NULL,
      device_name VARCHAR(255) NULL,
      type        VARCHAR(40)  NULL,                -- LOCK, RESET_PASSWORD, REBOOT, WIPE
      status      VARCHAR(40)  NULL,
      detail      VARCHAR(512) NULL,
      created_by  INT          NULL,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      KEY idx_company_time (company_id, created_at)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log('✓ Tablas MDM listas (mdm_devices, mdm_enrollment_tokens, mdm_commands)')
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
