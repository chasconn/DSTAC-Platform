require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const bcrypt = require('bcrypt')
const centralDB = require('./central')

async function seed() {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
  const hash = await bcrypt.hash('Admin1234!', rounds)

  await centralDB.execute(`
    INSERT IGNORE INTO users (email, username, password_hash, role, status, first_name, last_name)
    VALUES (?, ?, ?, 'super_admin', 'active', 'Admin', 'DSTAC')
  `, ['admin@dstac.cl', 'admin', hash])

  console.log('Usuario creado: admin@dstac.cl / Admin1234!')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
