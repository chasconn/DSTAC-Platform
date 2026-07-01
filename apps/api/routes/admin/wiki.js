// Wiki interna del equipo DSTAC (tipo Obsidian) — panel interno.
//
// Cada nota tiene un dueño (creado_por) y una visibilidad:
//   'privada' → solo la ve y edita su dueño.
//   'equipo'  → la ve y edita cualquier usuario DSTAC (colaborativa, como una
//               carpeta compartida). Solo el dueño puede eliminarla o volver
//               a hacerla privada.
//
// Enlazado bidireccional: al guardar una nota se parsean las referencias
// [[Título]] / [[Título|Alias]] del contenido. Cada título se resuelve, en este
// orden: (1) una nota propia del usuario con ese título, (2) una nota de
// 'equipo' de cualquier autor, (3) si no existe ninguna, se crea una "nota
// fantasma" (es_fantasma=1, sin contenido) que hereda la visibilidad de la nota
// de origen — así un enlace roto en una nota privada no se filtra al equipo, y
// uno roto en una nota de equipo sí queda visible para todos como "por escribir".
// Si luego alguien crea una nota real con ese mismo título en su propio
// espacio, "reclama" la nota fantasma en vez de duplicarla.
const router = require('express').Router()
const multer = require('multer')
const centralDB = require('../../db/central')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')

router.use(requireAuth, requireDstacRole)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'].includes(ext)) return cb(null, true)
    cb(new Error('Formato no permitido (usa imagen o PDF)'))
  },
})

const uploadMd = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 100 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (['md', 'markdown', 'txt'].includes(ext)) return cb(null, true)
    cb(new Error('Solo se pueden importar archivos .md, .markdown o .txt'))
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240)
}

// Extrae los títulos referenciados por [[Título]] o [[Título|Alias]] del markdown.
function extraerEnlaces(contenido) {
  const titulos = new Set()
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let m
  while ((m = re.exec(contenido || '')) !== null) {
    const t = m[1].trim()
    if (t) titulos.add(t)
  }
  return [...titulos]
}

function puedeEditar(nota, userId) {
  return nota.creado_por === userId || nota.visibilidad === 'equipo'
}
function puedeVer(nota, userId) {
  return nota.creado_por === userId || nota.visibilidad === 'equipo'
}

// Reconstruye wiki_links para una nota a partir de su contenido actual.
// Crea notas fantasma para los títulos referenciados que aún no existen.
async function sincronizarEnlaces(conn, origenId, contenido, userId, visibilidadOrigen) {
  const titulos = extraerEnlaces(contenido)
  const destinoIds = []

  for (const titulo of titulos) {
    const slug = slugify(titulo)
    if (!slug) continue

    // 1) nota propia con ese título   2) nota de equipo de cualquier autor
    const [propia] = await conn.execute(
      'SELECT id FROM wiki_notes WHERE slug = ? AND creado_por = ?', [slug, userId]
    )
    let destinoId
    if (propia.length) {
      destinoId = propia[0].id
    } else {
      const [equipo] = await conn.execute(
        `SELECT id FROM wiki_notes WHERE slug = ? AND visibilidad = 'equipo'
         ORDER BY es_fantasma ASC LIMIT 1`, [slug]
      )
      if (equipo.length) {
        destinoId = equipo[0].id
      } else {
        const [ins] = await conn.execute(
          `INSERT INTO wiki_notes (titulo, slug, contenido, es_fantasma, visibilidad, creado_por)
           VALUES (?, ?, '', 1, ?, ?)`,
          [titulo, slug, visibilidadOrigen, userId]
        )
        destinoId = ins.insertId
      }
    }
    if (destinoId !== origenId) destinoIds.push(destinoId)
  }

  await conn.execute('DELETE FROM wiki_links WHERE origen_id = ?', [origenId])
  for (const destinoId of destinoIds) {
    await conn.execute(
      'INSERT IGNORE INTO wiki_links (origen_id, destino_id) VALUES (?, ?)',
      [origenId, destinoId]
    )
  }
}

