// Agrega columnas faltantes a tablas existentes — seguro correr más de una vez
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

async function alter() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core'
  })

  if (!await columnExists(conn, 'db_dstac_core', 'companies', 'contact_phone')) {
    await conn.query(`ALTER TABLE companies ADD COLUMN contact_phone VARCHAR(50) NULL AFTER billing_email`)
  }

  if (!await columnExists(conn, 'db_dstac_core', 'companies', 'updated_at')) {
    await conn.query(`ALTER TABLE companies ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`)
  }

  if (!await columnExists(conn, 'db_dstac_core', 'users', 'must_change_password')) {
    await conn.query(`ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 0 AFTER password_hash`)
  }

  if (!await columnExists(conn, 'db_dstac_core', 'users', 'temp_password_expires_at')) {
    await conn.query(`ALTER TABLE users ADD COLUMN temp_password_expires_at TIMESTAMP NULL AFTER must_change_password`)
  }

  await conn.query(`ALTER TABLE users MODIFY COLUMN status ENUM('active','inactive','blocked','suspended') DEFAULT 'active'`)

  if (!await columnExists(conn, 'db_dstac_core', 'users', 'updated_at')) {
    await conn.query(`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`)
  }

  console.log('Alter completado.')
  await conn.end()
}

alter().catch(err => { console.error(err); process.exit(1) })
