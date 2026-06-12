// Aplica migraciones pendientes a todas las BDs operacionales de los tenants.
// Seguro correr más de una vez.
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

async function alterTenants() {
  // Conectar a la BD central para obtener la lista de empresas
  const central = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core',
  })

  const [companies] = await central.query('SELECT slug, db_name FROM companies')
  await central.end()

  if (companies.length === 0) {
    console.log('No hay empresas registradas.')
    return
  }

  console.log(`Migrando ${companies.length} tenant(s)...\n`)

  for (const { slug, db_name } of companies) {
    console.log(`→ ${db_name} (${slug})`)

    const conn = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: db_name,
    })

    try {
      // ── identidades: columna notas ────────────────────────────────────────
      if (!await columnExists(conn, db_name, 'identidades', 'notas')) {
        await conn.query(`ALTER TABLE identidades ADD COLUMN notas TEXT NULL AFTER fecha_expiracion`)
      }

      // ── identidades: agregar 'grupo' al ENUM tipo_identidad ───────────────
      // MODIFY reemplaza el ENUM completo — siempre incluir todos los valores
      await conn.query(`
        ALTER TABLE identidades
        MODIFY COLUMN tipo_identidad
          ENUM('usuario','cuenta_servicio','api_key','certificado','grupo','otro')
      `)

      // ── identidades: agregar 'pendiente' al ENUM estado ───────────────────
      await conn.query(`
        ALTER TABLE identidades
        MODIFY COLUMN estado
          ENUM('activa','inactiva','comprometida','expirada','pendiente')
          DEFAULT 'activa'
      `)

      console.log(`   ✓ identidades OK`)

      // ── accesos: agregar 'otro' a entorno y nivel_acceso ──────────────────
      await conn.query(`
        ALTER TABLE accesos
        MODIFY COLUMN entorno
          ENUM('produccion','desarrollo','testing','staging','otro')
      `)

      await conn.query(`
        ALTER TABLE accesos
        MODIFY COLUMN nivel_acceso
          ENUM('lectura','escritura','administrador','root','otro') NOT NULL
      `)

      // ── accesos: agregar 'pendiente_revision' al ENUM estado ─────────────
      await conn.query(`
        ALTER TABLE accesos
        MODIFY COLUMN estado
          ENUM('activo','inactivo','suspendido','expirado','pendiente_revision')
          DEFAULT 'activo'
      `)

      console.log(`   ✓ accesos OK`)
    } catch (err) {
      console.error(`   ✗ Error en ${db_name}:`, err.message)
    }

    await conn.end()
  }

  console.log('\nMigración completada.')
}

alterTenants().catch(err => { console.error(err); process.exit(1) })
