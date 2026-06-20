// content.js — contenido de la Política de Protección de Datos Personales
// (Ley N° 21.719) y del cuestionario de evaluación del módulo. Documento
// generado vía buildEspecifica (mismo motor que el módulo Ley 21.663).
const POLITICA = {
  titulo: 'Política de Protección de Datos Personales (Ley N° 21.719)',
  objetivo: 'Establecer los principios, roles y procedimientos que rigen el tratamiento de datos personales por parte de {{EMPRESA}}, dando cumplimiento a la Ley N° 21.719 sobre Protección de Datos Personales y a las instrucciones de la Agencia de Protección de Datos Personales.',
  alcance: 'Esta política aplica a todo tratamiento de datos personales de clientes, colaboradores, proveedores y terceros que realice {{EMPRESA}}, por sí misma o a través de encargados de tratamiento, en cualquier soporte físico o digital.',
  controlRowLabel: 'Norma relacionada',
  politicaMaestra: 'Política de Seguridad de la Información (documento rector del SGSI)',
  historialInicial: 'Emisión inicial alineada a la Ley N° 21.719 y su reglamento.',
  propositoExtra: 'Esta política desarrolla, para el ámbito de la protección de datos personales, los principios establecidos en la Política de Seguridad de la Información de {{EMPRESA}}, en conformidad con la Ley N° 21.719.',
  marcoNormativo: [
    'Ley N° 21.719, que regula la Protección y el Tratamiento de los Datos Personales y crea la Agencia de Protección de Datos Personales.',
    'Ley N° 19.628, sobre Protección de la Vida Privada, vigente como marco base hasta la entrada en vigor plena de la Ley N° 21.719.',
    'Instrucciones generales y normativas emitidas por la Agencia de Protección de Datos Personales.',
    'Ley N° 21.663, Ley Marco de Ciberseguridad, cuando una brecha de seguridad involucre datos personales.',
  ],
  revisionExtra: 'Esta política se revisa al menos una vez al año, ante cambios normativos o instrucciones de la Agencia de Protección de Datos Personales, o tras la ocurrencia de una brecha de seguridad. Los resultados de auditorías, solicitudes de derechos ARCO+ y brechas notificadas se reportan a la Dirección como parte de la mejora continua.',
  definiciones: [
    ['Dato personal', 'Cualquier información vinculada o referida a una persona natural identificada o identificable.'],
    ['Titular de datos', 'Persona natural a la que se refieren los datos personales objeto de tratamiento.'],
    ['Responsable de tratamiento', 'Persona natural o jurídica que decide sobre los fines y medios del tratamiento de datos personales — en este caso, {{EMPRESA}}.'],
    ['Encargado de tratamiento', 'Persona natural o jurídica que trata datos personales por cuenta del responsable de tratamiento (ej. proveedores de servicios).'],
    ['Delegado de Protección de Datos (DPO)', 'Persona designada para asesorar y supervisar el cumplimiento de la normativa de protección de datos dentro de la organización.'],
    ['Derechos ARCO+', 'Derechos de Acceso, Rectificación, Cancelación, Oposición y Portabilidad que la ley reconoce a los titulares de datos.'],
    ['Brecha de seguridad de datos personales', 'Incidente que compromete la confidencialidad, integridad o disponibilidad de datos personales, con riesgo para los derechos de sus titulares.'],
    ['Agencia de Protección de Datos Personales', 'Autoridad de control encargada de fiscalizar el cumplimiento de la Ley N° 21.719.'],
  ],
  directrices: [
    ['Gobernanza y roles', [
      'La Dirección designa un Delegado de Protección de Datos (DPO) o responsable equivalente cuando corresponda según la ley.',
      'Se mantiene un registro de actividades de tratamiento de datos personales, identificando finalidad, base de licitud y plazos de conservación.',
      'Se identifican los encargados de tratamiento (proveedores) que procesan datos personales por cuenta de {{EMPRESA}}.',
    ]],
    ['Derechos de los titulares', [
      'Existe un procedimiento documentado para recibir y responder solicitudes de derechos ARCO+ dentro de los plazos legales.',
      'El personal que atiende estas solicitudes conoce el procedimiento y los plazos aplicables.',
    ]],
    ['Seguridad y brechas', [
      'Se aplican medidas de seguridad técnicas y organizativas proporcionales al riesgo del tratamiento.',
      'Existe un procedimiento de detección, evaluación y notificación de brechas de seguridad de datos personales a la Agencia de Protección de Datos Personales y, cuando corresponda, a los titulares afectados.',
      'Toda brecha de seguridad de datos personales se registra con fecha de detección, alcance, acciones tomadas y notificaciones efectuadas.',
    ]],
    ['Transferencias y terceros', [
      'Las transferencias internacionales de datos personales cuentan con las garantías y mecanismos exigidos por la ley.',
      'Los contratos con encargados de tratamiento incluyen cláusulas de protección de datos personales y obligaciones de confidencialidad.',
    ]],
    'Se realizan evaluaciones de impacto en protección de datos (EIPD) para tratamientos de alto riesgo, cuando corresponda.',
  ],
  registros: [
    'Registro de actividades de tratamiento de datos personales.',
    'Procedimiento y bitácora de solicitudes de derechos ARCO+.',
    'Acta de designación del Delegado de Protección de Datos (DPO).',
    'Registro de brechas de seguridad de datos personales y notificaciones efectuadas.',
    'Evaluaciones de impacto en protección de datos (EIPD), cuando corresponda.',
  ],
  glosario: [
    ['DPO', 'Delegado de Protección de Datos.'],
    ['ARCO+', 'Derechos de Acceso, Rectificación, Cancelación, Oposición y Portabilidad.'],
    ['EIPD', 'Evaluación de Impacto en Protección de Datos.'],
    ['Responsable de tratamiento', 'Quien decide los fines y medios del tratamiento de datos personales.'],
    ['Encargado de tratamiento', 'Quien trata datos personales por cuenta del responsable.'],
  ],
}

// Cuestionario corto de autoevaluación (no usa dominios; una sola lista).
const PREGUNTAS = [
  '¿Se ha designado un Delegado de Protección de Datos (DPO) o responsable equivalente?',
  '¿Existe un registro de actividades de tratamiento de datos personales (finalidad, base de licitud, plazos de conservación)?',
  '¿Existe un procedimiento documentado para responder solicitudes de derechos ARCO+ dentro de los plazos legales?',
  '¿Existe un procedimiento de detección y notificación de brechas de seguridad de datos personales?',
  '¿Se aplican medidas de seguridad técnicas y organizativas proporcionales al riesgo del tratamiento?',
  '¿Las transferencias internacionales de datos personales cuentan con las garantías exigidas por la ley?',
  '¿Los contratos con proveedores que tratan datos personales incluyen cláusulas de protección de datos?',
  '¿Se realizan evaluaciones de impacto en protección de datos (EIPD) para tratamientos de alto riesgo?',
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
