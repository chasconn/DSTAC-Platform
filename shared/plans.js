const PLAN_MODULES = {
  pyme: [
    'personal', 'activos', 'identidades', 'accesos',
    'nist', 'reportes', 'capacitaciones', 'campanas'
  ],
  profesional: [
    'personal', 'activos', 'identidades', 'accesos',
    'incidentes', 'riesgos', 'recuperacion',
    'nist', 'reportes', 'capacitaciones', 'campanas', 'documentos'
  ],
  enterprise: [
    'personal', 'activos', 'identidades', 'accesos',
    'incidentes', 'riesgos', 'recuperacion',
    'nist', 'cumplimiento', 'gobernanza',
    'reportes', 'capacitaciones', 'campanas', 'documentos'
  ]
}

function hasModule(planName, moduleName) {
  return PLAN_MODULES[planName]?.includes(moduleName) ?? false
}

module.exports = { PLAN_MODULES, hasModule }
