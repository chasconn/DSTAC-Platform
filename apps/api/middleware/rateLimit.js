const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,   // 5 minutos
  max: 5,
  message: { error: 'Demasiados intentos de verificación.' },
  standardHeaders: true,
  legacyHeaders: false
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  max: 100,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = { loginLimiter, mfaLimiter, apiLimiter }
