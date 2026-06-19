// migrate_gastos.js — registro interno de gastos de DSTAC (no es por cliente).
// Idempotente. Correr en el contenedor api:
//   node apps/api/db/migrate_gastos.js
const centralDB = require('./central')

async function main() {
  console.log('› Creando tabla de gastos…')
  await centralDB.query(`
    CREATE TABLE IF NOT EXISTS gastos (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      fecha         DATE          NOT NULL,
      monto         DECIMAL(12,2) NOT NULL,
      categoria     VARCHAR(60)   NOT NULL,
      proveedor     VARCHAR(150)  NULL,
      descripcion   VARCHAR(255)  NULL,
      metodo_pago   ENUM('transferencia','tarjeta_empresa','tarjeta_personal','efectivo','otro') NOT NULL DEFAULT 'transferencia',
      realizado_por INT           NULL,
      pagado_por    INT           NULL,
      comprobante   VARCHAR(100)  NULL,
      notas         TEXT          NULL,
      created_by    INT           NULL,
      created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_fecha (fecha),
      KEY idx_categoria (categoria),
      FOREIGN KEY (realizado_por) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (pagado_por)    REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by)    REFERENCES users(id) ON DELETE SET NULL
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('✓ Tabla gastos lista')
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
