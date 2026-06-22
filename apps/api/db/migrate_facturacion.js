// Módulo de Facturación (BD central db_dstac_core):
//   - facturas       : cabecera de la factura/boleta emitida a una empresa cliente
//   - factura_items  : líneas de la factura
// Registro interno de facturación. La emisión real del DTE ante el SII se hace
// a través de un microservicio externo (ver apps/dte/README.md) — campos
// folio/track_id/estado_sii quedan NULL hasta que esa emisión se conecte.
// Seguro correr más de una vez.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_CENTRAL || 'db_dstac_core',
  })

  await conn.query(`
    CREATE TABLE IF NOT EXISTS facturas (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      numero            VARCHAR(30) NOT NULL UNIQUE,
      company_id        INT NOT NULL,
      tipo_dte          ENUM('33','39','61','56') NOT NULL DEFAULT '33',
      estado            ENUM('borrador','emitida','timbrada','pagada','anulada','rechazada') NOT NULL DEFAULT 'borrador',
      fecha_emision     DATE NOT NULL,
      fecha_vencimiento DATE NULL,
      fecha_pago        DATE NULL,
      glosa             VARCHAR(255) NULL,
      neto              INT NOT NULL DEFAULT 0,
      iva               INT NOT NULL DEFAULT 0,
      total             INT NOT NULL DEFAULT 0,
      folio             INT NULL,
      track_id          VARCHAR(50) NULL,
      estado_sii        VARCHAR(50) NULL,
      pdf_url           VARCHAR(500) NULL,
      notas             TEXT NULL,
      created_by        INT NULL,
      created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_estado (estado),
      INDEX idx_company (company_id),
      INDEX idx_fecha (fecha_emision),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS factura_items (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      factura_id      INT NOT NULL,
      descripcion     VARCHAR(255) NOT NULL,
      cantidad        INT NOT NULL DEFAULT 1,
      precio_unitario INT NOT NULL DEFAULT 0,
      orden           INT NOT NULL DEFAULT 0,
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)

  await conn.end()
  console.log('Migración facturación completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
