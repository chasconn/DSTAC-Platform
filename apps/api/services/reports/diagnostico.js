// Informe interno de Diagnóstico de Madurez (por cliente). Usa el último
// diagnóstico guardado de la empresa. Incluye score, brechas por dominio y
// servicios recomendados (del catálogo) con valor estimado.
const { buildHeader, buildFooter, colorFor, wrapDocument } = require('./template')
const { planDeRespuestas, tamanoPorTrabajadores, precioDiagnostico } = require('../diagnostico/cuestionario')

const CLP = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL')
// Columnas JSON: mysql2 las devuelve ya parseadas (array); tolera string también.
const asArr = (x) => Array.isArray(x) ? x : (typeof x === 'string' && x ? (() => { try { return JSON.parse(x) || [] } catch { return [] } })() : [])

async function getData(tenantDB, centralDB, companyId, company, query = {}) {
  const [[emp]] = await centralDB.query(`SELECT name FROM companies WHERE id = ?`, [companyId])
  const [[d]] = query?.id
    ? await centralDB.query(`SELECT * FROM diagnosticos WHERE id = ? AND company_id = ? LIMIT 1`, [query.id, companyId])
    : await centralDB.query(`SELECT * FROM diagnosticos WHERE company_id = ? ORDER BY fecha DESC, id DESC LIMIT 1`, [companyId])

  let dominios = [], proyectos = [], resp = {}
  if (d) {
    dominios = asArr(d.dominios); proyectos = asArr(d.servicios)
    resp = (d.respuestas && typeof d.respuestas === 'object') ? d.respuestas
      : (typeof d.respuestas === 'string' ? (() => { try { return JSON.parse(d.respuestas) || {} } catch { return {} } })() : {})
  }
  // Recomendación = PLAN (según tamaño) + diagnóstico de onboarding + proyectos.
  const tamano = resp?.tamano || tamanoPorTrabajadores(resp?.trabajadores) || 'Profesional'
  const keywords = d ? [planDeRespuestas(resp), 'Diagnóstico de Postura', ...proyectos] : []
  const servicios = []
  for (const kw of keywords) {
    const [rows] = await centralDB.execute(
      `SELECT nombre, tipo, precio_sugerido FROM cotizacion_catalogo
       WHERE activo = 1 AND nombre LIKE ? ORDER BY orden LIMIT 5`, [`%${kw}%`])
    rows.forEach(r => {
      if (servicios.find(x => x.nombre === r.nombre)) return
      // Mismo ajuste que en la cotización automática: el diagnóstico de
      // onboarding tiene precio escalonado por tamaño, no el fijo del catálogo.
      if (r.nombre.includes('Diagnóstico de Postura')) r.precio_sugerido = precioDiagnostico(tamano)
      servicios.push(r)
    })
  }
  return {
    company: { name: emp?.name || company?.name || '—' },
    fecha: (d ? new Date(d.fecha) : new Date()).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    d, dominios, servicios, hayDatos: !!d,
  }
}

function buildHTML(data) {
  if (!data.hayDatos) {
    return wrapDocument(`<div class="page">${buildHeader('Diagnóstico de Madurez')}
      <div class="page-body"><div class="title">Diagnóstico de Madurez</div>
      <div class="subtitle">${data.company.name}</div>
      <div class="card">Aún no hay un diagnóstico registrado para esta empresa. Complétalo en el módulo Diagnóstico y vuelve a generar el informe.</div>
      </div>${buildFooter(1, 1)}</div>`)
  }

  const d = data.d
  const bars = data.dominios.map(dm => {
    const s = dm.score == null ? 0 : dm.score
    const txt = dm.score == null ? 'sin datos' : `${s}%`
    return `<div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#2C2C2A;margin-bottom:4px;"><span>${dm.nombre}</span><strong>${txt}</strong></div>
      <div style="height:9px;background:#f1efe8;border-radius:6px;overflow:hidden;"><div style="width:${s}%;height:100%;background:${colorFor(s)};border-radius:6px;"></div></div>
    </div>`
  }).join('')

  const unico = data.servicios.filter(s => s.tipo !== 'mensual')
  const mensual = data.servicios.filter(s => s.tipo === 'mensual')
  const totUnico = unico.reduce((a, s) => a + (Number(s.precio_sugerido) || 0), 0)
  const totMensual = mensual.reduce((a, s) => a + (Number(s.precio_sugerido) || 0), 0)
  const servRow = (s) => `<tr>
    <td style="padding:7px 8px;font-size:11px;border-bottom:1px solid #f1efe8;">${s.nombre}</td>
    <td style="padding:7px 8px;font-size:10px;text-align:center;color:#888780;border-bottom:1px solid #f1efe8;">${s.tipo === 'mensual' ? 'Mensual' : 'Único'}</td>
    <td style="padding:7px 8px;font-size:11px;text-align:right;border-bottom:1px solid #f1efe8;">${s.precio_sugerido != null ? CLP(s.precio_sugerido) : '—'}</td>
  </tr>`

  const page1 = `<div class="page">
    ${buildHeader('Diagnóstico de Madurez')}
    <div class="page-body">
      <div class="title">Diagnóstico de Madurez en Ciberseguridad</div>
      <div class="subtitle">Informe interno · ${data.company.name}</div>
      <div class="card-dark">
        <div><span style="font-size:60px;font-weight:900;color:${colorFor(d.score_total)};line-height:1;">${d.score_total}%</span>
          <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">madurez global · ${data.fecha}</div></div>
        <div style="text-align:right;"><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px;">Nivel</div>
          <div style="background:${colorFor(d.score_total)};color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">${d.nivel}</div></div>
      </div>
      <div class="sec-label">Madurez por dominio</div>
      ${bars}
    </div>
    ${buildFooter(1, 2)}
  </div>`

  const page2 = `<div class="page">
    ${buildHeader('Diagnóstico de Madurez')}
    <div class="page-body">
      <div class="sec-label">Servicios recomendados para cerrar las brechas</div>
      ${data.servicios.length ? `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;margin-bottom:18px;">
        <thead><tr style="background:#f8f7f4;">
          <th style="padding:8px;font-size:10px;color:#888780;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Servicio</th>
          <th style="padding:8px;font-size:10px;color:#888780;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Tipo</th>
          <th style="padding:8px;font-size:10px;color:#888780;font-weight:600;text-align:right;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Valor estimado</th>
        </tr></thead>
        <tbody>${data.servicios.map(servRow).join('')}</tbody>
      </table>
      <div class="grid-2">
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:12px;color:#888780;">Estimado único</span><span style="font-size:18px;font-weight:800;color:#3C3489;">${CLP(totUnico)}</span></div></div>
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:12px;color:#888780;">Estimado mensual</span><span style="font-size:18px;font-weight:800;color:#1D9E75;">${CLP(totMensual)}</span></div></div>
      </div>` : `<div class="card">No se detectaron brechas con servicios asociados. La empresa muestra una postura adecuada en los dominios evaluados.</div>`}
      <div class="quote-block" style="margin-top:18px;">Documento interno de DSTAC. Los valores son estimaciones referenciales del catálogo; la cotización formal se genera y ajusta desde el módulo de Cotizaciones.</div>
    </div>
    ${buildFooter(2, 2)}
  </div>`

  return wrapDocument(page1 + page2)
}

module.exports = { getData, buildHTML }
