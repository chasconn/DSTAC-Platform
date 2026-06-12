require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const bcrypt = require('bcrypt')
const centralDB = require('./central')

async function seed() {
  // Buscar la primera empresa activa disponible
  const [companies] = await centralDB.execute(
    "SELECT id, name, slug FROM companies WHERE status = 'active' ORDER BY id ASC LIMIT 1"
  )

  if (companies.length === 0) {
    console.error('No hay empresas activas. Crea una primero desde el módulo Clientes.')
    process.exit(1)
  }

  const company = companies[0]
  console.log(`Usando empresa: ${company.name} (${company.slug})`)

  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
  const hash = await bcrypt.hash('Cliente2026!', rounds)

  const email = `cliente@${company.slug}.cl`

  await centralDB.execute(`
    INSERT INTO users
      (company_id, email, username, password_hash, role, status, first_name, last_name)
    VALUES (?, ?, ?, ?, 'cliente_admin', 'active', 'Jorge', 'Rojas')
    ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      status = 'active'
  `, [company.id, email, `cliente_${company.slug}`, hash])

  console.log('─────────────────────────────────────')
  console.log('Usuario cliente creado:')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: Cliente2026!`)
  console.log(`  Rol:      cliente_admin`)
  console.log(`  Empresa:  ${company.name}`)
  console.log('─────────────────────────────────────')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
