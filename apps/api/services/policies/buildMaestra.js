// buildMaestra.js — genera la Política de Seguridad de la Información (MAESTRA,
// control A.5.1) como documento Word profesional, replicando la estructura de
// DSTAC-PSI-001 v2.0. Auto-rellena {{EMPRESA}}, {{CODIGO}}, {{RSI}}, {{FECHA}},
// {{VERSION}}; deja como marcadores los datos que el sistema no conoce
// ([REPRESENTANTE LEGAL], firmas, etc.).
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} = require('docx')

const NAVY = '1A1740', PURPLE = '534AB7', GRAY = '6A675E', LINE = 'D9D7CE'
const B = { style: BorderStyle.SINGLE, size: 2, color: LINE }
const BORDERS = { top: B, bottom: B, left: B, right: B }

function sub(t, d) {
  return String(t)
    .replace(/{{EMPRESA}}/g, d.empresa)
    .replace(/{{CODIGO}}/g, d.codigo)
    .replace(/{{RSI}}/g, d.rsi)
    .replace(/{{REPRESENTANTE}}/g, d.representante)
    .replace(/{{FECHA}}/g, d.fecha)
    .replace(/{{VERSION}}/g, d.version)
}

function H(num, text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 },
    children: [new TextRun({ text: `${num}. ${text}`, bold: true, color: NAVY, size: 26 })] })
}
function H2(text) {
  return new Paragraph({ spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, color: PURPLE, size: 22 })] })
}
function P(text, d) {
  return new Paragraph({ spacing: { after: 110 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: sub(text, d), size: 21, color: '2C2C2A' })] })
}
function LI(text, d) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: sub(text, d), size: 21, color: '2C2C2A' })] })
}
function cell(text, d, { head = false, w = 50, bold = false } = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE }, borders: BORDERS,
    shading: head ? { fill: NAVY } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ children: [new TextRun({ text: sub(text, d), bold: head || bold, color: head ? 'FFFFFF' : '2C2C2A', size: 19 })] })],
  })
}
function table(rows, widths, d, { headerFirst = true } = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, ri) => new TableRow({
      children: r.map((c, ci) => cell(c, d, { head: headerFirst && ri === 0, w: widths[ci] })),
    })),
  })
}

