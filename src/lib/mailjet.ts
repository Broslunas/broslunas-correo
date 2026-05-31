export async function sendEmail2FACode(email: string, name: string, code: string) {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Mailjet credentials are not configured in environment variables (missing MAILJET_API_KEY or MAILJET_API_SECRET).');
    throw new Error('Servicio de correo de seguridad no configurado en el servidor');
  }

  const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de verificación - Broslunas Correo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #060a14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #d4dae8;
    }
    .wrapper {
      width: 100%;
      background-color: #060a14;
      padding: 40px 0;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    .header {
      padding: 30px 40px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: linear-gradient(180deg, rgba(45, 212, 191, 0.05), transparent);
    }
    .logo-container {
      display: inline-block;
      padding: 12px;
      border-radius: 12px;
      background: rgba(45, 212, 191, 0.1);
      border: 1px solid rgba(45, 212, 191, 0.2);
    }
    .logo-img {
      width: 32px;
      height: 32px;
      display: block;
    }
    .content {
      padding: 40px;
      text-align: center;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 30px 0;
    }
    .code-container {
      display: inline-block;
      font-size: 32px;
      font-weight: 850;
      letter-spacing: 6px;
      color: #2dd4bf;
      background: rgba(45, 212, 191, 0.08);
      border: 1px solid rgba(45, 212, 191, 0.25);
      border-radius: 12px;
      padding: 12px 36px;
      margin: 0 auto 30px auto;
    }
    .footer {
      padding: 24px 40px;
      background-color: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      text-align: center;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <img src="https://correo.broslunas.com/favicon.png" alt="Broslunas Correo" class="logo-img">
        </div>
      </div>
      <div class="content">
        <h1>Código de verificación de seguridad</h1>
        <p>Hola, ${name}.<br>Has solicitado iniciar sesión en tu cuenta de Broslunas Correo. Para completar el acceso de forma segura, introduce el siguiente código de un solo uso en la pantalla de verificación:</p>
        <div class="code-container">${code}</div>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Este código es válido durante los próximos 10 minutos.<br>Si tú no has solicitado este acceso, puedes ignorar este mensaje.</p>
      </div>
      <div class="footer">
        © 2026 Broslunas. Todos los derechos reservados.<br>
        Este es un correo automático de seguridad, por favor no respondas a este mensaje.
      </div>
    </div>
  </div>
</body>
</html>`;

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: 'notification@broslunas.com',
            Name: 'Broslunas Correo'
          },
          To: [
            {
              Email: email,
              Name: name
            }
          ],
          Subject: `${code} es tu código de verificación de inicio de sesión`,
          HTMLPart: htmlTemplate
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Mailjet API send failed:', errorText);
    throw new Error('Error al enviar el correo electrónico de verificación.');
  }

  const responseData = await response.json();
  console.log(`Email successfully sent to ${email} via Mailjet.`);
  return responseData;
}
