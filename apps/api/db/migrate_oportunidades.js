// Tablas del módulo Oportunidades (Mercado Público) en BD central db_dstac_core:
//   - oportunidades_licitaciones: licitaciones detectadas, puntuadas y su flujo de revisión interna
//   - oportunidades_keywords:     palabras clave / rubros usados para filtrar y puntuar
// Seguro correr más de una vez (CREATE TABLE IF NOT EXISTS).
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core',
  })

  console.log('Creando tabla oportunidades_licitaciones...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS oportunidades_licitaciones (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      codigo_externo      VARCHAR(60)  NOT NULL,
      nombre              VARCHAR(500) NOT NULL,
      organismo           VARCHAR(300) NULL,
      descripcion         TEXT         NULL,
      rubro1              VARCHAR(200) NULL,
      fecha_publicacion   DATETIME     NULL,
      fecha_cierre        DATETIME     NULL,
      monto_estimado      BIGINT       NULL,
      estado_mp           VARCHAR(60)  NULL,
      link_ficha          VARCHAR(500) NULL,
      score               INT          NOT NULL DEFAULT 0,
      keywords_matched    JSON         NULL,
      raw_json             JSON         NULL,
      estado_interno      ENUM('nueva','revisando','en_preparacion','postulada','descartada','no_adjudicada','adjudicada') NOT NULL DEFAULT 'nueva',
      asignado_a          INT          NULL,
      notas               TEXT         NULL,
      borrador_generado   TEXT         NULL,
      created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_codigo_externo (codigo_externo),
      INDEX idx_estado_interno (estado_interno),
      INDEX idx_score (score),
      INDEX idx_fecha_cierre (fecha_cierre),
      FOREIGN KEY (asignado_a) REFERENCES users(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ oportunidades_licitaciones')

  console.log('Creando tabla oportunidades_keywords...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS oportunidades_keywords (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      palabra     VARCHAR(150) NOT NULL,
      peso        INT          NOT NULL DEFAULT 10,
      activo      TINYINT(1)   NOT NULL DEFAULT 1,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_palabra (palabra)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ oportunidades_keywords')

  // Set inicial de palabras clave de ciberseguridad — el equipo puede editarlas desde la UI.
  const KEYWORDS_INICIALES = [
    ['ciberseguridad', 20], ['seguridad informatica', 20], ['seguridad de la informacion', 18],
    ['pentesting', 20], ['test de penetracion', 18], ['hacking etico', 18],
    ['auditoria de seguridad', 16], ['analisis de vulnerabilidades', 18], ['vulnerabilidades', 12],
    ['iso 27001', 16], ['iso 27000', 14], ['nist', 12], ['soc', 10],
    ['firewall', 10], ['antivirus', 8], ['edr', 10], ['siem', 14],
    ['phishing', 12], ['malware', 10], ['ransomware', 12],
    ['respuesta a incidentes', 16], ['continuidad operacional', 10], ['plan de recuperacion', 10],
    ['proteccion de datos', 14], ['ley 21.663', 18], ['ley 21663', 18],
    ['ley 21.719', 18], ['ley 21719', 18], ['ciberdefensa', 16],
    ['gestion de riesgos', 10], ['hardening', 12], ['monitoreo de seguridad', 14],
  ]
  for (const [palabra, peso] of KEYWORDS_INICIALES) {
    await conn.query(
      'INSERT IGNORE INTO oportunidades_keywords (palabra, peso) VALUES (?, ?)',
      [palabra, peso]
    )
  }
  console.log(`  ✓ ${KEYWORDS_INICIALES.length} palabras clave iniciales`)

  await conn.end()
  console.log('Migración oportunidades completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
