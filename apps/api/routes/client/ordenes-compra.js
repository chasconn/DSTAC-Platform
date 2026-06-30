// routes/client/ordenes-compra.js — el cliente sube sus propias OC.
// requireClientRole + resolveTenant fijan req.company desde el JWT, igual que
// en contratos.js — el cliente nunca puede ver/crear OC de otra empresa.
const router = require('express').Router()
const multer = require('multer')
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                   = require('../../middleware/tenant')
const centralDB = require('../../db/central')

router.use(requireAuth, requireClientRole, resolveTenant)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) return cb(null, true)
    cb(new Error('Solo PDF o imagen'))
  },
})

const ESTADO_LABEL = {
  pendiente_factura: 'Recibida, en proceso de facturación',
  facturada:         'Facturada',
  pagada:             'Pagada',
  anulada:            'Anulada',
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(`
      SELECT id, numero_oc, monto_total, estado, fecha_recepcion, numero_factura, created_at
      FROM ordenes_compra WHERE company_id = ? ORDER BY created_at DESC, id DESC
    `, [req.company.id])
    res.json({ ordenes: rows.map(r => ({ ...r, estado_label: ESTADO_LABEL[r.estado] || r.estado })) })
  } catch (err) { next(err) }
})

router.post('/', upload.single('archivo_oc'), async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.numero_oc?.trim()) return res.status(400).json({ error: 'El número de OC es obligatorio' })
    if (!req.file) return res.status(400).json({ error: 'Debes adjuntar el PDF de la OC' })

    await centralDB.execute(`
      INSERT INTO ordenes_compra
        (numero_oc, empresa, company_id, monto_total,
         archivo_oc, archivo_oc_nombre, archivo_oc_mime,
         fecha_recepcion, notas, estado, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,'pendiente_factura',?)
    `, [
      b.numero_oc.trim(),
      req.company.name,
      req.company.id,
      b.monto_total ? Number(b.monto_total) : null,
      req.file.buffer, req.file.originalname, req.file.mimetype,
      new Date().toISOString().slice(0, 10),
      b.notas?.trim() || null,
      req.user?.id || req.user?.user_id || null,
    ])
    res.status(201).json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
