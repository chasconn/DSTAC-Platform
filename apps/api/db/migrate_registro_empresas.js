// migrate_registro_empresas.js — tabla de la copia local del "Registro de
// Empresas y Sociedades" del Ministerio de Economía (datos.gob.cl, gratuito y
// oficial). Se usa para autocompletar razón social al ingresar un RUT en el
// formulario de Clientes, sin depender de ninguna API de pago.
const centralDB = require('./central')

async function main() {
  console.log('› Creando tabla registro_empresas…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS registro_empresas (
      rut VARCHAR(12) NOT NULL PRIMARY KEY,
      razon_social VARCHAR(255) NULL,
      tipo_sociedad VARCHAR(20) NULL,
      tipo_actuacion VARCHAR(50) NULL,
      capital BIGINT NULL,
      comuna VARCHAR(100) NULL,
      region VARCHAR(10) NULL,
      anio SMALLINT NULL,
      fecha_constitucion DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_razon_social (razon_social)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tabla registro_empresas lista')
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
