require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrateIso() {
  const conn = await mysql.createConnection({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           'db_dstac_core',
    multipleStatements: true
  })

  console.log('Creando tablas ISO 27001:2022 en db_dstac_core...')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_domains (
      id             VARCHAR(5)   PRIMARY KEY,
      name           VARCHAR(100) NOT NULL,
      description    TEXT,
      color          VARCHAR(7)   NOT NULL,
      order_num      INT          NOT NULL,
      total_controls INT          DEFAULT 0
    )
  `)
  console.log('  ✓ iso_domains')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_controls (
      id              VARCHAR(10)  PRIMARY KEY,
      domain_id       VARCHAR(5)   NOT NULL,
      name            VARCHAR(200) NOT NULL,
      description     TEXT         NOT NULL,
      purpose         TEXT,
      data_source     VARCHAR(100),
      checklist       JSON,
      policy_template TEXT,
      order_num       INT,
      FOREIGN KEY (domain_id) REFERENCES iso_domains(id)
    )
  `)
  console.log('  ✓ iso_controls')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_evaluations (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      company_id    INT          NOT NULL,
      evaluator_id  INT          NOT NULL,
      status        ENUM('borrador','activa','archivada') DEFAULT 'activa',
      score_total   DECIMAL(5,2) DEFAULT 0,
      gap_total     DECIMAL(5,2) DEFAULT 0,
      evaluated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id)   REFERENCES companies(id),
      FOREIGN KEY (evaluator_id) REFERENCES users(id)
    )
  `)
  console.log('  ✓ iso_evaluations')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_control_assessments (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id    INT          NOT NULL,
      control_id       VARCHAR(10)  NOT NULL,
      applies          TINYINT(1)   DEFAULT 1,
      non_apply_reason TEXT,
      status           ENUM('pendiente','parcial','implementado','no_aplica') DEFAULT 'pendiente',
      progress         INT          DEFAULT 0,
      checklist_items  JSON,
      policy_content   TEXT,
      notes_dstac      TEXT,
      updated_by       INT,
      updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id) ON DELETE CASCADE,
      FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
      FOREIGN KEY (updated_by)    REFERENCES users(id)
    )
  `)
  console.log('  ✓ iso_control_assessments')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_risks (
      id                   INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id        INT          NOT NULL,
      company_id           INT          NOT NULL,
      asset_id             INT,
      asset_name           VARCHAR(200) NOT NULL,
      threat               VARCHAR(200) NOT NULL,
      vulnerability        VARCHAR(200),
      probability          INT          NOT NULL,
      impact               INT          NOT NULL,
      risk_level           INT          GENERATED ALWAYS AS (probability * impact) STORED,
      risk_category        VARCHAR(20)  GENERATED ALWAYS AS (
        CASE
          WHEN (probability * impact) >= 20 THEN 'critico'
          WHEN (probability * impact) >= 12 THEN 'alto'
          WHEN (probability * impact) >= 6  THEN 'medio'
          ELSE 'bajo'
        END
      ) STORED,
      existing_controls    TEXT,
      residual_probability INT          DEFAULT NULL,
      residual_impact      INT          DEFAULT NULL,
      residual_risk        INT          GENERATED ALWAYS AS (
        COALESCE(residual_probability, probability) *
        COALESCE(residual_impact, impact)
      ) STORED,
      treatment            ENUM('mitigar','aceptar','transferir','evitar') DEFAULT 'mitigar',
      treatment_notes      TEXT,
      control_id           VARCHAR(10),
      status               ENUM('abierto','en_tratamiento','cerrado') DEFAULT 'abierto',
      created_by           INT          NOT NULL,
      created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
      FOREIGN KEY (company_id)    REFERENCES companies(id),
      FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
      FOREIGN KEY (created_by)    REFERENCES users(id)
    )
  `)
  console.log('  ✓ iso_risks')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_evidences (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id INT          NOT NULL,
      control_id    VARCHAR(10)  NOT NULL,
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
      FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
      FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
      FOREIGN KEY (company_id)    REFERENCES companies(id),
      FOREIGN KEY (uploaded_by)   REFERENCES users(id),
      FOREIGN KEY (reviewed_by)   REFERENCES users(id)
    )
  `)
  console.log('  ✓ iso_evidences')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_history (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id INT          NOT NULL,
      control_id    VARCHAR(10)  NULL,
      company_id    INT          NOT NULL,
      event_type    ENUM(
        'control_actualizado','evidencia_agregada','evidencia_aprobada',
        'evidencia_rechazada','comentario_agregado','estado_cambiado',
        'riesgo_agregado','riesgo_actualizado','politica_guardada',
        'evaluacion_creada'
      ) NOT NULL,
      user_id       INT          NOT NULL,
      previous_data JSON,
      new_data      JSON,
      comment       TEXT,
      created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
      FOREIGN KEY (company_id)    REFERENCES companies(id),
      FOREIGN KEY (user_id)       REFERENCES users(id)
    )
  `)
  console.log('  ✓ iso_history')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS iso_action_plans (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id   INT          NOT NULL,
      control_id      VARCHAR(10)  NOT NULL,
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
      FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
      FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
      FOREIGN KEY (company_id)    REFERENCES companies(id)
    )
  `)
  console.log('  ✓ iso_action_plans')

  console.log('\nMigración ISO 27001:2022 completada.')
  await conn.end()
}

migrateIso().catch(err => {
  console.error('Error en migración ISO:', err.message)
  process.exit(1)
})
