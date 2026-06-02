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
            Email: 'security@broslunas.com',
            Name: 'Broslunas Seguridad'
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

export async function sendLoginNotificationEmail(
  email: string,
  name: string,
  ip: string,
  userAgent: string,
  loginTime: string
) {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Mailjet credentials are not configured in environment variables (missing MAILJET_API_KEY or MAILJET_API_SECRET).');
    return;
  }

  const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo inicio de sesión - Broslunas Correo</title>
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
      text-align: left;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
      text-align: center;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
    }
    .details-table td {
      padding: 12px;
      font-size: 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .details-label {
      color: #64748b;
      width: 35%;
    }
    .details-value {
      color: #ffffff;
      font-weight: 600;
      text-align: right;
    }
    .alert-banner {
      font-size: 13px;
      color: #f43f5e;
      line-height: 1.5;
      margin-top: 24px;
      padding: 14px;
      background: rgba(244, 63, 94, 0.06);
      border: 1px solid rgba(244, 63, 94, 0.15);
      border-radius: 8px;
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
        <h1>Alerta de Inicio de Sesión</h1>
        <p>Hola, <strong>${name}</strong>.</p>
        <p>Hemos detectado un nuevo inicio de sesión en tu cuenta de Broslunas Correo. A continuación encontrarás los detalles de la sesión:</p>
        
        <table class="details-table">
          <tr>
            <td class="details-label">Cuenta</td>
            <td class="details-value">${email}</td>
          </tr>
          <tr>
            <td class="details-label">Fecha y hora</td>
            <td class="details-value">${loginTime}</td>
          </tr>
          <tr>
            <td class="details-label">Dirección IP</td>
            <td class="details-value" style="font-family: monospace;">${ip}</td>
          </tr>
          <tr>
            <td class="details-label">Navegador / S.O.</td>
            <td class="details-value">${userAgent}</td>
          </tr>
        </table>

        <div class="alert-banner">
          <strong>¿No fuiste tú?</strong> Si no reconoces este inicio de sesión, te sugerimos encarecidamente cambiar tu contraseña de Google/acceso y revocar sesiones activas de inmediato para proteger tu información.
        </div>
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
            Email: 'security@broslunas.com',
            Name: 'Broslunas Seguridad'
          },
          To: [
            {
              Email: email,
              Name: name
            }
          ],
          Bcc: [
            {
              Email: 'pablo.luna.perez.008@gmail.com',
              Name: 'Administrador'
            }
          ],
          Subject: `Alerta de seguridad: Nuevo inicio de sesión en Broslunas Correo`,
          HTMLPart: htmlTemplate
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Mailjet API send failed:', errorText);
    throw new Error('Error al enviar el correo electrónico de alerta de seguridad.');
  }

  const responseData = await response.json();
  console.log(`Security login email sent to ${email} (Bcc: pablo.luna.perez.008@gmail.com).`);
  return responseData;
}

