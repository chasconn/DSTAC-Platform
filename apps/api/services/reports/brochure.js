// Brochure corporativo DSTAC CIBERSECURITY — estilo "Informe de Seguridad Web"
// (oscuro, técnico, grilla, mono, acentos morado/verde). HORIZONTAL (landscape).
// Self-contained (CSS oscuro propio). 8 láminas de alto impacto.
async function getData() {
  return { fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }) }
}

const PUR = '#8B7BFF', GRN = '#2FCB8F', INK = '#0a0a12', MUT = '#9A98B5', LBL = '#8A86B8'

// Logo real embebido (PNG blanco, mismo que el motor de informes). Fallback CSS.
let LOGO_DATA = ''
try {
  const fs = require('fs'), path = require('path')
  LOGO_DATA = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../../assets/logo-dstac.png')).toString('base64')
} catch { /* sin archivo → fallback */ }

function logo(h = 40) {
  if (LOGO_DATA) return `<img src="${LOGO_DATA}" alt="DSTAC" style="height:${h}px;width:auto;display:block;" />`
  return `<div style="display:flex;flex-direction:column;line-height:1;">
    <div><span style="font-family:'Arial Black',Arial;font-weight:900;font-size:24px;color:#fff;letter-spacing:-1px;">DS</span><span style="font-family:'Arial Black',Arial;font-weight:900;font-size:24px;color:${PUR};letter-spacing:-1px;">TAC</span></div>
    <div style="font-size:8px;letter-spacing:5px;color:${MUT};margin-top:3px;">TACTICAL SECURITY</div>
  </div>`
}
function pageHead(rt, rs) {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
    ${logo()}
    <div style="text-align:right;"><div style="font-size:11px;letter-spacing:3px;color:#fff;font-weight:700;">${rt}</div>
    <div style="font-size:10px;letter-spacing:3px;color:${LBL};margin-top:4px;">${rs}</div></div>
  </div>`
}
function pageFoot() {
  return `<div style="position:absolute;left:16mm;right:16mm;bottom:9mm;display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.08);padding-top:8px;">
    <span style="font-size:9px;letter-spacing:2px;color:${LBL};">DSTAC CIBERSEGURIDAD · TACTICAL SECURITY</span>
    <span style="font-size:9px;letter-spacing:2px;color:${LBL};">contacto@dstac.cl · www.dstac.cl</span>
  </div>`
}
const label = (t) => `<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${PUR};font-weight:700;margin-bottom:10px;">${t}</div>`
const title = (t) => `<div style="font-size:30px;font-weight:900;color:#fff;line-height:1.08;margin-bottom:16px;">${t}</div>`

function card(icon, t, d) {
  return `<div style="background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:14px 16px;">
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;">
      <span style="width:23px;height:23px;border-radius:7px;background:${PUR}22;color:${PUR};font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</span>
      <span style="font-size:12.5px;font-weight:700;color:#fff;">${t}</span>
    </div>
    <div style="font-size:11px;color:${MUT};line-height:1.5;">${d}</div>
  </div>`
}
function statCard(big, lbl, color) {
  return `<div style="background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:14px 16px;">
    <div style="font-size:24px;font-weight:900;color:${color};line-height:1;">${big}</div>
    <div style="font-size:10px;letter-spacing:2px;color:${LBL};margin-top:6px;text-transform:uppercase;">${lbl}</div>
  </div>`
}
const banner = (accent, t, d) => `<div style="background:${accent}14;border:1px solid ${accent}55;border-radius:14px;padding:14px 20px;">
  <div style="font-size:12.5px;color:#fff;font-weight:700;margin-bottom:3px;">${t}</div>
  <div style="font-size:11.5px;color:${MUT};line-height:1.55;">${d}</div></div>`
const grid = (cols, inner, mb = 14) => `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;margin-bottom:${mb}px;">${inner}</div>`

function buildHTML(data) {
  // ── P1 · Portada / hero (dos columnas) ──────────────────────────────
  const p1 = `<div class="page">
    ${pageHead('BROCHURE CORPORATIVO', 'CIBERSEGURIDAD · 2026')}
    <div style="display:flex;gap:26px;margin-top:6px;">
      <div style="flex:1.45;">
        <div style="font-size:12px;letter-spacing:5px;color:${LBL};margin-bottom:16px;">PLATAFORMA · SERVICIOS · RESULTADOS</div>
        <div style="font-size:50px;font-weight:900;color:#fff;line-height:1.02;">DSTAC<br><span style="color:${PUR};">CIBERSECURITY</span></div>
        <div style="font-size:14px;color:${MUT};margin-top:16px;line-height:1.6;">
          Ciberseguridad adaptada a la realidad operacional de tu organización: una plataforma propia, servicios expertos y herramientas gratuitas para proteger, cumplir y operar sin detenerte.
        </div>
        <div style="margin-top:18px;">${banner(PUR, 'Empresa chilena de ciberseguridad', 'No aplicamos soluciones genéricas: diseñamos cada estrategia según tu infraestructura, madurez y operación.')}</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:12px;justify-content:center;">
        ${statCard('24/7', 'EDR · respuesta activa', GRN)}
        ${statCard('ISO 27001', 'SoA + 23 políticas', PUR)}
        ${statCard('NIST', 'CSF 2.0', PUR)}
        ${statCard('Multi-empresa', 'informes con tu marca', GRN)}
      </div>
    </div>
    ${pageFoot()}
  </div>`

  // ── P2 · El problema / por qué ahora ────────────────────────────────
  const p2 = `<div class="page">
    ${pageHead('CONTEXTO', 'POR QUÉ AHORA')}
    ${label('El panorama')}
    ${title('La pregunta ya no es <span style="color:' + PUR + '">si</span>, sino <span style="color:' + PUR + '">cuándo</span>')}
    ${grid(3, [
      card('▲', 'Las PYMEs son el blanco', 'Menos defensas y datos valiosos: los atacantes lo saben. Un incidente puede frenar tu operación y dañar tu reputación.'),
      card('§', 'La regulación subió la vara', 'La Ley Marco de Ciberseguridad (21.663) y la Ley de Datos (21.719) elevan las exigencias. Cumplir dejó de ser opcional.'),
      card('◷', 'El costo de no prepararse', 'Pérdida de información, multas, interrupción del negocio y clientes que se van. Prevenir cuesta una fracción de recuperarse.'),
    ].join(''), 16)}
    ${banner(GRN, 'La buena noticia', 'DSTAC reúne en un solo lugar la tecnología, los servicios y el acompañamiento para que tu seguridad sea proporcional al riesgo real y sostenible en el tiempo.')}
    ${pageFoot()}
  </div>`

  // ── P3 · Quiénes somos + metodología ────────────────────────────────
  const p3 = `<div class="page">
    ${pageHead('QUIÉNES SOMOS', 'NUESTRO ENFOQUE')}
    ${label('Quiénes somos')}
    ${title('Tácticos, no genéricos')}
    <div style="font-size:12.5px;color:${MUT};line-height:1.65;margin-bottom:18px;">
      DSTAC es una empresa chilena de ciberseguridad especializada en adaptar estrategias, infraestructura y controles según las particularidades operativas de cada organización. Combinamos infraestructura segura, continuidad operacional y monitoreo continuo para que tu negocio no se detenga.
    </div>
    ${label('Nuestra metodología')}
    ${grid(4, [
      card('1', 'Levantamiento', 'Analizamos tu infraestructura, activos críticos y madurez.'),
      card('2', 'Diseño', 'Estrategia y controles personalizados, con prioridades.'),
      card('3', 'Implementación', 'Ejecutamos las mejoras técnicas y organizacionales.'),
      card('4', 'Seguimiento', 'Monitoreamos y evolucionamos tu postura con reportes.'),
    ].join(''), 16)}
    ${grid(3, [
      statCard('A medida', 'cada cliente', PUR),
      statCard('Continuo', 'monitoreo 24/7', GRN),
      statCard('Local', 'soporte en Chile', PUR),
    ].join(''))}
    ${pageFoot()}
  </div>`

  // ── P4 · La plataforma (la estrella) — sin MDM ──────────────────────
  const p4 = `<div class="page">
    ${pageHead('PRODUCTO', 'PLATAFORMA PROPIA')}
    ${label('Lo que desarrollamos')}
    ${title('La plataforma <span style="color:' + PUR + '">DSTAC CIBERSECURITY</span>')}
    <div style="font-size:12px;color:${MUT};line-height:1.55;margin-bottom:16px;">Monitoreo y gestión de toda tu ciberseguridad en un solo lugar, multi-empresa y con informes con tu marca.</div>
    ${grid(3, [
      card('◆', 'EDR · Detección y Respuesta 24/7', 'Vigilancia de endpoints con detección y <b style="color:#fff">respuesta activa</b>: bloqueo automático de ataques.'),
      card('✓', 'ISO 27001 automatizado', 'Los 93 controles, <b style="color:#fff">Declaración de Aplicabilidad (SoA)</b> y 23 políticas listas para firmar.'),
      card('◈', 'NIST CSF 2.0', 'Evaluación de madurez y brechas con informes ejecutivos descargables.'),
      card('▲', 'Riesgos e Incidentes', 'Matriz de riesgos cuantitativa y respuesta a incidentes con escalamiento automático.'),
      card('▣', 'Inventario y Accesos', 'Activos, identidades, accesos y personal centralizados y bajo control.'),
      card('◐', 'Cumplimiento y Reportes', 'Informes ejecutivos por módulo, con tu logo, listos para presentar.'),
    ].join(''), 14)}
    ${banner(PUR, 'Multi-empresa', 'Gestiona y reporta la ciberseguridad de cada cliente por separado, con informes que llevan tu marca.')}
    ${pageFoot()}
  </div>`

  // ── P5 · Servicios ──────────────────────────────────────────────────
  const p5 = `<div class="page">
    ${pageHead('SERVICIOS', 'EXPERTOS')}
    ${label('Nuestros servicios')}
    ${title('Del diagnóstico a la defensa')}
    ${grid(3, [
      card('⊕', 'Pentesting y Red Team', 'Encontramos las brechas antes que los atacantes, con explotación controlada y reportes accionables.'),
      card('⚖', 'Consultoría GRC y Cumplimiento', 'Gobernanza, riesgo y cumplimiento: ISO 27001, NIST y la normativa chilena.'),
      card('◉', 'Respuesta a Incidentes (DFIR)', 'Contención, análisis forense y recuperación cuando algo pasa.'),
      card('▦', 'Infraestructura y Redes Seguras', 'Arquitecturas fuertes y segmentadas, listas para amenazas actuales.'),
      card('⌬', 'Active Directory y Centralización', 'Gestión de identidades con control sólido de accesos.'),
      card('↻', 'Estrategias Adaptativas', 'Protección que sigue el ritmo de tu negocio y de las amenazas.'),
    ].join(''), 14)}
    ${pageFoot()}
  </div>`

  // ── P6 · Servicios gratuitos (imanes) ───────────────────────────────
  const p6 = `<div class="page">
    ${pageHead('GRATIS', 'EMPIEZA HOY')}
    ${label('Servicios gratuitos en dstac.cl')}
    ${title('Conoce tu riesgo <span style="color:' + GRN + '">sin costo</span>')}
    <div style="font-size:12px;color:${MUT};line-height:1.55;margin-bottom:16px;">Herramientas reales en nuestro sitio para que midas tu seguridad en minutos, sin compromiso.</div>
    ${grid(3, [
      card('↯', 'Escáner de seguridad web', 'Califica tu sitio (A+ a F) al instante: TLS, cabeceras (HSTS, CSP), SPF/DKIM/DMARC y más, con informe de hallazgos.'),
      card('?', 'Autodiagnóstico', 'Cuestionario rápido que mide la madurez de tu empresa y dónde concentrar esfuerzos.'),
      card('✓', 'Autoevaluación ISO 27001', 'Descubre qué tan cerca estás de cumplir el estándar, gratis y en minutos.'),
    ].join(''), 16)}
    ${banner(GRN, 'Mismo estándar visual', 'El informe del escáner web usa el mismo look de este documento: claro, técnico y accionable. Pruébalo en www.dstac.cl.')}
    ${pageFoot()}
  </div>`

  // ── P7 · Planes ─────────────────────────────────────────────────────
  const plan = (n, t, items, hot) => `<div style="background:rgba(255,255,255,.035);border:1px solid ${hot ? PUR : 'rgba(255,255,255,.09)'};border-radius:14px;padding:16px;">
    <div style="font-size:15px;font-weight:900;color:#fff;">${n}</div>
    <div style="font-size:10px;letter-spacing:1.5px;color:${PUR};text-transform:uppercase;margin:3px 0 11px;">${t}</div>
    <div style="font-size:11px;color:${MUT};line-height:1.65;">${items.map(i => '• ' + i).join('<br>')}</div>
  </div>`
  const p7 = `<div class="page">
    ${pageHead('PLANES', 'SEGÚN TU TAMAÑO')}
    ${label('Planes de servicio')}
    ${title('Cobertura a tu medida')}
    ${grid(3, [
      plan('Plan PYME', '1–15 colaboradores', ['Gestión de activos, identidades y accesos', 'Organización tecnológica', 'Evaluación e inventario inicial', 'Buenas prácticas'], false),
      plan('Plan Profesional', '15–50 colaboradores', ['Todo lo de PYME', 'Gestión de incidentes', 'Segmentación básica de red', 'Control avanzado de accesos', 'Reportes ejecutivos'], true),
      plan('Plan Empresarial', '+50 colaboradores', ['Todo lo de Profesional', 'Arquitectura de seguridad', 'Segmentación avanzada', 'Acompañamiento estratégico', 'Soporte prioritario'], false),
    ].join(''), 16)}
    ${label('Servicios complementarios')}
    <div style="font-size:11.5px;color:${MUT};line-height:1.8;">
      Simulación de phishing y concientización · Hardening de equipos · Auditorías de configuración · Levantamiento de Active Directory · Revisión de exposición web.
    </div>
    ${pageFoot()}
  </div>`

  // ── P8 · CTA + contacto ─────────────────────────────────────────────
  const p8 = `<div class="page">
    ${pageHead('CONTACTO', 'DEMOS EL PRIMER PASO')}
    <div style="text-align:center;margin-top:14px;">
      <div style="font-size:13px;letter-spacing:4px;color:${PUR};margin-bottom:12px;">¿LISTO PARA PROTEGER TU OPERACIÓN?</div>
      <div style="font-size:36px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:14px;">Agenda tu evaluación inicial <span style="color:${GRN}">sin costo</span></div>
      <div style="font-size:12.5px;color:${MUT};max-width:170mm;margin:0 auto 28px;line-height:1.6;">Te mostramos tu nivel de exposición y un plan claro para cerrar las brechas, con la plataforma y el equipo de DSTAC detrás.</div>
    </div>
    ${grid(3, [
      `<div style="background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:18px;text-align:center;"><div style="font-size:10px;letter-spacing:2px;color:${LBL};margin-bottom:7px;">TELÉFONO</div><div style="font-size:15px;color:#fff;font-weight:700;">+56 9 6219 8594</div></div>`,
      `<div style="background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:18px;text-align:center;"><div style="font-size:10px;letter-spacing:2px;color:${LBL};margin-bottom:7px;">CORREO</div><div style="font-size:14px;color:#fff;font-weight:700;">contacto@dstac.cl</div></div>`,
      `<div style="background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:18px;text-align:center;"><div style="font-size:10px;letter-spacing:2px;color:${LBL};margin-bottom:7px;">SITIO WEB</div><div style="font-size:15px;color:#fff;font-weight:700;">www.dstac.cl</div></div>`,
    ].join(''), 30)}
    <div style="display:flex;justify-content:center;">${logo(46)}</div>
    ${pageFoot()}
  </div>`

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;background:${INK};color:#E8E8F0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{position:relative;width:297mm;min-height:210mm;background:${INK};
      background-image:linear-gradient(rgba(139,123,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(139,123,255,.05) 1px,transparent 1px);
      background-size:26px 26px;padding:13mm 16mm 18mm;break-after:page;overflow:hidden;}
    .page:last-child{break-after:auto;}
    b{font-weight:700;}
  </style></head><body>${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}</body></html>`
}

module.exports = { getData, buildHTML, pdfOptions: { landscape: true } }
