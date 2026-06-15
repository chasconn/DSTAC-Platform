const { buildHeader, buildFooter, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const [[ag]] = await centralDB.query(
    `SELECT COUNT(*) total, SUM(status='active') activos FROM edr_agents WHERE company_id = ?`, [companyId])
  const [[al]] = await centralDB.query(`
    SELECT COUNT(*) total, SUM(rule_level>=12) criticas, SUM(rule_level BETWEEN 7 AND 11) altas,
           SUM(event_time >= (NOW()-INTERVAL 24 HOUR)) h24, SUM(incidente_id IS NOT NULL) incidentes
    FROM edr_alerts WHERE company_id = ?`, [companyId])
  const [[corr]] = await centralDB.query(`SELECT COUNT(*) total FROM edr_responses WHERE company_id = ?`, [companyId])
  const [top] = await centralDB.execute(`
    SELECT rule_description d, MAX(rule_level) lvl, COUNT(*) n
    FROM edr_alerts WHERE company_id = ? GROUP BY rule_description ORDER BY n DESC LIMIT 8`, [companyId])
  const [cis] = await centralDB.execute(`
    SELECT a.agent_name,
      JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.score')) score,
      JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.passed')) passed,
      JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.failed')) failed
    FROM edr_alerts a JOIN (
      SELECT wazuh_id, JSON_UNQUOTE(JSON_EXTRACT(raw,'$.data.sca.policy_id')) pid, MAX(id) mid
      FROM edr_alerts WHERE rule_id=19004 AND company_id=? GROUP BY wazuh_id, pid) l ON l.mid=a.id`, [companyId])
  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    ag: ag || {}, al: al || {}, corr: Number(corr?.total) || 0, top, cis,
  }
}

function esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—' }

function buildHTML(data) {
  const a = data.al, g = data.ag
  const kpis = [['Agentes activos', `${Number(g.activos) || 0}/${Number(g.total) || 0}`, '#1D9E75'],
    ['Críticas', Number(a.criticas) || 0, '#DC2626'], ['Altas', Number(a.altas) || 0, '#D97706'],
    ['Incidentes', Number(a.incidentes) || 0, '#534AB7'], ['Correcciones', data.corr, '#0F6E56'], ['Alertas 24h', Number(a.h24) || 0, '#185FA5']]
    .map(([l, v, c]) => `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;color:#888780;">${l}</span><span style="font-size:19px;font-weight:800;color:${c};">${v}</span></div></div>`).join('')
  const topRows = data.top.map(t => `<tr>
    <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #f8f7f4;">${esc(t.d)}</td>
    <td style="padding:6px 10px;text-align:center;font-size:11px;border-bottom:1px solid #f8f7f4;">${t.lvl}</td>
    <td style="padding:6px 10px;text-align:center;font-size:11px;font-weight:700;border-bottom:1px solid #f8f7f4;">${t.n}</td></tr>`).join('')
  const cisRows = data.cis.map(c => {
    const s = Number(c.score) || 0
    return `<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span>${esc(c.agent_name)}</span><strong style="color:${colorFor(s)};">${s}% (✓${c.passed||0}/✗${c.failed||0})</strong></div>
      <div style="height:8px;background:#f1efe8;border-radius:6px;overflow:hidden;"><div style="width:${s}%;height:100%;background:${colorFor(s)};border-radius:6px;"></div></div></div>`
  }).join('') || '<div style="font-size:11px;color:#888780;">Sin datos de cumplimiento aún.</div>'
  const body = `
<div class="page">
  ${buildHeader('Informe EDR')}
  <div class="page-body">
    <div class="title">Detección y Respuesta de Endpoints (EDR)</div>
    <div class="subtitle">Wazuh · ${data.company.name}</div>
    <div class="card-dark">
      <div><span style="font-size:60px;font-weight:900;color:#7C4FDA;line-height:1;">${Number(a.total) || 0}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">alertas totales registradas</div></div>
      <div style="text-align:right;"><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px;">Respuestas activas</div>
        <div style="background:#0F6E56;color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">${data.corr}</div></div>
    </div>
    <div class="sec-label">Resumen</div>
    <div class="grid-2" style="margin-bottom:20px;">${kpis}</div>
    <div class="sec-label">Detecciones más frecuentes</div>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;margin-bottom:20px;">
      <thead><tr style="background:#f8f7f4;">
        <th style="padding:7px 10px;font-size:10px;color:#888780;text-align:left;text-transform:uppercase;border-bottom:1px solid #e2e0d8;">Detección</th>
        <th style="padding:7px 10px;font-size:10px;color:#888780;text-align:center;text-transform:uppercase;border-bottom:1px solid #e2e0d8;">Nivel</th>
        <th style="padding:7px 10px;font-size:10px;color:#888780;text-align:center;text-transform:uppercase;border-bottom:1px solid #e2e0d8;">Veces</th>
      </tr></thead><tbody>${topRows}</tbody></table>
    <div class="sec-label">Cumplimiento CIS por endpoint</div>
    ${cisRows}
  </div>
  ${buildFooter(1, 1)}
</div>`
  return wrapDocument(body)
}

module.exports = { getData, buildHTML }
