// Agrega deduplicación de alertas repetidas a edr_alerts — seguro correr más de una vez.
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

  if (!await columnExists(conn, 'db_dstac_core', 'edr_alerts', 'count')) {
    await conn.query(`ALTER TABLE edr_alerts ADD COLUMN count INT NOT NULL DEFAULT 1 AFTER raw`)
  }
  if (!await columnExists(conn, 'db_dstac_core', 'edr_alerts', 'last_seen')) {
    await conn.query(`ALTER TABLE edr_alerts ADD COLUMN last_seen DATETIME NULL AFTER count`)
    await conn.query(`UPDATE edr_alerts SET last_seen = created_at WHERE last_seen IS NULL`)
  }

  await conn.end()
  console.log('Migración de deduplicación EDR completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
