const centralDB = require('./central')
async function main() {
  console.log('› Creando tablas de simulación de phishing…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS phishing_campanas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      plantilla_id VARCHAR(60) NOT NULL,
      estado ENUM('borrador','enviada') NOT NULL DEFAULT 'borrador',
      enviado_at DATETIME NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_company (company_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS phishing_destinatarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campana_id INT NOT NULL,
      nombre VARCHAR(255) NULL,
      correo VARCHAR(255) NOT NULL,
      token CHAR(36) NOT NULL,
      enviado_at DATETIME NULL,
      abierto_at DATETIME NULL,
      clic_at DATETIME NULL,
      error VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY idx_token (token),
      KEY idx_campana (campana_id),
      CONSTRAINT fk_phishing_dest_campana FOREIGN KEY (campana_id)
        REFERENCES phishing_campanas(id) ON DELETE CASCADE
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tablas phishing_campanas / phishing_destinatarios listas')
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
