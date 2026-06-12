const { buildHeader, buildFooter, buildBar, buildMetricCard, colorFor, wrapDocument } = require('./template')

async function getData(tenantDB, centralDB, companyId, company) {
  const [[resumenRows], [detalleRows]] = await Promise.all([
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(estado='activa') AS activas,
        SUM(estado='inactiva') AS inactivas,
        SUM(estado='comprometida') AS comprometidas,
        SUM(estado='expirada') AS expiradas
      FROM identidades
    `),
    tenantDB.execute(`
      SELECT i.id, i.nombre, i.identidad, i.tipo_identidad, i.origen,
             i.estado, i.fecha_expiracion,
             p.nombre AS propietario
      FROM identidades i
      LEFT JOIN personal p ON p.id = i.propietario_id
      ORDER BY FIELD(i.estado,'comprometida','expirada','activa','inactiva'), i.nombre ASC
      LIMIT 200
    `),
  ])

  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    resumen: resumenRows[0],
    identidades: detalleRows,
  }
}

const ESTADO_STYLE = {
  activa:       { color: '#1D9E75', bg: '#EAF3DE', label: 'Activa'       },
  inactiva:     { color: '#888780', bg: '#F1EFE8', label: 'Inactiva'     },
  comprometida: { color: '#DC2626', bg: '#FEE2E2', label: 'Comprometida' },
  expirada:     { color: '#D97706', bg: '#FEF3C7', label: 'Expirada'     },
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '—' }

function buildHTML(data) {
  const r = data.resumen
  const total = Number(r.total) || 0
  const saludPct = total ? Math.round((Number(r.activas) / total) * 100) : 0
  const problema = Number(r.comprometidas) + Number(r.expiradas)

  const pageOne = `
<div class="page">
  ${buildHeader('Identidades y Accesos')}
  <div class="page-body">
    <div class="title">Identidades y Accesos</div>
    <div class="subtitle">Estado de las identidades digitales</div>

    <div class="card-dark">
      <div>
        <span style="font-size:60px;font-weight:900;color:${colorFor(saludPct)};line-height:1;">${total}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">identidades registradas en total</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:6px;">Requieren atención</div>
        <div style="background:${problema > 0 ? '#DC2626' : '#1D9E75'};color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">
          ${problema} identidades
        </div>
      </div>
    </div>

    <div class="sec-label">Distribución por estado</div>
    <div class="grid-2" style="margin-bottom:24px;">
      ${Object.entries(ESTADO_STYLE).map(([k, s]) => `
      <div class="card" style="border-top:3px solid ${s.color};">
        <div style="font-size:11px;color:#888780;margin-bottom:6px;">${s.label}</div>
        <div style="font-size:26px;font-weight:800;color:${s.color};">${Number(r[k + 's'] ?? r[k]) || 0}</div>
      </div>`).join('')}
    </div>

    <div class="sec-label">Salud general de identidades</div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:12px;color:#888780;">Identidades activas vs total</span>
        <span style="font-size:14px;font-weight:700;color:${colorFor(saludPct)};">${saludPct}%</span>
      </div>
      ${buildBar(saludPct, colorFor(saludPct))}
    </div>
    ${problema > 0 ? `
    <div class="quote-block" style="margin-top:16px;">
      Se detectaron <strong>${problema}</strong> identidades que requieren atención inmediata
      (${r.comprometidas || 0} comprometidas + ${r.expiradas || 0} expiradas).
      Se recomienda revisar y revocar estos accesos a la brevedad.
    </div>` : ''}
  </div>
  ${buildFooter(1, 2)}
</div>`

  const rows = data.identidades.map(i => {
    const st = ESTADO_STYLE[i.estado] ?? ESTADO_STYLE.inactiva
    const exp = i.fecha_expiracion ? new Date(i.fecha_expiracion).toLocaleDateString('es-CL') : '—'
    return `
<tr>
  <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #f8f7f4;font-weight:600;">${esc(i.nombre)}</td>
  <td style="padding:6px 10px;font-size:10px;color:#888780;border-bottom:1px solid #f8f7f4;font-family:monospace;">${esc(i.identidad)}</td>
  <td style="padding:6px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${esc(i.tipo_identidad?.replace(/_/g,' '))}</td>
  <td style="padding:6px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${esc(i.origen)}</td>
  <td style="padding:6px 10px;text-align:center;border-bottom:1px solid #f8f7f4;">
    <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${st.bg};color:${st.color};">${st.label}</span>
  </td>
  <td style="padding:6px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${exp}</td>
  <td style="padding:6px 10px;font-size:11px;color:#888780;border-bottom:1px solid #f8f7f4;">${esc(i.propietario)}</td>
</tr>`
  }).join('')

  const pageTwo = `
<div class="page">
  ${buildHeader('Identidades y Accesos')}
  <div class="page-body">
    <div class="sec-label">Detalle de identidades</div>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:#f8f7f4;">
          ${['Nombre','Identidad','Tipo','Origen','Estado','Expiración','Propietario'].map(h =>
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
