const { buildHeader, buildFooter, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const [funcs] = await centralDB.execute(`
    SELECT f.name AS nombre,
           ROUND(AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END), 0) AS porcentaje
    FROM nist_functions f
    LEFT JOIN nist_categories ncat ON ncat.function_id = f.id
    LEFT JOIN nist_controls nc ON nc.category_id = ncat.id
    LEFT JOIN nist_control_assessments nca ON nca.control_id = nc.id AND nca.evaluation_id = (
      SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1)
    GROUP BY f.id ORDER BY f.order_num`, [companyId])
  const vals = funcs.map(f => Number(f.porcentaje) || 0)
  const global = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    global, funcs,
  }
}

function buildHTML(data) {
  const bars = data.funcs.map(f => {
    const s = Number(f.porcentaje) || 0
    return `<div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#2C2C2A;margin-bottom:4px;"><span style="font-weight:600;">${f.nombre}</span><strong>${s}%</strong></div>
      <div style="height:11px;background:#f1efe8;border-radius:6px;overflow:hidden;"><div style="width:${s}%;height:100%;background:${colorFor(s)};border-radius:6px;"></div></div>
    </div>`
  }).join('')
  const body = `
<div class="page">
  ${buildHeader('Informe NIST CSF')}
  <div class="page-body">
    <div class="title">Madurez NIST Cybersecurity Framework</div>
    <div class="subtitle">Por función del marco · ${data.company.name}</div>
    <div class="card-dark">
      <div><span style="font-size:60px;font-weight:900;color:${colorFor(data.global)};line-height:1;">${data.global}%</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">madurez global del marco</div></div>
      <div style="text-align:right;"><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px;">Nivel</div>
        <div style="background:${colorFor(data.global)};color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">${data.global >= 70 ? 'Alto' : data.global >= 40 ? 'Medio' : 'Bajo'}</div></div>
    </div>
    <div class="sec-label">Madurez por función</div>
    ${bars}
  </div>
  ${buildFooter(1, 1)}
</div>`
  return wrapDocument(body)
}

module.exports = { getData, buildHTML }
