const router  = require('express').Router()
const multer  = require('multer')
const { requireAuth, requireDstacRole } = require('../../middleware/auth')
const { resolveTenant }                 = require('../../middleware/tenant')
const { leerExcel, validarColumnas }    = require('../../utils/importador')
const { generarPlantillaPersonal, generarPlantillaActivos, generarPlantillaIdentidades } = require('../../utils/plantillas')
const { COLUMNAS_REQUERIDAS: COL_PERSONAL, validarFilaPersonal }     = require('../../utils/validadores/personalValidador')
const { COLUMNAS_REQUERIDAS: COL_ACTIVOS, validarFilaActivo }         = require('../../utils/validadores/activosValidador')
const { COLUMNAS_REQUERIDAS: COL_IDENTIDADES, validarFilaIdentidad }  = require('../../utils/validadores/identidadesValidador')

// Multer: almacena el archivo en memoria (nunca toca el disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },   // 5 MB máximo
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (['xlsx', 'xls'].includes(ext)) return cb(null, true)
    cb(new Error('Solo se aceptan archivos Excel (.xlsx o .xls)'))
  },
})

// Auth aplicada a todas las rutas de este router
router.use(requireAuth, requireDstacRole)

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLAS — descarga el Excel vacío con instrucciones
// ─────────────────────────────────────────────────────────────────────────────

router.get('/personal/plantilla', (req, res) => {
  const buf = generarPlantillaPersonal()
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="plantilla_personal.xlsx"' })
  res.send(buf)
})

router.get('/activos/plantilla', (req, res) => {
  const buf = generarPlantillaActivos()
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="plantilla_activos.xlsx"' })
  res.send(buf)
})

router.get('/identidades/plantilla', (req, res) => {
  const buf = generarPlantillaIdentidades()
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="plantilla_identidades.xlsx"' })
  res.send(buf)
})

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL — preview y confirmar
// ─────────────────────────────────────────────────────────────────────────────

router.post('/personal/preview', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const filas = leerExcel(req.file.buffer)
    const check = validarColumnas(filas, COL_PERSONAL)
    if (!check.valido) return res.status(400).json({ error: check.error })

    const validas   = []
    const invalidas = []

    filas.forEach((fila, i) => {
      const r = validarFilaPersonal(fila, i + 2)   // +2: header en fila 1, datos desde fila 2
      if (r.valido) validas.push({ fila: i + 2, datos: r.datos })
      else          invalidas.push({ fila: i + 2, errores: r.errores })
    })

    res.json({
      total:           filas.length,
      validas:         validas.length,
      invalidas:       invalidas.length,
      preview:         validas.slice(0, 5),
      errores:         invalidas,
      puede_importar:  validas.length > 0,
    })
  } catch (err) { next(err) }
})