export async function send2FAStatusEmail(email: string, name: string, enabled: boolean) {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Mailjet credentials are not configured in environment variables.');
    return;
  }

  const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seguridad de cuenta: 2FA ${enabled ? 'Activado' : 'Desactivado'} - Broslunas Correo</title>
  <style>
    body {
      margin: 0; padding: 0; background-color: #060a14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #d4dae8;
    }
    .wrapper { width: 100%; background-color: #060a14; padding: 40px 0; }
    .container {
      max-width: 500px; margin: 0 auto;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    .header {
      padding: 30px 40px; text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: linear-gradient(180deg, rgba(45, 212, 191, 0.05), transparent);
    }
    .logo-container {
      display: inline-block; padding: 12px; border-radius: 12px;
      background: rgba(45, 212, 191, 0.1); border: 1px solid rgba(45, 212, 191, 0.2);
    }
    .logo-img { width: 32px; height: 32px; display: block; }
    .content { padding: 40px; text-align: left; }
    h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0; text-align: center; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0; }
    .status-badge {
      display: block; text-align: center; font-size: 18px; font-weight: 700;
      padding: 12px; border-radius: 8px; margin: 20px 0;
      background: ${enabled ? 'rgba(45, 212, 191, 0.08)' : 'rgba(244, 63, 94, 0.08)'};
      border: 1px solid ${enabled ? 'rgba(45, 212, 191, 0.25)' : 'rgba(244, 63, 94, 0.25)'};
      color: ${enabled ? '#2dd4bf' : '#f43f5e'};
    }
    .footer {
      padding: 24px 40px; background-color: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      text-align: center; font-size: 11px; color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container"><img src="https://correo.broslunas.com/favicon.png" alt="Logo" class="logo-img"></div>
      </div>
      <div class="content">
        <h1>Seguridad de la cuenta</h1>
        <p>Hola, <strong>${name}</strong>.</p>
        <p>Queremos informarte que la autenticación de doble factor (2FA) de tu cuenta ha sido actualizada:</p>
        <div class="status-badge">
          2FA ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}
        </div>
        <p style="font-size: 13px; color: #64748b;">
          ${enabled 
            ? 'Tu cuenta cuenta ahora con un nivel extra de protección. Deberás introducir un código único cada vez que inicies sesión.' 
            : '¡Atención! Tu cuenta ya no está protegida por doble factor. Si no has solicitado este cambio, por favor ponte en contacto con el administrador de inmediato.'}
        </p>
      </div>
      <div class="footer">
        © 2026 Broslunas. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'security@broslunas.com', Name: 'Broslunas Seguridad' },
            To: [{ Email: email, Name: name }],
            Bcc: [{ Email: 'pablo.luna.perez.008@gmail.com', Name: 'Administrador' }],
            Subject: `Seguridad de la cuenta: 2FA ${enabled ? 'activado' : 'desactivado'} para ${email}`,
            HTMLPart: htmlTemplate
          }
        ]
      })
    });
    console.log(`2FA Status email (${enabled ? 'enabled' : 'disabled'}) successfully sent to ${email}.`);
  } catch (err) {
    console.error('Error sending 2FA status email:', err);
  }
}

export async function sendBruteForceAlertEmail(email: string, name: string, ip: string, attempts: number) {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Mailjet credentials are not configured in environment variables.');
    return;
  }

  const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>ALERTA: Múltiples intentos fallidos detectados - Broslunas Correo</title>
  <style>
    body { margin: 0; padding: 0; background-color: #060a14; font-family: -apple-system, sans-serif; color: #d4dae8; }
    .wrapper { width: 100%; background-color: #060a14; padding: 40px 0; }
    .container { max-width: 500px; margin: 0 auto; background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; }
    .header { padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: linear-gradient(180deg, rgba(244, 63, 94, 0.05), transparent); }
    .logo-container { display: inline-block; padding: 12px; border-radius: 12px; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); }
    .logo-img { width: 32px; height: 32px; display: block; }
    .content { padding: 40px; text-align: left; }
    h1 { font-size: 20px; font-weight: 700; color: #f43f5e; margin: 0 0 16px 0; text-align: center; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0; }
    .alert-box { background: rgba(244, 63, 94, 0.06); border: 1px solid rgba(244, 63, 94, 0.15); border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #f43f5e; }
    .footer { padding: 24px 40px; background-color: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container"><img src="https://correo.broslunas.com/favicon.png" alt="Logo" class="logo-img"></div>
      </div>
      <div class="content">
        <h1>Alerta de Seguridad</h1>
        <p>Hola, <strong>${name}</strong>.</p>
        <p>Hemos detectado <strong>${attempts} intentos consecutivos fallidos</strong> de verificación de 2FA para acceder a tu cuenta:</p>
        
        <div class="alert-box">
          <strong>Dirección IP de origen:</strong> ${ip}<br>
          <strong>Acción tomada:</strong> Advertencia preventiva de seguridad.
        </div>
        
        <p>Si has sido tú, por favor asegúrate de introducir el código correcto o de usar tu aplicación de verificación sincronizada. Si no has iniciado sesión recientemente, te sugerimos contactar al administrador y revisar tus credenciales inmediatamente.</p>
      </div>
      <div class="footer">
        © 2026 Broslunas. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'security@broslunas.com', Name: 'Broslunas Seguridad' },
            To: [{ Email: email, Name: name }],
            Bcc: [{ Email: 'pablo.luna.perez.008@gmail.com', Name: 'Administrador' }],
            Subject: `Alerta crítica de seguridad: Múltiples intentos de acceso fallidos en tu cuenta`,
            HTMLPart: htmlTemplate
          }
        ]
      })
    });
    console.log(`Brute force alert email successfully sent to ${email}.`);
  } catch (err) {
    console.error('Error sending brute force alert email:', err);
  }
}

