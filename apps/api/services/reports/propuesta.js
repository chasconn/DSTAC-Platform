// Propuesta de Servicios DSTAC — estilo "Informe de Seguridad Web" (oscuro,
// horizontal). Planes TIER 1/2/3 con precios + complementarios, tomados del
// catálogo de cotización (siempre en sync con los precios reales).
const NAVY = '#1a1740', PUR = '#8B7BFF', GRN = '#2FCB8F', INK = '#0a0a12', MUT = '#A6A4C0', LBL = '#8A86B8'
const CLP = (n) => (n == null ? '—' : '$' + Number(n).toLocaleString('es-CL'))

let LOGO_DATA = ''
try {
  const fs = require('fs'), path = require('path')
  LOGO_DATA = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../../assets/logo-dstac.png')).toString('base64')
} catch {}
function logo(h = 44) {
  if (LOGO_DATA) return `<img src="${LOGO_DATA}" alt="DSTAC" style="height:${h}px;width:auto;display:block;" />`
  return `<div style="font-family:'Arial Black',Arial;font-weight:900;font-size:24px;color:#fff;">DS<span style="color:${PUR};">TAC</span></div>`
}
const pageHead = (rt, rs) => `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">${logo()}
  <div style="text-align:right;"><div style="font-size:11px;letter-spacing:3px;color:#fff;font-weight:700;">${rt}</div>
  <div style="font-size:10px;letter-spacing:3px;color:${LBL};margin-top:4px;">${rs}</div></div></div>`
const pageFoot = () => `<div style="position:absolute;left:16mm;right:16mm;bottom:9mm;display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.08);padding-top:8px;">
  <span style="font-size:9px;letter-spacing:2px;color:${LBL};">DSTAC CIBERSEGURIDAD · TACTICAL SECURITY</span>
  <span style="font-size:9px;letter-spacing:2px;color:${LBL};">contacto@dstac.cl · www.dstac.cl</span></div>`
const label = (t) => `<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${PUR};font-weight:700;margin-bottom:10px;">${t}</div>`
const title = (t) => `<div style="font-size:32px;font-weight:900;color:#fff;line-height:1.08;margin-bottom:16px;">${t}</div>`
const card = (icon, t, d) => `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:16px 18px;">
  <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;"><span style="width:24px;height:24px;border-radius:7px;background:${PUR}22;color:${PUR};font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;">${icon}</span><span style="font-size:13px;font-weight:700;color:#fff;">${t}</span></div>
  <div style="font-size:11.5px;color:${MUT};line-height:1.55;">${d}</div></div>`
const grid = (c, inner, mb = 16) => `<div style="display:grid;grid-template-columns:repeat(${c},1fr);gap:14px;margin-bottom:${mb}px;">${inner}</div>`

// Detalle de inclusión por TIER (contenido de presentación; precios van del catálogo).
const INCLUYE = [
  { tier: 'TIER 1', seg: 'PYME · 1–15 colaboradores', diag: 790000, items: ['Gestión de activos, identidades y accesos', 'Monitoreo L–V · EDR hasta 15 equipos', 'Reporte mensual y gestión básica de incidentes', 'Phishing trimestral', 'Onboarding y documentación base ISO', 'Buenas prácticas operacionales'] },
  { tier: 'TIER 2', seg: 'Mediana · 15–50 colaboradores', diag: 1200000, items: ['Todo lo del TIER 1', 'VMaaS · EDR hasta 50 equipos', 'Phishing mensual · gestión completa de incidentes', 'Segmentación básica de red', 'Active Directory básico · control avanzado de accesos', 'Reportes ejecutivos · soporte de cumplimiento legal'], hot: true },
  { tier: 'TIER 3', seg: 'Grande · +50 colaboradores', diag: 2500000, diagDesde: true, items: ['Todo lo del TIER 2', 'vCISO · comité de seguridad', 'Retainer DFIR · EDR ilimitado', 'Arquitectura y segmentación avanzada', 'Active Directory corporativo', 'Acompañamiento estratégico · soporte prioritario'] },
]

async function getData(tenantDB, centralDB) {
  const [planes] = await centralDB.execute(`SELECT nombre, precio_sugerido FROM cotizacion_catalogo WHERE activo=1 AND nivel='Plan' ORDER BY orden`)
  const [comp] = await centralDB.execute(`SELECT nombre, tipo, precio_sugerido FROM cotizacion_catalogo WHERE activo=1 AND nivel<>'Plan' AND nombre NOT LIKE '%Diagnóstico de Postura%' ORDER BY tipo='mensual' DESC, precio_sugerido`)
  return {
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    precios: planes.map(p => p.precio_sugerido),   // [TIER1, TIER2, TIER3] mensual
    comp,
  }
}

