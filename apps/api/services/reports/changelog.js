// Informe del Registro de cambios (changelog interno). Si query.id viene
// seteado, genera el informe de UNA entrada; si no, el historial completo
// (una página por entrada). No es por empresa — es interno de DSTAC.
const { buildHeader, buildFooter, wrapDocument } = require('./template')
const centralDB = require('../../db/central')

const PURPLE = '#534AB7', NAVY = '#1a1740'
const CATEGORIA_LABEL = { correccion: 'Corrección', feature: 'Funcionalidad nueva', mejora: 'Mejora' }

function parseJson(v, fallback = []) {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v) { try { return JSON.parse(v) || fallback } catch { return fallback } }
  return fallback
}

async function getData(tenantDB, centralDBArg, companyId, company, query = {}) {
  if (query.id) {
    const [[r]] = await centralDB.query(`SELECT * FROM dstac_changelog WHERE id = ?`, [query.id])
    if (!r) throw new Error('Registro no encontrado')
    return { entradas: [r] }
  }
  const [rows] = await centralDB.execute(`SELECT * FROM dstac_changelog ORDER BY fecha DESC, id DESC`)
  return { entradas: rows }
}

function buildEntryPage(e, pageNum, totalPages) {
  const fecha = new Date(e.fecha).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
  const archivos = parseJson(e.archivos)
  const comandos = parseJson(e.comandos)

  return `
<div class="page">
  ${buildHeader('Registro de cambios · Interno DSTAC')}
  <div class="page-body">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <span style="font-size:11px;color:#888780;font-weight:600;">${fecha}</span>
      <span class="badge" style="background:#EEEDFE;color:${PURPLE};">${CATEGORIA_LABEL[e.categoria] || 'Corrección'}</span>
    </div>
    <div class="title">${e.titulo}</div>
    <div class="section-divider"></div>

    <div class="sec-label">Resumen (lenguaje simple)</div>
    <div class="quote-block" style="white-space:pre-wrap;margin-bottom:24px;">${e.resumen_simple}</div>

    <div class="sec-label">Detalle técnico</div>
    <div class="card" style="white-space:pre-wrap;font-size:12px;line-height:1.65;margin-bottom:20px;">${e.detalle_tecnico}</div>

    ${archivos.length ? `
    <div class="sec-label">Archivos modificados</div>
    <div class="card" style="margin-bottom:20px;">
      ${archivos.map(a => `<div style="font-size:11.5px;font-family:'Courier New',monospace;color:#444441;padding:3px 0;word-break:break-all;">${a}</div>`).join('')}
    </div>` : ''}

    ${comandos.length ? `
    <div class="sec-label">Comandos utilizados</div>
    <div style="background:${NAVY};border-radius:10px;padding:14px 18px;">
      ${comandos.map(c => `<div style="font-size:11.5px;font-family:'Courier New',monospace;color:#8BE9A0;padding:3px 0;">$ ${c}</div>`).join('')}
    </div>` : ''}
  </div>
  ${buildFooter(pageNum, totalPages)}
</div>`
}

function buildHTML(data) {
  const { entradas } = data
  const total = entradas.length
  const body = entradas.map((e, i) => buildEntryPage(e, i + 1, total)).join('')
  return wrapDocument(body)
}

module.exports = { getData, buildHTML, pdfOptions: {} }
