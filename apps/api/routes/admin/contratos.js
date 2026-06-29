// routes/admin/contratos.js — Contratos de prestación de servicios con
// autorización de intervención (Ley N° 21.459) y firma electrónica simple
// (Ley N° 19.799). Solo DSTAC. Empresa desde X-Company-Slug (resolveTenant).
const router  = require('express').Router()
const crypto  = require('crypto')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                  = require('../../middleware/tenant')
const centralDB = require('../../db/central')
const { registrarActividad } = require('../../utils/activityLogger')
const { renderContrato } = require('../../services/contratos/template')
const { datosLegalesEmpresa, datosLegalesCliente, datosAlcance, camposFaltantes } = require('../../services/contratos/datos')

router.use(requireAuth, requireDstacRole, resolveTenant)
const uid = (req) => req.user.id || req.user.user_id

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex') }

async function siguienteNumero() {
  const anio = new Date().getFullYear()
  const [[r]] = await centralDB.query(
    `SELECT COUNT(*) AS n FROM contratos WHERE numero LIKE ?`, [`CONT-${anio}-%`])
  return `CONT-${anio}-${String((r.n || 0) + 1).padStart(3, '0')}`
}

// ── Datos legales propios de DSTAC (fila única) ───────────────────────────────
router.get('/datos-legales', async (req, res, next) => {
  try { res.json(await datosLegalesEmpresa(centralDB)) } catch (err) { next(err) }
})

