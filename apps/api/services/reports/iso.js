const { buildHeader, buildFooter, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const sub = `(SELECT id FROM iso_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1)`
  const [[ev]] = await centralDB.query(
    `SELECT score_total, gap_total FROM iso_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`, [companyId])
  const [domains] = await centralDB.execute(`
    SELECT d.name, d.color,
      ROUND(AVG(CASE WHEN ica.applies = 1 AND ica.status != 'no_aplica' THEN ica.progress END), 0) AS score
    FROM iso_domains d
    LEFT JOIN iso_controls ic ON ic.domain_id = d.id
    LEFT JOIN iso_control_assessments ica ON ica.control_id = ic.id AND ica.evaluation_id = ${sub}
    GROUP BY d.id ORDER BY d.order_num`, [companyId])
  const [[cnt]] = await centralDB.query(`
    SELECT SUM(status='implementado') impl, SUM(status='parcial') parcial,
           SUM(status='pendiente') pend, SUM(applies=0) na, COUNT(*) total
    FROM iso_control_assessments WHERE evaluation_id = ${sub}`, [companyId])
  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    score: Math.round(Number(ev?.score_total) || 0),
    gap: Math.round(Number(ev?.gap_total) || 100),
    domains, cnt: cnt || {},
  }
}

function buildHTML(data) {
  const c = data.cnt
  const bars = data.domains.map(d => {
    const s = Number(d.score) || 0
    return `<div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#2C2C2A;margin-bottom:4px;"><span>${d.name}</span><strong>${s}%</strong></div>
      <div style="height:9px;background:#f1efe8;border-radius:6px;overflow:hidden;"><div style="width:${s}%;height:100%;background:${colorFor(s)};border-radius:6px;"></div></div>
    </div>`
  }).join('')
  const counts = [['Implementados', c.impl, '#1D9E75'], ['Parciales', c.parcial, '#D97706'], ['Pendientes', c.pend, '#DC2626'], ['No aplica', c.na, '#888780']]
    .map(([l, v, col]) => `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:12px;color:#888780;">${l}</span><span style="font-size:20px;font-weight:800;color:${col};">${Number(v) || 0}</span></div></div>`).join('')
  const body = `
<div class="page">
  ${buildHeader('Informe ISO 27001')}
  <div class="page-body">
    <div class="title">Cumplimiento ISO/IEC 27001</div>
    <div class="subtitle">Estado de implementación del Anexo A · ${data.company.name}</div>
    <div class="card-dark">
      <div><span style="font-size:60px;font-weight:900;color:${colorFor(data.score)};line-height:1;">${data.score}%</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">cumplimiento global (${Number(c.total) || 0} controles)</div></div>
      <div style="text-align:right;"><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px;">Brecha</div>
        <div style="background:#DC2626;color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">${data.gap}%</div></div>
    </div>
    <div class="sec-label">Estado de controles</div>
    <div class="grid-2" style="margin-bottom:20px;">${counts}</div>
    <div class="sec-label">Cumplimiento por dominio</div>
    ${bars}
  </div>
  ${buildFooter(1, 1)}
</div>`
  return wrapDocument(body)
}

module.exports = { getData, buildHTML }
