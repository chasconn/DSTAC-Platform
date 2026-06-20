const centralDB = require('./central')
async function main() {
  console.log('› Creando tabla de registro de cambios (changelog)…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS dstac_changelog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE NOT NULL,
      titulo VARCHAR(255) NOT NULL,
      categoria VARCHAR(40) NOT NULL DEFAULT 'correccion',
      resumen_simple TEXT NOT NULL,
      detalle_tecnico LONGTEXT NOT NULL,
      archivos JSON NULL,
      comandos JSON NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_fecha (fecha)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tabla dstac_changelog lista')
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