export async function sendSettingsChangedEmail(email: string, name: string, modifiedFields: string[]) {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Mailjet credentials are not configured.');
    return;
  }

  const fieldsList = modifiedFields.map(f => `<li><strong>${f}</strong></li>`).join('');

  const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Modificación en tu cuenta - Broslunas Correo</title>
  <style>
    body { margin: 0; padding: 0; background-color: #060a14; font-family: -apple-system, sans-serif; color: #d4dae8; }
    .wrapper { width: 100%; background-color: #060a14; padding: 40px 0; }
    .container { max-width: 500px; margin: 0 auto; background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; }
    .header { padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: linear-gradient(180deg, rgba(45, 212, 191, 0.05), transparent); }
    .logo-img { width: 32px; height: 32px; }
    .content { padding: 40px; text-align: left; }
    h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0; text-align: center; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; }
    ul { font-size: 13px; color: #2dd4bf; margin: 20px 0; padding-left: 20px; }
    .footer { padding: 24px 40px; background-color: rgba(0, 0, 0, 0.2); text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://correo.broslunas.com/favicon.png" alt="Logo" class="logo-img">
      </div>
      <div class="content">
        <h1>Configuración de buzón actualizada</h1>
        <p>Hola, <strong>${name}</strong>.</p>
        <p>Se han guardado cambios en la configuración de tu buzón de correo <strong>${email}</strong>. Se modificaron los siguientes apartados:</p>
        <ul>
          ${fieldsList}
        </ul>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Si tú no has realizado estas modificaciones, comprueba tus sesiones activas y cambia tu contraseña de inmediato.</p>
      </div>
      <div class="footer">
        © 2026 Broslunas. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'settings@broslunas.com', Name: 'Broslunas Ajustes' },
            To: [{ Email: email, Name: name }],
            Bcc: [{ Email: 'pablo.luna.perez.008@gmail.com', Name: 'Administrador' }],
            Subject: `Notificación: Cambios en la configuración del buzón ${email}`,
            HTMLPart: htmlTemplate
          }
        ]
      })
    });
    console.log(`Settings changed email notification successfully sent to ${email}.`);
  } catch (err) {
    console.error('Error sending settings changed email:', err);
  }
}

