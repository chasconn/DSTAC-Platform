const { buildHeader, buildFooter, buildBar, buildMetricCard, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const [planRows] = await centralDB.execute(
    `SELECT pl.display_name FROM companies c JOIN plans pl ON pl.id = c.plan_id WHERE c.id = ?`,
    [companyId]
  )
  const [[activosRows], [detalleRows]] = await Promise.all([
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(criticidad='critica') AS criticos,
        SUM(criticidad='alta') AS alta,
        SUM(criticidad='media') AS media,
        SUM(criticidad='baja') AS baja,
        SUM(estado='operativo') AS operativos,
        SUM(estado='degradado') AS degradados,
        SUM(estado='fuera_de_servicio') AS fuera_servicio,
        SUM(estado='en_mantencion') AS en_mantencion
      FROM activos
    `),
    tenantDB.execute(`
      SELECT a.id, a.tipo, a.nombre, a.criticidad, a.estado, a.ambiente,
             p.nombre AS responsable
      FROM activos a
      LEFT JOIN personal p ON p.id = a.responsable_id
      ORDER BY FIELD(a.criticidad,'critica','alta','media','baja'), a.nombre ASC
      LIMIT 200
    `),
  ])

  return {
    company: { name: company.name },
    plan: planRows[0]?.display_name ?? 'Plan',
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    resumen: activosRows[0],
    activos: detalleRows,
  }
}

const CRIT_COLOR = { critica: '#DC2626', alta: '#D97706', media: '#534AB7', baja: '#1D9E75' }
const CRIT_BG    = { critica: '#FEE2E2', alta: '#FEF3C7', media: '#EEEDFE', baja: '#EAF3DE' }
const ESTADO_COLOR = { operativo: '#1D9E75', degradado: '#D97706', fuera_de_servicio: '#DC2626', en_mantencion: '#534AB7' }

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '—' }

function buildHTML(data) {
  const r = data.resumen
  const total = Number(r.total) || 0
  const opPct = total ? Math.round((Number(r.operativos) / total) * 100) : 0

  const pageOne = `
<div class="page">
  ${buildHeader('Inventario de Activos')}
  <div class="page-body">
    <div class="title">Inventario de Activos</div>
    <div class="subtitle">Estado del parque tecnológico</div>

    <div class="card-dark">
      <div>
        <span style="font-size:60px;font-weight:900;color:${colorFor(opPct)};line-height:1;">${total}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">activos registrados en total</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px;">Tasa operativa</div>
        <div style="background:${colorFor(opPct)};color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">${opPct}%</div>
      </div>
    </div>

    <div class="sec-label">Por criticidad</div>
    <div class="grid-2" style="margin-bottom:20px;">
      ${['critica','alta','media','baja'].map(c => `
      <div class="card" style="border-left:4px solid ${CRIT_COLOR[c]};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:#2C2C2A;text-transform:capitalize;">${c}</span>
          <span style="font-size:22px;font-weight:800;color:${CRIT_COLOR[c]};">${Number(r[c]) || 0}</span>
        </div>
      </div>`).join('')}
    </div>

    <div class="sec-label">Por estado</div>
    <div class="grid-2">
      ${[['operativos','operativo'],['degradados','degradado'],['fuera_servicio','fuera de servicio'],['en_mantencion','en mantención']].map(([k,l]) => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#888780;text-transform:capitalize;">${l}</span>
          <span style="font-size:18px;font-weight:700;color:${ESTADO_COLOR[l.replace(/ /g,'_').replace('en_mantención','en_mantencion')] || '#534AB7'};">${Number(r[k]) || 0}</span>
        </div>
      </div>`).join('')}
    </div>
  </div>
  ${buildFooter(1, 2)}
</div>`

  const rows = data.activos.map(a => `
<tr>
  <td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #f8f7f4;">${esc(a.tipo)}</td>
  <td style="padding:7px 10px;font-size:11px;font-weight:600;border-bottom:1px solid #f8f7f4;">${esc(a.nombre)}</td>
  <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${CRIT_BG[a.criticidad]||'#f8f7f4'};color:${CRIT_COLOR[a.criticidad]||'#888780'};">${a.criticidad||'—'}</span>
  </td>
  <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:10px;font-weight:600;color:${ESTADO_COLOR[a.estado]||'#888780'};">${(a.estado||'').replace(/_/g,' ')}</span>
  </td>
  <td style="padding:7px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${esc(a.responsable)}</td>
</tr>`).join('')

  const pageTwo = `
<div class="page">
  ${buildHeader('Inventario de Activos')}
  <div class="page-body">
    <div class="sec-label">Detalle de activos</div>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:#f8f7f4;">
          <th style="padding:8px 10px;font-size:10px;color:#888780;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Tipo</th>
          <th style="padding:8px 10px;font-size:10px;color:#888780;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Nombre</th>
          <th style="padding:8px 10px;font-size:10px;color:#888780;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Criticidad</th>
          <th style="padding:8px 10px;font-size:10px;color:#888780;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Estado</th>
          <th style="padding:8px 10px;font-size:10px;color:#888780;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">Responsable</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  ${buildFooter(2, 2)}
</div>`

  return wrapDocument(pageOne + pageTwo)
}

module.exports = { getData, buildHTML }
