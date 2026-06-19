// Plantillas de correos para simulaciones de phishing (concientización del personal).
// Cada plantilla genera HTML con un link de seguimiento único por destinatario
// (clic) y un píxel de 1x1 (apertura). No se captura ninguna credencial real:
// al hacer clic, el destinatario llega a una página educativa que explica que
// era una simulación.

function layout(cuerpo) {
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5;max-width:560px">${cuerpo}</div>`
}

const PLANTILLAS = [
  {
    id: 'reset_password',
    nombre: 'Restablecimiento de contraseña urgente',
    asunto: 'Acción requerida: tu contraseña expira hoy',
    remitenteNombre: 'Soporte TI',
    render: ({ nombre, empresa, link }) => layout(`
      <p>Hola ${nombre || ''},</p>
      <p>Detectamos que la contraseña de tu cuenta corporativa de <b>${empresa || 'tu empresa'}</b> expira hoy. Para evitar quedar bloqueado, debes restablecerla en los próximos 30 minutos.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:11px 24px;border-radius:6px;text-decoration:none;font-weight:600">Restablecer mi contraseña</a></p>
      <p style="color:#666;font-size:12.5px">Si no realizas esta acción, tu cuenta podría quedar suspendida temporalmente.</p>
      <p style="color:#999;font-size:11px;margin-top:18px">Equipo de Soporte TI</p>
    `),
  },
  {
    id: 'documento_compartido',
    nombre: 'Documento compartido pendiente',
    asunto: 'Un documento ha sido compartido contigo',
    remitenteNombre: 'Notificaciones',
    render: ({ nombre, empresa, link }) => layout(`
      <p>Hola ${nombre || ''},</p>
      <p>Un compañero de <b>${empresa || 'tu empresa'}</b> compartió un documento contigo: <b>"Presupuesto 2026 - confidencial.xlsx"</b>.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#1d9e75;color:#fff;padding:11px 24px;border-radius:6px;text-decoration:none;font-weight:600">Ver documento</a></p>
      <p style="color:#666;font-size:12.5px">Este enlace expira en 24 horas.</p>
      <p style="color:#999;font-size:11px;margin-top:18px">Sistema de notificaciones</p>
    `),
  },
  {
    id: 'alerta_seguridad',
    nombre: 'Alerta de seguridad de cuenta',
    asunto: 'Alerta: actividad inusual en tu cuenta',
    remitenteNombre: 'Seguridad de la cuenta',
    render: ({ nombre, empresa, link }) => layout(`
      <p>Hola ${nombre || ''},</p>
      <p>Detectamos un inicio de sesión inusual en tu cuenta de <b>${empresa || 'tu empresa'}</b> desde una ubicación desconocida. Si no fuiste tú, revisa la actividad de inmediato.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#c0392b;color:#fff;padding:11px 24px;border-radius:6px;text-decoration:none;font-weight:600">Revisar actividad de mi cuenta</a></p>
      <p style="color:#666;font-size:12.5px">Si no revisas esta alerta, tu cuenta podría ser bloqueada por precaución.</p>
      <p style="color:#999;font-size:11px;margin-top:18px">Equipo de Seguridad</p>
    `),
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
      <li>Urgencia o amenazas ("tu cuenta será bloqueada")</li>
      <li>Remitente desconocido o inusual</li>
      <li>Enlaces que no coinciden con el dominio real de la empresa</li>
      <li>Solicitudes de contraseñas o datos sensibles por correo</li>
    </ul>
    <p>Si tienes dudas sobre un correo real, repórtalo a tu equipo de TI antes de hacer clic.</p>
    <div class="foot">Simulación de phishing · DSTAC Ciberseguridad</div>
  </div>
</body></html>`
}

module.exports = { PLANTILLAS, porId, landingHtml }