router.put('/datos-legales', async (req, res, next) => {
  try {
    const { razon_social, rut, domicilio, representante_legal, representante_legal_rut, representante_legal_cargo } = req.body || {}
    await centralDB.execute(
      `UPDATE empresa_datos_legales SET razon_social=?, rut=?, domicilio=?,
         representante_legal=?, representante_legal_rut=?, representante_legal_cargo=?
       WHERE id = 1`,
      [razon_social || null, rut || null, domicilio || null,
       representante_legal || null, representante_legal_rut || null, representante_legal_cargo || null])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Generar un contrato (borrador) desde una cotización ───────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { cotizacion_id } = req.body || {}
    if (!cotizacion_id) return res.status(400).json({ error: 'Indica la cotización de origen' })

    const [[cot]] = await centralDB.query(
      `SELECT * FROM cotizaciones WHERE id = ? AND company_id = ? LIMIT 1`, [cotizacion_id, req.company.id])
    if (!cot) return res.status(404).json({ error: 'Cotización no encontrada para esta empresa' })

    const numero = await siguienteNumero()
    const codigo = `DSTAC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

    const [r] = await centralDB.execute(
      `INSERT INTO contratos (numero, company_id, cotizacion_id, estado, alcance, codigo_verificacion, created_by)
       VALUES (?, ?, ?, 'borrador', ?, ?, ?)`,
      [numero, req.company.id, cotizacion_id, JSON.stringify([]), codigo, uid(req)])

    await registrarActividad({
      req, accion: 'crear', modulo: 'contratos',
      descripcion: `Generó el contrato ${numero} desde la cotización ${cot.numero}`,
      entidad_id: r.insertId, company_id: req.company.id,
    })

    res.json({ id: r.insertId, numero, codigo_verificacion: codigo })
  } catch (err) { next(err) }
})

// ── Listar contratos de la empresa activa ─────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await centralDB.execute(
      `SELECT id, numero, cotizacion_id, estado, codigo_verificacion, created_at,
              (firma_dstac IS NOT NULL) AS firmado_dstac, (firma_cliente IS NOT NULL) AS firmado_cliente
         FROM contratos WHERE company_id = ? ORDER BY created_at DESC, id DESC`,
      [req.company.id])
    res.json({ contratos: rows })
  } catch (err) { next(err) }
})

// ── Detalle + alcance editable ────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[d]] = await centralDB.query(
      `SELECT * FROM contratos WHERE id = ? AND company_id = ? LIMIT 1`, [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Contrato no encontrado' })
    res.json({ ...d, alcance: datosAlcance(d) })
  } catch (err) { next(err) }
})

// ── Editar el Anexo A (alcance autorizado) mientras está en borrador ─────────
router.put('/:id/alcance', async (req, res, next) => {
  try {
    const { alcance = [] } = req.body || {}
    const [[d]] = await centralDB.query(
      `SELECT id, estado FROM contratos WHERE id = ? AND company_id = ? LIMIT 1`, [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Contrato no encontrado' })
    if (d.estado !== 'borrador') return res.status(400).json({ error: 'Solo se puede editar el alcance mientras el contrato está en borrador' })
    await centralDB.execute(`UPDATE contratos SET alcance = ? WHERE id = ?`, [JSON.stringify(alcance), d.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Enviar a firma: valida que los datos legales estén completos, recalcula
// el contenido_html final (snapshot) y lo deja disponible para el cliente. ───
router.post('/:id/enviar', async (req, res, next) => {
  try {
    const [[d]] = await centralDB.query(
      `SELECT * FROM contratos WHERE id = ? AND company_id = ? LIMIT 1`, [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Contrato no encontrado' })

    const dstac = await datosLegalesEmpresa(centralDB)
    const [[c]] = await centralDB.query(`SELECT * FROM companies WHERE id = ?`, [req.company.id])
    const cliente = datosLegalesCliente(c)
    const alcance = datosAlcance(d)

    const faltan = [...camposFaltantes(dstac, 'DSTAC'), ...camposFaltantes(cliente, 'Cliente')]
    if (!alcance.length) faltan.push('Anexo A: agrega al menos un activo autorizado')
    if (faltan.length) return res.status(400).json({ error: 'Faltan datos legales para enviar a firma', detalle: faltan })

    let cotizacion = null
    if (d.cotizacion_id) {
      const [[cot]] = await centralDB.query(`SELECT * FROM cotizaciones WHERE id = ?`, [d.cotizacion_id])
      cotizacion = cot
    }

    const html = renderContrato({
      numero: d.numero,
      fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
      dstac, cliente, cotizacion, alcance,
      codigoVerificacion: d.codigo_verificacion,
      firmaDstac: null, firmaCliente: null,
    })

    await centralDB.execute(
      `UPDATE contratos SET estado = 'enviado', contenido_html = ? WHERE id = ?`, [html, d.id])

    await registrarActividad({
      req, accion: 'editar', modulo: 'contratos',
      descripcion: `Envió a firma el contrato ${d.numero}`,
      entidad_id: d.id, company_id: req.company.id,
    })

    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Firma del lado DSTAC (representante de DSTAC firma dentro del panel admin) ─
router.post('/:id/firmar-dstac', async (req, res, next) => {
  try {
    const { nombre, rut, cargo } = req.body || {}
    if (!nombre?.trim() || !rut?.trim()) return res.status(400).json({ error: 'Nombre y RUT del firmante son obligatorios' })

    const [[d]] = await centralDB.query(
      `SELECT * FROM contratos WHERE id = ? AND company_id = ? LIMIT 1`, [req.params.id, req.company.id])
    if (!d) return res.status(404).json({ error: 'Contrato no encontrado' })
    if (!d.contenido_html) return res.status(400).json({ error: 'El contrato debe enviarse a firma antes de firmarlo' })
    if (d.firma_dstac) return res.status(400).json({ error: 'Este contrato ya fue firmado por DSTAC' })

    const firmaDstac = {
      nombre: nombre.trim(), rut: rut.trim(), cargo: cargo?.trim() || '',
      fecha: new Date().toISOString(), ip: req.ip, user_agent: req.headers['user-agent'] || '',
      hash: sha256(d.contenido_html),
    }
    const nuevoEstado = d.firma_cliente ? 'completado' : 'enviado'
    await centralDB.execute(
      `UPDATE contratos SET firma_dstac = ?, hash_documento = ?, estado = ? WHERE id = ?`,
      [JSON.stringify(firmaDstac), firmaDstac.hash, nuevoEstado, d.id])

    await registrarActividad({
      req, accion: 'editar', modulo: 'contratos',
      descripcion: `Firmó por DSTAC el contrato ${d.numero}`,
      entidad_id: d.id, company_id: req.company.id,
    })

    res.json({ ok: true, estado: nuevoEstado })
  } catch (err) { next(err) }
})

module.exports = router
