require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true  // Solo para scripts DDL manuales — nunca reutilizar esta conexión con input de usuario
  })

  console.log('Creando BD central y tablas...')

  await conn.query(`CREATE DATABASE IF NOT EXISTS db_dstac_core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.query(`USE db_dstac_core`)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      modules JSON NOT NULL,
      max_users INT DEFAULT 5,
      price_monthly INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      plan_id INT NOT NULL,
      db_name VARCHAR(100) NOT NULL,
      status ENUM('active','suspended','setup','cancelled') DEFAULT 'setup',
      is_internal TINYINT(1) DEFAULT 0,
      theme_color VARCHAR(7) DEFAULT '#3C3489',
      theme_light VARCHAR(7) DEFAULT '#EEEDFE',
      theme_mid VARCHAR(7) DEFAULT '#534AB7',
      billing_email VARCHAR(200),
      contact_phone VARCHAR(50),
      max_users INT DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT,
      email VARCHAR(200) NOT NULL UNIQUE,
      username VARCHAR(100) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      must_change_password TINYINT(1) DEFAULT 0,
      temp_password_expires_at TIMESTAMP NULL,
      role ENUM('super_admin','admin_dstac','analista_dstac','consultor_dstac','cliente_admin','cliente_lectura') NOT NULL,
      status ENUM('active','inactive','blocked','suspended') DEFAULT 'active',
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      mfa_enabled BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mfa_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT NOT NULL,
      company_id INT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS pending_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      priority ENUM('critical','high','medium','low') NOT NULL,
      status ENUM('pending','in_progress','done','cancelled') DEFAULT 'pending',
      due_date DATE,
      assigned_to INT,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS dashboard_layouts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      widgets_config JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Insertar planes base si no existen
  const { PLAN_MODULES } = require('../../../shared/plans')
  await conn.query(`
    INSERT IGNORE INTO plans (id, name, display_name, modules, max_users, price_monthly) VALUES
    (1, 'pyme', 'PYME', ?, 5, 0),
    (2, 'profesional', 'Profesional', ?, 15, 0),
    (3, 'enterprise', 'Enterprise', ?, 999, 0)
  `, [
    JSON.stringify(PLAN_MODULES.pyme),
    JSON.stringify(PLAN_MODULES.profesional),
    JSON.stringify(PLAN_MODULES.enterprise)
  ])

  console.log('Migracion completada.')
  await conn.end()
}

migrate().catch(err => {
  console.error('Error en migracion:', err)
  process.exit(1)
})
