// Certificado de Cumplimiento — Ley N° 21.663 (Ciberseguridad) o
// Ley N° 21.719 (Protección de Datos), según query.ley. Página única
// horizontal, estilo formal/minimalista (a diferencia del resto de
// informes, que son oscuros y técnicos). Solo existe si la evaluación ya
// tiene certificado_codigo emitido (ver routes/admin/ley21663.js y ley21719.js).
const fs = require('fs')
const path = require('path')
let QRCode = null
try { QRCode = require('qrcode') } catch { /* dep opcional */ }

const PURPLE = '#534AB7'
const INK    = '#1c1c22'
const MUTED  = '#9b99a6'
const APP_URL = process.env.APP_URL || 'https://portal.dstac.cl'

const LEYES = {
  '21663': { tabla: 'ley21663_evaluaciones', titulo: 'Ley N° 21.663 · Ley Marco de Ciberseguridad', norma: 'Ley N° 21.663', descripcion: 'la evaluación de madurez en ciberseguridad' },
  '21719': { tabla: 'ley21719_evaluaciones', titulo: 'Ley N° 21.719 · Protección de Datos Personales', norma: 'Ley N° 21.719', descripcion: 'la evaluación de cumplimiento en protección de datos personales' },
}

function fileToDataURI(rel) {
  try { return 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../../assets', rel)).toString('base64') }
  catch { return '' }
}

async function getData(tenantDB, centralDB, companyId, company, query = {}) {
  const leyInfo = LEYES[query.ley] || LEYES['21663']
  const [[ev]] = await centralDB.query(
    `SELECT * FROM ${leyInfo.tabla} WHERE id = ? AND company_id = ? LIMIT 1`,
    [query.evaluacionId, companyId])
  if (!ev) throw new Error('Evaluación no encontrada')

  // req.company (resolveTenant) solo trae id/slug/plan_id/status — el nombre
  // y RUT para mostrar en el certificado se consultan aparte.
  const [[emp]] = await centralDB.query(`SELECT name, rut FROM companies WHERE id = ?`, [companyId])
  company = { ...company, name: emp?.name || company?.name, rut: emp?.rut || company?.rut }

  // Vista previa (solo DSTAC, antes de emitir): permite revisar el diseño
  // exacto con los datos reales sin generar ni persistir un código real.
  const esVistaPrevia = !ev.certificado_codigo
  if (esVistaPrevia && !query.preview) throw new Error('Esta evaluación no tiene un certificado emitido')

  const codigo = ev.certificado_codigo || 'VISTA-PREVIA'
  const fechaBase = ev.certificado_emitido_at ? new Date(ev.certificado_emitido_at) : new Date()
  const verifyUrl = `${APP_URL}/verificar/${codigo}`
  let qrDataUrl = ''
  if (QRCode && !esVistaPrevia) {
    try { qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 240, margin: 1, color: { dark: INK, light: '#ffffff' } }) } catch {}
  }

  return {
    company,
    ev,
    leyInfo,
    codigo,
    esVistaPrevia,
    verifyUrl,
    qrDataUrl,
    logo: fileToDataURI('logo-dstac.png'),
    isotipo: fileToDataURI('isotipo-dstac.png'),
    fechaEmision: fechaBase.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
  }
}

