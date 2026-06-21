const centralDB = require('./central')
async function main() {
  console.log('› Creando tablas de Onboarding…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS onboarding_pasos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orden INT NOT NULL,
      fase VARCHAR(120) NOT NULL,
      titulo VARCHAR(255) NOT NULL,
      explicacion_simple TEXT NOT NULL,
      instrucciones LONGTEXT NOT NULL,
      modulo_link VARCHAR(120) NULL,
      modulo_label VARCHAR(80) NULL,
      opcional TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_orden (orden)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS onboarding_progreso (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      paso_id INT NOT NULL,
      completado TINYINT(1) NOT NULL DEFAULT 0,
      completado_at DATETIME NULL,
      completado_por INT NULL,
      notas TEXT NULL,
      UNIQUE KEY uniq_company_paso (company_id, paso_id),
      KEY idx_company (company_id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tablas onboarding_pasos / onboarding_progreso listas')
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
