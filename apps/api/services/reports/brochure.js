// Brochure corporativo DSTAC CIBERSECURITY — generado con el mismo motor de
// informes de la plataforma (template.js: header navy + logo + tarjetas).
// Contenido estático (no depende del tenant).
const { buildHeader, buildFooter, wrapDocument } = require('./template')

async function getData() {
  return { fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }) }
}

const NAVY = '#1a1740', PURPLE = '#534AB7', LOGOP = '#7C4FDA'

function card(title, desc, icon = '•') {
  return `<div class="card">
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;">
      <span style="width:26px;height:26px;border-radius:7px;background:${PURPLE}1A;color:${PURPLE};font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</span>
      <span style="font-size:13px;font-weight:700;color:#2C2C2A;">${title}</span>
    </div>
    <div style="font-size:11.5px;color:#6A675E;line-height:1.5;">${desc}</div>
  </div>`
}

function planCard(nombre, tam, items, destacado) {
  return `<div class="card" style="${destacado ? `border:1.5px solid ${PURPLE};` : ''}padding:16px 18px;">
    <div style="font-size:15px;font-weight:800;color:${NAVY};">${nombre}</div>
    <div style="font-size:11px;color:${PURPLE};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:2px 0 10px;">${tam}</div>
    <div style="font-size:11px;color:#6A675E;line-height:1.7;">${items.map(i => `• ${i}`).join('<br>')}</div>
  </div>`
}

function buildHTML() {
  // ── Página 1: portada + quiénes somos ──────────────────────────────
  const p1 = `
<div class="page">
  ${buildHeader('Brochure Corporativo')}
  <div class="page-body">
    <div class="card-dark" style="flex-direction:column;align-items:flex-start;gap:8px;padding:34px 36px;">
      <div style="font-size:40px;font-weight:900;color:#fff;line-height:1.05;">DSTAC <span style="color:${LOGOP};">CIBERSECURITY</span></div>
      <div style="font-size:14px;color:rgba(255,255,255,0.7);font-weight:600;">Ciberseguridad adaptada a la realidad operacional de tu organización.</div>
    </div>
    <div class="sec-label">Quiénes somos</div>
    <div style="font-size:12.5px;color:#444441;line-height:1.7;margin-bottom:18px;">
      DSTAC CIBERSECURITY es una empresa chilena de ciberseguridad. No aplicamos soluciones genéricas:
      diseñamos cada estrategia según tu infraestructura, madurez y operación, combinando infraestructura
      segura, continuidad operacional y monitoreo continuo para que tu negocio no se detenga.
    </div>
    <div class="sec-label">Nuestra metodología</div>
    <div class="grid-2">
      ${card('1 · Levantamiento', 'Analizamos tu infraestructura, activos críticos y nivel de madurez de seguridad.', '1')}
      ${card('2 · Diseño', 'Definimos una estrategia y controles personalizados, con prioridades y plan de implementación.', '2')}
      ${card('3 · Implementación', 'Ejecutamos las mejoras técnicas y organizacionales: infraestructura, accesos y políticas.', '3')}
      ${card('4 · Seguimiento', 'Monitoreamos y evolucionamos tu postura de seguridad con soporte y reportes periódicos.', '4')}
    </div>
  </div>
  ${buildFooter(1, 3)}
</div>`

  // ── Página 2: plataforma + servicios gratuitos ─────────────────────
  const p2 = `
<div class="page">
  ${buildHeader('Brochure Corporativo')}
  <div class="page-body">
    <div class="title">La plataforma DSTAC CIBERSECURITY</div>
    <div class="subtitle">Monitoreo y gestión de tu ciberseguridad en un solo lugar</div>
    <div class="grid-2" style="margin-bottom:20px;">
      ${card('Detección y Respuesta (EDR)', 'Vigilancia de tus endpoints 24/7 con detección de amenazas y respuesta activa (bloqueo automático de ataques).', '◆')}
      ${card('Cumplimiento ISO 27001 y NIST', 'Evaluación de controles, brechas y cumplimiento, con informes ejecutivos descargables.', '✓')}
      ${card('Gestión de Riesgos e Incidentes', 'Matriz de riesgos, registro y respuesta a incidentes, escalamiento automático.', '▲')}
      ${card('Inventario y Accesos', 'Activos, identidades, accesos y personal centralizados y bajo control.', '▣')}
    </div>
    <div class="quote-block">Multi-empresa: gestiona y reporta la ciberseguridad de cada cliente por separado, con informes con tu marca.</div>

    <div class="sec-label">Servicios gratuitos en dstac.cl</div>
    <div class="grid-3">
      ${card('Escáner de seguridad web', 'Analiza tu sitio y obtén una calificación de seguridad al instante, sin costo.', '↯')}
      ${card('Autodiagnóstico', 'Cuestionario rápido que mide el nivel de ciberseguridad de tu empresa.', '?')}
      ${card('Autoevaluación ISO 27001', 'Conoce qué tan cerca estás de cumplir el estándar, gratis.', '✓')}
    </div>
  </div>
  ${buildFooter(2, 3)}
</div>`

  // ── Página 3: planes + complementarios + contacto ──────────────────
  const p3 = `
<div class="page">
  ${buildHeader('Brochure Corporativo')}
  <div class="page-body">
    <div class="title">Planes de servicio</div>
    <div class="subtitle">Cobertura según el tamaño y la criticidad de tu operación</div>
    <div class="grid-3" style="margin-bottom:18px;">
      ${planCard('Plan PYME', '1–15 colaboradores', ['Gestión de activos, identidades y accesos', 'Organización tecnológica', 'Evaluación e inventario inicial', 'Buenas prácticas operacionales'])}
      ${planCard('Plan Profesional', '15–50 colaboradores', ['Todo lo de PYME', 'Gestión de incidentes', 'Segmentación básica de red', 'Control avanzado de accesos', 'Reportes ejecutivos'], true)}
      ${planCard('Plan Empresarial', '+50 colaboradores', ['Todo lo de Profesional', 'Arquitectura de seguridad', 'Segmentación avanzada', 'Acompañamiento estratégico', 'Soporte prioritario'])}
    </div>
    <div class="sec-label">Servicios complementarios</div>
    <div style="font-size:11.5px;color:#6A675E;line-height:1.8;margin-bottom:20px;">
      Simulación de phishing y concientización · Hardening de equipos · Auditorías de configuración ·
      Segmentación de red · Levantamiento de Active Directory · Revisión de exposición web.
    </div>
    <div class="cta-box">
      <div style="font-size:20px;font-weight:800;margin-bottom:6px;">¿Listo para proteger tu operación?</div>
      <div style="font-size:13px;opacity:0.92;margin-bottom:12px;">Agenda tu evaluación inicial sin costo.</div>
      <div style="font-size:13px;font-weight:700;">dstac.cl &nbsp;·&nbsp; contacto@dstac.cl &nbsp;·&nbsp; +56 9 4276 0353</div>
    </div>
  </div>
  ${buildFooter(3, 3)}
</div>`

  return wrapDocument(p1 + p2 + p3)
}

module.exports = { getData, buildHTML }
