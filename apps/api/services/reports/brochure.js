// Brochure corporativo DSTAC Cybersecurity — estilo "Informe de Seguridad Web"
// (oscuro, técnico, grilla, mono, acentos morado/verde). HORIZONTAL (landscape).
// Self-contained (CSS oscuro propio). 8 láminas de alto impacto.
async function getData() {
  return { fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }) }
}

const PUR = '#8B7BFF', GRN = '#2FCB8F', INK = '#0a0a12', MUT = '#A6A4C0', LBL = '#8A86B8'

// Logo real embebido (PNG blanco, mismo que el motor de informes). Fallback CSS.
let LOGO_DATA = ''
try {
  const fs = require('fs'), path = require('path')
  LOGO_DATA = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../../assets/logo-dstac.png')).toString('base64')
} catch { /* sin archivo → fallback */ }

function logo(h = 46) {
  if (LOGO_DATA) return `<img src="${LOGO_DATA}" alt="DSTAC" style="height:${h}px;width:auto;display:block;" />`
  return `<div style="display:flex;flex-direction:column;line-height:1;">
    <div><span style="font-family:'Arial Black',Arial;font-weight:900;font-size:26px;color:#fff;letter-spacing:-1px;">DS</span><span style="font-family:'Arial Black',Arial;font-weight:900;font-size:26px;color:${PUR};letter-spacing:-1px;">TAC</span></div>
    <div style="font-size:8px;letter-spacing:5px;color:${MUT};margin-top:3px;">TACTICAL SECURITY</div>
  </div>`
}
function pageHead(rt, rs) {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:26px;">
    ${logo()}
    <div style="text-align:right;"><div style="font-size:12px;letter-spacing:3px;color:#fff;font-weight:700;">${rt}</div>
    <div style="font-size:10px;letter-spacing:3px;color:${LBL};margin-top:5px;">${rs}</div></div>
  </div>`
}
function pageFoot() {
  return `<div style="position:absolute;left:18mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.08);padding-top:9px;">
    <span style="font-size:9px;letter-spacing:2px;color:${LBL};">DSTAC CIBERSEGURIDAD · TACTICAL SECURITY</span>
    <span style="font-size:9px;letter-spacing:2px;color:${LBL};">contacto@dstac.cl · www.dstac.cl</span>
  </div>`
}
const label = (t) => `<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${PUR};font-weight:700;margin-bottom:12px;">${t}</div>`
const title = (t) => `<div style="font-size:38px;font-weight:900;color:#fff;line-height:1.08;margin-bottom:22px;">${t}</div>`

function card(icon, t, d) {
  return `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:20px 22px;">
    <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px;">
      <span style="width:30px;height:30px;border-radius:9px;background:${PUR}22;color:${PUR};font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</span>
      <span style="font-size:15px;font-weight:700;color:#fff;">${t}</span>
    </div>
    <div style="font-size:13px;color:${MUT};line-height:1.65;">${d}</div>
  </div>`
}
function statCard(big, lbl, color) {
  return `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:20px 22px;">
    <div style="font-size:30px;font-weight:900;color:${color};line-height:1;">${big}</div>
    <div style="font-size:11px;letter-spacing:2px;color:${LBL};margin-top:8px;text-transform:uppercase;">${lbl}</div>
  </div>`
}
const mini = (t, d) => `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:16px 18px;">
  <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:5px;">${t}</div>
  <div style="font-size:12px;color:${MUT};line-height:1.55;">${d}</div></div>`
const banner = (accent, t, d) => `<div style="background:${accent}16;border:1px solid ${accent}55;border-radius:16px;padding:18px 24px;">
  <div style="font-size:14px;color:#fff;font-weight:700;margin-bottom:5px;">${t}</div>
  <div style="font-size:13px;color:${MUT};line-height:1.6;">${d}</div></div>`
const grid = (cols, inner, mb = 18) => `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;margin-bottom:${mb}px;">${inner}</div>`

// Íconos SVG inline (siempre renderizan en el PDF; no dependen de fuentes de glifos).
const SVG = (p) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;">${p}</svg>`
const IC = {
  shield:   '<path d="M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  iso:      '<circle cx="12" cy="12" r="9"/><path d="M8.4 12.2l2.4 2.4 4.8-5.2"/>',
  nist:     '<path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z"/><path d="M4 12l8 4.5 8-4.5"/>',
  risk:     '<path d="M10.3 4.4 2.7 17.5A1.8 1.8 0 0 0 4.3 20h15.4a1.8 1.8 0 0 0 1.6-2.5L13.7 4.4a1.8 1.8 0 0 0-3.4 0z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><line x1="12" y1="16.6" x2="12" y2="16.65"/>',
  box:      '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="9.5" y1="20.5" x2="9.5" y2="9.5"/>',
  report:   '<path d="M14 3.5H7A1.8 1.8 0 0 0 5.2 5.3v13.4A1.8 1.8 0 0 0 7 20.5h10a1.8 1.8 0 0 0 1.8-1.8V8.3z"/><path d="M14 3.5V8.3h4.8"/><line x1="8.5" y1="13" x2="15" y2="13"/><line x1="8.5" y1="16.5" x2="13" y2="16.5"/>',
  target:   '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>',
  law:      '<line x1="12" y1="4" x2="12" y2="20"/><line x1="7.5" y1="20" x2="16.5" y2="20"/><path d="M5 8h14"/><path d="M5 8l-2.2 5a2.6 2.6 0 0 0 5.2 0L5.8 8"/><path d="M19 8l-2.2 5a2.6 2.6 0 0 0 5.2 0L19.8 8"/>',
  clock:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pentest:  '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="1.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22.5" y2="12"/>',
  dfir:     '<path d="M3 12h4l2.5 6.5 4-13 2.5 6.5H21"/>',
  infra:    '<rect x="3.5" y="4.5" width="17" height="6" rx="1.5"/><rect x="3.5" y="13.5" width="17" height="6" rx="1.5"/><line x1="7" y1="7.5" x2="7.1" y2="7.5"/><line x1="7" y1="16.5" x2="7.1" y2="16.5"/>',
  users:    '<circle cx="9" cy="8" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 6"/><path d="M19.5 19.5a5.5 5.5 0 0 0-3-5"/>',
  adapt:    '<path d="M4 12a8 8 0 0 1 13.5-5.8L20 8.5"/><path d="M20 4.5v4h-4"/><path d="M20 12a8 8 0 0 1-13.5 5.8L4 15.5"/><path d="M4 19.5v-4h4"/>',
  scan:     '<circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/>',
  clipboard:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/>',
}
const ic = (n) => SVG(IC[n] || '')

function buildHTML(data) {
  // ── P1 · Portada / hero (dos columnas) ──────────────────────────────
  const p1 = `<div class="page">
    ${pageHead('BROCHURE CORPORATIVO', 'CIBERSEGURIDAD · 2026')}
    <div style="display:flex;gap:30px;margin-top:14px;">
      <div style="flex:1.4;">
        <div style="font-size:13px;letter-spacing:5px;color:${LBL};margin-bottom:20px;">PLATAFORMA · SERVICIOS · RESULTADOS</div>
        <div style="font-size:62px;font-weight:900;color:#fff;line-height:1.0;">DSTAC<br><span style="color:${PUR};">Cybersecurity</span></div>
        <div style="font-size:16px;color:${MUT};margin-top:22px;line-height:1.7;">
          Ciberseguridad adaptada a la realidad operacional de tu organización: una <b style="color:#fff">plataforma propia</b>, <b style="color:#fff">servicios expertos</b> y <b style="color:#fff">herramientas gratuitas</b> para proteger, cumplir y operar sin detenerte.
        </div>
        <div style="margin-top:24px;">${banner(PUR, 'Empresa chilena de ciberseguridad', 'No aplicamos soluciones genéricas: diseñamos cada estrategia según tu infraestructura, madurez y operación, y te acompañamos en el tiempo.')}</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:16px;justify-content:center;">
        ${statCard('24/7', 'EDR · respuesta activa', GRN)}
        ${statCard('ISO 27001', 'autoevaluación', PUR)}
        ${statCard('NIST', 'CSF 2.0 · madurez', PUR)}
        ${statCard('Multi-empresa', 'informes con tu marca', GRN)}
      </div>
    </div>
    ${pageFoot()}
  </div>`

  // ── P2 · El problema / por qué ahora ────────────────────────────────
  const p2 = `<div class="page">
    ${pageHead('CONTEXTO', 'POR QUÉ AHORA')}
    ${label('El panorama')}
    ${title('La pregunta ya no es <span style="color:' + PUR + '">si</span> te atacarán, sino <span style="color:' + PUR + '">cuándo</span>')}
    ${grid(3, [
      card(ic('target'), 'Las PYMEs son el blanco', 'Menos defensas y datos valiosos: los atacantes lo saben y automatizan sus ataques. Un solo incidente puede frenar tu operación, exponer datos de clientes y golpear tu reputación de forma duradera.'),
      card(ic('law'), 'La regulación subió la vara', 'La Ley Marco de Ciberseguridad (21.663) y la Ley de Protección de Datos (21.719) elevan las exigencias para empresas de todos los tamaños. Cumplir dejó de ser opcional y empezó a fiscalizarse.'),
      card(ic('clock'), 'El costo de no prepararse', 'Pérdida de información, multas, interrupción del negocio y clientes que se van por desconfianza. Prevenir y monitorear cuesta una fracción de lo que vale recuperarse de un incidente grave.'),
    ].join(''))}
    ${label('Lo que está en juego')}
    ${grid(3, [
      mini('Tus datos', 'Información de clientes, contratos, credenciales y propiedad intelectual.'),
      mini('Tu continuidad', 'La capacidad de seguir operando sin interrupciones costosas.'),
      mini('Tu reputación', 'La confianza que tardaste años en construir con tus clientes.'),
    ].join(''))}
    ${banner(GRN, 'La buena noticia', 'DSTAC reúne en un solo lugar la tecnología, los servicios y el acompañamiento para que tu seguridad sea proporcional al riesgo real y sostenible en el tiempo. Empiezas hoy, midiendo gratis.')}
    ${pageFoot()}
  </div>`

  // ── P3 · Quiénes somos + metodología ────────────────────────────────
  const p3 = `<div class="page">
    ${pageHead('QUIÉNES SOMOS', 'NUESTRO ENFOQUE')}
    ${label('Quiénes somos')}
    ${title('Tácticos, no genéricos')}
    <div style="font-size:14.5px;color:${MUT};line-height:1.75;margin-bottom:26px;">
      DSTAC es una empresa chilena de ciberseguridad especializada en <b style="color:#fff">adaptar estrategias, infraestructura y controles</b> según las particularidades operativas de cada organización. Combinamos infraestructura segura, continuidad operacional y monitoreo continuo para que tu negocio no se detenga, con un equipo cercano y soporte local.
    </div>
    ${label('Nuestra metodología')}
    ${grid(4, [
      card('1', 'Levantamiento', 'Analizamos tu infraestructura, activos críticos y nivel de madurez de seguridad.'),
      card('2', 'Diseño', 'Definimos estrategia y controles personalizados, con prioridades y plan de implementación.'),
      card('3', 'Implementación', 'Ejecutamos las mejoras técnicas y organizacionales: infraestructura, accesos y políticas.'),
      card('4', 'Seguimiento', 'Monitoreamos y evolucionamos tu postura con soporte y reportes periódicos.'),
    ].join(''))}
    ${grid(3, [
      statCard('A medida', 'estrategia por cliente', PUR),
      statCard('Continuo', 'monitoreo 24/7', GRN),
      statCard('Local', 'soporte en Chile', PUR),
    ].join(''))}
    ${pageFoot()}
  </div>`

  // ── P4 · La plataforma (la estrella) — sin MDM ──────────────────────
  const p4 = `<div class="page">
    ${pageHead('PRODUCTO', 'PLATAFORMA PROPIA')}
    ${label('Lo que desarrollamos')}
    ${title('La plataforma <span style="color:' + PUR + '">DSTAC Cybersecurity</span>')}
    <div style="font-size:13.5px;color:${MUT};line-height:1.5;margin-bottom:12px;">Monitoreo y gestión de toda tu ciberseguridad en un solo lugar: multi-empresa y con informes con tu marca.</div>
    ${grid(3, [
      card(ic('shield'), 'EDR · Detección y Respuesta 24/7', 'Vigilancia continua de tus endpoints con detección de amenazas y <b style="color:#fff">respuesta activa</b>: bloqueo automático de ataques en tiempo real.'),
      card(ic('iso'), 'Preparación hacia ISO 27001', 'Estructuramos tu avance sobre el Anexo A (93 controles, <b style="color:#fff">SoA basada en tu análisis de riesgos</b> y plantillas adaptables). Construyes tu sistema de gestión paso a paso, con nuestro acompañamiento.'),
      card(ic('nist'), 'NIST CSF 2.0', 'Evaluación de madurez y brechas por función, con informes ejecutivos descargables para la dirección.'),
      card(ic('risk'), 'Riesgos e Incidentes', 'Matriz de riesgos cuantitativa, registro y respuesta a incidentes con escalamiento automático desde el EDR.'),
      card(ic('box'), 'Inventario y Accesos', 'Activos, identidades, accesos y personal centralizados, controlados y siempre actualizados.'),
      card(ic('report'), 'Cumplimiento y Reportes', 'Informes ejecutivos por módulo, con tu logo, listos para presentar a clientes o auditores.'),
    ].join(''), 12)}
    ${banner(PUR, 'Multi-empresa', 'Gestiona y reporta la ciberseguridad de cada cliente por separado, con informes que llevan tu marca.')}
    <div style="font-size:12.5px;color:#CFCDEA;margin-top:6px;line-height:1.45;">La certificación ISO 27001 la emite un organismo acreditado independiente (BSI, SGS, AENOR…). DSTAC te prepara y acompaña para superarla.</div>
    ${pageFoot()}
  </div>`

  // ── P5 · Servicios ──────────────────────────────────────────────────
  const p5 = `<div class="page">
    ${pageHead('SERVICIOS', 'EXPERTOS')}
    ${label('Nuestros servicios')}
    ${title('Del diagnóstico a la defensa')}
    ${grid(3, [
      card(ic('pentest'), 'Pentesting y Red Team', 'Encontramos las brechas antes que los atacantes, con explotación controlada y reportes claros y accionables.'),
      card(ic('law'), 'Consultoría GRC y Cumplimiento', 'Gobernanza, riesgo y cumplimiento: ISO 27001, NIST y la normativa chilena, con un plan realista.'),
      card(ic('dfir'), 'Respuesta a Incidentes (DFIR)', 'Contención, análisis forense y recuperación cuando algo pasa, para volver a operar lo antes posible.'),
      card(ic('infra'), 'Infraestructura y Redes Seguras', 'Diseñamos arquitecturas fuertes y segmentadas, listas para enfrentar las amenazas actuales.'),
      card(ic('users'), 'Active Directory y Centralización', 'Fortalecemos la gestión de identidades con control sólido de accesos y menos riesgo operacional.'),
      card(ic('adapt'), 'Estrategias de Seguridad Adaptativas', 'Protección que sigue el ritmo de tu negocio y de las amenazas, con análisis y automatización.'),
    ].join(''))}
    ${banner(PUR, 'Todo se entrega con evidencia', 'Cada servicio incluye informes claros, hallazgos priorizados y recomendaciones accionables — no solo un PDF, sino un plan para avanzar.')}
    ${pageFoot()}
  </div>`

  // ── P6 · Servicios gratuitos (imanes) ───────────────────────────────
  const p6 = `<div class="page">
    ${pageHead('GRATIS', 'EMPIEZA HOY')}
    ${label('Servicios gratuitos en dstac.cl')}
    ${title('Conoce tu riesgo <span style="color:' + GRN + '">sin costo</span>')}
    <div style="font-size:14px;color:${MUT};line-height:1.65;margin-bottom:22px;">Herramientas reales en nuestro sitio para que midas tu seguridad en minutos, sin registro y sin compromiso. El primer paso para tomar decisiones con datos.</div>
    ${grid(3, [
      card(ic('scan'), 'Escáner de seguridad web', 'Califica tu sitio (A+ a F) al instante: certificado TLS, cabeceras de seguridad (HSTS, CSP), SPF/DKIM/DMARC y exposición de versiones, con un informe claro de hallazgos.'),
      card(ic('clipboard'), 'Autodiagnóstico de ciberseguridad', 'Cuestionario rápido que mide el nivel de madurez de tu empresa y te muestra exactamente dónde concentrar tus esfuerzos.'),
      card(ic('iso'), 'Autoevaluación ISO 27001', 'Identifica tus brechas frente al estándar internacional en pocos minutos y obtén un punto de partida claro para tu camino hacia la certificación.'),
    ].join(''))}
    ${grid(3, [
      statCard('A+ → F', 'calificación clara', GRN),
      statCard('Sin registro', 'resultado inmediato', PUR),
      statCard('3 herramientas', '100% gratuitas', GRN),
    ].join(''))}
    ${banner(GRN, 'Informe técnico y accionable, listo para actuar.', 'Cada herramienta entrega hallazgos claros y priorizados para que sepas exactamente qué corregir primero. Pruébalas ahora en www.dstac.cl.')}
    ${pageFoot()}
  </div>`

  // ── P7 · Planes ─────────────────────────────────────────────────────
  const plan = (n, t, items, hot) => `<div style="background:rgba(255,255,255,.04);border:1px solid ${hot ? PUR : 'rgba(255,255,255,.10)'};border-radius:16px;padding:22px;">
    <div style="font-size:18px;font-weight:900;color:#fff;">${n}</div>
    <div style="font-size:11px;letter-spacing:1.5px;color:${PUR};text-transform:uppercase;margin:4px 0 14px;">${t}</div>
    <div style="font-size:12.5px;color:${MUT};line-height:1.9;">${items.map(i => '• ' + i).join('<br>')}</div>
  </div>`
  const p7 = `<div class="page">
    ${pageHead('PLANES', 'SEGÚN TU TAMAÑO')}
    ${label('Planes de servicio')}
    ${title('Cobertura a tu medida')}
    ${grid(3, [
      plan('TIER 1', 'PYME · 1–15 colaboradores', ['Gestión de activos, identidades y accesos', 'Organización tecnológica', 'Evaluación e inventario inicial', 'Buenas prácticas operacionales'], false),
      plan('TIER 2', 'Profesional · 15–50 colaboradores', ['Todo lo del TIER 1', 'Gestión de incidentes', 'Segmentación básica de red', 'Control avanzado de accesos', 'Reportes ejecutivos'], true),
      plan('TIER 3', 'Empresarial · +50 colaboradores', ['Todo lo del TIER 2', 'Arquitectura de seguridad', 'Segmentación avanzada', 'Acompañamiento estratégico', 'Soporte prioritario'], false),
    ].join(''))}
    ${label('Servicios complementarios')}
    ${grid(3, [
      mini('Concientización', 'Simulación de phishing y formación del equipo en seguridad.'),
      mini('Hardening y auditoría', 'Endurecimiento de equipos y auditorías de configuración.'),
      mini('Active Directory y red', 'Levantamiento de AD, segmentación y revisión de exposición web.'),
    ].join(''))}
    ${pageFoot()}
  </div>`

  // ── P8 · CTA + contacto ─────────────────────────────────────────────
  const p8 = `<div class="page">
    ${pageHead('CONTACTO', 'DEMOS EL PRIMER PASO')}
    <div style="text-align:center;margin-top:18px;">
      <div style="font-size:14px;letter-spacing:4px;color:${PUR};margin-bottom:14px;">¿LISTO PARA PROTEGER TU OPERACIÓN?</div>
      <div style="font-size:44px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:16px;">Agenda tu evaluación inicial <span style="color:${GRN}">sin costo</span></div>
      <div style="font-size:14px;color:${MUT};max-width:180mm;margin:0 auto 30px;line-height:1.7;">Te mostramos tu nivel de exposición y un plan claro para cerrar las brechas, con la plataforma y el equipo de DSTAC detrás.</div>
    </div>
    ${grid(3, [
      mini('1 · Diagnóstico', 'Medimos tu exposición y tu nivel de madurez actual.'),
      mini('2 · Hallazgos priorizados', 'Te entregamos qué corregir primero y por qué.'),
      mini('3 · Plan de acción', 'Una hoja de ruta clara, con la plataforma DSTAC detrás.'),
    ].join(''))}
    ${grid(3, [
      `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:22px;text-align:center;"><div style="font-size:11px;letter-spacing:2px;color:${LBL};margin-bottom:9px;">TELÉFONO</div><div style="font-size:17px;color:#fff;font-weight:700;">+56 9 6219 8594</div></div>`,
      `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:22px;text-align:center;"><div style="font-size:11px;letter-spacing:2px;color:${LBL};margin-bottom:9px;">CORREO</div><div style="font-size:16px;color:#fff;font-weight:700;">contacto@dstac.cl</div></div>`,
      `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:22px;text-align:center;"><div style="font-size:11px;letter-spacing:2px;color:${LBL};margin-bottom:9px;">SITIO WEB</div><div style="font-size:17px;color:#fff;font-weight:700;">www.dstac.cl</div></div>`,
    ].join(''), 26)}
    <div style="display:flex;justify-content:center;">${logo(50)}</div>
    ${pageFoot()}
  </div>`

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;background:${INK};color:#E8E8F0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{position:relative;width:297mm;min-height:210mm;background:${INK};
      background-image:linear-gradient(rgba(139,123,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(139,123,255,.05) 1px,transparent 1px);
      background-size:28px 28px;padding:14mm 18mm 20mm;break-after:page;overflow:hidden;}
    .page:last-child{break-after:auto;}
    b{font-weight:700;}
  </style></head><body>${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}</body></html>`
}

module.exports = { getData, buildHTML, pdfOptions: { landscape: true } }