function buildMaestra(d) {
  // Defaults de marcadores
  d = {
    empresa: d.empresa || '[EMPRESA]',
    codigo: d.codigo || '[CÓDIGO]',
    rsi: d.rsi || '[Responsable de Seguridad de la Información]',
    representante: d.representante || '[Representante Legal]',
    fecha: d.fecha || '[FECHA]',
    version: d.version || '1.0',
  }

  const children = []
  const push = (...x) => children.push(...x)

  // Portada
  push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 40 },
      children: [new TextRun({ text: 'Política de Seguridad de la Información', bold: true, color: NAVY, size: 40 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 },
      children: [new TextRun({ text: sub('{{EMPRESA}}', d), bold: true, color: PURPLE, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 },
      children: [new TextRun({ text: sub('{{CODIGO}} · Versión {{VERSION}} · {{FECHA}} · Clasificación: Interno / Confidencial', d), color: GRAY, size: 18 })] }),
  )

  // 1. Control documental
  push(H('1', 'Información de Control Documental'))
  push(table([
    ['Nombre del Documento', 'Política de Seguridad de la Información'],
    ['Código', '{{CODIGO}}'],
    ['Versión', '{{VERSION}}'],
    ['Clasificación', 'Interno / Confidencial'],
    ['Estado', 'Borrador para aprobación de Dirección'],
    ['Propietario', 'Dirección de {{EMPRESA}}'],
    ['Responsable de mantenimiento', 'Responsable de Seguridad de la Información (RSI)'],
    ['Fecha de emisión', '{{FECHA}}'],
    ['Fecha de entrada en vigor', 'Desde aprobación formal por la Dirección'],
    ['Frecuencia de revisión', 'Anual, o ante cambios regulatorios, de servicios o incidentes graves'],
    ['Marco principal', 'ISO/IEC 27001:2022'],
    ['Marcos complementarios', 'NIST CSF 2.0, CIS Controls v8, Ley 21.663, Ley 21.719, Ley 19.628'],
    ['Aplicabilidad', 'Toda la organización: colaboradores, contratistas y terceros con acceso a información o activos de {{EMPRESA}}'],
  ], [32, 68], d, { headerFirst: false }))

  // 2. Historial de versiones
  push(H('2', 'Historial de Versiones'))
  push(table([
    ['Versión', 'Fecha', 'Descripción del cambio', 'Responsable'],
    ['{{VERSION}}', '{{FECHA}}', 'Versión vigente alineada a ISO/IEC 27001:2022.', 'Dirección / RSI'],
  ], [12, 18, 50, 20], d))

  // 3. Aprobaciones
  push(H('3', 'Aprobaciones'))
  push(table([
    ['Rol', 'Nombre', 'Firma', 'Fecha'],
    ['Representante Legal / Dirección General', '{{REPRESENTANTE}}', '', ''],
    ['Responsable de Seguridad de la Información', '{{RSI}}', '', ''],
  ], [38, 30, 17, 15], d))

  // 4. Propósito
  push(H('4', 'Propósito'),
    P('La presente Política de Seguridad de la Información tiene como propósito establecer el marco corporativo mediante el cual {{EMPRESA}} protege la confidencialidad, integridad, disponibilidad, autenticidad y trazabilidad de la información bajo su responsabilidad.', d),
    P('Esta política constituye el documento rector del Sistema de Gestión de Seguridad de la Información (SGSI) de {{EMPRESA}}, conforme a los requisitos de la norma ISO/IEC 27001:2022. Todos los controles, procedimientos, estándares e instructivos de seguridad se subordinan a los principios y directrices aquí establecidos.', d),
    P('La seguridad de la información es considerada un habilitador estratégico del negocio y un diferenciador competitivo, no un costo de cumplimiento. Su gestión debe ser proporcional al riesgo real, sostenible en el tiempo y coherente con la capacidad operativa de la organización.', d))

  // 5. Alcance
  push(H('5', 'Alcance'), P('Esta política aplica a:', d),
    LI('Toda la información creada, recibida, procesada, transmitida, almacenada o eliminada por {{EMPRESA}}, independientemente de su formato o medio.', d),
    LI('Todos los servicios prestados por {{EMPRESA}}.', d),
    LI('Todos los activos tecnológicos propios o autorizados: estaciones de trabajo, dispositivos móviles, cuentas corporativas, repositorios, plataformas cloud y herramientas de trabajo.', d),
    LI('Todo el personal: colaboradores internos, independientemente de modalidad de contrato, jornada o ubicación física.', d),
    LI('Contratistas y terceros con acceso a información, sistemas o activos de {{EMPRESA}}, en la medida definida contractualmente.', d),
    P('Queda prohibido excluir información, activos, sistemas o personas del alcance de esta política sin una excepción formal aprobada por la Dirección según el procedimiento establecido en la Sección 14.', d))

  // 6. Marco Normativo
  push(H('6', 'Marco Normativo de Referencia'),
    P('{{EMPRESA}} ha diseñado su SGSI considerando los siguientes marcos normativos y obligaciones aplicables:', d),
    H2('6.1 Estándares internacionales'),
    LI('ISO/IEC 27001:2022 — Marco principal del SGSI. Esta política satisface los requisitos de la Cláusula 5.2 (Política de Seguridad de la Información).', d),
    LI('NIST Cybersecurity Framework 2.0 — Marco complementario, con énfasis en la función Govern.', d),
    LI('CIS Controls v8 — Referencia para controles técnicos y operativos priorizados.', d),
    H2('6.2 Marco legal chileno'),
    LI('Ley Marco de Ciberseguridad N° 21.663 — Aplicable directa e indirectamente según el rol de la organización y la naturaleza de sus clientes.', d),
    LI('Ley N° 21.719 de Protección de Datos Personales — Aplicable al tratamiento de datos personales de clientes, colaboradores y terceros.', d),
    LI('Ley N° 19.628 — Vigente como marco base hasta la entrada en vigor plena de la Ley 21.719.', d),
    H2('6.3 Obligaciones contractuales'),
    LI('Contratos de prestación de servicios con clientes, incluyendo acuerdos de confidencialidad.', d),
    LI('Normativas sectoriales de clientes cuando sean parte del alcance del servicio contratado.', d))

  // 7. Contexto
  push(H('7', 'Contexto de la Organización'),
    P('[Describa aquí el contexto de {{EMPRESA}}: a qué se dedica, sus servicios o productos principales, tamaño del equipo, modelo de infraestructura (cloud / física / híbrida) y el tipo de información sensible que gestiona.]', d),
    P('El análisis completo del contexto externo e interno, las partes interesadas y sus requisitos se documenta en el documento de Contexto de la Organización (Cláusula 4 de ISO/IEC 27001:2022).', d))

  // 8. Compromiso de la Dirección
  push(H('8', 'Declaración de Compromiso de la Dirección'),
    P('La Dirección de {{EMPRESA}} declara su compromiso inequívoco con la protección de la información, la gestión responsable de riesgos de ciberseguridad, el cumplimiento normativo y la mejora continua del SGSI.', d),
    P('En virtud de este compromiso, la Dirección:', d),
    LI('Aprueba formalmente la presente política y asegura su comunicación, comprensión y cumplimiento en toda la organización.', d),
    LI('Asigna responsabilidades, autoridad y recursos razonables para la implementación y operación del SGSI.', d),
    LI('Define el apetito de riesgo de la organización y asegura que los riesgos superiores al nivel aceptado sean tratados, justificados o aprobados formalmente.', d),
    LI('Exige rendición de cuentas respecto del cumplimiento de políticas, gestión de riesgos, incidentes, excepciones y planes de mejora.', d),
    LI('Promueve una cultura de seguridad, confidencialidad y ética profesional.', d),
    LI('Asegura que la seguridad de la información sea considerada en las decisiones estratégicas, comerciales, operativas y tecnológicas.', d),
    LI('Supervisa periódicamente el desempeño del SGSI mediante indicadores, informes de incidentes, resultados de auditorías y revisiones formales.', d))

  // 9. Principios
  push(H('9', 'Principios Fundamentales de Seguridad'),
    P('{{EMPRESA}} adopta los siguientes principios como base de todas las decisiones, controles y comportamientos relacionados con la seguridad de la información. Son obligatorios y no admiten excepciones sin aprobación formal.', d))
  push(table([
    ['Principio', 'Descripción'],
    ['Confidencialidad', 'La información se protege contra accesos, divulgaciones o usos no autorizados. Toda información de cliente se clasifica como mínimo Confidencial, salvo acuerdo contractual más restrictivo.'],
    ['Integridad', 'Se previenen alteraciones no autorizadas de reportes, evidencias, registros, configuraciones y documentación. La exactitud y completitud de la información son requisitos no negociables.'],
    ['Disponibilidad', 'La información y los activos relevantes están disponibles para los usuarios autorizados cuando son requeridos, conforme a las necesidades operativas y contractuales.'],
    ['Autenticidad', 'Se verifican la identidad de usuarios, sistemas, fuentes de información y comunicaciones críticas mediante mecanismos proporcionales al riesgo.'],
    ['Trazabilidad', 'Se mantienen registros suficientes para reconstruir actividades relevantes, accesos, cambios, transferencias de información y decisiones de seguridad.'],
    ['Mínimo privilegio', 'Se otorgan únicamente los accesos mínimos necesarios para cumplir funciones autorizadas. Los privilegios se revisan periódicamente y se revocan cuando dejan de ser necesarios.'],
    ['Necesidad de conocer', 'El acceso a información se autoriza solo cuando existe necesidad operativa, contractual o funcional justificada.'],
    ['Zero Trust', 'No se confía de forma implícita en usuarios, dispositivos, redes o sistemas. Todo acceso debe ser verificado, autorizado, monitoreado y limitado según riesgo y contexto.'],
    ['Responsabilidad individual', 'Toda acción realizada con cuentas personales, corporativas o privilegiadas es atribuible al usuario designado. La delegación de acceso no transfiere la responsabilidad.'],
    ['Ética profesional', 'El uso de herramientas, técnicas y conocimiento se limita estrictamente a actividades autorizadas, dentro del alcance contratado y bajo principios deontológicos.'],
  ], [26, 74], d))

  // 10. Objetivos
  push(H('10', 'Objetivos de Seguridad de la Información'),
    P('{{EMPRESA}} establece objetivos medibles para el período de vigencia de esta política. El RSI reporta su estado a la Dirección al menos semestralmente.', d))
  push(table([
    ['ID', 'Objetivo', 'Indicador', 'Meta', 'Responsable'],
    ['OBJ-01', 'Cero incidentes de filtración de información de clientes', 'N° de incidentes de filtración confirmados', '0 por año', 'RSI'],
    ['OBJ-02', 'Cero servicios ejecutados fuera del alcance autorizado', 'N° de hallazgos por scope creep', '0 por año', 'Resp. de proyecto'],
    ['OBJ-03', 'Gestión formal de identidades y accesos', '% de cuentas con acceso justificado y documentado', '100% en revisión semestral', 'RSI'],
    ['OBJ-04', 'MFA en cuentas críticas', '% de cuentas críticas con MFA activo', '100% en 90 días', 'RSI'],
    ['OBJ-05', 'Políticas específicas documentadas y comunicadas', 'N° de políticas publicadas y comunicadas', 'Mínimo 6 en el primer año', 'RSI'],
    ['OBJ-06', 'Cumplimiento legal monitorizado', 'Registro de obligaciones legales actualizado', '100% actualizado anualmente', 'RSI'],
    ['OBJ-07', 'Gestión de incidentes operativa', 'Tiempo máximo de reporte interno desde detección', 'Máx. 4 horas hábiles', 'Todo el personal'],
    ['OBJ-08', 'Concienciación del equipo', '% de colaboradores capacitados en SI', '100% anualmente', 'RSI'],
  ], [10, 30, 28, 18, 14], d))

  // 11. Gobierno y roles
  push(H('11', 'Estructura de Gobierno y Roles'),
    P('{{EMPRESA}} establece la siguiente estructura de gobierno, proporcional a su tamaño, madurez, riesgos y servicios.', d),
    H2('11.1 Dirección'), P('La Dirección es responsable de: aprobar esta política y sus actualizaciones; definir el apetito y tolerancia al riesgo; asignar recursos para el SGSI; aprobar excepciones; revisar informes de seguridad, incidentes y auditorías; y decidir sobre riesgos que superen el nivel aceptado.', d),
    H2('11.2 Responsable de Seguridad de la Información (RSI)'), P('Rol desempeñado por {{RSI}}. Es responsable de: coordinar la implementación, mantenimiento y mejora del SGSI; mantener políticas, procedimientos y controles; gestionar el registro de riesgos, excepciones e incidentes; reportar a la Dirección; mantener el registro de cumplimiento legal; y gestionar la concienciación del equipo.', d),
    H2('11.3 Personal, Contratistas y Terceros'), P('Todo el personal y los terceros con acceso deben: acceder solo a la información necesaria para sus funciones autorizadas; cumplir esta política y los procedimientos relacionados; firmar acuerdos de confidencialidad antes de acceder; y reportar cualquier evento sospechoso, pérdida de información o acceso indebido.', d))

  // 12. Políticas específicas
  push(H('12', 'Dominios de Control y Políticas Específicas'),
    P('Esta política maestra se desarrolla mediante un conjunto de políticas específicas que cubren cada dominio de control. Cada política específica detalla los controles, procedimientos, responsables y métricas de su ámbito, y debe ser coherente con los principios de este documento.', d))
  push(table([
    ['Código', 'Nombre del Documento', 'Estado'],
    ['{{CODIGO_PSE}}-001', 'Política de Clasificación y Manejo de la Información', 'En desarrollo'],
    ['{{CODIGO_PSE}}-002', 'Política de Gestión de Identidades y Accesos', 'En desarrollo'],
    ['{{CODIGO_PSE}}-003', 'Política de Gestión de Credenciales', 'En desarrollo'],
    ['{{CODIGO_PSE}}-004', 'Política de Uso Aceptable de Activos Tecnológicos', 'En desarrollo'],
    ['{{CODIGO_PSE}}-005', 'Política de Gestión de Incidentes de Seguridad', 'En desarrollo'],
    ['{{CODIGO_PSE}}-006', 'Política de Trabajo Remoto y Acceso Remoto', 'En desarrollo'],
    ['{{CODIGO_PSE}}-007', 'Política de Gestión de Proveedores y Terceros', 'En desarrollo'],
    ['{{CODIGO_PSE}}-008', 'Política de Respaldo y Recuperación', 'En desarrollo'],
  ].map(r => r.map(c => c.replace(/{{CODIGO_PSE}}/g, d.codigo.replace('-PSI-001', '-PSE')))), [22, 58, 20], d))
  push(P('La ausencia de una política específica no exime del cumplimiento de los principios establecidos en este documento. En tal caso, el criterio de decisión es: ¿protegería esta acción la confidencialidad, integridad y disponibilidad de la información? Si la respuesta es no, la acción requiere aprobación formal antes de ejecutarse.', d))

  // 13. Gestión de riesgos
  push(H('13', 'Gestión de Riesgos'),
    P('{{EMPRESA}} gestiona los riesgos de seguridad de la información como una actividad continua, documentada y proporcional a la criticidad de sus activos, servicios y obligaciones contractuales.', d),
    H2('13.1 Principios'),
    LI('La gestión de riesgos es una responsabilidad compartida: el RSI coordina el proceso; los responsables de servicio y la Dirección participan activamente.', d),
    LI('Todo riesgo identificado debe ser evaluado, categorizado y tratado. No es aceptable ignorar riesgos conocidos.', d),
    LI('El tratamiento puede ser: mitigar, aceptar (con justificación formal), transferir o eliminar.', d),
    LI('Los riesgos que superen el apetito definido por la Dirección se escalan y tratan con prioridad.', d),
    H2('13.2 Apetito de riesgo'),
    LI('Riesgo CERO en: filtración de información de clientes, actividades fuera del alcance autorizado, uso indebido de credenciales y violaciones éticas o legales.', d),
    LI('Riesgo BAJO aceptado: debilidades internas sin exposición externa, con controles compensatorios documentados.', d),
    LI('Riesgo MEDIO aceptado temporalmente con plan de tratamiento activo y plazo máximo de 90 días.', d),
    LI('Riesgo ALTO o CRÍTICO: requiere aprobación formal de la Dirección, plan de tratamiento inmediato y seguimiento semanal.', d))

  // 14. Cumplimiento, excepciones, consecuencias
  push(H('14', 'Cumplimiento, Excepciones y Consecuencias'),
    H2('14.1 Cumplimiento'), P('El cumplimiento de esta política y de las políticas específicas derivadas es obligatorio para toda persona incluida en el alcance. El desconocimiento de esta política no exime de su cumplimiento. El RSI mantiene evidencia razonable del cumplimiento de las obligaciones del SGSI.', d),
    H2('14.2 Gestión de excepciones'), P('Toda desviación a esta política o a sus controles se trata mediante un proceso formal de excepción. No se aceptan excepciones informales, verbales o tácitas. Cada excepción documenta: descripción y justificación, activos/personas afectadas, riesgo y controles compensatorios, responsable, fecha de expiración y aprobación formal. Las excepciones tienen vigencia máxima de 6 meses; vencida y no renovada se considera incumplimiento.', d),
    H2('14.3 Consecuencias del incumplimiento'), P('El incumplimiento puede derivar en: revisión disciplinaria conforme a la normativa laboral; terminación de contratos o acuerdos de confidencialidad; responsabilidad legal individual; y reporte a la Dirección para acciones correctivas. Las consecuencias son proporcionales a la gravedad, intencionalidad e impacto del incumplimiento.', d))

  // 15. Revisión y mejora
  push(H('15', 'Revisión y Mejora Continua'),
    P('El SGSI de {{EMPRESA}} opera bajo el ciclo PDCA (Planificar, Hacer, Verificar, Actuar), conforme a ISO/IEC 27001:2022.', d),
    H2('15.1 Revisión de la política'), P('Esta política se revisa: anualmente como mínimo, en la revisión formal del SGSI por la Dirección (Cláusula 9.3); ante cambios regulatorios; ante cambios relevantes en servicios, negocio, tecnología o estructura; y ante incidentes graves que evidencien deficiencias.', d),
    H2('15.2 Auditoría interna'), P('Se realiza al menos una auditoría interna del SGSI por año, evaluando la conformidad con esta política, las políticas específicas y los controles. Los resultados se reportan a la Dirección y alimentan la mejora continua.', d),
    H2('15.3 No conformidades y acciones correctivas'), P('Todo incumplimiento, desviación o debilidad se registra como no conformidad, se analiza su causa raíz y se trata mediante acciones correctivas documentadas con responsable y plazo.', d))

  // 16. Glosario
  push(H('16', 'Glosario'))
  push(table([
    ['Término', 'Definición'],
    ['Activo de información', 'Todo dato, documento, sistema, plataforma, cuenta, credencial o herramienta que tenga valor para la organización o sus clientes.'],
    ['Apetito de riesgo', 'Nivel de riesgo que la organización está dispuesta a asumir para el logro de sus objetivos estratégicos.'],
    ['Confidencialidad', 'Propiedad que garantiza que solo personas autorizadas puedan acceder a la información.'],
    ['Disponibilidad', 'Propiedad que garantiza que la información sea accesible para usuarios autorizados cuando la requieran.'],
    ['Integridad', 'Propiedad que garantiza la exactitud y completitud de la información y su protección contra alteraciones no autorizadas.'],
    ['Incidente de seguridad', 'Evento que compromete o amenaza la confidencialidad, integridad o disponibilidad de información o activos.'],
    ['MFA', 'Autenticación Multifactor. Mecanismo que requiere dos o más factores de verificación para autenticar un acceso.'],
    ['Mínimo privilegio', 'Principio de otorgar únicamente los accesos necesarios para cumplir una función específica.'],
    ['No conformidad', 'Incumplimiento de un requisito de la política, procedimiento o estándar del SGSI.'],
    ['RSI', 'Responsable de Seguridad de la Información. Coordina la implementación y operación del SGSI.'],
    ['SGSI', 'Sistema de Gestión de Seguridad de la Información. Conjunto de políticas, procedimientos, controles y procesos.'],
    ['Zero Trust', 'Modelo que no otorga confianza implícita a ningún usuario, dispositivo o red, requiriendo verificación continua.'],
  ], [24, 76], d))

  push(new Paragraph({ spacing: { before: 240 },
    children: [new TextRun({ text: 'Documento generado por la plataforma DSTAC CIBERSECURITY. Complete los campos entre corchetes, ajuste el contexto y los objetivos a la realidad de la organización, y obtenga la aprobación formal de la Dirección antes de su entrada en vigor.', italics: true, color: GRAY, size: 16 })] }))

  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } } }, children }] })
  return Packer.toBuffer(doc)
}

module.exports = { buildMaestra }
