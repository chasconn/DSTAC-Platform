// services/marketing/pymesTemplate.js — plantilla HTML para prospeccion fria a
// pymes chilenas (sin la referencia a Exponor). Misma identidad visual y firma
// real que el correo de Exponor, pero con apertura distinta porque no hubo un
// encuentro previo con el contacto.
const { FIRMA_HTML } = require('./firma')

function renderPymesEmail({ nombre, empresa }) {
  const nombreLimpio = (nombre || '').trim()
  const safeEmpresa = (empresa || '').trim() || 'tu empresa'
  // La mayoria de las empresas encontradas por busqueda no tienen un nombre de
  // contacto (solo un correo generico de la pagina). "Hola estimado contacto"
  // suena forzado -- si no hay nombre, se saluda a la empresa directamente.
  const saludo = nombreLimpio ? `Hola ${nombreLimpio},` : `Hola, equipo de ${safeEmpresa}`

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>DSTAC — Ciberseguridad aplicada</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  [data-ogsc] .dstac-header, [data-ogsb] .dstac-header { background-color:#13102a !important; }
</style>
</head>
<body style="margin:0; padding:0; background-color:#eeecf5; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eeecf5; padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:14px; overflow:hidden; max-width:620px; box-shadow:0 4px 24px rgba(26,21,48,0.08);">

        <!-- HEADER -->
        <tr>
          <td class="dstac-header" bgcolor="#13102a" background="https://www.dstac.cl/assets/navy-bg.png?v=1" style="background-color:#13102a !important; background-image:url('https://www.dstac.cl/assets/navy-bg.png?v=1'); background-repeat:repeat; padding:36px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <img src="https://www.dstac.cl/assets/logo-dstac.png?v=2" alt="DSTAC" width="140" style="display:block; height:auto; max-width:140px;">
                </td>
                <td align="right">
                  <span style="display:inline-block; background-color:rgba(255,255,255,0.1); border:1px solid rgba(183,155,255,0.4); border-radius:999px; padding:6px 14px; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#d8c9ff; letter-spacing:1px;">🔒 CIBERSEGURIDAD APLICADA</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO / APERTURA -->
        <tr>
          <td style="padding:40px 40px 12px 40px;">
            <h1 style="margin:0 0 18px 0; font-family:Arial, Helvetica, sans-serif; font-size:25px; line-height:1.35; color:#1a1530;">${saludo}</h1>
            <p style="margin:0 0 14px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.65; color:#3a3a3a;">
              Somos DSTAC, una consultora chilena de ciberseguridad. Trabajamos con empresas
              como ${safeEmpresa} para identificar y cerrar brechas de seguridad antes de que
              se conviertan en un problema real — sin tecnicismos innecesarios ni venderte
              miedo: un diagnóstico claro y un plan de acción concreto.
            </p>
            <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.65; color:#3a3a3a;">
              Muchas pymes en Chile no cuentan con un equipo de TI propio, y eso las deja
              más expuestas de lo que creen. Antes de entrar en detalle, hay un tema
              regulatorio que aplica a prácticamente toda empresa hoy:
            </p>
          </td>
        </tr>

        <!-- BLOQUE LEY 21.719 -->
        <tr>
          <td style="padding:8px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff6e9; border:1px solid #f0d9a8; border-radius:12px;">
              <tr>
                <td style="padding:26px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="display:inline-block; background-color:#e8841b; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:11px; font-weight:bold; letter-spacing:1px; border-radius:999px; padding:4px 12px;">⚠ LEY 21.719 — YA VIGENTE</span>
                      </td>
                    </tr>
                  </table>
                  <h2 style="margin:14px 0 10px 0; font-family:Arial, Helvetica, sans-serif; font-size:19px; color:#1a1530; line-height:1.4;">¿Qué pasa si te fiscalizan y no tienes esto en orden?</h2>
                  <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.65; color:#5a4a30;">
                    La nueva Ley de Protección de Datos Personales de Chile ya está vigente,
                    y reemplaza un marco legal que tenía más de 20 años. No es solo para
                    empresas tecnológicas: <strong>aplica a cualquier empresa que recolecte
                    datos de clientes, empleados o proveedores</strong> — es decir, casi todas.
                  </p>

                  <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:bold; color:#1a1530;">La ley exige, entre otras cosas:</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                    <tr>
                      <td width="24" style="vertical-align:top; padding:4px 0;"><span style="color:#e8841b; font-weight:bold;">✓</span></td>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:13.5px; line-height:1.6; color:#4a3d22; padding:4px 0;">Designar un <strong>responsable</strong> de la protección de datos dentro de la empresa.</td>
                    </tr>
                    <tr>
                      <td width="24" style="vertical-align:top; padding:4px 0;"><span style="color:#e8841b; font-weight:bold;">✓</span></td>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:13.5px; line-height:1.6; color:#4a3d22; padding:4px 0;">Mantener un <strong>registro de las actividades de tratamiento</strong> de datos personales.</td>
                    </tr>
                    <tr>
                      <td width="24" style="vertical-align:top; padding:4px 0;"><span style="color:#e8841b; font-weight:bold;">✓</span></td>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:13.5px; line-height:1.6; color:#4a3d22; padding:4px 0;">Tener un <strong>protocolo de respuesta</strong> listo para notificar filtraciones o brechas de datos.</td>
                    </tr>
                    <tr>
                      <td width="24" style="vertical-align:top; padding:4px 0;"><span style="color:#e8841b; font-weight:bold;">✓</span></td>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:13.5px; line-height:1.6; color:#4a3d22; padding:4px 0;">Garantizar los derechos de las personas sobre sus datos (acceso, rectificación, eliminación, oposición).</td>
                    </tr>
                  </table>

                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13.5px; line-height:1.6; color:#4a3d22;">
                    <strong>No cumplir significa multas</strong> — y, peor para el negocio,
                    perder la confianza de tus clientes y socios comerciales justo cuando
                    más la necesitas.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA LEY 21.719 -->
        <tr>
          <td align="center" style="padding:22px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background-color:#e8841b; border-radius:999px;">
                  <a href="https://www.dstac.cl/diagnostico/" target="_blank" style="display:inline-block; padding:13px 28px; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none;">
                    Evaluar gratis si ${safeEmpresa} está expuesta →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#999999;">5 minutos, sin costo, sin tarjeta de crédito.</p>
          </td>
        </tr>

        <!-- DIVISOR -->
        <tr>
          <td style="padding:32px 40px 0 40px;">
            <hr style="border:none; border-top:1px solid #ececec; margin:0;">
          </td>
        </tr>

        <!-- RESTO DE SERVICIOS -->
        <tr>
          <td style="padding:28px 40px 0 40px;">
            <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:bold; color:#7b4dff; letter-spacing:1px; text-transform:uppercase;">TAMBIÉN TE PUEDE SERVIR</p>
            <h3 style="margin:0 0 18px 0; font-family:Arial, Helvetica, sans-serif; font-size:18px; color:#1a1530;">El resto de lo que hacemos en DSTAC</h3>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="vertical-align:top; padding:0 8px 14px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6fb; border-radius:10px;">
                    <tr><td style="padding:16px;">
                      <span style="display:inline-block; width:30px; height:30px; line-height:30px; text-align:center; background-color:#ece7ff; border-radius:8px; font-size:15px; margin-bottom:8px;">🔍</span>
                      <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a1530;">Auditoría y Pentest Web</p>
                      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#666666;">OWASP Top 10 + plan de remediación priorizado.</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="vertical-align:top; padding:0 0 14px 8px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6fb; border-radius:10px;">
                    <tr><td style="padding:16px;">
                      <span style="display:inline-block; width:30px; height:30px; line-height:30px; text-align:center; background-color:#ece7ff; border-radius:8px; font-size:15px; margin-bottom:8px;">🛡️</span>
                      <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a1530;">Seguridad Gestionada + EDR</p>
                      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#666666;">Monitoreo y respuesta a amenazas 24/7.</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td width="50%" style="vertical-align:top; padding:0 8px 14px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6fb; border-radius:10px;">
                    <tr><td style="padding:16px;">
                      <span style="display:inline-block; width:30px; height:30px; line-height:30px; text-align:center; background-color:#ece7ff; border-radius:8px; font-size:15px; margin-bottom:8px;">🎓</span>
                      <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a1530;">Capacitación y Phishing</p>
                      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#666666;">Simulacros reales y medibles para tu equipo.</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="vertical-align:top; padding:0 0 14px 8px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6fb; border-radius:10px;">
                    <tr><td style="padding:16px;">
                      <span style="display:inline-block; width:30px; height:30px; line-height:30px; text-align:center; background-color:#ece7ff; border-radius:8px; font-size:15px; margin-bottom:8px;">📱</span>
                      <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a1530;">Gestión de Dispositivos Móviles</p>
                      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#666666;">Bloqueo y borrado remoto ante pérdida o robo.</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td width="50%" style="vertical-align:top; padding:0 8px 0 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6fb; border-radius:10px;">
                    <tr><td style="padding:16px;">
                      <span style="display:inline-block; width:30px; height:30px; line-height:30px; text-align:center; background-color:#ece7ff; border-radius:8px; font-size:15px; margin-bottom:8px;">📋</span>
                      <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a1530;">Evaluación ISO 27001</p>
                      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#666666;">Informe de brechas y documentos de política.</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="vertical-align:top; padding:0 0 0 8px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6fb; border-radius:10px;">
                    <tr><td style="padding:16px;">
                      <span style="display:inline-block; width:30px; height:30px; line-height:30px; text-align:center; background-color:#ece7ff; border-radius:8px; font-size:15px; margin-bottom:8px;">🌐</span>
                      <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a1530;">Escáner Web Gratis</p>
                      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#666666;">SSL, cabeceras y riesgos, resultado al instante.</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BROCHURE -->
        <tr>
          <td align="center" style="padding:30px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1530; border-radius:12px;">
              <tr>
                <td class="dstac-header" bgcolor="#1a1530" background="https://www.dstac.cl/assets/navy-bg-2.png?v=1" style="background-color:#1a1530 !important; background-image:url('https://www.dstac.cl/assets/navy-bg-2.png?v=1'); background-repeat:repeat; padding:22px 26px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#ffffff;">📄 Brochure corporativo de DSTAC</p>
                        <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12.5px; color:#b7adcf;">Toda nuestra oferta de servicios en un PDF.</p>
                      </td>
                      <td align="right" style="vertical-align:middle;">
                        <a href="https://www.dstac.cl/dstac-brochure.pdf" target="_blank" style="display:inline-block; background-color:#7b4dff; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:bold; text-decoration:none; padding:10px 18px; border-radius:999px; white-space:nowrap;">Descargar</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FIRMA PERSONAL -->
        <tr>
          <td style="padding:34px 40px 0 40px;">
            <hr style="border:none; border-top:1px solid #ececec; margin:0 0 26px 0;">
            ${FIRMA_HTML}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="dstac-header" bgcolor="#1a1530" background="https://www.dstac.cl/assets/navy-bg-2.png?v=1" style="background-color:#1a1530 !important; background-image:url('https://www.dstac.cl/assets/navy-bg-2.png?v=1'); background-repeat:repeat; padding:24px 40px; text-align:center; margin-top:30px;">
            <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#ffffff; font-weight:bold;">DSTAC | DS Tactical Security</p>
            <p style="margin:0 0 10px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#a98bff;">Ciberseguridad aplicada a su operación</p>
            <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:10.5px; color:#8a7ba8;">Antofagasta, Chile · Si no deseas recibir más correos como este, <a href="mailto:dchacon@dstac.cl?subject=Eliminar%20de%20lista" style="color:#c7b8ff; text-decoration:underline;">avísanos aquí</a>.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

module.exports = { renderPymesEmail }
