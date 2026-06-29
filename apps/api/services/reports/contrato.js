// Vista previa del Contrato de Prestación de Servicios — reutiliza el mismo
// renderContrato() que se guarda al firmar, para que la vista previa y el
// documento final firmado sean siempre idénticos.
const { buildHeader, buildFooter, wrapDocument } = require('./template')
const { renderContrato } = require('../contratos/template')
const { datosLegalesEmpresa, datosLegalesCliente, datosAlcance } = require('../contratos/datos')

async function getData(tenantDB, centralDB, companyId, company, query = {}) {
  const dstac = await datosLegalesEmpresa(centralDB)
  const [[c]] = await centralDB.query(`SELECT * FROM companies WHERE id = ?`, [companyId])

  let contrato = null
  if (query?.id) {
    const [[row]] = await centralDB.query(
      `SELECT * FROM contratos WHERE id = ? AND company_id = ? LIMIT 1`, [query.id, companyId])
    contrato = row
  } else {
    const [[row]] = await centralDB.query(
      `SELECT * FROM contratos WHERE company_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`, [companyId])
    contrato = row
  }

  let cotizacion = null
  if (contrato?.cotizacion_id) {
    const [[cot]] = await centralDB.query(`SELECT * FROM cotizaciones WHERE id = ?`, [contrato.cotizacion_id])
    cotizacion = cot
  }

  return {
    hayDatos: !!contrato,
    company: { name: c?.name || company?.name || '—' },
    dstac, cliente: datosLegalesCliente(c), cotizacion,
    contrato, alcance: datosAlcance(contrato),
  }
}

function buildHTML(data) {
  if (!data.hayDatos) {
    return wrapDocument(`<div class="page">${buildHeader('Contrato de Servicios')}
      <div class="page-body"><div class="title">Contrato de Prestación de Servicios</div>
      <div class="subtitle">${data.company.name}</div>
      <div class="card">Aún no se ha generado un contrato para esta empresa. Generalo desde una cotización aceptada en el módulo Contratos.</div>
      </div>${buildFooter(1, 1)}</div>`)
  }
  const d = data.contrato
  const cuerpo = renderContrato({
    numero: d.numero,
    fecha: new Date(d.created_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    dstac: data.dstac,
    cliente: data.cliente,
    cotizacion: data.cotizacion,
    alcance: data.alcance,
    codigoVerificacion: d.codigo_verificacion,
    firmaDstac: d.firma_dstac && typeof d.firma_dstac === 'string' ? JSON.parse(d.firma_dstac) : d.firma_dstac,
    firmaCliente: d.firma_cliente && typeof d.firma_cliente === 'string' ? JSON.parse(d.firma_cliente) : d.firma_cliente,
  })
  return wrapDocument(`<div class="page">${buildHeader('Contrato de Servicios')}<div class="page-body">${cuerpo}</div>${buildFooter(1, 1)}</div>`)
}

module.exports = { getData, buildHTML }
