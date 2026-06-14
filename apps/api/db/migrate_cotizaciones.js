// Módulo de Cotizaciones (BD central db_dstac_core):
//   - cotizaciones        : cabecera de la cotización (cliente, totales, estado)
//   - cotizacion_items    : líneas (servicio, detalle, tipo, cantidad, precio)
//   - cotizacion_catalogo : catálogo de servicios reutilizables (niveles N0-N3, 2A/2B, proyectos)
// Seguro correr más de una vez. Siembra el catálogo solo si está vacío.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

const SEED = [
  ['Diagnóstico de Postura de Seguridad', 'Evaluación de lectura de la postura de ciberseguridad (2–3 semanas), con informe y hoja de ruta.', 'unico', 'N1', 1],
  ['Seguridad Gestionada Operacional', 'Monitoreo, gestión de incidentes, accesos y reportes mensuales. Cobertura L–V.', 'mensual', '2A', 2],
  ['Seguridad Estratégica / vCISO', 'Incluye Seguridad Gestionada (2A) + gobierno, acompañamiento ejecutivo y evaluaciones avanzadas.', 'mensual', '2B', 3],
  ['Pentest / Auditoría de Seguridad', 'Prueba de penetración o auditoría técnica puntual, con informe de hallazgos y remediación.', 'unico', 'N3', 4],
  ['Acompañamiento vCISO', 'Asesoría estratégica recurrente de un CISO virtual (gobierno, riesgo y cumplimiento).', 'mensual', '2B', 5],
  ['Segmentación de red', 'Proyecto puntual de segmentación y endurecimiento de la red.', 'unico', 'proyecto', 6],
  ['Diseño de infraestructura segura', 'Diseño e implementación de arquitectura de TI con foco en seguridad.', 'unico', 'proyecto', 7],
  ['Implementación de Active Directory', 'Despliegue y aseguramiento de Active Directory / gestión de identidades.', 'unico', 'proyecto', 8],
  ['Capacitación en ciberseguridad', 'Capacitación y concientización para el equipo del cliente.', 'unico', 'transversal', 9],
  ['Autoevaluación ISO 27001 guiada', 'Acompañamiento en la autoevaluación ISO 27001 y plan de cierre de brechas.', 'unico', 'N0', 10],
]

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: 'db_dstac_core',
  })

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cotizaciones (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      numero           VARCHAR(30) NOT NULL UNIQUE,
      estado           ENUM('borrador','enviada','aceptada','rechazada','vencida') NOT NULL DEFAULT 'borrador',
      company_id       INT NULL,
      lead_id          INT NULL,
      cliente_empresa  VARCHAR(255) NULL,
      cliente_rut      VARCHAR(30)  NULL,
      cliente_contacto VARCHAR(255) NULL,
      cliente_email    VARCHAR(255) NULL,
      cliente_telefono VARCHAR(60)  NULL,
      fecha            DATE NOT NULL,
      validez_dias     INT NOT NULL DEFAULT 15,
      forma_pago       VARCHAR(255) NULL,
      plazo_ejecucion  VARCHAR(255) NULL,
      notas            TEXT NULL,
      neto             INT NOT NULL DEFAULT 0,
      iva              INT NOT NULL DEFAULT 0,
      total            INT NOT NULL DEFAULT 0,
      created_by       INT NULL,
      created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_estado (estado),
      INDEX idx_company (company_id),
      INDEX idx_created (created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cotizacion_items (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      cotizacion_id   INT NOT NULL,
      servicio        VARCHAR(255) NOT NULL,
      detalle         TEXT NULL,
      tipo            ENUM('unico','mensual') NOT NULL DEFAULT 'unico',
      cantidad        INT NOT NULL DEFAULT 1,
      precio_unitario INT NOT NULL DEFAULT 0,
      orden           INT NOT NULL DEFAULT 0,
      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cotizacion_catalogo (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      nombre          VARCHAR(255) NOT NULL,
      detalle         TEXT NULL,
      tipo            ENUM('unico','mensual') NOT NULL DEFAULT 'unico',
      precio_sugerido INT NULL,
      nivel           VARCHAR(20) NULL,
      activo          TINYINT(1) NOT NULL DEFAULT 1,
      orden           INT NOT NULL DEFAULT 0
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)

  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM cotizacion_catalogo')
  if (n === 0) {
    for (const [nombre, detalle, tipo, nivel, orden] of SEED) {
      await conn.query(
        'INSERT INTO cotizacion_catalogo (nombre, detalle, tipo, nivel, orden) VALUES (?,?,?,?,?)',
        [nombre, detalle, tipo, nivel, orden]
      )
    }
    console.log(`  ✓ catálogo sembrado con ${SEED.length} servicios`)
  }

  await conn.end()
  console.log('Migración cotizaciones completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