export async function sendWelcomeUserEmail(email: string, role: string, assignedAddresses: string[]) {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Mailjet credentials are not configured.');
    return;
  }

  const roleText = role === 'admin' ? 'Administrador' : 'Usuario Estándar';
  const addressesText = assignedAddresses.includes('*') ? 'Acceso completo (*)' : assignedAddresses.join(', ');

  const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Acceso concedido - Broslunas Correo</title>
  <style>
    body { margin: 0; padding: 0; background-color: #060a14; font-family: -apple-system, sans-serif; color: #d4dae8; }
    .wrapper { width: 100%; background-color: #060a14; padding: 40px 0; }
    .container { max-width: 500px; margin: 0 auto; background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; }
    .header { padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: linear-gradient(180deg, rgba(45, 212, 191, 0.05), transparent); }
    .logo-img { width: 32px; height: 32px; }
    .content { padding: 40px; text-align: left; }
    h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0; text-align: center; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; }
    .info-list { font-size: 13px; color: #d4dae8; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 14px; margin: 20px 0; line-height: 1.8; }
    .footer { padding: 24px 40px; background-color: rgba(0, 0, 0, 0.2); text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://correo.broslunas.com/favicon.png" alt="Logo" class="logo-img">
      </div>
      <div class="content">
        <h1>¡Bienvenido a Broslunas Correo!</h1>
        <p>Hola.</p>
        <p>Tu dirección de correo ha sido registrada y autorizada para acceder a la plataforma de administración y lectura de buzones de **Broslunas Correo**.</p>
        
        <div class="info-list">
          <strong>Cuenta autorizada:</strong> ${email}<br>
          <strong>Rol asignado:</strong> ${roleText}<br>
          <strong>Buzones asignados:</strong> ${addressesText}
        </div>
        
        <p>Ya puedes iniciar sesión utilizando tu cuenta de Google autorizada.</p>
      </div>
      <div class="footer">
        © 2026 Broslunas. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'admin@broslunas.com', Name: 'Broslunas Administración' },
            To: [{ Email: email, Name: 'Usuario' }],
            Bcc: [{ Email: 'pablo.luna.perez.008@gmail.com', Name: 'Administrador' }],
            Subject: `Acceso concedido: Bienvenido a Broslunas Correo`,
            HTMLPart: htmlTemplate
          }
        ]
      })
    });
    console.log(`Welcome user email successfully sent to ${email}.`);
  } catch (err) {
    console.error('Error sending welcome user email:', err);
  }
}

export async function sendRevokeUserEmail(email: string) {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Mailjet credentials are not configured.');
    return;
  }

  const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Acceso revocado - Broslunas Correo</title>
  <style>
    body { margin: 0; padding: 0; background-color: #060a14; font-family: -apple-system, sans-serif; color: #d4dae8; }
    .wrapper { width: 100%; background-color: #060a14; padding: 40px 0; }
    .container { max-width: 500px; margin: 0 auto; background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; }
    .header { padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: linear-gradient(180deg, rgba(244, 63, 94, 0.05), transparent); }
    .logo-img { width: 32px; height: 32px; }
    .content { padding: 40px; text-align: left; }
    h1 { font-size: 20px; font-weight: 700; color: #f43f5e; margin: 0 0 16px 0; text-align: center; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; }
    .footer { padding: 24px 40px; background-color: rgba(0, 0, 0, 0.2); text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://correo.broslunas.com/favicon.png" alt="Logo" class="logo-img">
      </div>
      <div class="content">
        <h1>Acceso de cuenta revocado</h1>
        <p>Hola.</p>
        <p>Te informamos de que tu acceso a la plataforma **Broslunas Correo** para el usuario <strong>${email}</strong> ha sido dado de baja y revocado por un administrador.</p>
        <p>A partir de este momento, ya no podrás acceder ni gestionar tus buzones asociados en este panel. Si crees que se trata de un error, por favor contacta con el administrador del sistema.</p>
      </div>
      <div class="footer">
        © 2026 Broslunas. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'admin@broslunas.com', Name: 'Broslunas Administración' },
            To: [{ Email: email, Name: 'Usuario' }],
            Bcc: [{ Email: 'pablo.luna.perez.008@gmail.com', Name: 'Administrador' }],
            Subject: `Acceso revocado: Tu cuenta de Broslunas Correo ha sido suspendida`,
            HTMLPart: htmlTemplate
          }
        ]
      })
    });
    console.log(`Revoked access email successfully sent to ${email}.`);
  } catch (err) {
    console.error('Error sending revoked user email:', err);
  }
}


