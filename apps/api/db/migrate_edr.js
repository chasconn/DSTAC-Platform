// migrate_edr.js — crea las tablas del módulo EDR (Wazuh) en la BD central.
// Idempotente (CREATE TABLE IF NOT EXISTS). Correr dentro del contenedor api:
//   node apps/api/db/migrate_edr.js
const centralDB = require('./central')

async function main() {
  console.log('› Creando tablas EDR…')

  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS edr_agents (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      wazuh_id       VARCHAR(10)  NOT NULL,
      company_id     INT          NULL,
      name           VARCHAR(255) NULL,
      ip             VARCHAR(64)  NULL,
      os_name        VARCHAR(120) NULL,
      os_version     VARCHAR(120) NULL,
      agent_version  VARCHAR(40)  NULL,
      status         ENUM('active','disconnected','never_connected','pending') DEFAULT 'active',
      group_name     VARCHAR(120) NULL,
      last_keepalive DATETIME     NULL,
      register_date  DATETIME     NULL,
      raw            JSON         NULL,
      created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wazuh (wazuh_id),
      KEY idx_company (company_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS edr_alerts (
      id               BIGINT AUTO_INCREMENT PRIMARY KEY,
      company_id       INT          NULL,
      wazuh_id         VARCHAR(10)  NULL,
      agent_name       VARCHAR(255) NULL,
      rule_id          INT          NULL,
      rule_level       INT          NULL,
      rule_description VARCHAR(1024) NULL,
      rule_groups      JSON         NULL,
      mitre_ids        JSON         NULL,
      mitre_tactics    JSON         NULL,
      mitre_techniques JSON         NULL,
      location         VARCHAR(255) NULL,
      decoder          VARCHAR(120) NULL,
      src_ip           VARCHAR(64)  NULL,
      full_log         TEXT         NULL,
      event_time       DATETIME     NULL,
      raw              JSON         NULL,
      incidente_id     INT          NULL,
      incidente_slug   VARCHAR(120) NULL,
      created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      KEY idx_company_time (company_id, event_time),
      KEY idx_level (rule_level),
      KEY idx_wazuh (wazuh_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS edr_responses (
      id          BIGINT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT          NULL,
      wazuh_id    VARCHAR(10)  NULL,
      action      VARCHAR(40)  NULL,
      target      VARCHAR(120) NULL,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      KEY idx_company_time (company_id, created_at)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log('✓ Tablas EDR listas (edr_agents, edr_alerts, edr_responses)')
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
