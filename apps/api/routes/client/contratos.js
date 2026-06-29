// routes/client/contratos.js — el cliente ve y firma sus propios contratos.
// requireClientRole fija req.forced_company_slug desde el JWT, y
// resolveTenant lo usa para resolver req.company — el cliente nunca puede
// pedir el contrato de otra empresa (ver middleware/tenant.js).
const router = require('express').Router()
const crypto = require('crypto')
const { requireAuth, requireClientRole } = require('../../middleware/auth')
const { resolveTenant }                   = require('../../middleware/tenant')
const centralDB = require('../../db/central')

router.use(requireAuth, requireClientRole, resolveTenant)

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex') }

// Solo se muestran contratos que ya fueron enviados a firma (no borradores
// internos de DSTAC).
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, numero, estado, codigo_verificacion, created_at,
              (firma_dstac IS NOT NULL) AS firmado_dstac, (firma_cliente IS NOT NULL) AS firmado_cliente
         FROM contratos WHERE company_id = ? AND estado <> 'borrador' ORDER BY created_at DESC, id DESC`,
      [req.company.id])
    res.json({ contratos: rows })
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const [[d]] = await centralDB.query(
      `SELECT id, numero, estado, contenido_html, codigo_verificacion, created_at, firma_dstac, firma_cliente
         FROM contratos WHERE id = ? AND company_id = ? AND estado <> 'borrador' LIMIT 1`,
      [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Contrato no encontrado' })
    res.json(d)
  } catch (err) { next(err) }
})

router.post('/:id/firmar', async (req, res, next) => {
  try {
    const { nombre, rut, cargo, acepto } = req.body || {}
    if (!acepto) return res.status(400).json({ error: 'Debes aceptar la declaración de firma' })
    if (!nombre?.trim() || !rut?.trim()) return res.status(400).json({ error: 'Nombre y RUT del firmante son obligatorios' })

    const [[d]] = await centralDB.query(
      `SELECT * FROM contratos WHERE id = ? AND company_id = ? AND estado <> 'borrador' LIMIT 1`,
      [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Contrato no encontrado' })
    if (!d.contenido_html) return res.status(400).json({ error: 'El contrato aún no está disponible para firmar' })
    if (d.firma_cliente) return res.status(400).json({ error: 'Este contrato ya fue firmado' })

    const firmaCliente = {
      nombre: nombre.trim(), rut: rut.trim(), cargo: cargo?.trim() || '',
      fecha: new Date().toISOString(), ip: req.ip, user_agent: req.headers['user-agent'] || '',
      usuario_id: req.user.user_id || req.user.id, usuario_email: req.user.email,
      hash: sha256(d.contenido_html),
    }
    const nuevoEstado = d.firma_dstac ? 'completado' : 'firmado_cliente'
    await centralDB.execute(
      `UPDATE contratos SET firma_cliente = ?, estado = ? WHERE id = ?`,
      [JSON.stringify(firmaCliente), nuevoEstado, d.id])

    res.json({ ok: true, estado: nuevoEstado })
  } catch (err) { next(err) }
})

module.exports = router
