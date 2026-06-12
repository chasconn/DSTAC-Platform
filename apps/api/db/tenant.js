const mysql = require('mysql2/promise')

// Cache de pools activos — evita reconectar en cada request
const tenantPools = {}

async function getTenantDB(companySlug) {
  if (tenantPools[companySlug]) {
    return tenantPools[companySlug]
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: `db_dstac_op_${companySlug.replace(/-/g, '_')}`,
    waitForConnections: true,
    connectionLimit: 5,   // Bajo por límites de Planet Hosting
    queueLimit: 0
  })

  tenantPools[companySlug] = pool
  return pool
}

// Liberar pool de un tenant (para cuando se suspende una empresa)
function releaseTenantDB(companySlug) {
  if (tenantPools[companySlug]) {
    tenantPools[companySlug].end()
    delete tenantPools[companySlug]
  }
}

module.exports = { getTenantDB, releaseTenantDB }
