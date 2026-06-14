const mysql = require('mysql2/promise')

// Slug solo letras minúsculas, números y guiones — nunca se interpola directamente en queries
const VALID_SLUG = /^[a-z0-9-]+$/

function slugToDbName(slug) {
  return `db_dstac_op_${slug.replace(/-/g, '_')}`
}

async function createTenantDB(slug) {
  if (!VALID_SLUG.test(slug)) {
    throw new Error(`Slug inválido: ${slug}`)
  }

  const dbName = slugToDbName(slug)

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // multipleStatements NO — cada tabla se crea en su propia query
  })

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.query(`USE \`${dbName}\``)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS personal (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(200) NOT NULL,
      rol_empresarial VARCHAR(200),
      nivel_responsabilidad ENUM('alto','medio','bajo'),
      estado ENUM('activo','inactivo','vacaciones','desvinculado') DEFAULT 'activo',
      fecha_ingreso DATE,
      correo VARCHAR(200),
      telefono VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS activos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo VARCHAR(100) NOT NULL,
      nombre VARCHAR(200) NOT NULL,
      proveedor VARCHAR(200),
      estado ENUM('operativo','degradado','fuera_de_servicio','en_mantencion') DEFAULT 'operativo',
      criticidad ENUM('critica','alta','media','baja') NOT NULL,
      ambiente ENUM('produccion','desarrollo','testing','staging'),
      responsable_id INT,
      proyecto VARCHAR(200),
      documentacion TEXT,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (responsable_id) REFERENCES personal(id) ON DELETE SET NULL
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS identidades (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      nombre           VARCHAR(200) NOT NULL,
      identidad        VARCHAR(200) NOT NULL,
      tipo_identidad   ENUM('usuario','cuenta_servicio','api_key','certificado','grupo','otro'),
      origen           VARCHAR(100),
      estado           ENUM('activa','inactiva','comprometida','expirada','pendiente') DEFAULT 'activa',
      propietario_id   INT NULL,
      fecha_creacion   DATE,
      fecha_revision   DATE,
      fecha_expiracion DATE,
      notas            TEXT,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (propietario_id) REFERENCES personal(id) ON DELETE SET NULL
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS accesos (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      identidad_id       INT NOT NULL,
      activo_id          INT NOT NULL,
      entorno            ENUM('produccion','desarrollo','testing','staging','otro'),
      nivel_acceso       ENUM('lectura','escritura','administrador','root','otro') NOT NULL,
      estado             ENUM('activo','inactivo','suspendido','expirado','pendiente_revision') DEFAULT 'activo',
      criticidad         ENUM('critica','alta','media','baja'),
      fecha_otorgamiento DATE,
      fecha_expiracion   DATE,
      quien_autorizo     VARCHAR(200),
      justificacion      TEXT,
      created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (identidad_id) REFERENCES identidades(id) ON DELETE CASCADE,
      FOREIGN KEY (activo_id)    REFERENCES activos(id)     ON DELETE CASCADE
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS incidentes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo VARCHAR(100) NOT NULL,
      categoria VARCHAR(100),
      estado ENUM('abierto','en_investigacion','en_respuesta','cerrado','falso_positivo') DEFAULT 'abierto',
      severidad ENUM('critica','alta','media','baja') NOT NULL,
      impacto ENUM('critico','alto','medio','bajo'),
      proyecto VARCHAR(200),
      activo_id INT,
      descripcion TEXT,
      causa_raiz TEXT,
      vulnerabilidades TEXT,
      cvss DECIMAL(3,1),
      fecha_deteccion DATETIME,
      fecha_respuesta DATETIME,
      tiempo_resolucion INT,
      requiere_notificacion_legal BOOLEAN DEFAULT FALSE,
      responsable VARCHAR(200),
      archivo_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE SET NULL
    )
  `)

  // Riesgos — modelo cuantitativo (probabilidad × impacto, escala 1-5).
  // nivel_riesgo / nivel_categoria / residual_nivel son columnas GENERADAS: no se insertan.
  await conn.query(`
    CREATE TABLE IF NOT EXISTS riesgos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(200) NOT NULL,
      descripcion TEXT,
      categoria ENUM('tecnico','operacional','humano','externo','legal') NOT NULL,
      activo_id INT NULL,
      activo_nombre VARCHAR(200) NULL,
      amenaza VARCHAR(300) NOT NULL,
      vulnerabilidad VARCHAR(300),
      probabilidad INT NOT NULL,
      impacto INT NOT NULL,
      nivel_riesgo INT GENERATED ALWAYS AS (probabilidad * impacto) STORED,
      nivel_categoria VARCHAR(10) GENERATED ALWAYS AS (
        CASE
          WHEN (probabilidad * impacto) >= 20 THEN 'critico'
          WHEN (probabilidad * impacto) >= 15 THEN 'alto'
          WHEN (probabilidad * impacto) >= 6  THEN 'medio'
          ELSE 'bajo'
        END
      ) STORED,
      tipo_tratamiento ENUM('mitigar','aceptar','transferir','evitar') NULL,
      plan_tratamiento TEXT,
      responsable VARCHAR(200),
      fecha_limite DATE NULL,
      residual_probabilidad INT NULL,
      residual_impacto INT NULL,
      residual_nivel INT GENERATED ALWAYS AS (
        COALESCE(residual_probabilidad, probabilidad) * COALESCE(residual_impacto, impacto)
      ) STORED,
      estado ENUM('identificado','en_tratamiento','mitigado','aceptado','cerrado') DEFAULT 'identificado',
      incidente_id INT NULL,
      incidente_nombre VARCHAR(200) NULL,
      iso_control_ids JSON NULL,
      iso_evidencia_id INT NULL,
      notas_dstac TEXT,
      creado_por INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_estado (estado),
      INDEX idx_nivel (nivel_categoria),
      FOREIGN KEY (activo_id)    REFERENCES activos(id)    ON DELETE SET NULL,
      FOREIGN KEY (incidente_id) REFERENCES incidentes(id) ON DELETE SET NULL
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS riesgos_historial (
      id INT AUTO_INCREMENT PRIMARY KEY,
      riesgo_id INT NOT NULL,
      user_id INT NOT NULL,
      campo_cambiado VARCHAR(100),
      valor_anterior TEXT,
      valor_nuevo TEXT,
      comentario TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (riesgo_id) REFERENCES riesgos(id) ON DELETE CASCADE
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS recuperacion (
      id INT AUTO_INCREMENT PRIMARY KEY,
      activo_id INT,
      nombre_tecnico VARCHAR(200),
      estado_operativo ENUM('operativo','degradado','fuera_de_servicio'),
      nivel_impacto ENUM('critico','alto','medio','bajo'),
      backup_disponible BOOLEAN DEFAULT FALSE,
      inicio_incidente DATETIME,
      fecha_recuperacion DATETIME,
      fecha_indisponibilidad DATETIME,
      responsable_respuesta VARCHAR(200),
      documento_plan_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE SET NULL
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nist_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      funcion ENUM('identificar','proteger','detectar','responder','recuperar') NOT NULL,
      porcentaje INT NOT NULL DEFAULT 0,
      notas TEXT,
      fecha_evaluacion DATE NOT NULL,
      evaluado_por VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS security_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      score INT NOT NULL,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await conn.end()
  return dbName
}

async function dropTenantDB(slug) {
  if (!VALID_SLUG.test(slug)) {
    throw new Error(`Slug inválido: ${slug}`)
  }

  const dbName = slugToDbName(slug)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })

  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``)
  await conn.end()
}

module.exports = { createTenantDB, dropTenantDB, VALID_SLUG, slugToDbName }
