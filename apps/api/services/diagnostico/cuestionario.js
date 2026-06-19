// Cuestionario de Diagnóstico de Madurez (interno, por cliente). ~10 dominios.
// La cotización resultante recomienda UN PLAN (según tamaño) + los PROYECTOS
// à la carte que cierran las brechas (los servicios gestionados van en el plan,
// no se apilan). Respuestas por pregunta: 'si' | 'parcial' | 'no' | 'na'.
const DOMINIOS = [
  {
    id: 'gob', nombre: 'Gobernanza y Cumplimiento',
    proyectos: ['Ley 21.663', 'Ley 21.719', 'ISO 27001'],
    preguntas: [
      'Existe una política de seguridad de la información aprobada y comunicada.',
      'Hay un responsable de seguridad de la información (interno o vCISO) designado.',
      'Se identifican y gestionan los requisitos legales aplicables (Ley 21.663, Ley 21.719).',
      'Se ha evaluado el cumplimiento frente a un estándar (ISO 27001 / NIST).',
    ],
  },
  {
    id: 'iam', nombre: 'Identidades y Accesos',
    proyectos: ['Active Directory', 'Endurecimiento de M365'],
    preguntas: [
      'Se exige autenticación multifactor (MFA) en correo y cuentas críticas.',
      'La gestión de identidades está centralizada (Active Directory / IdP).',
      'Los accesos se revisan periódicamente y se revocan al cese del personal.',
      'Existe una política de contraseñas y credenciales aplicada.',
    ],
  },
  {
    id: 'end', nombre: 'Endpoints (Equipos)',
    proyectos: ['Endurecimiento de M365'],
    preguntas: [
      'Todos los equipos tienen protección antimalware/EDR activa y actualizada.',
      'Los equipos están cifrados y con actualizaciones de seguridad al día.',
      'Se controla qué software puede instalarse en los equipos.',
    ],
  },
  {
    id: 'red', nombre: 'Red e Infraestructura',
    proyectos: ['Segmentación de red', 'Diseño de infraestructura segura', 'CSPM'],
    preguntas: [
      'La red está segmentada y protegida con firewall gestionado.',
      'La infraestructura está documentada y endurecida (hardening).',
      'El acceso remoto se realiza por canales cifrados (VPN) con MFA.',
    ],
  },
  {
    id: 'datos', nombre: 'Datos y Respaldo',
    proyectos: ['BCP/DRP'],
    preguntas: [
      'Se realizan respaldos periódicos con pruebas de restauración.',
      'La información se clasifica según su sensibilidad.',
      'Los datos sensibles se cifran en reposo y en tránsito.',
    ],
  },
  {
    id: 'pii', nombre: 'Protección de Datos Personales',
    proyectos: ['Ley 21.719', 'DPO as-a-Service'],
    preguntas: [
      'El tratamiento de datos personales tiene base legal y un registro de actividades.',
      'Se aplican medidas de seguridad y privacidad conforme a la Ley 21.719.',
      'Existe un proceso para atender los derechos de los titulares y notificar brechas.',
    ],
  },
  {
    id: 'cont', nombre: 'Continuidad del Negocio',
    proyectos: ['BCP/DRP'],
    preguntas: [
      'Existe un plan de continuidad y recuperación ante desastres (BCP/DRP).',
      'Se han definido objetivos de recuperación (RTO/RPO) y se prueban.',
    ],
  },
  {
    id: 'aware', nombre: 'Concientización del Personal',
    proyectos: ['Capacitación'],
    preguntas: [
      'El personal recibe capacitación periódica en ciberseguridad.',
      'Se realizan simulaciones de phishing y campañas de concientización.',
    ],
  },
  {
    id: 'mon', nombre: 'Monitoreo y Respuesta a Incidentes',
    proyectos: [],
    preguntas: [
      'Se centralizan y monitorean los logs/eventos de seguridad.',
      'Existe un proceso (o retainer) de respuesta a incidentes.',
      'Se gestionan las vulnerabilidades técnicas (escaneo y parcheo).',
    ],
  },
  {
    id: 'val', nombre: 'Validación de Seguridad',
    proyectos: ['Pentest', 'Red Team', 'CSPM'],
    preguntas: [
      'Se han realizado pruebas de penetración (pentest) o auditorías técnicas.',
      'Se revisa periódicamente la configuración de los servicios cloud (CSPM).',
    ],
  },
]

// Plan recomendado según el tamaño de la empresa.
const TAMANOS = [
  { id: 'PYMES', label: 'PYME (1–15 colaboradores)', plan: 'Plan PYMES' },
  { id: 'Profesional', label: 'Mediana (15–50 colaboradores)', plan: 'Plan Profesional' },
  { id: 'Empresarial', label: 'Grande (+50 colaboradores)', plan: 'Plan Empresarial' },
]
const planDeTamano = (t) => (TAMANOS.find(x => x.id === t) || TAMANOS[1]).plan

const VAL = { si: 100, parcial: 50, no: 0 }
const nivelDe = (s) => (s >= 80 ? 'Alto' : s >= 50 ? 'Medio' : 'Bajo')

// respuestas: { '<domId>-<idx>': 'si'|'parcial'|'no'|'na', tamano: 'PYMES'|... }
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
  const brechas = dominios.filter(d => d.score != null && d.score < 70)
  const proyectos = []
  brechas.forEach(d => {
    const def = DOMINIOS.find(x => x.id === d.id)
    def.proyectos.forEach(k => { if (!proyectos.includes(k)) proyectos.push(k) })
  })
  const tamano = respuestas.tamano || 'Profesional'
  return { dominios, scoreTotal, nivel: nivelDe(scoreTotal), brechas: brechas.map(b => b.id), proyectos, tamano, plan: planDeTamano(tamano) }
}

module.exports = { DOMINIOS, TAMANOS, evaluar, nivelDe, planDeTamano }
