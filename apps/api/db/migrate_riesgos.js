// Reemplaza la tabla riesgos (modelo ENUM antiguo, sin uso) por el modelo
// cuantitativo nuevo (probabilidad × impacto 1-5, columnas generadas) y crea
// riesgos_historial. Se aplica a TODAS las BD operacionales existentes.
// La tabla antigua está vacía, por lo que el DROP es seguro.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

const DDL_RIESGOS = `
  CREATE TABLE IF NOT EXISTS riesgos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria ENUM('tecnico','operacional','humano','externo','legal') NOT NULL,
    activo_id INT NULL,
    activo_nombre VARCHAR(200) NULL,
    amenaza VARCHAR(300) NOT NULL,
    vulnerabilidad VARCHAR(300),
    probabilidad INT NOT NULL,
    impacto INT NOT NULL,
    nivel_riesgo INT GENERATED ALWAYS AS (probabilidad * impacto) STORED,
    nivel_categoria VARCHAR(10) GENERATED ALWAYS AS (
      CASE
        WHEN (probabilidad * impacto) >= 20 THEN 'critico'
        WHEN (probabilidad * impacto) >= 15 THEN 'alto'
        WHEN (probabilidad * impacto) >= 6  THEN 'medio'
        ELSE 'bajo'
      END
    ) STORED,
    tipo_tratamiento ENUM('mitigar','aceptar','transferir','evitar') NULL,
    plan_tratamiento TEXT,
    responsable VARCHAR(200),
    fecha_limite DATE NULL,
    residual_probabilidad INT NULL,
    residual_impacto INT NULL,
    residual_nivel INT GENERATED ALWAYS AS (
      COALESCE(residual_probabilidad, probabilidad) * COALESCE(residual_impacto, impacto)
    ) STORED,
    estado ENUM('identificado','en_tratamiento','mitigado','aceptado','cerrado') DEFAULT 'identificado',
    incidente_id INT NULL,
    incidente_nombre VARCHAR(200) NULL,
    iso_control_ids JSON NULL,
    iso_evidencia_id INT NULL,
    notas_dstac TEXT,
    creado_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_estado (estado),
    INDEX idx_nivel (nivel_categoria),
    FOREIGN KEY (activo_id)    REFERENCES activos(id)    ON DELETE SET NULL,
    FOREIGN KEY (incidente_id) REFERENCES incidentes(id) ON DELETE SET NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`

const DDL_HISTORIAL = `
  CREATE TABLE IF NOT EXISTS riesgos_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    riesgo_id INT NOT NULL,
    user_id INT NOT NULL,
    campo_cambiado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    comentario TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (riesgo_id) REFERENCES riesgos(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })

  const [dbs] = await conn.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'db_dstac_op_%'`
  )
  console.log(`Encontradas ${dbs.length} BD operacionales`)

  for (const row of dbs) {
    const db = row.SCHEMA_NAME || row.schema_name
    console.log(`\n→ ${db}`)
    await conn.query(`USE \`${db}\``)
    // riesgos_historial referencia riesgos → borrar historial antes (si existiera)
    await conn.query('DROP TABLE IF EXISTS riesgos_historial')
    await conn.query('DROP TABLE IF EXISTS riesgos')
    await conn.query(DDL_RIESGOS)
    await conn.query(DDL_HISTORIAL)
    console.log('  ✓ riesgos + riesgos_historial recreadas')
  }

  await conn.end()
  console.log('\nMigración riesgos completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
