// buildEspecifica.js — genera una Política Específica (hija) con estructura
// profesional auditable y el CONTENIDO propio de cada política
// (policyContent.js: objetivo, definiciones, directrices, registros). Las
// secciones boilerplate (alcance, roles, cumplimiento, revisión, glosario) se
// auto-rellenan con tokens.
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} = require('docx')

const NAVY = '1A1740', PURPLE = '534AB7', GRAY = '6A675E', LINE = 'D9D7CE'
const B = { style: BorderStyle.SINGLE, size: 2, color: LINE }
const BORDERS = { top: B, bottom: B, left: B, right: B }

function P(text) {
  return new Paragraph({ spacing: { after: 110 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 21, color: '2C2C2A' })] })
}
function SUB(text) {
  return new Paragraph({ spacing: { before: 120, after: 70 },
    children: [new TextRun({ text, bold: true, color: PURPLE, size: 21 })] })
}
function LI(text) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 21, color: '2C2C2A' })] })
}
function cell(text, { head = false, w = 50, bold = false } = {}) {
  return new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, borders: BORDERS,
    shading: head ? { fill: NAVY } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: head || bold, color: head ? 'FFFFFF' : '2C2C2A', size: 19 })] })] })
}
function table(rows, widths, { headerFirst = true } = {}) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => cell(c, { head: headerFirst && ri === 0, w: widths[ci] })) })) })
}

