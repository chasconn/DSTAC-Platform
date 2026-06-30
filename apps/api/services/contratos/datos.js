// services/contratos/datos.js — helpers para armar los datos legales que
// alimentan el contrato (DSTAC y el cliente), y para validar que estén
// completos antes de permitir la firma (la comparecencia con representante
// legal y domicilio es lo que sostiene la autorización de intervención ante
// la Ley N° 21.459 — sin esos datos, el contrato es más fácil de impugnar).

async function datosLegalesEmpresa(centralDB) {
  const [[row]] = await centralDB.query(`SELECT * FROM empresa_datos_legales WHERE id = 1`)
  return row || {}
}

function datosLegalesCliente(company) {
  if (!company) return {}
  return {
    razon_social: company.name,
    rut: company.rut,
    domicilio: company.domicilio,
    representante_legal: company.representante_legal,
    representante_legal_rut: company.representante_legal_rut,
    representante_legal_cargo: company.representante_legal_cargo,
  }
}

function datosAlcance(contrato) {
  let a = contrato?.alcance
  if (typeof a === 'string') { try { a = JSON.parse(a) } catch { a = [] } }
  return Array.isArray(a) ? a : []
}

// Campos obligatorios para que la comparecencia de una parte sea válida.
const CAMPOS_REQUERIDOS = ['rut', 'domicilio', 'representante_legal', 'representante_legal_rut', 'representante_legal_cargo']

function camposFaltantes(datos, etiqueta) {
  return CAMPOS_REQUERIDOS
    .filter(c => !datos?.[c] || !String(datos[c]).trim())
    .map(c => `${etiqueta}: ${c.replace(/_/g, ' ')}`)
}

module.exports = { datosLegalesEmpresa, datosLegalesCliente, datosAlcance, camposFaltantes }
