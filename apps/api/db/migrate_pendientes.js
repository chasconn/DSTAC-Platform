// Tablas del módulo Pendientes expandido (BD central db_dstac_core):
//   - calendario_eventos: agenda interna de DSTAC (eventos opcionalmente ligados a una empresa)
//   - activity_log:       bitácora de actividad de TODO el sistema
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

  console.log('Creando tabla calendario_eventos...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS calendario_eventos (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      titulo       VARCHAR(255) NOT NULL,
      descripcion  TEXT         NULL,
      fecha        DATE         NOT NULL,
      hora_inicio  TIME         NULL,
      hora_fin     TIME         NULL,
      todo_el_dia  TINYINT(1)   NOT NULL DEFAULT 0,
      tipo         ENUM('reunion','tarea','recordatorio','auditoria','vencimiento','otro') NOT NULL DEFAULT 'otro',
      company_id   INT          NULL,
      created_by   INT          NULL,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_fecha   (fecha),
      INDEX idx_company (company_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ calendario_eventos')

  console.log('Creando tabla activity_log...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id      INT          NULL,
      usuario_nombre  VARCHAR(255) NULL,
      accion          ENUM('crear','editar','eliminar','login','exportar','otro') NOT NULL DEFAULT 'otro',
      modulo          VARCHAR(60)  NOT NULL,
      descripcion     VARCHAR(500) NULL,
      entidad_id      INT          NULL,
      company_id      INT          NULL,
      company_nombre  VARCHAR(255) NULL,
      metadata        JSON         NULL,
      ip              VARCHAR(64)  NULL,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_modulo  (modulo),
      INDEX idx_accion  (accion),
      INDEX idx_usuario (usuario_id),
      INDEX idx_created (created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ activity_log')

  await conn.end()
  console.log('Migración pendientes completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
