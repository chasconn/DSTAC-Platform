// Carga datos de demo en la BD operacional de la primera empresa activa
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')
const { slugToDbName } = require('./tenantMigrate')

async function seed() {
  const central = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core'
  })

  const [companies] = await central.execute(
    "SELECT id, name, slug FROM companies WHERE status = 'active' ORDER BY id ASC LIMIT 1"
  )
  await central.end()

  if (companies.length === 0) {
    console.error('No hay empresas activas.')
    process.exit(1)
  }

  const { name, slug } = companies[0]
  const dbName = slugToDbName(slug)
  console.log(`Cargando demo en: ${name} → ${dbName}`)

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName
  })

  // Crear tabla security_scores si no existe
  await db.query(`
    CREATE TABLE IF NOT EXISTS security_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      score INT NOT NULL,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Personal — borrar seeds por nombre antes de reinsertar (preserva registros manuales)
  await db.query(`DELETE FROM personal WHERE nombre IN ('Juan Pérez','Ana González','Carlos Ruiz','Roberto Morales')`)
  await db.query(`
    INSERT INTO personal (nombre, rol_empresarial, nivel_responsabilidad, estado, correo) VALUES
    ('Juan Pérez',      'Jefe de TI',            'alto',  'activo',       'jperez@empresa.cl'),
    ('Ana González',    'Administradora de BD',   'alto',  'activo',       'agonzalez@empresa.cl'),
    ('Carlos Ruiz',     'Ingeniero de Redes',     'medio', 'activo',       'cruiz@empresa.cl'),
    ('Roberto Morales', 'Ex-Jefe de Sistemas',    'alto',  'desvinculado', 'rmorales@empresa.cl')
  `)

  // Activos — borrar seeds por nombre antes de reinsertar
  await db.query(`DELETE FROM activos WHERE nombre IN ('Servidor Web Principal','MySQL Producción','VPN Corporativa','CRM interno','Firewall perimetral')`)
  await db.query(`
    INSERT INTO activos (tipo, nombre, proveedor, estado, criticidad, ambiente) VALUES
    ('Servidor',      'Servidor Web Principal', 'AWS',      'operativo', 'critica', 'produccion'),
    ('Base de datos', 'MySQL Producción',       'RDS',      'operativo', 'critica', 'produccion'),
    ('Red',           'VPN Corporativa',        'Fortinet', 'degradado', 'alta',    'produccion'),
    ('Aplicación',    'CRM interno',            'SaaS',     'operativo', 'alta',    'produccion'),
    ('Red',           'Firewall perimetral',    'Cisco',    'operativo', 'critica', 'produccion')
  `)

  // Identidades — borrar seeds por identidad antes de reinsertar
  await db.query(`DELETE FROM identidades WHERE identidad IN ('jperez@empresa.cl','pk_live_***4a2f','*.empresa.cl','rmorales@empresa.cl')`)
  await db.query(`
    INSERT INTO identidades (nombre, identidad, tipo_identidad, estado, propietario_id) VALUES
    ('Juan Pérez',     'jperez@empresa.cl',   'usuario',     'activa',       1),
    ('API producción', 'pk_live_***4a2f',     'api_key',     'activa',       1),
    ('Cert. SSL',      '*.empresa.cl',        'certificado', 'expirada',     2),
    ('Ex-empleado',    'rmorales@empresa.cl', 'usuario',     'comprometida', 4)
  `)

  // Incidentes — truncar y reinsertar para evitar duplicados
  await db.query('DELETE FROM incidentes')
  await db.query(`
    INSERT INTO incidentes (tipo, estado, severidad, descripcion, fecha_deteccion) VALUES
    ('Acceso no autorizado', 'abierto',           'critica', 'Acceso VPN no autorizado detectado',       NOW()),
    ('Phishing',             'en_investigacion',  'alta',    'Campaña phishing en correos corporativos', NOW()),
    ('Malware',              'cerrado',           'media',   'Malware aislado en servidor de archivos',  DATE_SUB(NOW(), INTERVAL 5 DAY))
  `)

  // NIST scores — reemplazar con INSERT ... ON DUPLICATE no aplica sin UNIQUE; borrar y reinsertar
  await db.query('DELETE FROM nist_scores')
  await db.query(`
    INSERT INTO nist_scores (funcion, porcentaje, notas, fecha_evaluacion, evaluado_por) VALUES
    ('identificar', 80, 'Inventario completo documentado',                  CURDATE(), 'Ana Martínez - DSTAC'),
    ('proteger',    65, 'Controles de acceso implementados, MFA pendiente', CURDATE(), 'Ana Martínez - DSTAC'),
    ('detectar',    55, 'Monitoreo básico activo',                          CURDATE(), 'Ana Martínez - DSTAC'),
    ('responder',   40, 'Plan de respuesta en borrador',                    CURDATE(), 'Ana Martínez - DSTAC'),
    ('recuperar',   30, 'BCP no formalizado',                               CURDATE(), 'Ana Martínez - DSTAC')
  `)

  // Security score manual — siempre dejar solo la entrada más reciente
  await db.query('DELETE FROM security_scores')
  await db.query(
    'INSERT INTO security_scores (score, fecha) VALUES (?, CURDATE())',
    [74]
  )

  await db.end()
  console.log('✓ Datos de demo cargados correctamente')
  console.log(`\nResumen:`)
  console.log('  4 personas, 5 activos, 4 identidades, 3 incidentes')
  console.log('  NIST: 80/65/55/40/30 → Score: 74')
}

seed().catch(err => { console.error(err); process.exit(1) })
