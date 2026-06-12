const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

async function sendMFACode(email, code) {
  await transporter.sendMail({
    from: `"DSTAC Seguridad" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Tu código de verificación DSTAC',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #3C3489;">Código de verificación</h2>
        <p>Ingresa el siguiente código para acceder a tu cuenta:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px;
                    color: #3C3489; padding: 24px; background: #EEEDFE;
                    border-radius: 8px; text-align: center; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888780; font-size: 14px;">
          Este código expira en 5 minutos. Si no solicitaste este acceso, ignora este correo.
        </p>
      </div>
    `
  })
}

module.exports = { sendMFACode }
