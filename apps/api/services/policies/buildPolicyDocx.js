// buildPolicyDocx.js — arma un documento Word (.docx) de política a partir del
// contenido (policyContent.js) y los datos de la empresa, sustituyendo los
// tokens conocidos ({{EMPRESA}}, {{RESPONSABLE}}, {{FECHA}}…) y dejando como
// marcadores visibles los que el usuario completa ([CARGO], [APROBADOR]).
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} = require('docx')

const NAVY = '1a1740', PURPLE = '534AB7', GRAY = '6A675E'

function sub(text, d) {
  return String(text)
    .replace(/{{EMPRESA}}/g,     d.empresa     || '[EMPRESA]')
    .replace(/{{RESPONSABLE}}/g, d.responsable || '[RESPONSABLE]')
    .replace(/{{CARGO}}/g,       d.cargo       || '[CARGO]')
    .replace(/{{FECHA}}/g,       d.fecha       || '[FECHA]')
    .replace(/{{VERSION}}/g,     d.version     || '1.0')
    .replace(/{{APROBADOR}}/g,   d.aprobador   || '[APROBADOR]')
}

const ALCANCE = 'Esta política aplica a todo el personal, contratistas, sistemas e información de {{EMPRESA}}, independientemente de su ubicación o formato.'
const ROLES   = 'La dirección de {{EMPRESA}} aprueba y respalda esta política. {{RESPONSABLE}} ({{CARGO}}) es responsable de su implementación, mantenimiento y revisión. Todo el personal y los terceros con acceso a la información deben cumplirla.'
const CUMPL   = 'El incumplimiento de esta política puede derivar en medidas disciplinarias conforme a los procedimientos de {{EMPRESA}} y, cuando corresponda, en acciones legales. Esta política se revisa al menos una vez al año o ante cambios significativos.'

function h(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 90 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 24 })],
  })
}
function p(text, d) {
  return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: sub(text, d), size: 22, color: '2C2C2A' })] })
}
function bullet(text, d) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: sub(text, d), size: 22, color: '2C2C2A' })] })
}
function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.w || 25, type: WidthType.PERCENTAGE },
    shading: opts.head ? { fill: NAVY } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: !!opts.head, color: opts.head ? 'FFFFFF' : '2C2C2A', size: 20 })] })],
  })
}

async function buildPolicyDocx(spec, data) {
  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new TextRun({ text: sub(spec.titulo, data), bold: true, color: NAVY, size: 36 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
      children: [new TextRun({ text: sub('{{EMPRESA}}', data), bold: true, color: PURPLE, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: `${data.codigo ? data.codigo + ' · ' : ''}Clasificación: Interno · Versión {{VERSION}} · {{FECHA}}`.replace('{{VERSION}}', data.version || '1.0').replace('{{FECHA}}', data.fecha || '[FECHA]'), color: GRAY, size: 18 })] }),

    h('1. Objetivo'), p(spec.objetivo, data),
    h('2. Alcance'), p(ALCANCE, data),
    h('3. Roles y responsabilidades'), p(ROLES, data),
    h('4. Directrices'),
    ...spec.directrices.map(dir => bullet(dir, data)),
    h('5. Cumplimiento y revisión'), p(CUMPL, data),
    h('6. Control de versiones'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell('Versión', { head: true, w: 15 }), cell('Fecha', { head: true, w: 20 }), cell('Responsable', { head: true, w: 35 }), cell('Aprobado por', { head: true, w: 30 })] }),
        new TableRow({ children: [cell(data.version || '1.0', { w: 15 }), cell(data.fecha || '[FECHA]', { w: 20 }), cell(data.responsable || '[RESPONSABLE]', { w: 35 }), cell(data.aprobador || '[APROBADOR]', { w: 30 })] }),
      ],
    }),
    new Paragraph({ spacing: { before: 240 },
      children: [new TextRun({ text: 'Documento generado por la plataforma DSTAC CIBERSECURITY. Complete los campos entre corchetes y revise el contenido para reflejar la operación real de la organización antes de aprobarlo.', italics: true, color: GRAY, size: 16 })] }),
  ]

  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children }] })
  return Packer.toBuffer(doc)
}

module.exports = { buildPolicyDocx }
