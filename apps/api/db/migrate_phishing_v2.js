// migrate_phishing_v2.js — agrega: reporte de correo sospechoso, mini-quiz
// post-clic, cargo/área (para el ranking) y campañas recurrentes. Idempotente.
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
  const DB = 'db_dstac_core'

  const destCols = [
    ['cargo', `VARCHAR(255) NULL AFTER nombre`],
    ['reportado_at', `DATETIME NULL AFTER clic_at`],
    ['quiz_respuestas', `JSON NULL AFTER reportado_at`],
    ['quiz_completado_at', `DATETIME NULL AFTER quiz_respuestas`],
  ]
  for (const [col, def] of destCols) {
    if (!await columnExists(conn, DB, 'phishing_destinatarios', col)) {
      await conn.query(`ALTER TABLE phishing_destinatarios ADD COLUMN ${col} ${def}`)
      console.log(`✓ phishing_destinatarios.${col} agregada`)
    }
  }

  const campCols = [
    ['recurrente', `TINYINT(1) NOT NULL DEFAULT 0 AFTER plantilla_id`],
    ['personal_ids', `JSON NULL AFTER recurrente`],
    ['proxima_ejecucion', `DATE NULL AFTER personal_ids`],
  ]
  for (const [col, def] of campCols) {
    if (!await columnExists(conn, DB, 'phishing_campanas', col)) {
      await conn.query(`ALTER TABLE phishing_campanas ADD COLUMN ${col} ${def}`)
      console.log(`✓ phishing_campanas.${col} agregada`)
    }
  }

  await conn.end()
  console.log('Migración phishing v2 completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
