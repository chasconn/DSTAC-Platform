// Tabla de prospectos (leads) en la BD central — captados por el funnel público
// (scanner web + autodiagnóstico). Seguro correr más de una vez.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core',
  })

  console.log('Creando tabla leads...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tipo            ENUM('web_scan','cuestionario') NOT NULL,
      empresa         VARCHAR(255) NULL,
      contacto_nombre VARCHAR(255) NULL,
      email           VARCHAR(255) NULL,
      telefono        VARCHAR(60)  NULL,
      dominio         VARCHAR(255) NULL,
      score           INT          NULL,
      grade           VARCHAR(10)  NULL,
      risk            VARCHAR(30)  NULL,
      data            JSON         NULL,
      estado          ENUM('nuevo','contactado','convertido','descartado') NOT NULL DEFAULT 'nuevo',
      company_id      INT          NULL,
      ip              VARCHAR(64)  NULL,
      user_agent      VARCHAR(255) NULL,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tipo (tipo),
      INDEX idx_estado (estado),
      INDEX idx_created (created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ leads')

  await conn.end()
  console.log('Migración leads completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
