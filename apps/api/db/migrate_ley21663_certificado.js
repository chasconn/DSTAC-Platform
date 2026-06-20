const centralDB = require('./central')
async function main() {
  console.log('› Agregando columnas de certificado a ley21663_evaluaciones…')
  const [cols] = await centralDB.query(`SHOW COLUMNS FROM ley21663_evaluaciones LIKE 'certificado_codigo'`)
  if (cols.length === 0) {
    await centralDB.query(`
      ALTER TABLE ley21663_evaluaciones
        ADD COLUMN certificado_codigo VARCHAR(20) NULL UNIQUE,
        ADD COLUMN certificado_emitido_at DATETIME NULL
    `)
    console.log('✓ Columnas agregadas')
  } else {
    console.log('✓ Columnas ya existían, nada que hacer')
  }
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
