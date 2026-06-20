// migrate_edr_network_devices.js — equipos detectados de forma pasiva (tabla
// ARP) por un agente Wazuh ya instalado, sin necesitar agente propio en cada
// dispositivo. Idempotente.
const centralDB = require('./central')

async function main() {
  console.log('› Creando tabla edr_network_devices…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS edr_network_devices (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      company_id    INT NULL,
      wazuh_id      VARCHAR(10) NULL,
      mac           VARCHAR(17) NOT NULL,
      ip            VARCHAR(64) NULL,
      vendor        VARCHAR(120) NULL,
      tipo          VARCHAR(30) NULL,
      hostname      VARCHAR(255) NULL,
      primera_vez   DATETIME NULL,
      ultima_vez    DATETIME NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_company_mac (company_id, mac),
      KEY idx_company (company_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tabla edr_network_devices lista')
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
