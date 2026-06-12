// Script maestro de setup — corre todo en orden para un entorno nuevo o para reinicializar.
// Seguro correr más de una vez (idempotente).
// Uso: node apps/api/db/setup.js [--demo]
//   --demo  : carga también los datos de demo y crea usuario cliente
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })

const { execSync } = require('child_process')
const path = require('path')

const DB_DIR = __dirname
const FLAG_DEMO = process.argv.includes('--demo')

function run(script, desc) {
  console.log(`\n▶ ${desc}`)
  execSync(`node "${path.join(DB_DIR, script)}"`, { stdio: 'inherit' })
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('   DSTAC Platform — Setup inicial')
  console.log('═══════════════════════════════════════')

  run('migrate.js',           '1/5  BD central + tablas base (plans, companies, users, sessions…)')
  run('alter.js',             '2/5  Columnas extras (companies + users: must_change_password, temp_password_expires_at, suspended)')
  run('addInternalCompany.js','3/5  Empresa DSTAC interna (is_internal=1)')
  run('addClientTables.js',   '4/5  security_scores en tenants + dashboard_layouts')
  run('alterTenant.js',       '5/5  Migraciones de tenants existentes')

  if (FLAG_DEMO) {
    console.log('\n── Datos de demo ──────────────────────')
    run('seedDemoData.js',   'Demo  Datos de demo en el primer tenant activo')
    run('seedClientUser.js', 'Demo  Usuario cliente de demo')
  }

  console.log('\n═══════════════════════════════════════')
  console.log('   Setup completado ✓')
  if (FLAG_DEMO) {
    console.log('\n   Credenciales del cliente demo:')
    console.log('     Email:    cliente@{slug}.cl')
    console.log('     Password: Cliente2026!')
    console.log('     Rol:      cliente_admin')
  }
  console.log('═══════════════════════════════════════\n')
}

main().catch(err => { console.error('\n✗ Error en setup:', err.message); process.exit(1) })
