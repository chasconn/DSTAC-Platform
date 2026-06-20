// Módulo de Cotizaciones (BD central db_dstac_core):
//   - cotizaciones        : cabecera de la cotización (cliente, totales, estado)
//   - cotizacion_items    : líneas (servicio, detalle, tipo, cantidad, precio)
//   - cotizacion_catalogo : catálogo de servicios reutilizables (niveles N0-N3, 2A/2B, proyectos)
// Seguro correr más de una vez. Siembra el catálogo solo si está vacío.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

// [nombre, detalle, tipo, precio_sugerido (CLP, referencial), nivel, orden]
const SEED = [
  ['Diagnóstico de Postura de Seguridad', 'Evaluación de lectura de la postura de ciberseguridad (2–3 semanas), con informe y hoja de ruta. Precio según tamaño: PYME $790.000 · Mediana $1.200.000 · Grande desde $2.500.000.', 'unico', 1200000, 'N1', 1],
  ['Seguridad Gestionada Operacional', 'Monitoreo, gestión de incidentes, accesos y reportes mensuales. Cobertura L–V.', 'mensual', 450000, '2A', 2],
  ['Seguridad Estratégica / vCISO', 'Incluye Seguridad Gestionada (2A) + gobierno, acompañamiento ejecutivo y evaluaciones avanzadas.', 'mensual', 1200000, '2B', 3],
  ['Pentest / Auditoría de Seguridad', 'Prueba de penetración o auditoría técnica puntual, con informe de hallazgos y remediación.', 'unico', 1500000, 'N3', 4],
  ['Acompañamiento vCISO', 'Asesoría estratégica recurrente de un CISO virtual (gobierno, riesgo y cumplimiento).', 'mensual', 800000, '2B', 5],
  ['Segmentación de red', 'Proyecto puntual de segmentación y endurecimiento de la red.', 'unico', 2500000, 'proyecto', 6],
  ['Diseño de infraestructura segura', 'Diseño e implementación de arquitectura de TI con foco en seguridad.', 'unico', 3500000, 'proyecto', 7],
  ['Implementación de Active Directory', 'Despliegue y aseguramiento de Active Directory / gestión de identidades.', 'unico', 2500000, 'proyecto', 8],
  ['Capacitación en ciberseguridad', 'Capacitación y concientización para el equipo del cliente.', 'unico', 700000, 'transversal', 9],
  ['Autoevaluación ISO 27001 guiada', 'Acompañamiento en la autoevaluación ISO 27001 y plan de cierre de brechas.', 'unico', 2500000, 'N0', 10],
  ['Cumplimiento Ley Marco de Ciberseguridad (Ley 21.663)', 'Diagnóstico de brechas y plan de adecuación a la Ley Marco de Ciberseguridad.', 'unico', 3000000, 'GRC', 11],
  ['Gestión continua de vulnerabilidades (VMaaS)', 'Escaneo recurrente y seguimiento de remediación de vulnerabilidades.', 'mensual', 350000, '2A', 12],
  ['Simulación de phishing y concientización', 'Campañas periódicas de phishing simulado con métricas y reforzamiento.', 'mensual', 300000, 'transversal', 13],
  ['Respuesta a incidentes — retainer (DFIR)', 'Bolsa de horas y disponibilidad prioritaria para respuesta a incidentes.', 'mensual', 500000, '2A', 14],
  ['Endurecimiento de M365 / Google Workspace', 'Revisión y endurecimiento de la configuración de seguridad de la nube de productividad.', 'unico', 1500000, 'proyecto', 15],
  ['Gestión de EDR/XDR (endpoint)', 'Monitoreo y respuesta gestionada de endpoints (valor por equipo/mes).', 'mensual', 6000, '2A', 16],
  ['Auditoría de configuración cloud (CSPM)', 'Revisión de la postura de seguridad en AWS, Azure o GCP.', 'unico', 2500000, 'proyecto', 17],
  ['Plan de continuidad y recuperación (BCP/DRP)', 'Plan de continuidad del negocio y recuperación ante desastres, con pruebas de respaldo.', 'unico', 3500000, 'proyecto', 18],
  ['Red Team / ejercicio adversarial', 'Simulación de ataque real completo, superior al pentest, para clientes maduros.', 'unico', 6000000, 'N3', 19],
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
    for (const [nombre, detalle, tipo, precio, nivel, orden] of SEED) {
      await conn.query(
        'INSERT INTO cotizacion_catalogo (nombre, detalle, tipo, precio_sugerido, nivel, orden) VALUES (?,?,?,?,?,?)',
        [nombre, detalle, tipo, precio, nivel, orden]
      )
    }
    console.log(`  ✓ catálogo sembrado con ${SEED.length} servicios`)
  }

  await conn.end()
  console.log('Migración cotizaciones completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