const NOTA_FIELDS = `n.id, n.titulo, n.slug, n.carpeta, n.tags, n.visibilidad, n.es_fantasma,
  n.creado_por, n.actualizado_por, n.created_at, n.updated_at,
  TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS propietario_nombre`

// ─── LISTAR / BUSCAR ────────────────────────────────────────────────────────────
// GET /api/admin/wiki?carpeta=&search=&mias=1&equipo=1
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const { carpeta, search, mias, equipo } = req.query

    const cond = ['(n.creado_por = ? OR n.visibilidad = "equipo")']
    const params = [userId]

    if (mias === '1')   { cond.push('n.creado_por = ?'); params.push(userId) }
    if (equipo === '1') cond.push('n.visibilidad = "equipo"')
    if (carpeta) { cond.push('n.carpeta = ?'); params.push(carpeta) }

    let sql, sqlParams
    if (search?.trim()) {
      const term = search.trim()
      sql = `SELECT ${NOTA_FIELDS}, MATCH(n.titulo, n.contenido) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevancia
             FROM wiki_notes n LEFT JOIN users u ON u.id = n.creado_por
             WHERE MATCH(n.titulo, n.contenido) AGAINST (? IN NATURAL LANGUAGE MODE)`
      sqlParams = [term, term, ...params]
      if (cond.length) sql += ' AND ' + cond.join(' AND ')
      sql += ' ORDER BY relevancia DESC LIMIT 50'
    } else {
      sql = `SELECT ${NOTA_FIELDS} FROM wiki_notes n LEFT JOIN users u ON u.id = n.creado_por`
      sqlParams = params
      if (cond.length) sql += ' WHERE ' + cond.join(' AND ')
      sql += ' ORDER BY n.updated_at DESC LIMIT 200'
    }

    const [rows] = await centralDB.execute(sql, sqlParams)
    const out = rows.map(r => ({ ...r, es_mia: r.creado_por === userId, puedo_editar: r.creado_por === userId || r.visibilidad === 'equipo' }))
    res.json(out)
  } catch (err) { next(err) }
})

// ─── CARPETAS (para el árbol lateral) ──────────────────────────────────────────
router.get('/carpetas', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [rows] = await centralDB.execute(
      `SELECT carpeta, COUNT(*) AS n FROM wiki_notes
       WHERE carpeta IS NOT NULL AND carpeta != '' AND es_fantasma = 0
         AND (creado_por = ? OR visibilidad = 'equipo')
       GROUP BY carpeta ORDER BY carpeta`,
      [userId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// ─── GRAFO (notas visibles + enlaces entre ellas) ──────────────────────────────
router.get('/graph', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [nodes] = await centralDB.execute(
      `SELECT id, titulo, slug, carpeta, visibilidad, es_fantasma, creado_por
       FROM wiki_notes WHERE creado_por = ? OR visibilidad = 'equipo'`,
      [userId]
    )
    const visibleIds = new Set(nodes.map(n => n.id))
    const [rawEdges] = await centralDB.execute(
      `SELECT origen_id AS source, destino_id AS target FROM wiki_links
       WHERE origen_id IN (SELECT id FROM wiki_notes WHERE creado_por = ? OR visibilidad = 'equipo')`,
      [userId]
    )
    const edges = rawEdges.filter(e => visibleIds.has(e.target))
    res.json({
      nodes: nodes.map(n => ({ ...n, es_mia: n.creado_por === userId })),
      edges,
    })
  } catch (err) { next(err) }
})

// ─── BACKLINKS de una nota ──────────────────────────────────────────────────────
router.get('/backlinks/:id', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [notaRows] = await centralDB.execute('SELECT * FROM wiki_notes WHERE id = ?', [req.params.id])
    if (!notaRows.length || !puedeVer(notaRows[0], userId)) return res.status(404).json({ error: 'Nota no encontrada' })

    const [rows] = await centralDB.execute(
      `SELECT n.id, n.titulo, n.slug, n.carpeta, n.visibilidad, n.es_fantasma
       FROM wiki_links l JOIN wiki_notes n ON n.id = l.origen_id
       WHERE l.destino_id = ? AND (n.creado_por = ? OR n.visibilidad = 'equipo')
       ORDER BY n.titulo`,
      [req.params.id, userId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// ─── DETALLE (nota completa + backlinks + enlaces salientes) ──────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [rows] = await centralDB.execute(
      `SELECT n.*, TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS propietario_nombre
       FROM wiki_notes n LEFT JOIN users u ON u.id = n.creado_por WHERE n.id = ?`,
      [req.params.id]
    )
    if (!rows.length || !puedeVer(rows[0], userId)) return res.status(404).json({ error: 'Nota no encontrada' })
    const nota = rows[0]
    if (typeof nota.tags === 'string') { try { nota.tags = JSON.parse(nota.tags) } catch { nota.tags = [] } }

    const [backlinks] = await centralDB.execute(
      `SELECT n.id, n.titulo, n.slug, n.es_fantasma
       FROM wiki_links l JOIN wiki_notes n ON n.id = l.origen_id
       WHERE l.destino_id = ? AND (n.creado_por = ? OR n.visibilidad = 'equipo')
       ORDER BY n.titulo`,
      [nota.id, userId]
    )
    const [salientes] = await centralDB.execute(
      `SELECT n.id, n.titulo, n.slug, n.es_fantasma
       FROM wiki_links l JOIN wiki_notes n ON n.id = l.destino_id
       WHERE l.origen_id = ? AND (n.creado_por = ? OR n.visibilidad = 'equipo')
       ORDER BY n.titulo`,
      [nota.id, userId]
    )
    const [adjuntos] = await centralDB.execute(
      'SELECT id, filename, mimetype, tamano, created_at FROM wiki_attachments WHERE nota_id = ? ORDER BY created_at DESC',
      [nota.id]
    )

    res.json({
      ...nota,
      es_mia: nota.creado_por === userId,
      puedo_editar: puedeEditar(nota, userId),
      backlinks, enlaces_salientes: salientes, adjuntos,
    })
  } catch (err) { next(err) }
})

