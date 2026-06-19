const centralDB = require('./central')
async function main() {
  console.log('› Creando tabla de evaluaciones Ley 21.663…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS ley21663_evaluaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      fecha DATETIME NOT NULL,
      score_total INT NOT NULL DEFAULT 0,
      nivel VARCHAR(20) NOT NULL DEFAULT 'Bajo',
      respuestas JSON NULL,
      brechas JSON NULL,
      notas TEXT NULL,
      cotizacion_id INT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_company (company_id, fecha)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tabla ley21663_evaluaciones lista')
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