function buildHTML(data) {
  const { company, ev, leyInfo, codigo, esVistaPrevia, qrDataUrl, logo, isotipo, fechaEmision } = data

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: A4 landscape; margin: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .sheet { position:relative; width:297mm; height:210mm; background:#fff; overflow:hidden; }
  .frame-outer { position:absolute; inset:14mm; border:1px solid ${PURPLE}; }
  .frame-inner { position:absolute; inset:17mm; border:1px solid rgba(83,74,183,0.25); }
  .watermark { position:absolute; right:-30mm; bottom:-34mm; opacity:0.05; }
  .content { position:relative; height:100%; display:flex; flex-direction:column; align-items:center; padding:24mm 36mm 16mm; }
  .brand { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
  .label { font-size:12px; font-weight:700; letter-spacing:4px; color:${PURPLE}; text-transform:uppercase; margin-bottom:8px; }
  .ley { font-size:20px; font-weight:600; color:${INK}; text-align:center; margin-bottom:22px; }
  .pretexto { font-size:12px; color:${MUTED}; margin-bottom:6px; }
  .empresa { font-family: Georgia, 'Times New Roman', serif; font-size:32px; font-weight:700; color:${INK}; text-align:center; margin-bottom:2px; }
  .rut { font-size:12px; color:${MUTED}; letter-spacing:1px; margin-bottom:20px; }
  .cuerpo { font-size:13px; line-height:1.7; color:#3a3942; text-align:center; max-width:560px; margin-bottom:18px; }
  .badge { display:flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; border:2px solid ${PURPLE}; margin-bottom:auto; }
  .badge span { font-size:18px; font-weight:800; color:${PURPLE}; }
  .footer { width:100%; display:flex; align-items:flex-end; justify-content:space-between; margin-top:22px; }
  .qr-block { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
  .qr-block img { width:52px; height:52px; }
  .codigo { font-size:8.5px; color:${MUTED}; letter-spacing:0.5px; }
  .fechas { text-align:center; }
  .fechas .emitido { font-size:12px; color:#3a3942; margin-bottom:2px; }
  .firma { text-align:center; }
  .firma .linea { width:150px; border-top:1px solid #c9c7d1; padding-top:5px; margin:0 auto; }
  .firma .nombre { font-size:10.5px; color:#3a3942; font-weight:600; }
  .firma .cargo { font-size:9px; color:${MUTED}; }
  .marca-previa { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-22deg); font-size:62px; font-weight:900; letter-spacing:6px; color:rgba(192,57,43,0.10); text-transform:uppercase; white-space:nowrap; pointer-events:none; }
</style></head>
<body>
  <div class="sheet">
    <div class="frame-outer"></div>
    <div class="frame-inner"></div>
    ${isotipo ? `<img class="watermark" src="${isotipo}" style="width:140mm;" />` : ''}
    ${esVistaPrevia ? `<div class="marca-previa">Vista previa</div>` : ''}

    <div class="content">
      <div class="brand">
        ${logo ? `<img src="${logo}" style="height:30px;" />` : `<span style="font-weight:800;font-size:16px;">DSTAC SECURITY</span>`}
      </div>

      <div class="label">Certificado de Cumplimiento</div>
      <div class="ley">${leyInfo.titulo}</div>

      <div class="pretexto">Se certifica que</div>
      <div class="empresa">${company.name}</div>
      ${company.rut ? `<div class="rut">RUT ${company.rut}</div>` : '<div style="margin-bottom:20px"></div>'}

      <div class="cuerpo">
        ha sido evaluada conforme a los lineamientos de la <strong>${leyInfo.norma}</strong>, alcanzando un nivel de cumplimiento
        <strong style="color:${PURPLE};">${ev.nivel}</strong>, de acuerdo a ${leyInfo.descripcion} realizada por DSTAC Security.
      </div>

      <div class="badge"><span>${ev.score_total}</span></div>

      <div class="footer">
        <div class="qr-block">
          ${qrDataUrl ? `<img src="${qrDataUrl}" />` : ''}
          <span class="codigo">${esVistaPrevia ? 'SIN EMITIR · SOLO VISTA PREVIA' : `COD. VERIF. ${codigo}`}</span>
        </div>
        <div class="fechas">
          <div class="emitido">Emitido el ${fechaEmision}</div>
        </div>
        <div class="firma">
          <div class="linea">
            <div class="nombre">DSTAC Security</div>
            <div class="cargo">Equipo de Ciberseguridad</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body></html>`
}

module.exports = { getData, buildHTML, pdfOptions: { landscape: true } }