// ─── CREAR ──────────────────────────────────────────────────────────────────────
// POST /api/admin/wiki  { titulo, contenido?, carpeta?, tags?, visibilidad? }
// Crea una nota o reclama la fantasma propia con el mismo slug. Corre dentro de
// una transacción ya abierta por el caller (no hace commit/rollback). Lanza un
// Error con .status=409 si ya existe una nota real propia con ese título.
async function crearOReclamarNota(conn, { titulo, contenido, carpeta, tags, visibilidad, userId }) {
  const slug = slugify(titulo)
  if (!slug) { const e = new Error('Título inválido'); e.status = 400; throw e }

  const [existentes] = await conn.execute('SELECT * FROM wiki_notes WHERE slug = ? AND creado_por = ?', [slug, userId])
  let notaId, reclamada = false

  if (existentes.length && !existentes[0].es_fantasma) {
    const e = new Error(`Ya tienes una nota con el título "${titulo}"`)
    e.status = 409
    throw e
  }

  if (existentes.length && existentes[0].es_fantasma) {
    notaId = existentes[0].id
    reclamada = true
    await conn.execute(
      `UPDATE wiki_notes SET titulo=?, contenido=?, carpeta=?, tags=?, visibilidad=?, es_fantasma=0,
         actualizado_por=? WHERE id=?`,
      [titulo.trim(), contenido, carpeta, tags ? JSON.stringify(tags) : null, visibilidad, userId, notaId]
    )
  } else {
    const [ins] = await conn.execute(
      `INSERT INTO wiki_notes (titulo, slug, contenido, carpeta, tags, visibilidad, es_fantasma, creado_por, actualizado_por)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [titulo.trim(), slug, contenido, carpeta, tags ? JSON.stringify(tags) : null, visibilidad, userId, userId]
    )
    notaId = ins.insertId
  }

  await sincronizarEnlaces(conn, notaId, contenido, userId, visibilidad)
  return { notaId, slug, reclamada }
}

router.post('/', async (req, res, next) => {
  const { titulo, contenido = '', carpeta = null, tags = null, visibilidad = 'privada' } = req.body || {}
  if (!titulo?.trim()) return res.status(400).json({ error: 'El título es obligatorio' })
  if (!['privada', 'equipo'].includes(visibilidad)) return res.status(400).json({ error: 'Visibilidad inválida' })

  const userId = req.user.user_id || req.user.id
  const conn = await centralDB.getConnection()
  try {
    await conn.beginTransaction()
    const { notaId, slug, reclamada } = await crearOReclamarNota(conn, { titulo, contenido, carpeta, tags, visibilidad, userId })
    await conn.commit()

    await registrarActividad({
      req, accion: 'crear', modulo: 'wiki',
      descripcion: `${reclamada ? 'Completó' : 'Creó'} la nota "${titulo.trim()}" (${visibilidad})`,
      entidad_id: notaId,
    })
    res.status(201).json({ id: notaId, slug, reclamada })
  } catch (err) {
    await conn.rollback()
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  } finally {
    conn.release()
  }
})

// ─── IMPORTAR ARCHIVOS .MD ───────────────────────────────────────────────────────
// POST /api/admin/wiki/import — multipart, campo "archivos" (múltiples .md/.markdown/.txt)
// Body además: carpeta? (destino común), visibilidad? (privada|equipo, para todo el lote)
router.post('/import', uploadMd.array('archivos', 100), async (req, res, next) => {
  const userId = req.user.user_id || req.user.id
  const carpeta = req.body?.carpeta?.trim() || null
  const visibilidad = ['privada', 'equipo'].includes(req.body?.visibilidad) ? req.body.visibilidad : 'privada'

  if (!req.files?.length) return res.status(400).json({ error: 'Sin archivos' })

  const creadas = [], reclamadas = [], omitidas = []

  for (const file of req.files) {
    const titulo = file.originalname.replace(/\.(md|markdown|txt)$/i, '').trim()
    const contenido = file.buffer.toString('utf8')
    if (!titulo) { omitidas.push({ archivo: file.originalname, motivo: 'Nombre de archivo inválido' }); continue }

    const conn = await centralDB.getConnection()
    try {
      await conn.beginTransaction()
      const { notaId, reclamada } = await crearOReclamarNota(conn, { titulo, contenido, carpeta, tags: null, visibilidad, userId })
      await conn.commit()
      if (reclamada) reclamadas.push({ id: notaId, titulo })
      else creadas.push({ id: notaId, titulo })
    } catch (err) {
      await conn.rollback()
      omitidas.push({ archivo: file.originalname, motivo: err.status === 409 ? 'Ya existe una nota con ese título' : (err.message || 'Error al importar') })
    } finally {
      conn.release()
    }
  }

  await registrarActividad({
    req, accion: 'crear', modulo: 'wiki',
    descripcion: `Importó ${creadas.length + reclamadas.length} nota(s) desde archivos .md${omitidas.length ? ` (${omitidas.length} omitidas)` : ''}`,
  })
  res.status(201).json({ creadas, reclamadas, omitidas })
})

// ─── ACTUALIZAR ─────────────────────────────────────────────────────────────────
// PUT /api/admin/wiki/:id  { titulo?, contenido?, carpeta?, tags?, visibilidad? }
router.put('/:id', async (req, res, next) => {
  const { id } = req.params
  const { titulo, contenido, carpeta, tags, visibilidad } = req.body || {}
  const userId = req.user.user_id || req.user.id

  const conn = await centralDB.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.execute('SELECT * FROM wiki_notes WHERE id = ?', [id])
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: 'Nota no encontrada' }) }
    const actual = rows[0]
    const esDueno = actual.creado_por === userId

    if (!puedeEditar(actual, userId)) { await conn.rollback(); return res.status(403).json({ error: 'Esta nota es privada de otro usuario' }) }
    if (visibilidad !== undefined && visibilidad !== actual.visibilidad && !esDueno) {
      await conn.rollback()
      return res.status(403).json({ error: 'Solo el dueño puede cambiar la visibilidad de la nota' })
    }

    let slug = actual.slug
    if (titulo?.trim() && titulo.trim() !== actual.titulo) {
      slug = slugify(titulo)
      const [colision] = await conn.execute(
        'SELECT id FROM wiki_notes WHERE slug = ? AND creado_por = ? AND id != ?',
        [slug, actual.creado_por, id]
      )
      if (colision.length) { await conn.rollback(); return res.status(409).json({ error: 'Ya existe otra nota con ese título en ese espacio' }) }
    }

    const nuevoContenido = contenido !== undefined ? contenido : actual.contenido
    const nuevaVisibilidad = (visibilidad !== undefined && esDueno) ? visibilidad : actual.visibilidad

    await conn.execute(
      `UPDATE wiki_notes SET titulo=?, slug=?, contenido=?, carpeta=?, tags=?, visibilidad=?, es_fantasma=0, actualizado_por=?
       WHERE id=?`,
      [
        titulo?.trim() || actual.titulo,
        slug,
        nuevoContenido,
        carpeta !== undefined ? carpeta : actual.carpeta,
        tags !== undefined ? (tags ? JSON.stringify(tags) : null) : actual.tags,
        nuevaVisibilidad,
        userId,
        id,
      ]
    )

    await sincronizarEnlaces(conn, Number(id), nuevoContenido, actual.creado_por, nuevaVisibilidad)
    await conn.commit()

    await registrarActividad({ req, accion: 'editar', modulo: 'wiki', descripcion: `Editó la nota "${titulo?.trim() || actual.titulo}"`, entidad_id: Number(id) })
    res.json({ id: Number(id), slug })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
})

// ─── ELIMINAR (solo el dueño) ───────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [rows] = await centralDB.execute('SELECT titulo, creado_por FROM wiki_notes WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Nota no encontrada' })
    if (rows[0].creado_por !== userId) return res.status(403).json({ error: 'Solo el dueño puede eliminar esta nota' })

    await centralDB.execute('DELETE FROM wiki_notes WHERE id = ?', [req.params.id])
    await registrarActividad({ req, accion: 'eliminar', modulo: 'wiki', descripcion: `Eliminó la nota "${rows[0].titulo}"`, entidad_id: Number(req.params.id) })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── ADJUNTOS ───────────────────────────────────────────────────────────────────
// POST /api/admin/wiki/:id/attachments
router.post('/:id/attachments', upload.single('archivo'), async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [notas] = await centralDB.execute('SELECT * FROM wiki_notes WHERE id = ?', [req.params.id])
    if (!notas.length || !puedeVer(notas[0], userId)) return res.status(404).json({ error: 'Nota no encontrada' })
    if (!puedeEditar(notas[0], userId)) return res.status(403).json({ error: 'No puedes editar esta nota' })
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' })

    const [ins] = await centralDB.execute(
      `INSERT INTO wiki_attachments (nota_id, filename, mimetype, tamano, contenido, subido_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer, userId]
    )
    res.status(201).json({ id: ins.insertId, filename: req.file.originalname, mimetype: req.file.mimetype, tamano: req.file.size })
  } catch (err) { next(err) }
})

// GET /api/admin/wiki/attachments/:attId — sirve el binario (para <img src> en el preview)
router.get('/attachments/:attId', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [rows] = await centralDB.execute(
      `SELECT a.filename, a.mimetype, a.contenido, n.creado_por, n.visibilidad
       FROM wiki_attachments a JOIN wiki_notes n ON n.id = a.nota_id WHERE a.id = ?`,
      [req.params.attId]
    )
    if (!rows.length || !puedeVer(rows[0], userId)) return res.status(404).json({ error: 'Adjunto no encontrado' })
    const a = rows[0]
    res.set('Content-Type', a.mimetype)
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(a.filename)}"`)
    res.send(a.contenido)
  } catch (err) { next(err) }
})

router.delete('/attachments/:attId', async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id
    const [rows] = await centralDB.execute(
      `SELECT a.id, n.creado_por, n.visibilidad
       FROM wiki_attachments a JOIN wiki_notes n ON n.id = a.nota_id WHERE a.id = ?`,
      [req.params.attId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Adjunto no encontrado' })
    if (!puedeEditar(rows[0], userId)) return res.status(403).json({ error: 'No puedes editar esta nota' })

    await centralDB.execute('DELETE FROM wiki_attachments WHERE id = ?', [req.params.attId])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
