const { buildHeader, buildFooter, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const [[ag]] = await centralDB.query(
    `SELECT COUNT(*) total, SUM(status='active') activos FROM edr_agents WHERE company_id = ?`, [companyId])
  // Críticas/Altas/Top siempre sobre las últimas 24h — mismo universo que las
  // tarjetas KPI y los gráficos del panel en vivo, para que el informe y el
  // panel nunca muestren números distintos para lo mismo.
  const [[al]] = await centralDB.query(`
    SELECT COUNT(*) total,
           SUM(CASE WHEN rule_level>=12 AND event_time >= (NOW()-INTERVAL 24 HOUR) THEN 1 ELSE 0 END) criticas,
           SUM(CASE WHEN rule_level BETWEEN 7 AND 11 AND event_time >= (NOW()-INTERVAL 24 HOUR) THEN 1 ELSE 0 END) altas,
           SUM(event_time >= (NOW()-INTERVAL 24 HOUR)) h24, SUM(incidente_id IS NOT NULL) incidentes
    FROM edr_alerts WHERE company_id = ?`, [companyId])
  const [[corr]] = await centralDB.query(`SELECT COUNT(*) total FROM edr_responses WHERE company_id = ?`, [companyId])
  // SUM(count) en vez de COUNT(*): las alertas repetidas en una ventana corta
  // se deduplican en una sola fila con un contador (apps/api/routes/edr.js),
  // así que contar filas subestimaría el volumen real.
  const [top] = await centralDB.execute(`
    SELECT rule_description d, MAX(rule_level) lvl, SUM(count) n
    FROM edr_alerts WHERE company_id = ? AND event_time >= (NOW()-INTERVAL 24 HOUR)
    GROUP BY rule_description ORDER BY n DESC LIMIT 8`, [companyId])
  const [cis] = await centralDB.execute(`
    SELECT a.agent_name,
      JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.score')) score,
      JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.passed')) passed,
      JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.failed')) failed
    FROM edr_alerts a JOIN (
      SELECT wazuh_id, JSON_UNQUOTE(JSON_EXTRACT(raw,'$.data.sca.policy_id')) pid, MAX(id) mid
      FROM edr_alerts WHERE rule_id=19004 AND company_id=? GROUP BY wazuh_id, pid) l ON l.mid=a.id`, [companyId])
  // Equipos en la red — descubrimiento pasivo por ARP (módulo nuevo, sin
  // necesitar agente propio en cada dispositivo).
  const [[red]] = await centralDB.query(`
    SELECT COUNT(*) total, SUM(ultima_vez >= (NOW()-INTERVAL 3 MINUTE)) conectados
    FROM edr_network_devices WHERE company_id = ?`, [companyId])
  const [redTipos] = await centralDB.execute(`
    SELECT COALESCE(tipo,'desconocido') tipo, COUNT(*) n
    FROM edr_network_devices WHERE company_id = ? GROUP BY tipo ORDER BY n DESC`, [companyId])
  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    ag: ag || {}, al: al || {}, corr: Number(corr?.total) || 0, top, cis,
    red: red || {}, redTipos,
  }
}

function esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—' }

function buildHTML(data) {
  const a = data.al, g = data.ag
  const kpis = [['Agentes activos', `${Number(g.activos) || 0}/${Number(g.total) || 0}`, '#1D9E75'],
    ['Críticas (24h)', Number(a.criticas) || 0, '#DC2626'], ['Altas (24h)', Number(a.altas) || 0, '#D97706'],
    ['Incidentes', Number(a.incidentes) || 0, '#534AB7'], ['Correcciones', data.corr, '#0F6E56'], ['Alertas 24h', Number(a.h24) || 0, '#185FA5']]
    .map(([l, v, c]) => `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;color:#888780;">${l}</span><span style="font-size:19px;font-weight:800;color:${c};">${v}</span></div></div>`).join('')
  const red = data.red, redTotal = Number(red.total) || 0
  const redTipoLabel = { router: 'Routers', impresora: 'Impresoras', movil: 'Móviles', computador: 'Computadores',
    virtual: 'Máquinas virtuales', iot: 'IoT', camara: 'Cámaras', desconocido: 'Desconocido' }
  const redRows = data.redTipos.map(t => `<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:4px 0;border-bottom:1px solid #f8f7f4;">
    <span>${redTipoLabel[t.tipo] || t.tipo}</span><strong>${t.n}</strong></div>`).join('') || '<div style="font-size:11px;color:#888780;">Sin dispositivos detectados aún.</div>'
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
    <div class="sec-label">Detecciones más frecuentes (24h)</div>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;margin-bottom:20px;">
      <thead><tr style="background:#f8f7f4;">
        <th style="padding:7px 10px;font-size:10px;color:#888780;text-align:left;text-transform:uppercase;border-bottom:1px solid #e2e0d8;">Detección</th>
        <th style="padding:7px 10px;font-size:10px;color:#888780;text-align:center;text-transform:uppercase;border-bottom:1px solid #e2e0d8;">Nivel</th>
        <th style="padding:7px 10px;font-size:10px;color:#888780;text-align:center;text-transform:uppercase;border-bottom:1px solid #e2e0d8;">Veces</th>
      </tr></thead><tbody>${topRows || `<tr><td colspan="3" style="padding:8px 10px;font-size:11px;color:#888780;">Sin detecciones en las últimas 24h.</td></tr>`}</tbody></table>
    <div class="sec-label">Equipos en la red</div>
    <div class="card-dark" style="margin-bottom:14px;">
      <div><span style="font-size:60px;font-weight:900;color:#7C4FDA;line-height:1;">${redTotal}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">dispositivos detectados (tabla ARP, sin agente propio)</div></div>
      <div style="text-align:right;"><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px;">Conectados ahora</div>
        <div style="background:#0F6E56;color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">${Number(red.conectados) || 0}</div></div>
    </div>
    ${redRows}
    <div class="sec-label" style="margin-top:20px;">Cumplimiento CIS por endpoint</div>
    ${cisRows}
  </div>
  ${buildFooter(1, 1)}
</div>`
  return wrapDocument(body)
}

module.exports = { getData, buildHTML }
