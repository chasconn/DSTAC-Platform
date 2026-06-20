// Plantillas de correos para simulaciones de phishing (concientización del personal).
// Cada plantilla genera HTML con un link de seguimiento único por destinatario
// (clic) y un píxel de 1x1 (apertura). No se captura ninguna credencial real:
// al hacer clic, el destinatario llega a una página educativa que explica que
// era una simulación.
//
// Diseño deliberadamente realista (mimetiza alertas reales de Microsoft
// 365 / RRHH / facturación, los pretextos con mayor tasa de clic en
// concientización real) — el objetivo es que el ejercicio mida algo
// representativo de un ataque real, no algo obviamente falso.

function fechaCorta() {
  return new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

// Layout estilo Microsoft 365 (header con barra de color + logo de texto,
// cuerpo blanco, tipografía Segoe UI) — el patrón más reconocible y más
// clicado en campañas reales de concientización.
function layoutMicrosoft(cuerpo, { barra = '#0078D4', marca = 'Microsoft 365' } = {}) {
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5;max-width:560px;border:1px solid #e1e1e1">
    <div style="background:${barra};padding:14px 22px;display:flex;align-items:center;gap:10px">
      <span style="display:inline-block;width:18px;height:18px;background:
        linear-gradient(90deg,#f25022 0 49%,transparent 49%),
        linear-gradient(90deg,transparent 51%,#7fba00 51%);
        background-size:100% 49%,100% 49%;background-repeat:no-repeat;background-position:top left,bottom left;border-radius:2px"></span>
      <span style="color:#fff;font-size:15px;font-weight:600">${marca}</span>
    </div>
    <div style="padding:24px 26px;background:#fff">${cuerpo}</div>
    <div style="background:#f3f2f1;padding:14px 26px;font-size:11px;color:#666">Este es un mensaje automático del sistema. © Microsoft Corporation. Todos los derechos reservados.</div>
  </div>`
}

// Layout neutro tipo notificación corporativa interna (RRHH/Firma/Facturación).
function layoutCorp(cuerpo, { acento = '#1d9e75' } = {}) {
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.55;max-width:560px;border:1px solid #e6e6e6;border-radius:8px;overflow:hidden">
    <div style="border-top:4px solid ${acento};padding:20px 24px 4px"></div>
    <div style="padding:8px 24px 22px">${cuerpo}</div>
  </div>`
}

const PLANTILLAS = [
  {
    id: 'reset_password',
    nombre: 'Microsoft 365 — Tu contraseña expira hoy',
    asunto: 'Acción requerida: tu contraseña expira hoy',
    remitenteNombre: 'Microsoft 365 Security',
    render: ({ nombre, empresa, link }) => layoutMicrosoft(`
      <p style="margin:0 0 14px">Hola ${nombre || ''},</p>
      <p style="margin:0 0 14px">La contraseña de tu cuenta <b>${empresa || 'corporativa'}</b> vence hoy según la política de seguridad de tu organización. Para mantener el acceso sin interrupciones, actualízala antes de las 23:59.</p>
      <table role="presentation" style="background:#faf9f8;border:1px solid #edebe9;border-radius:6px;width:100%;margin:0 0 18px"><tr><td style="padding:12px 16px;font-size:13px;color:#444">
        <b>Cuenta:</b> ${nombre ? `${nombre.toLowerCase().replace(/\s+/g,'.')}` : 'usuario'}@${(empresa||'tuempresa').toLowerCase().replace(/\s+/g,'')}.cl<br>
        <b>Vence:</b> Hoy, ${fechaCorta()} · 23:59
      </td></tr></table>
      <p style="margin:0 0 22px"><a href="${link}" style="background:#0078D4;color:#fff;padding:11px 28px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Actualizar contraseña ahora</a></p>
      <p style="color:#666;font-size:12px;margin:0">O copia este enlace en tu navegador: <span style="color:#0078D4">https://login.microsoftonline.com/common/reset?ref=${(empresa||'org').toLowerCase().replace(/\s+/g,'')}</span></p>
    `),
  },
  {
    id: 'documento_firma',
    nombre: 'RRHH — Documento pendiente de firma',
    asunto: 'Documento de Recursos Humanos pendiente de tu firma',
    remitenteNombre: 'Recursos Humanos',
    render: ({ nombre, empresa, link }) => layoutCorp(`
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#888">Recursos Humanos · ${empresa || 'tu empresa'}</p>
      <p style="margin:0 0 14px;font-size:15px;font-weight:700">Tienes un documento pendiente de firma</p>
      <p style="margin:0 0 14px">Hola ${nombre || ''}, se generó un documento que requiere tu firma electrónica antes del cierre de este proceso (actualización de datos contractuales / convenio interno).</p>
      <table role="presentation" style="background:#f7f9f8;border:1px solid #e3e8e6;border-radius:6px;width:100%;margin:0 0 18px"><tr><td style="padding:12px 16px;font-size:13px;color:#444">
        📄 <b>Documento:</b> Anexo_Contrato_2026.pdf<br>
        <b>Plazo de firma:</b> 48 horas
      </td></tr></table>
      <p style="margin:0 0 22px"><a href="${link}" style="background:#1d9e75;color:#fff;padding:11px 28px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Revisar y firmar documento</a></p>
      <p style="color:#888;font-size:12px;margin:0">Si no reconoces este trámite, contacta directamente a Recursos Humanos antes de firmar.</p>
    `, { acento: '#1d9e75' }),
  },
  {
    id: 'alerta_seguridad',
    nombre: 'Microsoft 365 — Inicio de sesión inusual',
    asunto: 'Alerta de seguridad: nuevo inicio de sesión',
    remitenteNombre: 'Microsoft 365 Security',
    render: ({ nombre, empresa, link }) => layoutMicrosoft(`
      <p style="margin:0 0 14px">Hola ${nombre || ''},</p>
      <p style="margin:0 0 14px">Detectamos un inicio de sesión en tu cuenta de <b>${empresa || 'tu organización'}</b> desde un dispositivo no reconocido. Si fuiste tú, puedes ignorar este mensaje.</p>
      <table role="presentation" style="background:#faf9f8;border:1px solid #edebe9;border-radius:6px;width:100%;margin:0 0 18px"><tr><td style="padding:12px 16px;font-size:13px;color:#444">
        <b>Fecha:</b> ${fechaCorta()}, ${new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}<br>
        <b>Ubicación aproximada:</b> Santiago, Chile (IP no habitual)<br>
        <b>Dispositivo:</b> Windows · Chrome
      </td></tr></table>
      <p style="margin:0 0 22px"><a href="${link}" style="background:#0078D4;color:#fff;padding:11px 28px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Esto no fui yo — revisar actividad</a></p>
      <p style="color:#666;font-size:12px;margin:0">https://account.microsoft.com/security/activity</p>
    `, { barra: '#c0392b' }),
  },
  {
    id: 'factura_pendiente',
    nombre: 'Finanzas — Factura pendiente de aprobación',
    asunto: 'Factura pendiente de aprobación — vence hoy',
    remitenteNombre: 'Finanzas',
    render: ({ nombre, empresa, link }) => layoutCorp(`
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#888">Finanzas · ${empresa || 'tu empresa'}</p>
      <p style="margin:0 0 14px;font-size:15px;font-weight:700">Factura pendiente de tu aprobación</p>
      <p style="margin:0 0 14px">Hola ${nombre || ''}, hay una factura de proveedor a tu nombre esperando aprobación antes del cierre contable de hoy.</p>
      <table role="presentation" style="background:#fbf8f1;border:1px solid #ece2cf;border-radius:6px;width:100%;margin:0 0 18px"><tr><td style="padding:12px 16px;font-size:13px;color:#444">
        <b>N° Factura:</b> F-${Math.floor(10000+Math.random()*89999)}<br>
        <b>Monto:</b> $${(Math.floor(Math.random()*900+100)*1000).toLocaleString('es-CL')}<br>
        <b>Vence:</b> Hoy
      </td></tr></table>
      <p style="margin:0 0 22px"><a href="${link}" style="background:#b8860b;color:#fff;padding:11px 28px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Revisar y aprobar factura</a></p>
      <p style="color:#888;font-size:12px;margin:0">Si no gestionas aprobaciones de pago, reenvía este correo al área de Finanzas.</p>
    `, { acento: '#b8860b' }),
  },
]

function porId(id) { return PLANTILLAS.find(p => p.id === id) }

// HTML de la página educativa mostrada tras el clic (sin formularios ni captura de datos).
function landingHtml({ empresa }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulación de phishing</title>
<style>
body{font-family:Arial,sans-serif;background:#F8F7F4;margin:0;padding:40px 16px;color:#2C2C2A}
.box{max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#C0392B;font-size:22px;margin:0 0 6px}
.sub{color:#888780;font-size:13px;margin-bottom:20px}
ul{padding-left:18px;font-size:14px;line-height:1.7}
.foot{margin-top:24px;font-size:11px;color:#B4B2A9;text-align:center}
</style></head><body>
  <div class="box">
    <h1>⚠️ Esto era una simulación</h1>
    <div class="sub">Acabas de hacer clic en un correo de prueba de concientización en ciberseguridad${empresa ? ` de ${empresa}` : ''}.</div>
    <p>No se capturó ninguna contraseña ni dato personal. Este ejercicio busca ayudarte a reconocer señales de phishing real:</p>
    <ul>
      <li>Urgencia o amenazas ("tu cuenta será bloqueada", "vence hoy")</li>
      <li>Remitente que imita una marca conocida (Microsoft, RRHH, Finanzas) pero no coincide del todo con el dominio real</li>
      <li>Enlaces que, al pasar el mouse por encima, no coinciden con el dominio que muestran en el texto</li>
      <li>Solicitudes de contraseñas o datos sensibles por correo</li>
    </ul>
    <p>Si tienes dudas sobre un correo real, repórtalo a tu equipo de TI antes de hacer clic.</p>
    <div class="foot">Simulación de phishing · DSTAC Ciberseguridad</div>
  </div>
</body></html>`
}

module.exports = { PLANTILLAS, porId, landingHtml }