function buildEspecifica(spec, d) {
  const empresa = d.empresa || '[EMPRESA]'
  const codigo  = d.codigo  || '[CÓDIGO]'
  const rsi     = d.rsi     || '[Responsable de Seguridad de la Información]'
  const fecha   = d.fecha   || '[FECHA]'
  const version = d.version || '1.0'
  const ctrl    = `${spec.controlId} «${spec.controlName}»`
  const fix     = (t) => String(t).replace(/{{EMPRESA}}/g, empresa)

  const children = []
  const push = (...x) => children.push(...x)
  let n = 0
  const H = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 },
    children: [new TextRun({ text: `${++n}. ${text}`, bold: true, color: NAVY, size: 26 })] })

  // Portada
  push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 40 },
      children: [new TextRun({ text: spec.titulo, bold: true, color: NAVY, size: 38 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 },
      children: [new TextRun({ text: empresa, bold: true, color: PURPLE, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: `${codigo} · Versión ${version} · ${fecha} · Clasificación: Interno`, color: GRAY, size: 18 })] }),
  )

  // Control documental
  push(H('Información de Control Documental'))
  push(table([
    ['Nombre del Documento', spec.titulo],
    ['Código', codigo], ['Versión', version], ['Clasificación', 'Interno'],
    ['Estado', 'Borrador para aprobación'],
    ['Propietario', `Dirección de ${empresa}`],
    ['Responsable de mantenimiento', rsi],
    ['Fecha de emisión', fecha],
    ['Frecuencia de revisión', 'Anual, o ante cambios significativos'],
    ['Política maestra', 'Política de Seguridad de la Información (documento rector del SGSI)'],
    ['Control ISO relacionado', ctrl],
  ], [32, 68], { headerFirst: false }))

  // Historial
  push(H('Historial de Versiones'))
  push(table([['Versión', 'Fecha', 'Descripción del cambio', 'Responsable'],
    [version, fecha, 'Emisión inicial alineada a ISO/IEC 27001:2022.', 'RSI']], [12, 18, 50, 20]))

  // Aprobaciones
  push(H('Aprobaciones'))
  push(table([['Rol', 'Nombre', 'Firma', 'Fecha'],
    ['Dirección', '[Representante Legal]', '', ''],
    ['Responsable de Seguridad de la Información', rsi, '', '']], [38, 30, 17, 15]))

  // Propósito
  push(H('Propósito'), P(fix(spec.objetivo)),
    P(`Esta política específica desarrolla, para su ámbito, los principios establecidos en la Política de Seguridad de la Información de ${empresa}, en conformidad con el control ${ctrl} del Anexo A de ISO/IEC 27001:2022.`))

  // Alcance
  push(H('Alcance'),
    P(fix(spec.alcance || `Esta política aplica a todo el personal, contratistas, sistemas, activos e información de ${empresa} comprendidos en el ámbito de este documento, independientemente de su ubicación o formato. Toda excepción debe ser aprobada formalmente conforme a la sección de Cumplimiento.`)))

  // Marco normativo
  push(H('Marco Normativo de Referencia'),
    LI(`ISO/IEC 27001:2022 — Anexo A, control ${ctrl}.`),
    LI('NIST Cybersecurity Framework 2.0 y CIS Controls v8 — referencias complementarias.'),
    LI('Ley N° 21.663 (Ciberseguridad) y Ley N° 21.719 (Protección de Datos Personales), cuando resulten aplicables.'))

  // Definiciones (propias de la política)
  if (spec.definiciones && spec.definiciones.length) {
    push(H('Términos y Definiciones'))
    push(table([['Término', 'Definición'], ...spec.definiciones.map(([t, v]) => [t, fix(v)])], [26, 74]))
  }

  // Directrices (contenido profundo, puede venir agrupado por subsecciones)
  push(H('Directrices'))
  spec.directrices.forEach(item => {
    if (Array.isArray(item)) { push(SUB(item[0])); item[1].forEach(x => push(LI(fix(x)))) }
    else push(LI(fix(item)))
  })

  // Roles y responsabilidades
  push(H('Roles y Responsabilidades'),
    P('Dirección: aprueba esta política, asigna recursos y respalda su cumplimiento.'),
    P(`Responsable de Seguridad de la Información (${rsi}): implementa, mantiene y revisa esta política; gestiona excepciones, métricas y verifica su cumplimiento.`),
    P('Responsables de área / sistemas: aplican los controles de esta política en su ámbito y mantienen los registros asociados.'),
    P('Personal, contratistas y terceros: cumplen esta política en el ámbito de sus funciones y reportan cualquier incumplimiento o evento de seguridad.'))

  // Registros y evidencias
  if (spec.registros && spec.registros.length) {
    push(H('Registros y Evidencias'),
      P('Para demostrar la implementación y el cumplimiento de esta política se mantienen, como mínimo, los siguientes registros:'))
    spec.registros.forEach(r => push(LI(fix(r))))
  }

  // Cumplimiento, excepciones y consecuencias
  push(H('Cumplimiento, Excepciones y Consecuencias'),
    P('El cumplimiento de esta política es obligatorio para todas las personas dentro de su alcance. Toda excepción debe documentarse y aprobarse formalmente (justificación, riesgo, controles compensatorios, responsable y fecha de expiración; vigencia máxima 6 meses).'),
    P(`El incumplimiento puede derivar en medidas disciplinarias conforme a la normativa laboral de ${empresa}, terminación de contratos o acuerdos de confidencialidad y, cuando corresponda, responsabilidad legal, de forma proporcional a la gravedad e impacto.`))

  // Revisión
  push(H('Revisión y Mejora Continua'),
    P('Esta política se revisa al menos una vez al año, o ante cambios regulatorios, tecnológicos, de servicios o tras incidentes graves, conforme al ciclo de mejora continua (PDCA) del SGSI. Los indicadores asociados se reportan a la Dirección en la revisión por la dirección.'))

  // Glosario
  push(H('Glosario'))
  push(table([['Término', 'Definición'],
    ['SGSI', 'Sistema de Gestión de Seguridad de la Información.'],
    ['RSI', 'Responsable de Seguridad de la Información.'],
    ['Confidencialidad', 'Propiedad que garantiza que solo personas autorizadas accedan a la información.'],
    ['Integridad', 'Propiedad que garantiza la exactitud y completitud de la información.'],
    ['Disponibilidad', 'Propiedad que garantiza el acceso a la información por usuarios autorizados cuando la requieran.']], [24, 76]))

  push(new Paragraph({ spacing: { before: 240 },
    children: [new TextRun({ text: 'Documento generado por la plataforma DSTAC CIBERSECURITY. Complete los campos entre corchetes, ajuste las directrices a la operación real de la organización y obtenga la aprobación formal antes de su entrada en vigor.', italics: true, color: GRAY, size: 16 })] }))

  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } } }, children }] })
  return Packer.toBuffer(doc)
}

module.exports = { buildEspecifica }
