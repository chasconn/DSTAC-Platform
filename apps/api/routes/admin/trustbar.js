// Gestión del "Trust bar" (logos del home de dstac.cl) desde la plataforma.
//
// Los logos viven en el sitio (tabla dstac_clientes + archivos en assets/clientes/),
// que el home lee vía clientes.php. Aquí NO tocamos esa BD directamente: hacemos de
// proxy server-side hacia la API JSON del sitio (clientes_api.php), enviando el
// secreto compartido en el header x-dstac-key. Así el secreto nunca llega al navegador.
//
// Requiere la variable de entorno PUBLIC_LEADS_SECRET (el mismo secreto que el sitio).
const router = require('express').Router()
const express = require('express')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { registrarActividad } = require('../../utils/activityLogger')

router.use(requireAuth, requireDstacRole)

const SITE_URL = process.env.TRUSTBAR_API_URL || 'https://dstac.cl/diagnostico/clientes_api.php'

// Llama a la API del sitio. Lanza error con .status si algo falla.
async function callSite(action, payload) {
  const secret = process.env.PUBLIC_LEADS_SECRET
  if (!secret) {
    const e = new Error('Falta configurar PUBLIC_LEADS_SECRET en el servicio api para gestionar el trust bar.')
    e.status = 503
    throw e
  }
  let r
  try {
    r = await fetch(SITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dstac-key': secret },
      body: JSON.stringify({ action, ...(payload || {}) }),
    })
  } catch (err) {
    const e = new Error('No se pudo contactar el sitio: ' + err.message)
    e.status = 502
    throw e
  }
  const data = await r.json().catch(() => ({ ok: false, error: 'Respuesta inválida del sitio' }))
  if (!r.ok || !data.ok) {
    const e = new Error(data.error || 'Error en el sitio')
    e.status = r.status || 500
    throw e
  }
  return data
}

// GET /api/admin/trustbar — lista logos + config (heading, enabled)
router.get('/', async (req, res, next) => {
  try { res.json(await callSite('list')) }
  catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

// POST /api/admin/trustbar/logo — { nombre, file_base64 }
// Body grande (imágenes hasta ~1.4MB en base64): parser dedicado de 3mb.
router.post('/logo', express.json({ limit: '3mb' }), async (req, res, next) => {
  try {
    const { nombre, file_base64 } = req.body || {}
    const out = await callSite('upload', { nombre, file_base64 })
    await registrarActividad({ req, accion: 'crear', modulo: 'sitio', descripcion: `Agregó el logo "${nombre}" al trust bar`, entidad_id: out.id })
    res.json(out)
  } catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

// DELETE /api/admin/trustbar/logo/:id
router.delete('/logo/:id', async (req, res, next) => {
  try {
    const out = await callSite('delete', { id: Number(req.params.id) })
    await registrarActividad({ req, accion: 'eliminar', modulo: 'sitio', descripcion: `Eliminó un logo del trust bar (#${req.params.id})`, entidad_id: Number(req.params.id) })
    res.json(out)
  } catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

// PATCH /api/admin/trustbar/logo/:id/toggle — alterna visible
router.patch('/logo/:id/toggle', async (req, res, next) => {
  try { res.json(await callSite('toggle', { id: Number(req.params.id) })) }
  catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

// PATCH /api/admin/trustbar/reorder — { ids: [...] }
router.patch('/reorder', async (req, res, next) => {
  try { res.json(await callSite('reorder', { ids: req.body?.ids || [] })) }
  catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

// PATCH /api/admin/trustbar/config — { heading?, enabled? }
router.patch('/config', async (req, res, next) => {
  try {
    const out = await callSite('config', req.body || {})
    await registrarActividad({ req, accion: 'editar', modulo: 'sitio', descripcion: 'Actualizó la configuración del trust bar' })
    res.json(out)
  } catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

module.exports = router
