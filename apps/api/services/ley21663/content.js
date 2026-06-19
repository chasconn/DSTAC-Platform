// content.js — contenido de la Política de Ciberseguridad (Ley N° 21.663,
// Ley Marco de Ciberseguridad e Infraestructura Crítica de la Información) y
// del cuestionario de evaluación del módulo. Documento generado vía buildEspecifica.
const POLITICA = {
  titulo: 'Política de Ciberseguridad y Gestión de Incidentes (Ley N° 21.663)',
  objetivo: 'Establecer el marco de gobernanza, prevención, detección, notificación y respuesta ante incidentes de ciberseguridad de {{EMPRESA}}, dando cumplimiento a la Ley N° 21.663 (Ley Marco de Ciberseguridad e Infraestructura Crítica de la Información) y a las exigencias de la Agencia Nacional de Ciberseguridad (ANCI).',
  alcance: 'Esta política aplica a todos los sistemas, redes, datos y servicios de {{EMPRESA}} que sean relevantes para su operación, así como al personal, contratistas y proveedores que participen en su provisión. Si {{EMPRESA}} es calificada como Operador de Importancia Vital (OIV) o presta un servicio esencial conforme a la Ley N° 21.663, esta política incorpora además las obligaciones reforzadas que correspondan a dicha calificación.',
  controlRowLabel: 'Norma relacionada',
  politicaMaestra: 'Política de Seguridad de la Información (documento rector del SGSI)',
  historialInicial: 'Emisión inicial alineada a la Ley N° 21.663 y su reglamento.',
  propositoExtra: 'Esta política desarrolla, para el ámbito de la ciberseguridad y la gestión de incidentes, los principios establecidos en la Política de Seguridad de la Información de {{EMPRESA}}, en conformidad con la Ley N° 21.663 y los estándares mínimos de seguridad exigibles según el rol y sector de la organización.',
  marcoNormativo: [
    'Ley N° 21.663, Ley Marco de Ciberseguridad e Infraestructura Crítica de la Información, y su reglamento.',
    'Estándares e instrucciones emitidos por la Agencia Nacional de Ciberseguridad (ANCI) y, cuando corresponda, por el CSIRT Nacional.',
    'ISO/IEC 27001:2022, NIST Cybersecurity Framework 2.0 y CIS Controls v8 — referencias complementarias de buenas prácticas.',
    'Ley N° 21.719, Protección de Datos Personales, cuando un incidente involucre datos personales.',
  ],
  revisionExtra: 'Esta política se revisa al menos una vez al año, ante cambios normativos o instrucciones de la ANCI, o tras la ocurrencia de un incidente significativo. Los resultados de simulacros, brechas detectadas y notificaciones efectuadas se reportan a la Dirección como parte de la mejora continua del proceso de gestión de incidentes.',
  definiciones: [
    ['Incidente de ciberseguridad', 'Evento que compromete o pone en riesgo la confidencialidad, integridad o disponibilidad de un sistema, red o información, con potencial de afectar la operación de la organización o de terceros.'],
    ['Incidente de alta probabilidad de impacto significativo o significativo', 'Categorías de incidente definidas por la Ley N° 21.663 según su severidad, que determinan plazos y obligaciones de notificación a la ANCI/CSIRT Nacional.'],
    ['Operador de Importancia Vital (OIV)', 'Organización calificada por la ANCI cuya continuidad operacional es esencial para el país, sujeta a obligaciones reforzadas de ciberseguridad.'],
    ['ANCI', 'Agencia Nacional de Ciberseguridad, autoridad encargada de coordinar la ciberseguridad a nivel nacional conforme a la Ley N° 21.663.'],
    ['CSIRT Nacional', 'Equipo de Respuesta a Incidentes de Seguridad Informática del Estado, receptor de las notificaciones de incidentes.'],
    ['Delegado de Ciberseguridad', 'Persona designada por la organización como contraparte formal ante la ANCI para materias de ciberseguridad.'],
  ],
  directrices: [
    ['Gobernanza', [
      'La Dirección designa un Delegado de Ciberseguridad como contraparte formal ante la ANCI.',
      'Se evalúa anualmente si {{EMPRESA}} corresponde a la calificación de Operador de Importancia Vital (OIV) o presta un servicio esencial, y se documenta el resultado.',
      'Se mantienen estándares mínimos de seguridad acordes al rol y sector de la organización, revisados conforme a las instrucciones de la ANCI.',
    ]],
    ['Gestión de incidentes', [
      'Se mantiene un proceso documentado de identificación, clasificación, contención, erradicación y recuperación ante incidentes de ciberseguridad.',
      'Todo incidente se clasifica según su severidad (incluyendo las categorías "con probabilidad de impacto significativo" y "significativo") conforme a los criterios de la Ley N° 21.663.',
      'Se mantiene una bitácora/registro de incidentes con fecha de detección, clasificación, acciones tomadas y cierre.',
    ]],
    ['Notificación a la autoridad', [
      'Los incidentes que correspondan se notifican al CSIRT Nacional y/o a la ANCI dentro de los plazos legales establecidos según su clasificación.',
      'Se designa un responsable de mantener actualizados los datos de contacto del Delegado de Ciberseguridad ante la ANCI.',
      'Cuando el incidente involucre datos personales, se evalúa adicionalmente la obligación de notificación bajo la Ley N° 21.719.',
    ]],
    ['Terceros y cadena de suministro', [
      'Los contratos con proveedores críticos incluyen obligaciones de ciberseguridad y de reporte de incidentes que les afecten y puedan impactar a {{EMPRESA}}.',
      'Se evalúa periódicamente el riesgo de ciberseguridad asociado a proveedores relevantes para la operación.',
    ]],
    'Se realizan ejercicios o simulacros periódicos para validar la efectividad del proceso de gestión y notificación de incidentes.',
  ],
  registros: [
    'Registro/bitácora de incidentes de ciberseguridad y su clasificación.',
    'Evidencia de notificaciones efectuadas al CSIRT Nacional / ANCI y sus plazos.',
    'Acta de designación del Delegado de Ciberseguridad.',
    'Evaluación de calificación como OIV / prestador de servicio esencial.',
    'Registros de simulacros y ejercicios de respuesta a incidentes.',
  ],
  glosario: [
    ['ANCI', 'Agencia Nacional de Ciberseguridad.'],
    ['CSIRT Nacional', 'Equipo de Respuesta a Incidentes de Seguridad Informática del Estado.'],
    ['OIV', 'Operador de Importancia Vital.'],
    ['Incidente significativo', 'Incidente de ciberseguridad de mayor severidad sujeto a plazos de notificación más estrictos conforme a la Ley N° 21.663.'],
    ['Delegado de Ciberseguridad', 'Contraparte formal de la organización ante la ANCI.'],
  ],
}

