// migrate_marketing.js — crea la tabla de envios de campanas de marketing
// (ej. seguimiento de contactos obtenidos en ferias como Exponor).
const centralDB = require('./central')

async function main() {
  console.log('› Creando tabla marketing_envios…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS marketing_envios (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      campana         VARCHAR(120) NOT NULL DEFAULT 'exponor-2026',
      empresa         VARCHAR(255) NOT NULL,
      contacto_nombre VARCHAR(255) NOT NULL,
      contacto_email  VARCHAR(255) NOT NULL,
      estado          ENUM('enviado','error') NOT NULL DEFAULT 'enviado',
      error_detail    VARCHAR(500) NULL,
      created_by      INT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_campana (campana)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tabla marketing_envios lista')
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
