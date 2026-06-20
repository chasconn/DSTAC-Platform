// routes/admin/changelog.js — Registro interno de correcciones y cambios
// técnicos de la plataforma. Solo DSTAC (no es por empresa). Cada entrada
// tiene un resumen en lenguaje simple y un detalle técnico aparte, para que
// la pueda leer tanto alguien técnico como alguien que no lo es.
const router = require('express').Router()
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const centralDB = require('../../db/central')

router.use(requireAuth, requireDstacRole)
const uid = (req) => req.user.id || req.user.user_id

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, fecha, titulo, categoria, resumen_simple, archivos, comandos, created_at
         FROM dstac_changelog ORDER BY fecha DESC, id DESC`
    )
    res.json({ entradas: rows })
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const [[r]] = await centralDB.query(`SELECT * FROM dstac_changelog WHERE id = ?`, [req.params.id])
    if (!r) return res.status(404).json({ error: 'Registro no encontrado' })
    res.json(r)
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const { fecha, titulo, categoria, resumen_simple, detalle_tecnico, archivos, comandos } = req.body || {}
    if (!titulo?.trim() || !resumen_simple?.trim() || !detalle_tecnico?.trim()) {
      return res.status(400).json({ error: 'Título, resumen simple y detalle técnico son obligatorios' })
    }
    const [r] = await centralDB.execute(
      `INSERT INTO dstac_changelog (fecha, titulo, categoria, resumen_simple, detalle_tecnico, archivos, comandos, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [fecha || new Date().toISOString().slice(0, 10), titulo.trim(), categoria || 'correccion',
       resumen_simple.trim(), detalle_tecnico.trim(),
       archivos ? JSON.stringify(archivos) : null, comandos ? JSON.stringify(comandos) : null, uid(req)])
    res.status(201).json({ id: r.insertId })
  } catch (err) { next(err) }
})

module.exports = router
