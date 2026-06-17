const { buildHeader, buildFooter, buildBar, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const [[resumenRows], [detalleRows]] = await Promise.all([
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(nivel_categoria='critico')         AS criticos,
        SUM(nivel_categoria='alto')            AS altos,
        SUM(nivel_categoria='medio')           AS medios,
        SUM(nivel_categoria='bajo')            AS bajos,
        SUM(estado='identificado')             AS abiertos,
        SUM(estado='en_tratamiento')           AS en_tratamiento,
        SUM(estado IN ('cerrado','mitigado'))  AS cerrados,
        SUM(estado='aceptado')                 AS aceptados
      FROM riesgos
    `),
    tenantDB.execute(`
      SELECT id, categoria, nombre, descripcion, amenaza,
             probabilidad, impacto, nivel_riesgo, nivel_categoria,
             estado, responsable, activo_nombre
      FROM riesgos
      ORDER BY nivel_riesgo DESC, id DESC
      LIMIT 200
    `),
  ])

  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    resumen: resumenRows[0],
    riesgos: detalleRows,
  }
}

const NIVEL_STYLE = {
  critico:   { color: '#DC2626', bg: '#FEE2E2', label: 'Crítico'   },
  alto:      { color: '#D97706', bg: '#FEF3C7', label: 'Alto'      },
  medio:     { color: '#534AB7', bg: '#EEEDFE', label: 'Medio'     },
  bajo:      { color: '#1D9E75', bg: '#EAF3DE', label: 'Bajo'      },
  aceptable: { color: '#888780', bg: '#F1EFE8', label: 'Aceptable' },
}
// probabilidad / impacto ahora son enteros 1-5 → color por valor.
function numColor(n) { n = Number(n); if (n >= 4) return '#DC2626'; if (n === 3) return '#D97706'; return '#1D9E75' }

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').substring(0,80) : '—' }

function buildHTML(data) {
  const r = data.resumen
  const total = Number(r.total) || 0
  const cerPct = total ? Math.round(((Number(r.cerrados) + Number(r.aceptados)) / total) * 100) : 0

  const pageOne = `
<div class="page">
  ${buildHeader('Gestión de Riesgos')}
  <div class="page-body">
    <div class="title">Gestión de Riesgos</div>
    <div class="subtitle">Matriz y estado del registro de riesgos</div>

    <div class="card-dark">
      <div>
        <span style="font-size:60px;font-weight:900;color:${Number(r.criticos) > 0 ? '#E24B4A' : '#1D9E75'};line-height:1;">${total}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">riesgos identificados en total</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:6px;">Riesgos críticos</div>
        <div style="background:${Number(r.criticos) > 0 ? '#DC2626' : '#1D9E75'};color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">
          ${r.criticos || 0}
        </div>
      </div>
    </div>

    <div class="sec-label">Por nivel de riesgo</div>
    <div class="grid-2" style="margin-bottom:20px;">
      ${[['criticos','Crítico','#DC2626'],['altos','Alto','#D97706'],['medios','Medio','#534AB7'],['bajos','Bajo','#1D9E75']].map(([k,l,c]) => `
      <div class="card" style="border-top:3px solid ${c};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:#2C2C2A;">${l}</span>
          <span style="font-size:22px;font-weight:800;color:${c};">${Number(r[k])||0}</span>
        </div>
      </div>`).join('')}
    </div>

    <div class="sec-label">Por estado de tratamiento</div>
    <div class="grid-2">
      ${[['abiertos','Abierto','#DC2626'],['en_tratamiento','En tratamiento','#D97706'],['cerrados','Cerrado','#1D9E75'],['aceptados','Aceptado','#888780']].map(([k,l,c]) => `
      <div class="card" style="border-left:4px solid ${c};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:#2C2C2A;">${l}</span>
          <span style="font-size:22px;font-weight:800;color:${c};">${Number(r[k])||0}</span>
        </div>
      </div>`).join('')}
    </div>
  </div>
  ${buildFooter(1, 2)}
</div>`

  const rows = data.riesgos.map(ri => {
    const nv = NIVEL_STYLE[ri.nivel_categoria] ?? NIVEL_STYLE.medio
    return `
<tr>
  <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #f8f7f4;">${esc(ri.categoria)}</td>
  <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #f8f7f4;">${esc(ri.nombre)}</td>
  <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:10px;color:${numColor(ri.probabilidad)};font-weight:700;">${ri.probabilidad ?? '—'}</span>
  </td>
  <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:10px;color:${numColor(ri.impacto)};font-weight:700;">${ri.impacto ?? '—'}</span>
  </td>
  <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${nv.bg};color:${nv.color};">${nv.label}</span>
  </td>
  <td style="padding:6px 8px;font-size:10px;color:#888780;border-bottom:1px solid #f8f7f4;">${esc(ri.estado?.replace(/_/g,' '))}</td>
  <td style="padding:6px 8px;font-size:10px;color:#888780;border-bottom:1px solid #f8f7f4;">${esc(ri.activo_nombre)}</td>
</tr>`
  }).join('')

  const pageTwo = `
<div class="page">
  ${buildHeader('Gestión de Riesgos')}
  <div class="page-body">
    <div class="sec-label">Registro de riesgos</div>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:#f8f7f4;">
          ${['Categoría','Riesgo','Prob.','Impacto','Nivel','Estado','Activo'].map(h =>
            `<th style="padding:7px 8px;font-size:10px;color:#888780;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">${h}</th>`
          ).join('')}
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