function buildHTML(data) {
  const precios = data.precios || []
  // ── P1 Portada ──
  const p1 = `<div class="page">${pageHead('PROPUESTA DE SERVICIOS', 'CIBERSEGURIDAD · 2026')}
    <div style="display:flex;gap:30px;margin-top:10px;">
      <div style="flex:1.4;">
        <div style="font-size:12px;letter-spacing:5px;color:${LBL};margin-bottom:16px;">SEGURIDAD ADAPTADA A TU OPERACIÓN</div>
        <div style="font-size:50px;font-weight:900;color:#fff;line-height:1.02;">Propuesta de<br><span style="color:${PUR};">Servicios</span></div>
        <div style="font-size:15px;color:${MUT};margin-top:18px;line-height:1.65;">Infraestructura segura, continuidad operacional y cumplimiento para empresas chilenas — con planes claros por tamaño y servicios a la medida de cada brecha.</div>
        <div style="margin-top:22px;font-size:12px;color:${LBL};">DSTAC <span style="color:#fff;font-weight:700;">Cybersecurity</span> · ${data.fecha}</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:12px;justify-content:center;">
        ${INCLUYE.map((t, i) => `<div style="background:rgba(255,255,255,.04);border:1px solid ${t.hot ? PUR : 'rgba(255,255,255,.10)'};border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div><div style="font-size:14px;font-weight:900;color:#fff;">${t.tier}</div><div style="font-size:10px;color:${LBL};">${t.seg}</div></div>
          <div style="text-align:right;"><div style="font-size:18px;font-weight:900;color:${GRN};">${CLP(precios[i])}</div><div style="font-size:9px;color:${LBL};letter-spacing:1px;">MENSUAL</div></div></div>`).join('')}
      </div>
    </div>${pageFoot()}</div>`

  // ── P2 Quiénes somos + metodología ──
  const p2 = `<div class="page">${pageHead('QUIÉNES SOMOS', 'ENFOQUE Y MÉTODO')}
    ${label('Quiénes somos')}${title('Tácticos, no genéricos')}
    <div style="font-size:13px;color:${MUT};line-height:1.7;margin-bottom:18px;">DSTAC Cybersecurity es una empresa chilena de ciberseguridad que adapta estrategias y controles a la realidad operacional de cada organización. Combinamos infraestructura segura, continuidad operacional y acompañamiento permanente para que tu negocio no se detenga.</div>
    ${grid(4, [
      card('1', 'Levantamiento', 'Analizamos tu infraestructura, activos críticos y nivel de madurez.'),
      card('2', 'Diseño', 'Estrategia y controles personalizados, con prioridades y plan.'),
      card('3', 'Implementación', 'Ejecutamos las mejoras técnicas y organizacionales.'),
      card('4', 'Seguimiento', 'Monitoreo, soporte consultivo y evolución continua.'),
    ].join(''))}
    ${grid(2, [
      card('◆', 'Enfoque adaptativo', 'Cada estrategia se diseña según tu realidad operacional, infraestructura y madurez — no soluciones genéricas.'),
      card('↻', 'Acompañamiento permanente', 'No desaparecemos tras la implementación: seguimiento continuo, soporte consultivo y evolución constante.'),
    ].join(''), 0)}
    ${pageFoot()}</div>`

  // ── P3 Planes con precios ──
  const planCard = (t, i) => `<div style="background:rgba(255,255,255,.04);border:1px solid ${t.hot ? PUR : 'rgba(255,255,255,.10)'};border-radius:16px;padding:18px;display:flex;flex-direction:column;">
    ${t.hot ? `<div style="font-size:9px;letter-spacing:2px;color:${PUR};font-weight:800;margin-bottom:4px;">RECOMENDADO</div>` : ''}
    <div style="font-size:20px;font-weight:900;color:#fff;">${t.tier}</div>
    <div style="font-size:10px;letter-spacing:1px;color:${PUR};text-transform:uppercase;margin:2px 0 12px;">${t.seg}</div>
    <div style="font-size:26px;font-weight:900;color:${GRN};line-height:1;">${CLP(precios[i])}<span style="font-size:11px;color:${LBL};font-weight:600;"> /mes</span></div>
    <div style="font-size:10.5px;color:${MUT};margin:4px 0 12px;">Diagnóstico inicial ${t.diagDesde ? 'desde ' : ''}${CLP(t.diag)}</div>
    <div style="font-size:11px;color:${MUT};line-height:1.7;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;">${t.items.map(x => '• ' + x).join('<br>')}</div></div>`
  const p3 = `<div class="page">${pageHead('PLANES', 'TRES NIVELES')}
    ${label('Planes de servicio')}${title('Tres niveles, un mismo enfoque')}
    ${grid(3, INCLUYE.map(planCard).join(''), 12)}
    <div style="font-size:10.5px;color:${LBL};font-style:italic;">Valores netos (+ IVA). La mensualidad incluye el servicio gestionado; el diagnóstico inicial es un pago único de onboarding. Contratos sugeridos de 12 meses.</div>
    ${pageFoot()}</div>`

  // ── P4 Complementarios (à la carte) ──
  const comp = data.comp || []
  const mid = Math.ceil(comp.length / 2)
  const colRows = (arr) => arr.map(s => `<tr>
    <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid rgba(255,255,255,.07);color:#fff;">${s.nombre}</td>
    <td style="padding:6px 8px;font-size:9px;text-align:center;border-bottom:1px solid rgba(255,255,255,.07);color:${LBL};">${s.tipo === 'mensual' ? 'MENSUAL' : 'ÚNICO'}</td>
    <td style="padding:6px 8px;font-size:11px;text-align:right;border-bottom:1px solid rgba(255,255,255,.07);color:${GRN};font-weight:700;">${CLP(s.precio_sugerido)}</td></tr>`).join('')
  const tabla = (arr) => `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">${colRows(arr)}</table>`
  const p4 = `<div class="page">${pageHead('COMPLEMENTARIOS', 'À LA CARTE')}
    ${label('Servicios complementarios')}${title('Proyectos a la medida')}
    <div style="font-size:12px;color:${MUT};line-height:1.55;margin-bottom:16px;">Soluciones adicionales para cerrar brechas específicas de cumplimiento, infraestructura y resiliencia. Se cotizan según alcance.</div>
    ${grid(2, [`<div>${tabla(comp.slice(0, mid))}</div>`, `<div>${tabla(comp.slice(mid))}</div>`].join(''), 12)}
    <div style="font-size:10.5px;color:${LBL};font-style:italic;">Valores netos referenciales (+ IVA); el valor final depende del alcance. La certificación ISO/legal la emite un organismo acreditado independiente; DSTAC prepara y acompaña.</div>
    ${pageFoot()}</div>`

  // ── P5 CTA ──
  const p5 = `<div class="page">${pageHead('CONTACTO', 'SIGUIENTE PASO')}
    <div style="text-align:center;margin-top:22px;">
      <div style="font-size:13px;letter-spacing:4px;color:${PUR};margin-bottom:12px;">¿LISTO PARA PROTEGER TU OPERACIÓN?</div>
      <div style="font-size:40px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:14px;">Agenda tu evaluación inicial <span style="color:${GRN}">sin costo</span></div>
      <div style="font-size:13px;color:${MUT};max-width:170mm;margin:0 auto 30px;line-height:1.6;">Medimos tu nivel de exposición, te recomendamos el plan adecuado a tu tamaño y armamos una propuesta clara para cerrar las brechas.</div>
    </div>
    ${grid(3, [
      `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:20px;text-align:center;"><div style="font-size:10px;letter-spacing:2px;color:${LBL};margin-bottom:8px;">SITIO WEB</div><div style="font-size:15px;color:#fff;font-weight:700;">www.dstac.cl</div></div>`,
      `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:20px;text-align:center;"><div style="font-size:10px;letter-spacing:2px;color:${LBL};margin-bottom:8px;">CORREO</div><div style="font-size:14px;color:#fff;font-weight:700;">contacto@dstac.cl</div></div>`,
      `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:20px;text-align:center;"><div style="font-size:10px;letter-spacing:2px;color:${LBL};margin-bottom:8px;">TELÉFONO</div><div style="font-size:15px;color:#fff;font-weight:700;">+56 9 6219 8594</div></div>`,
    ].join(''), 30)}
    <div style="display:flex;justify-content:center;">${logo(48)}</div>
    ${pageFoot()}</div>`

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;background:${INK};color:#E8E8F0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{position:relative;width:297mm;min-height:210mm;background:${INK};background-image:linear-gradient(rgba(139,123,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(139,123,255,.05) 1px,transparent 1px);background-size:28px 28px;padding:14mm 16mm 18mm;break-after:page;overflow:hidden;}
    .page:last-child{break-after:auto;}
    b{font-weight:700;}
  </style></head><body>${p1}${p2}${p3}${p4}${p5}</body></html>`
}

module.exports = { getData, buildHTML, pdfOptions: { landscape: true } }
