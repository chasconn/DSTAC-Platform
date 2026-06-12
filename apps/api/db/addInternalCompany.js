// Agrega campo is_internal a companies, inserta empresa DSTAC y crea su BD operacional.
// Seguro correr más de una vez.
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')
const { createTenantDB } = require('./tenantMigrate')

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core',
  })

  // 1. Agregar columna is_internal si no existe
  console.log('→ Verificando columna is_internal en companies...')
  const [cols] = await conn.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'db_dstac_core' AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'is_internal'
  `)
  if (cols.length === 0) {
    await conn.query(`ALTER TABLE companies ADD COLUMN is_internal TINYINT(1) DEFAULT 0 AFTER status`)
  }
  console.log('   ✓ Columna is_internal OK')

  // 2. Obtener id del plan enterprise (o el mayor disponible como fallback)
  const [[planRow]] = await conn.query(`
    SELECT id FROM plans WHERE name = 'enterprise' LIMIT 1
  `)
  if (!planRow) {
    console.error('   ✗ No se encontró el plan enterprise. Ejecuta primero el seed de planes.')
    await conn.end()
    process.exit(1)
  }
  const planId = planRow.id

  // 3. Insertar empresa DSTAC interna
  console.log('→ Insertando empresa DSTAC interna...')
  await conn.query(`
    INSERT INTO companies
      (name, slug, plan_id, db_name, status, is_internal, theme_color, theme_light, theme_mid)
    VALUES (
      'DSTAC',
      'dstac',
      ?,
      'db_dstac_op_dstac',
      'active',
      1,
      '#26215C',
      '#EEEDFE',
      '#534AB7'
    )
    ON DUPLICATE KEY UPDATE
      is_internal   = 1,
      status        = 'active',
      plan_id       = VALUES(plan_id),
      db_name       = 'db_dstac_op_dstac',
      theme_color   = '#26215C'
  `, [planId])
  console.log('   ✓ Empresa DSTAC OK')

  await conn.end()

  // 4. Crear BD operacional db_dstac_op_dstac
  console.log('→ Creando BD operacional db_dstac_op_dstac...')
  try {
    await createTenantDB('dstac')
    console.log('   ✓ BD db_dstac_op_dstac creada OK')
  } catch (err) {
    if (err.message?.includes('already exists') || err.code === 'ER_DB_CREATE_EXISTS') {
      console.log('   ✓ BD db_dstac_op_dstac ya existía — sin cambios')
    } else {
      throw err
    }
  }

  console.log('\nMigración completada.')
}

run().catch(err => { console.error(err); process.exit(1) })
