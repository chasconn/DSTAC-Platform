// Declaración de Aplicabilidad (SoA — Statement of Applicability), ISO/IEC
// 27001:2022 Anexo A. Documento mandatorio: lista TODOS los controles con
// aplicabilidad, justificación y estado de implementación. Se arma desde los
// assessments que el usuario rellena en el módulo ISO (BD central).
const { buildHeader, buildFooter, wrapDocument } = require('./template')

const NAVY = '#1a1740', PURPLE = '#534AB7'

async function getData(tenantDB, centralDB, companyId, company) {
  const sub = `(SELECT id FROM iso_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1)`
  const [[ev]] = await centralDB.query(
    `SELECT id FROM iso_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1`,
    [companyId])
  const [rows] = await centralDB.execute(`
    SELECT d.id AS domain_id, d.name AS domain_name, d.order_num AS d_order,
           ic.id AS control_id, ic.name AS control_name,
           COALESCE(ica.applies, 1)          AS applies,
           ica.non_apply_reason, ica.notes_dstac, ica.responsable,
           COALESCE(ica.status, 'pendiente') AS status,
           COALESCE(ica.progress, 0)         AS progress
    FROM iso_domains d
    JOIN iso_controls ic ON ic.domain_id = d.id
    LEFT JOIN iso_control_assessments ica ON ica.control_id = ic.id AND ica.evaluation_id = ${sub}
    ORDER BY d.order_num, ic.order_num, ic.id
  `, [companyId])

  const total       = rows.length
  const aplicables  = rows.filter(r => Number(r.applies) === 1).length
  const implement   = rows.filter(r => r.status === 'implementado').length
  const parciales   = rows.filter(r => r.status === 'parcial').length

  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    tieneEvaluacion: !!ev,
    rows,
    resumen: { total, aplicables, excluidos: total - aplicables, implement, parciales },
  }
}

const STATUS_STYLE = {
  implementado: { label: 'Implementado', color: '#1D9E75', bg: '#EAF3DE' },
  parcial:      { label: 'Parcial',      color: '#D97706', bg: '#FEF3C7' },
  pendiente:    { label: 'Pendiente',    color: '#DC2626', bg: '#FEE2E2' },
  no_aplica:    { label: 'No aplica',    color: '#888780', bg: '#F1EFE8' },
}

function esc(s, max = 0) {
  let t = s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (max && t.length > max) t = t.slice(0, max - 1) + '…'
  return t
}

function buildHTML(data) {
  const { resumen: R } = data

  // Justificación: excluido → motivo de exclusión; incluido → nota o estándar SGSI.
  const justif = (r) => {
    if (Number(r.applies) === 0) return esc(r.non_apply_reason || 'Excluido del alcance del SGSI', 140)
    return esc(r.notes_dstac && r.notes_dstac.trim() ? r.notes_dstac : 'Requisito del SGSI / evaluación de riesgos', 140)
  }

  // Filas agrupadas por dominio (fila-cabecera por dominio).
  let lastDomain = null
  const body = data.rows.map(r => {
    const st = Number(r.applies) === 0 ? STATUS_STYLE.no_aplica : (STATUS_STYLE[r.status] || STATUS_STYLE.pendiente)
    const aplicaSi = Number(r.applies) === 1
    let domainRow = ''
    if (r.domain_id !== lastDomain) {
      lastDomain = r.domain_id
      domainRow = `<tr style="break-inside:avoid;"><td colspan="5" style="background:${NAVY};color:#fff;font-size:10px;font-weight:700;letter-spacing:0.5px;padding:6px 10px;">${esc(r.domain_id)} · ${esc(r.domain_name)}</td></tr>`
    }
    return `${domainRow}
<tr style="break-inside:avoid;">
  <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #f1efe8;vertical-align:top;"><b>${esc(r.control_id)}</b> ${esc(r.control_name, 70)}</td>
  <td style="padding:6px 8px;font-size:10px;text-align:center;border-bottom:1px solid #f1efe8;vertical-align:top;">
    <span style="font-weight:700;color:${aplicaSi ? '#1D9E75' : '#888780'};">${aplicaSi ? 'Sí' : 'No'}</span>
  </td>
  <td style="padding:6px 8px;font-size:9.5px;color:#6A675E;border-bottom:1px solid #f1efe8;vertical-align:top;">${justif(r)}</td>
  <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f1efe8;vertical-align:top;">
    <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${st.bg};color:${st.color};">${st.label}</span>
  </td>
  <td style="padding:6px 8px;font-size:9.5px;color:#6A675E;border-bottom:1px solid #f1efe8;vertical-align:top;">${esc(r.responsable, 40) || '—'}</td>
</tr>`
  }).join('')

  const aviso = data.tieneEvaluacion ? '' :
    `<div class="quote-block">Aún no hay una evaluación ISO activa: este documento refleja el catálogo completo del Anexo A con los valores por defecto (aplicable · pendiente). Rellena los controles en el módulo ISO para personalizarlo.</div>`

  const page = `
<div class="page">
  ${buildHeader('Declaración de Aplicabilidad')}
  <div class="page-body">
    <div class="title">Declaración de Aplicabilidad (SoA)</div>
    <div class="subtitle">ISO/IEC 27001:2022 · Anexo A · ${esc(data.company.name)}</div>

    <div class="grid-3" style="margin-bottom:18px;">
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;color:#888780;">Controles</span><span style="font-size:20px;font-weight:800;color:${NAVY};">${R.total}</span></div></div>
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;color:#888780;">Aplicables</span><span style="font-size:20px;font-weight:800;color:${PURPLE};">${R.aplicables}</span></div></div>
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;color:#888780;">Excluidos</span><span style="font-size:20px;font-weight:800;color:#888780;">${R.excluidos}</span></div></div>
    </div>
    ${aviso}
    <div style="font-size:11px;color:#6A675E;margin-bottom:14px;line-height:1.6;">
      Documento emitido el <b>${data.fecha}</b>. Implementados: <b>${R.implement}</b> · Parciales: <b>${R.parciales}</b>.
      Esta Declaración de Aplicabilidad identifica los controles del Anexo A de ISO/IEC 27001:2022, su aplicabilidad
      al SGSI de ${esc(data.company.name)}, la justificación de inclusión o exclusión y su estado de implementación.
    </div>

    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:#f8f7f4;">
          ${['Control', 'Aplica', 'Justificación', 'Estado', 'Responsable'].map((h, i) =>
            `<th style="padding:7px 8px;font-size:9.5px;color:#888780;font-weight:700;text-align:${i === 1 || i === 3 ? 'center' : 'left'};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #e2e0d8;">${h}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
  ${buildFooter(1, 1)}
</div>`

  return wrapDocument(page)
}

module.exports = { getData, buildHTML }
