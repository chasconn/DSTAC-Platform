function errorHandler(err, req, res, next) {
  // Loggear internamente con contexto suficiente para debuggear
  console.error('[ERROR]', {
    message: err.message,
    path: req.path,
    method: req.method,
    user_id: req.user?.user_id || req.user?.id || null,
    // Stack solo en desarrollo — nunca en producción
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })

  // Al cliente: siempre genérico — nunca filtrar detalles internos
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: 'Ha ocurrido un error. Por favor intenta nuevamente.'
  })
}

module.exports = errorHandler
