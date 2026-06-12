const { buildHeader, buildFooter, buildBar, buildMetricCard, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const [[resumenRows], [detalleRows]] = await Promise.all([
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(estado='abierto') AS abiertos,
        SUM(estado='en_investigacion') AS en_investigacion,
        SUM(estado='en_respuesta') AS en_respuesta,
        SUM(estado='cerrado') AS cerrados,
        SUM(severidad='critica') AS critica,
        SUM(severidad='alta') AS alta,
        SUM(severidad='media') AS media,
        SUM(severidad='baja') AS baja
      FROM incidentes
    `),
    tenantDB.execute(`
      SELECT id, tipo, categoria, estado, severidad, impacto,
             fecha_deteccion, fecha_respuesta, tiempo_resolucion, responsable
      FROM incidentes
      ORDER BY FIELD(severidad,'critica','alta','media','baja'),
               FIELD(estado,'abierto','en_investigacion','en_respuesta','cerrado')
      LIMIT 200
    `),
  ])

  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    resumen: resumenRows[0],
    incidentes: detalleRows,
  }
}

const SEV_STYLE = {
  critica: { color: '#DC2626', bg: '#FEE2E2', label: 'Crítica' },
  alta:    { color: '#D97706', bg: '#FEF3C7', label: 'Alta'    },
  media:   { color: '#534AB7', bg: '#EEEDFE', label: 'Media'   },
  baja:    { color: '#1D9E75', bg: '#EAF3DE', label: 'Baja'    },
}
const EST_STYLE = {
  abierto:          { color: '#DC2626', label: 'Abierto'           },
  en_investigacion: { color: '#D97706', label: 'En investigación'  },
  en_respuesta:     { color: '#534AB7', label: 'En respuesta'      },
  cerrado:          { color: '#1D9E75', label: 'Cerrado'           },
  falso_positivo:   { color: '#888780', label: 'Falso positivo'    },
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '—' }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-CL') : '—' }

function buildHTML(data) {
  const r = data.resumen
  const total = Number(r.total) || 0
  const abPct = total ? Math.round(((Number(r.cerrados)) / total) * 100) : 0

  const pageOne = `
<div class="page">
  ${buildHeader('Incidentes de Seguridad')}
  <div class="page-body">
    <div class="title">Incidentes de Seguridad</div>
    <div class="subtitle">Historial y estado de incidentes</div>

    <div class="card-dark">
      <div>
        <span style="font-size:60px;font-weight:900;color:${Number(r.abiertos) > 0 ? '#E24B4A' : '#1D9E75'};line-height:1;">${total}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">incidentes registrados en total</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:6px;">Incidentes abiertos</div>
        <div style="background:${Number(r.abiertos) > 0 ? '#DC2626' : '#1D9E75'};color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">
          ${r.abiertos || 0}
        </div>
      </div>
    </div>

    <div class="sec-label">Por estado</div>
    <div class="grid-2" style="margin-bottom:20px;">
      ${[['abiertos','Abiertos','#DC2626'],['en_investigacion','En investigación','#D97706'],['en_respuesta','En respuesta','#534AB7'],['cerrados','Cerrados','#1D9E75']].map(([k,l,c]) => `
      <div class="card" style="border-left:4px solid ${c};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:#2C2C2A;">${l}</span>
          <span style="font-size:22px;font-weight:800;color:${c};">${Number(r[k])||0}</span>
        </div>
      </div>`).join('')}
    </div>

    <div class="sec-label">Por severidad</div>
    <div class="grid-2">
      ${Object.entries(SEV_STYLE).map(([k, s]) => `
      <div class="card" style="border-top:3px solid ${s.color};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;">${s.label}</span>
          <span style="font-size:22px;font-weight:800;color:${s.color};">${Number(r[k])||0}</span>
        </div>
      </div>`).join('')}
    </div>
  </div>
  ${buildFooter(1, 2)}
</div>`

  const rows = data.incidentes.map(i => {
    const sev = SEV_STYLE[i.severidad] ?? SEV_STYLE.baja
    const est = EST_STYLE[i.estado]    ?? EST_STYLE.abierto
    return `
<tr>
  <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #f8f7f4;font-weight:600;">${esc(i.tipo)}</td>
  <td style="padding:6px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${esc(i.categoria)}</td>
  <td style="padding:6px 10px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${sev.bg};color:${sev.color};">${sev.label}</span>
  </td>
  <td style="padding:6px 10px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:10px;font-weight:700;color:${est.color};">${est.label}</span>
  </td>
  <td style="padding:6px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${fmtDate(i.fecha_deteccion)}</td>
  <td style="padding:6px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${i.tiempo_resolucion ? i.tiempo_resolucion + ' min' : '—'}</td>
</tr>`
  }).join('')

  const pageTwo = `
<div class="page">
  ${buildHeader('Incidentes de Seguridad')}
  <div class="page-body">
    <div class="sec-label">Historial de incidentes</div>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:#f8f7f4;">
          ${['Tipo','Categoría','Severidad','Estado','Detección','T. Resolución'].map(h =>
            `<th style="padding:7px 10px;font-size:10px;color:#888780;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e0d8;">${h}</th>`
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
