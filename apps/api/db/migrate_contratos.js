// migrate_contratos.js — datos legales faltantes (domicilio + representante
// legal) en companies, datos legales propios de DSTAC, y tabla de contratos
// con firma electrónica simple. Idempotente. Correr en el contenedor api:
//   node apps/api/db/migrate_contratos.js
const centralDB = require('./central')

async function columnaExiste(tabla, columna) {
  const [rows] = await centralDB.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabla, columna])
  return rows[0].n > 0
}

async function agregarColumnaSiFalta(tabla, columna, definicion) {
  if (await columnaExiste(tabla, columna)) return
  await centralDB.query(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`)
  console.log(`  + ${tabla}.${columna}`)
}

async function main() {
  console.log('› Agregando datos legales faltantes a companies…')
  await agregarColumnaSiFalta('companies', 'domicilio', 'VARCHAR(255) NULL')
  await agregarColumnaSiFalta('companies', 'representante_legal', 'VARCHAR(255) NULL')
  await agregarColumnaSiFalta('companies', 'representante_legal_rut', 'VARCHAR(30) NULL')
  await agregarColumnaSiFalta('companies', 'representante_legal_cargo', 'VARCHAR(120) NULL')
  console.log('✓ companies lista')

  console.log('› Creando tabla de datos legales de DSTAC (fila única)…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS empresa_datos_legales (
      id                        INT PRIMARY KEY DEFAULT 1,
      razon_social              VARCHAR(255) NULL,
      rut                       VARCHAR(30)  NULL,
      domicilio                 VARCHAR(255) NULL,
      representante_legal       VARCHAR(255) NULL,
      representante_legal_rut   VARCHAR(30)  NULL,
      representante_legal_cargo VARCHAR(120) NULL,
      updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT chk_fila_unica CHECK (id = 1)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await centralDB.query(
    `INSERT INTO empresa_datos_legales (id, razon_social) VALUES (1, 'DSTAC CIBERSEGURIDAD')
       ON DUPLICATE KEY UPDATE id = id`
  )
  console.log('✓ empresa_datos_legales lista')

  console.log('› Creando tabla de contratos…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS contratos (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      numero              VARCHAR(30)  NOT NULL UNIQUE,
      company_id          INT          NOT NULL,
      cotizacion_id        INT          NULL,
      estado              ENUM('borrador','enviado','firmado_cliente','completado','rechazado') NOT NULL DEFAULT 'borrador',
      alcance              JSON         NULL,
      contenido_html       LONGTEXT     NULL,
      codigo_verificacion  VARCHAR(20)  NULL UNIQUE,
      hash_documento       VARCHAR(64)  NULL,
      firma_dstac          JSON         NULL,
      firma_cliente        JSON         NULL,
      created_by           INT          NULL,
      created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_company (company_id, created_at)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tabla contratos lista')
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
