// fillTemplate.js — rellena una plantilla .docx (con marcadores {token})
// conservando su diseño original, usando docxtemplater. Se usa para servir las
// políticas a partir del documento maestro del cliente (formato propio).
const fs = require('fs')

function fillTemplate(templatePath, data) {
  const PizZip = require('pizzip')
  const Docxtemplater = require('docxtemplater')
  const content = fs.readFileSync(templatePath, 'binary')
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',   // marcador faltante → vacío (no rompe el render)
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

module.exports = { fillTemplate }
