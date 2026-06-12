require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrateNist() {
  const conn = await mysql.createConnection({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           'db_dstac_core',
    multipleStatements: true
  })

  console.log('Creando tablas NIST CSF en db_dstac_core...')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_functions (
      id          VARCHAR(2)   PRIMARY KEY,
      code        VARCHAR(20)  NOT NULL,
      name        VARCHAR(100) NOT NULL,
      description TEXT,
      color       VARCHAR(7)   NOT NULL,
      order_num   INT          NOT NULL
    )
  `)
  console.log('  ✓ nist_functions')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_categories (
      id          VARCHAR(10)  PRIMARY KEY,
      function_id VARCHAR(2)   NOT NULL,
      name        VARCHAR(100) NOT NULL,
      description TEXT,
      FOREIGN KEY (function_id) REFERENCES nist_functions(id)
    )
  `)
  console.log('  ✓ nist_categories')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_controls (
      id          VARCHAR(15)  PRIMARY KEY,
      category_id VARCHAR(10)  NOT NULL,
      name        VARCHAR(200) NOT NULL,
      description TEXT         NOT NULL,
      data_source VARCHAR(100),
      checklist   JSON,
      order_num   INT,
      FOREIGN KEY (category_id) REFERENCES nist_categories(id)
    )
  `)
  console.log('  ✓ nist_controls')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_evaluations (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      company_id   INT          NOT NULL,
      evaluator_id INT          NOT NULL,
      status       ENUM('borrador','activa','archivada') DEFAULT 'activa',
      score_total  DECIMAL(5,2) DEFAULT 0,
      evaluated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id)   REFERENCES companies(id),
      FOREIGN KEY (evaluator_id) REFERENCES users(id)
    )
  `)
  console.log('  ✓ nist_evaluations')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_control_assessments (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id   INT          NOT NULL,
      control_id      VARCHAR(15)  NOT NULL,
      status          ENUM('pendiente','parcial','implementado','no_aplica') DEFAULT 'pendiente',
      progress        INT          DEFAULT 0,
      current_value   INT          DEFAULT 0,
      max_value       INT          DEFAULT 0,
      checklist_items JSON,
      notes_dstac     TEXT,
      updated_by      INT,
      updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id) ON DELETE CASCADE,
      FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
      FOREIGN KEY (updated_by)    REFERENCES users(id)
    )
  `)
  console.log('  ✓ nist_control_assessments')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_evidences (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id INT          NOT NULL,
      control_id    VARCHAR(15)  NOT NULL,
      company_id    INT          NOT NULL,
      filename      VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_type     VARCHAR(50),
      file_size     INT,
      file_path     VARCHAR(500),
      status        ENUM('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
      uploaded_by   INT          NOT NULL,
      reviewed_by   INT,
      reviewed_at   TIMESTAMP    NULL,
      comments      TEXT,
      expires_at    DATE         NULL,
      created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id),
      FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
      FOREIGN KEY (company_id)    REFERENCES companies(id),
      FOREIGN KEY (uploaded_by)   REFERENCES users(id),
      FOREIGN KEY (reviewed_by)   REFERENCES users(id)
    )
  `)
  console.log('  ✓ nist_evidences')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_history (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id INT          NOT NULL,
      control_id    VARCHAR(15)  NULL,
      company_id    INT          NOT NULL,
      event_type    ENUM(
        'control_actualizado','evidencia_agregada','evidencia_aprobada',
        'evidencia_rechazada','comentario_agregado','estado_cambiado',
        'evaluacion_creada'
      ) NOT NULL,
      user_id       INT          NOT NULL,
      previous_data JSON,
      new_data      JSON,
      comment       TEXT,
      created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id),
      FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
      FOREIGN KEY (company_id)    REFERENCES companies(id),
      FOREIGN KEY (user_id)       REFERENCES users(id)
    )
  `)
  console.log('  ✓ nist_history')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_action_plans (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id   INT          NOT NULL,
      control_id      VARCHAR(15)  NOT NULL,
      company_id      INT          NOT NULL,
      priority        ENUM('critica','alta','media','baja') DEFAULT 'media',
      status          ENUM('pendiente','en_progreso','completada','cancelada') DEFAULT 'pendiente',
      responsible     VARCHAR(200),
      due_date        DATE,
      action          TEXT         NOT NULL,
      evidence_needed TEXT,
      comment_dstac   TEXT,
      created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id),
      FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
      FOREIGN KEY (company_id)    REFERENCES companies(id)
    )
  `)
  console.log('  ✓ nist_action_plans')

  console.log('\nMigración NIST completada.')
  await conn.end()
}

migrateNist().catch(err => {
  console.error('Error en migración NIST:', err.message)
  process.exit(1)
})
