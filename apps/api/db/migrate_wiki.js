// Wiki interna del equipo DSTAC (tipo Obsidian): notas en Markdown con enlaces
// bidireccionales [[Nota]], backlinks y grafo. Vive en la BD central (un solo
// espacio de trabajo compartido por el equipo, no por tenant/cliente).
// Seguro correr más de una vez (CREATE TABLE IF NOT EXISTS).
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_CENTRAL || 'db_dstac_core',
  })

  console.log('Creando tabla wiki_notes...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS wiki_notes (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      titulo          VARCHAR(255) NOT NULL,
      slug            VARCHAR(255) NOT NULL,
      contenido       MEDIUMTEXT NOT NULL DEFAULT '',
      carpeta         VARCHAR(150) NULL,
      tags            JSON NULL,
      visibilidad     ENUM('privada','equipo') NOT NULL DEFAULT 'privada',
      es_fantasma     TINYINT(1) NOT NULL DEFAULT 0,
      creado_por      INT NULL,
      actualizado_por INT NULL,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_owner_slug (creado_por, slug),
      INDEX idx_carpeta (carpeta),
      INDEX idx_fantasma (es_fantasma),
      INDEX idx_visibilidad (visibilidad),
      FULLTEXT INDEX ft_busqueda (titulo, contenido)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ wiki_notes')

  console.log('Creando tabla wiki_links...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS wiki_links (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      origen_id  INT NOT NULL,
      destino_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_link (origen_id, destino_id),
      INDEX idx_destino (destino_id),
      FOREIGN KEY (origen_id)  REFERENCES wiki_notes(id) ON DELETE CASCADE,
      FOREIGN KEY (destino_id) REFERENCES wiki_notes(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ wiki_links')

  console.log('Creando tabla wiki_attachments...')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS wiki_attachments (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      nota_id     INT NOT NULL,
      filename    VARCHAR(255) NOT NULL,
      mimetype    VARCHAR(100) NOT NULL,
      tamano      INT NOT NULL,
      contenido   LONGBLOB NOT NULL,
      subido_por  INT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_nota (nota_id),
      FOREIGN KEY (nota_id) REFERENCES wiki_notes(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  console.log('  ✓ wiki_attachments')

  await conn.end()
  console.log('\nMigración wiki completada.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