router.post('/personal/confirmar', upload.single('archivo'), resolveTenant, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const filas = leerExcel(req.file.buffer)
    const check = validarColumnas(filas, COL_PERSONAL)
    if (!check.valido) return res.status(400).json({ error: check.error })

    let creados = 0
    const errores = []

    for (let i = 0; i < filas.length; i++) {
      const r = validarFilaPersonal(filas[i], i + 2)
      if (!r.valido) { errores.push({ fila: i + 2, errores: r.errores }); continue }

      try {
        await req.tenantDB.execute(
          `INSERT INTO personal (nombre, rol_empresarial, nivel_responsabilidad, estado, fecha_ingreso, correo, telefono)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [r.datos.nombre, r.datos.rol_empresarial, r.datos.nivel_responsabilidad,
           r.datos.estado, r.datos.fecha_ingreso, r.datos.correo, r.datos.telefono]
        )
        creados++
      } catch (dbErr) {
        errores.push({ fila: i + 2, errores: [{ campo: 'BD', error: dbErr.message }] })
      }
    }

    res.json({ creados, omitidos: errores.length, errores, warnings: [] })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVOS — preview y confirmar
// ─────────────────────────────────────────────────────────────────────────────

router.post('/activos/preview', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const filas = leerExcel(req.file.buffer)
    const check = validarColumnas(filas, COL_ACTIVOS)
    if (!check.valido) return res.status(400).json({ error: check.error })

    const validas   = []
    const invalidas = []

    filas.forEach((fila, i) => {
      const r = validarFilaActivo(fila, i + 2)
      if (r.valido) validas.push({ fila: i + 2, datos: r.datos })
      else          invalidas.push({ fila: i + 2, errores: r.errores })
    })

    res.json({
      total:          filas.length,
      validas:        validas.length,
      invalidas:      invalidas.length,
      preview:        validas.slice(0, 5),
      errores:        invalidas,
      puede_importar: validas.length > 0,
    })
  } catch (err) { next(err) }
})

router.post('/activos/confirmar', upload.single('archivo'), resolveTenant, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const filas = leerExcel(req.file.buffer)
    const check = validarColumnas(filas, COL_ACTIVOS)
    if (!check.valido) return res.status(400).json({ error: check.error })

    let creados = 0
    const errores = []

    for (let i = 0; i < filas.length; i++) {
      const r = validarFilaActivo(filas[i], i + 2)
      if (!r.valido) { errores.push({ fila: i + 2, errores: r.errores }); continue }

      try {
        await req.tenantDB.execute(
          `INSERT INTO activos (nombre, tipo, criticidad, estado, ambiente, proveedor, proyecto, documentacion, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.datos.nombre, r.datos.tipo, r.datos.criticidad, r.datos.estado,
           r.datos.ambiente, r.datos.proveedor, r.datos.proyecto,
           r.datos.documentacion, r.datos.metadata]
        )
        creados++
      } catch (dbErr) {
        errores.push({ fila: i + 2, errores: [{ campo: 'BD', error: dbErr.message }] })
      }
    }

    res.json({ creados, omitidos: errores.length, errores, warnings: [] })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// IDENTIDADES — preview y confirmar
// ─────────────────────────────────────────────────────────────────────────────

router.post('/identidades/preview', upload.single('archivo'), resolveTenant, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const filas = leerExcel(req.file.buffer)
    const check = validarColumnas(filas, COL_IDENTIDADES)
    if (!check.valido) return res.status(400).json({ error: check.error })

    const validas   = []
    const invalidas = []
    const allWarnings = []

    for (let i = 0; i < filas.length; i++) {
      const r = await validarFilaIdentidad(filas[i], i + 2, req.tenantDB)
      if (r.warnings.length) allWarnings.push(...r.warnings)
      if (r.valido) validas.push({ fila: i + 2, datos: r.datos })
      else          invalidas.push({ fila: i + 2, errores: r.errores })
    }

    res.json({
      total:          filas.length,
      validas:        validas.length,
      invalidas:      invalidas.length,
      preview:        validas.slice(0, 5),
      errores:        invalidas,
      warnings:       allWarnings,
      puede_importar: validas.length > 0,
    })
  } catch (err) { next(err) }
})

router.post('/identidades/confirmar', upload.single('archivo'), resolveTenant, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const filas = leerExcel(req.file.buffer)
    const check = validarColumnas(filas, COL_IDENTIDADES)
    if (!check.valido) return res.status(400).json({ error: check.error })

    let creados = 0
    const errores    = []
    const allWarnings = []

    for (let i = 0; i < filas.length; i++) {
      const r = await validarFilaIdentidad(filas[i], i + 2, req.tenantDB)
      if (r.warnings.length) allWarnings.push(...r.warnings)
      if (!r.valido) { errores.push({ fila: i + 2, errores: r.errores }); continue }

      try {
        await req.tenantDB.execute(
          `INSERT INTO identidades (nombre, identidad, tipo_identidad, origen, estado, propietario_id, fecha_creacion, fecha_revision, fecha_expiracion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.datos.nombre, r.datos.identidad, r.datos.tipo_identidad, r.datos.origen,
           r.datos.estado, r.datos.propietario_id, r.datos.fecha_creacion,
           r.datos.fecha_revision, r.datos.fecha_expiracion]
        )
        creados++
      } catch (dbErr) {
        errores.push({ fila: i + 2, errores: [{ campo: 'BD', error: dbErr.message }] })
      }
    }

    res.json({ creados, omitidos: errores.length, errores, warnings: allWarnings })
  } catch (err) { next(err) }
})

module.exports = router
