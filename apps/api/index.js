require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { apiLimiter } = require('./middleware/rateLimit')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Detrás de Traefik (1 proxy): confiar en X-Forwarded-* para IP real (rate-limit correcto)
app.set('trust proxy', 1)

// CORS — acepta peticiones del frontend (credentials: true necesario para cookies HttpOnly)
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000'
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)                          // curl / SSR
    if (origin === ALLOWED_ORIGIN) return cb(null, true)       // producción
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true) // dev local
    if (/^https:\/\/(www\.)?dstac\.cl$/.test(origin)) return cb(null, true)           // sitio público (funnel /api/public)
    cb(new Error(`CORS bloqueado: ${origin}`))
  },
  credentials: true
}))

// Limite mas alto solo para el escaneo de tarjetas (fotos de camara de celular,
// ya redimensionadas/comprimidas en el navegador, pero con margen de seguridad).
app.use('/api/admin/marketing/escanear-tarjeta', express.json({ limit: '8mb' }))
app.use(express.json({ limit: '3mb' }))   // 3mb para permitir subir logos (base64) al trust bar
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use('/api', apiLimiter)

// Rutas
app.use('/api/auth',            require('./routes/auth'))
app.use('/api/public',          require('./routes/public'))
app.use('/api/edr',             require('./routes/edr'))
app.use('/api/admin/leads',     require('./routes/admin/leads'))
app.use('/api/companies',       require('./routes/companies'))
app.use('/api/dashboard',       require('./routes/dashboard'))
app.use('/api/users',           require('./routes/users'))
app.use('/api/assets',          require('./routes/assets'))
app.use('/api/identities',      require('./routes/identities'))
app.use('/api/accesses',        require('./routes/accesses'))
app.use('/api/incidents',       require('./routes/incidents'))
app.use('/api/risks',           require('./routes/risks'))
app.use('/api/recovery',        require('./routes/recovery'))
app.use('/api/pending',         require('./routes/pending'))
app.use('/api/reports',         require('./routes/reports'))
app.use('/api/client/stats',       require('./routes/client/stats'))
app.use('/api/client/dashboard',   require('./routes/client/dashboard'))
app.use('/api/client/personal',    require('./routes/client/personal'))
app.use('/api/client/activos',     require('./routes/client/activos'))
app.use('/api/client/identidades', require('./routes/client/identidades'))
app.use('/api/client/accesos',     require('./routes/client/accesos'))
app.use('/api/client/incidentes',  require('./routes/client/incidentes'))
app.use('/api/client/riesgos',     require('./routes/client/riesgos'))
app.use('/api/client/nist',        require('./routes/client/nist'))
app.use('/api/client/iso',         require('./routes/client/iso'))
app.use('/api/reports/client',     require('./routes/client/reportes'))
app.use('/api/client/certificados', require('./routes/client/certificados'))
app.use('/api/client/contratos',   require('./routes/client/contratos'))
app.use('/api/admin/usuarios',     require('./routes/admin/usuarios'))
app.use('/api/admin/nist',         require('./routes/admin/nist'))
app.use('/api/admin/iso',          require('./routes/admin/iso'))
app.use('/api/admin/activos',   require('./routes/admin/activos'))
app.use('/api/admin/personal',     require('./routes/admin/personal'))
app.use('/api/admin/identidades',  require('./routes/admin/identidades'))
app.use('/api/admin/accesos',      require('./routes/admin/accesos'))
app.use('/api/admin/empresas',     require('./routes/admin/empresas'))
app.use('/api/admin/importacion',  require('./routes/admin/importacion'))
app.use('/api/admin/pendientes',   require('./routes/admin/pendientes'))
app.use('/api/admin/trustbar',     require('./routes/admin/trustbar'))
app.use('/api/admin/riesgos',      require('./routes/admin/riesgos'))
app.use('/api/admin/cotizaciones', require('./routes/admin/cotizaciones'))
app.use('/api/admin/edr',          require('./routes/admin/edr'))
app.use('/api/admin/mdm',          require('./routes/admin/mdm'))
app.use('/api/admin/marketing',    require('./routes/admin/marketing'))
app.use('/api/admin/diagnostico',  require('./routes/admin/diagnostico'))
app.use('/api/admin/ley21663',     require('./routes/admin/ley21663'))
app.use('/api/admin/ley21719',     require('./routes/admin/ley21719'))
app.use('/api/admin/changelog',    require('./routes/admin/changelog'))
app.use('/api/admin/onboarding',   require('./routes/admin/onboarding'))
app.use('/api/admin/gastos',       require('./routes/admin/gastos'))
app.use('/api/admin/phishing',     require('./routes/admin/phishing'))
app.use('/api/admin/oportunidades', require('./routes/admin/oportunidades'))
app.use('/api/admin/contratos',    require('./routes/admin/contratos'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV })
})

// Manejador de errores global — debe ir al final, después de todas las rutas
app.use(errorHandler)

// Campañas de phishing recurrentes: revisa cada 6h si alguna ya debe
// volver a dispararse sola (sin que un admin la cree a mano cada vez).
const { verificarRecurrentes } = require('./services/phishing/recurrente')
setInterval(() => verificarRecurrentes(), 6 * 60 * 60 * 1000)
setTimeout(() => verificarRecurrentes(), 30 * 1000) // primera pasada poco después de arrancar

// Oportunidades (Mercado Público): busca licitaciones de ciberseguridad cada 12h.
// Solo detecta y puntúa — nunca postula. Si falta MERCADOPUBLICO_TICKET, falla en silencio (queda logueado).
const { sincronizarOportunidades } = require('./services/mercadoPublico/sync')
const correrSyncOportunidades = () => sincronizarOportunidades().catch(err => console.error('[oportunidades] sync error:', err.message))
setInterval(correrSyncOportunidades, 12 * 60 * 60 * 1000)

// Marketing (pymes-chile): la busqueda diaria de empresas nuevas la dispara
// solo el cron externo (/opt/dstac-ops/marketing_buscar_diario.sh, 4x/dia) —
// no duplicar aqui con un setInterval, ya causo corridas dobles.
setTimeout(correrSyncOportunidades, 45 * 1000)

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => {
  console.log(`DSTAC API corriendo en puerto ${PORT} [${process.env.NODE_ENV}]`)
})