// Cuestionario corto de autoevaluación (no usa dominios; una sola lista).
const PREGUNTAS = [
  '¿Se ha evaluado si la organización corresponde a un Operador de Importancia Vital (OIV) o presta un servicio esencial según la Ley N° 21.663?',
  '¿Existe un Delegado de Ciberseguridad designado como contraparte ante la ANCI?',
  '¿Existe un proceso documentado de gestión de incidentes de ciberseguridad (identificación, clasificación, respuesta)?',
  '¿Se conocen los plazos y el procedimiento para notificar incidentes al CSIRT Nacional / ANCI según su clasificación?',
  '¿Se mantiene un registro/bitácora de incidentes de ciberseguridad?',
  '¿Se aplican estándares mínimos de seguridad acordes al rol y sector de la organización?',
  '¿Los contratos con proveedores críticos incluyen obligaciones de ciberseguridad y reporte de incidentes?',
  '¿Se han realizado simulacros o ejercicios de respuesta a incidentes en el último año?',
]

const VAL = { si: 100, parcial: 50, no: 0 }
const nivelDe = (s) => (s >= 80 ? 'Alto' : s >= 50 ? 'Medio' : 'Bajo')

// respuestas: { '0': 'si'|'parcial'|'no'|'na', ... }
function evaluar(respuestas = {}) {
  let sum = 0, n = 0
  const brechas = []
  PREGUNTAS.forEach((p, i) => {
    const a = respuestas[i]
    if (a && a !== 'na') {
      sum += (VAL[a] ?? 0); n++
      if (VAL[a] < 70) brechas.push(p)
    }
  })
  const scoreTotal = n ? Math.round(sum / n) : 0
  return { scoreTotal, nivel: nivelDe(scoreTotal), respondidas: n, total: PREGUNTAS.length, brechas }
}

module.exports = { POLITICA, PREGUNTAS, evaluar, nivelDe }
