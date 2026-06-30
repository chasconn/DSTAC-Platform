// cleanup_edr_broadcast_rows.js — borra de edr_network_devices las filas
// basura (broadcast/multicast) que quedaron registradas antes de que el
// network-scan empezara a filtrarlas. Ejecutar una sola vez tras desplegar
// el fix de los scripts de descubrimiento. Idempotente (no falla si ya no
// quedan filas que coincidan).
const centralDB = require('./central')

async function main() {
  console.log('› Buscando filas broadcast/multicast en edr_network_devices…')

  const [rows] = await centralDB.query(`
    SELECT id, company_id, mac, ip FROM edr_network_devices
    WHERE ip LIKE '%.255'
       OR SUBSTRING_INDEX(ip, '.', 1) BETWEEN 224 AND 239
       OR mac LIKE '01:00:5E:%'
       OR mac LIKE '33:33:%'
       OR mac = 'FF:FF:FF:FF:FF:FF'
  `)

  if (rows.length === 0) {
    console.log('✓ No hay filas basura que limpiar')
    process.exit(0)
  }

  console.log(`› Eliminando ${rows.length} fila(s):`)
  rows.forEach(r => console.log(`  - company_id=${r.company_id} mac=${r.mac} ip=${r.ip}`))

  const [result] = await centralDB.query(`
    DELETE FROM edr_network_devices
    WHERE ip LIKE '%.255'
       OR SUBSTRING_INDEX(ip, '.', 1) BETWEEN 224 AND 239
       OR mac LIKE '01:00:5E:%'
       OR mac LIKE '33:33:%'
       OR mac = 'FF:FF:FF:FF:FF:FF'
  `)

  console.log(`✓ ${result.affectedRows} fila(s) eliminada(s)`)
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
