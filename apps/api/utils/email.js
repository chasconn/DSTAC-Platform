// Correos de gestión de usuarios (bienvenida / reset) vía Microsoft Graph.
// Usa el mismo emisor OAuth2 que services/emailService.js (sin SMTP básico).
const { sendMail } = require('../services/emailService')

async function enviarEmailBienvenida({ to, first_name, tempPassword, role, loginUrl, expiresHoras = 48 }) {
  const esCliente = role?.startsWith('cliente')
  const tipoPortal = esCliente ? 'Portal Cliente' : 'Panel DSTAC'

  const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#2C2C2A">
        <div style="background:#26215C;padding:24px 28px;border-radius:10px 10px 0 0">
          <h1 style="margin:0;font-size:20px;color:#CECBF6;letter-spacing:0.5px">DSTAC Platform</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#7F77DD">Ciberseguridad para empresas chilenas</p>
        </div>

        <div style="background:#ffffff;padding:28px;border:1px solid #e2e0d8;border-top:none">
          <h2 style="margin:0 0 16px;font-size:18px;color:#26215C">Hola ${first_name},</h2>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
            Tu cuenta en el <strong>${tipoPortal}</strong> ha sido creada.
            A continuación tus credenciales de acceso:
          </p>

          <div style="background:#f8f7f4;border:1px solid #e2e0d8;border-radius:8px;padding:18px 20px;margin:16px 0">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:5px 0;color:#888780;width:40%">Email</td>
                <td style="padding:5px 0;font-weight:600">${to}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#888780">Contraseña temporal</td>
                <td style="padding:5px 0">
                  <code style="background:#EEEDFE;color:#26215C;padding:4px 10px;border-radius:6px;font-size:15px;letter-spacing:1px;font-weight:700">${tempPassword}</code>
                </td>
              </tr>
            </table>
          </div>

          <div style="background:#FAEEDA;border:1px solid #F8D57A;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px;color:#633806">
            ⚠️ Esta contraseña expira en <strong>${expiresHoras} horas</strong>.
            Al ingresar por primera vez deberás establecer una nueva contraseña personal.
          </div>

          <a href="${loginUrl}"
             style="display:inline-block;background:#534AB7;color:#ffffff;padding:11px 28px;
                    border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;
                    margin-top:8px">
            Ingresar a la plataforma →
          </a>

          <p style="margin-top:28px;font-size:12px;color:#888780;border-top:1px solid #f1efe8;padding-top:16px">
            Si no esperabas este correo, puedes ignorarlo con seguridad.<br>
            DSTAC <strong>nunca</strong> te pedirá tu contraseña por correo electrónico.
          </p>
        </div>

        <div style="background:#f8f7f4;padding:12px 28px;border:1px solid #e2e0d8;border-top:none;border-radius:0 0 10px 10px;text-align:center">
          <p style="margin:0;font-size:11px;color:#B4B2A9">
            DSTAC — Ciberseguridad gestionada · Chile
          </p>
        </div>
      </div>
    `
  await sendMail(to, 'Bienvenido a DSTAC Platform — Tus credenciales de acceso', html)
}

async function enviarEmailResetPassword({ to, first_name, tempPassword, loginUrl, expiresHoras = 48 }) {
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#2C2C2A">
        <div style="background:#26215C;padding:24px 28px;border-radius:10px 10px 0 0">
          <h1 style="margin:0;font-size:20px;color:#CECBF6">DSTAC Platform</h1>
        </div>

        <div style="background:#ffffff;padding:28px;border:1px solid #e2e0d8;border-top:none">
          <h2 style="margin:0 0 16px;font-size:18px;color:#26215C">Hola ${first_name},</h2>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
            Se ha generado una nueva contraseña temporal para tu cuenta:
          </p>

          <div style="background:#f8f7f4;border:1px solid #e2e0d8;border-radius:8px;padding:18px 20px;margin:16px 0">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:5px 0;color:#888780;width:40%">Email</td>
                <td style="padding:5px 0;font-weight:600">${to}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#888780">Nueva contraseña</td>
                <td style="padding:5px 0">
                  <code style="background:#EEEDFE;color:#26215C;padding:4px 10px;border-radius:6px;font-size:15px;letter-spacing:1px;font-weight:700">${tempPassword}</code>
                </td>
              </tr>
            </table>
          </div>

          <div style="background:#FAEEDA;border:1px solid #F8D57A;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px;color:#633806">
            ⚠️ Esta contraseña expira en <strong>${expiresHoras} horas</strong>.
          </div>

          <a href="${loginUrl}"
             style="display:inline-block;background:#534AB7;color:#ffffff;padding:11px 28px;
                    border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;
                    margin-top:8px">
            Ingresar →
          </a>

          <p style="margin-top:28px;font-size:12px;color:#888780;border-top:1px solid #f1efe8;padding-top:16px">
            Si no solicitaste este cambio, contacta a tu administrador DSTAC de inmediato.
          </p>
        </div>
      </div>
    `
  await sendMail(to, 'DSTAC Platform — Nueva contraseña temporal', html)
}

module.exports = { enviarEmailBienvenida, enviarEmailResetPassword }
