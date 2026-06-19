// Agrega el descuento a la cabecera de cotizaciones — seguro correr más de una vez.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function columnExists(conn, db, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, column]
  )
  return rows.length > 0
}

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: 'db_dstac_core',
  })

  if (!await columnExists(conn, 'db_dstac_core', 'cotizaciones', 'descuento_tipo')) {
    await conn.query(`ALTER TABLE cotizaciones ADD COLUMN descuento_tipo ENUM('porcentaje','monto') NULL AFTER notas`)
  }
  if (!await columnExists(conn, 'db_dstac_core', 'cotizaciones', 'descuento_valor')) {
    await conn.query(`ALTER TABLE cotizaciones ADD COLUMN descuento_valor INT NOT NULL DEFAULT 0 AFTER descuento_tipo`)
  }
  if (!await columnExists(conn, 'db_dstac_core', 'cotizaciones', 'descuento_motivo')) {
    await conn.query(`ALTER TABLE cotizaciones ADD COLUMN descuento_motivo VARCHAR(255) NULL AFTER descuento_valor`)
  }

  await conn.end()
  console.log('Migración descuento de cotizaciones completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
