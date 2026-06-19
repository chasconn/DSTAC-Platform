// Cuestionario de Diagnóstico de Madurez (interno, por cliente). ~10 dominios.
// Cada dominio mapea a "keywords" de servicios del catálogo de cotización
// (cotizacion_catalogo.nombre LIKE %keyword%) que cierran sus brechas.
// Respuestas por pregunta: 'si' | 'parcial' | 'no' | 'na'.
const DOMINIOS = [
  {
    id: 'gob', nombre: 'Gobernanza y Cumplimiento',
    servicios: ['vCISO', 'Ley 21.663', 'Ley 21.719', 'ISO 27001', 'Diagnóstico de Postura'],
    preguntas: [
      'Existe una política de seguridad de la información aprobada y comunicada.',
      'Hay un responsable de seguridad de la información (interno o vCISO) designado.',
      'Se identifican y gestionan los requisitos legales aplicables (Ley 21.663, Ley 21.719).',
      'Se ha evaluado el cumplimiento frente a un estándar (ISO 27001 / NIST).',
    ],
  },
  {
    id: 'iam', nombre: 'Identidades y Accesos',
    servicios: ['Active Directory', 'Endurecimiento de M365', 'Seguridad Gestionada'],
    preguntas: [
      'Se exige autenticación multifactor (MFA) en correo y cuentas críticas.',
      'La gestión de identidades está centralizada (Active Directory / IdP).',
      'Los accesos se revisan periódicamente y se revocan al cese del personal.',
      'Existe una política de contraseñas y credenciales aplicada.',
    ],
  },
  {
    id: 'end', nombre: 'Endpoints (Equipos)',
    servicios: ['EDR/XDR', 'Seguridad Gestionada'],
    preguntas: [
      'Todos los equipos tienen protección antimalware/EDR activa y actualizada.',
      'Los equipos están cifrados y con actualizaciones de seguridad al día.',
      'Se controla qué software puede instalarse en los equipos.',
    ],
  },
  {
    id: 'red', nombre: 'Red e Infraestructura',
    servicios: ['Segmentación de red', 'Diseño de infraestructura segura', 'CSPM'],
    preguntas: [
      'La red está segmentada y protegida con firewall gestionado.',
      'La infraestructura está documentada y endurecida (hardening).',
      'El acceso remoto se realiza por canales cifrados (VPN) con MFA.',
    ],
  },
  {
    id: 'datos', nombre: 'Datos y Respaldo',
    servicios: ['BCP/DRP', 'Seguridad Gestionada'],
    preguntas: [
      'Se realizan respaldos periódicos con pruebas de restauración.',
      'La información se clasifica según su sensibilidad.',
      'Los datos sensibles se cifran en reposo y en tránsito.',
    ],
  },
  {
    id: 'pii', nombre: 'Protección de Datos Personales',
    servicios: ['Ley 21.719'],
    preguntas: [
      'El tratamiento de datos personales tiene base legal y un registro de actividades.',
      'Se aplican medidas de seguridad y privacidad conforme a la Ley 21.719.',
      'Existe un proceso para atender los derechos de los titulares y notificar brechas.',
    ],
  },
  {
    id: 'cont', nombre: 'Continuidad del Negocio',
    servicios: ['BCP/DRP'],
    preguntas: [
      'Existe un plan de continuidad y recuperación ante desastres (BCP/DRP).',
      'Se han definido objetivos de recuperación (RTO/RPO) y se prueban.',
    ],
  },
  {
    id: 'aware', nombre: 'Concientización del Personal',
    servicios: ['Capacitación', 'phishing'],
    preguntas: [
      'El personal recibe capacitación periódica en ciberseguridad.',
      'Se realizan simulaciones de phishing y campañas de concientización.',
    ],
  },
  {
    id: 'mon', nombre: 'Monitoreo y Respuesta a Incidentes',
    servicios: ['Seguridad Gestionada', 'DFIR', 'VMaaS'],
    preguntas: [
      'Se centralizan y monitorean los logs/eventos de seguridad.',
      'Existe un proceso (o retainer) de respuesta a incidentes.',
      'Se gestionan las vulnerabilidades técnicas (escaneo y parcheo).',
    ],
  },
  {
    id: 'val', nombre: 'Validación de Seguridad',
    servicios: ['Pentest', 'Red Team', 'CSPM'],
    preguntas: [
      'Se han realizado pruebas de penetración (pentest) o auditorías técnicas.',
      'Se revisa periódicamente la configuración de los servicios cloud (CSPM).',
    ],
  },
]

const VAL = { si: 100, parcial: 50, no: 0 }
const nivelDe = (s) => (s >= 80 ? 'Alto' : s >= 50 ? 'Medio' : 'Bajo')

// respuestas: { '<domId>-<idx>': 'si'|'parcial'|'no'|'na' }
function evaluar(respuestas = {}) {
  const dominios = DOMINIOS.map(d => {
    let sum = 0, n = 0
    d.preguntas.forEach((_, i) => {
      const a = respuestas[`${d.id}-${i}`]
      if (a && a !== 'na') { sum += (VAL[a] ?? 0); n++ }
    })
    return { id: d.id, nombre: d.nombre, score: n ? Math.round(sum / n) : null, respondidas: n, total: d.preguntas.length }
  })
  const conDatos = dominios.filter(d => d.score != null)
  const scoreTotal = conDatos.length ? Math.round(conDatos.reduce((s, d) => s + d.score, 0) / conDatos.length) : 0
  // Brechas: dominios con score < 70 (o con respuestas y bajo). Servicios recomendados = unión.
  const brechas = dominios.filter(d => d.score != null && d.score < 70)
  const servicios = []
  brechas.forEach(d => {
    const def = DOMINIOS.find(x => x.id === d.id)
    def.servicios.forEach(k => { if (!servicios.includes(k)) servicios.push(k) })
  })
  return { dominios, scoreTotal, nivel: nivelDe(scoreTotal), brechas: brechas.map(b => b.id), servicios }
}

module.exports = { DOMINIOS, evaluar, nivelDe }
