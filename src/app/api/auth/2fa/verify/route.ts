import { NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import QRCode from 'qrcode';
import { connectToDatabase } from '@/lib/db';
import { generate2FASecret, verifyTOTP } from '@/lib/totp';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// Helper to verify temporary or permanent session token and return payload
async function getSessionUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
    const parts = c.trim().split('=');
    return [parts[0], parts.slice(1).join('=')];
  }));

  const tempToken = cookies['webmail_temp_session'];
  const finalToken = cookies['webmail_session'];

  if (tempToken) {
    try {
      const { payload } = await jwtVerify(tempToken, JWT_SECRET);
      if (payload.step === '2fa_pending') {
        return { 
          email: (payload.email as string).trim().toLowerCase(), 
          name: payload.name as string || '', 
          picture: payload.picture as string || '',
          isTemp: true 
        };
      }
    } catch (err) {
      console.warn('Failed to verify temporary session JWT:', err);
    }
  }

  if (finalToken) {
    try {
      const { payload } = await jwtVerify(finalToken, JWT_SECRET);
      return { 
        email: (payload.email as string).trim().toLowerCase(), 
        name: payload.name as string || '', 
        picture: payload.picture as string || '',
        isTemp: false 
      };
    } catch (err) {
      console.warn('Failed to verify final session JWT:', err);
    }
  }

  return null;
}

// GET: Check 2FA state, generate secret & QR Code if not enabled
export async function GET(request: Request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado (sesión inválida)' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: session.email });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 1. User has 2FA enabled
    if (user.twoFactorEnabled === true) {
      return NextResponse.json({
        enabled: true,
        email: session.email,
        name: session.name,
        picture: session.picture,
        method: 'app',
        require2FA: user.require2FA === undefined ? false : !!user.require2FA,
      });
    }

    // 2. User does not have 2FA enabled yet.
    // If it's a temporary session (login flow), they MUST verify via email code
    if (session.isTemp) {
      return NextResponse.json({
        enabled: false,
        email: session.email,
        name: session.name,
        picture: session.picture,
        method: 'email',
        require2FA: true,
      });
    }

    // Otherwise, they are managing security inside the dashboard and can enable app-based 2FA:
    let totpSecret = user.twoFactorSecret;
    if (!totpSecret || totpSecret.length !== 32) {
      totpSecret = generate2FASecret();
      // Store secret in a pending verification state
      await db.collection('users').updateOne(
        { email: session.email },
        {
          $set: {
            twoFactorSecret: totpSecret,
            twoFactorEnabled: false,
            updatedAt: new Date(),
          }
        }
      );
    }

    // Generate otpauth URL and QR code image
    const otpAuthUrl = `otpauth://totp/BroslunasMail:${session.email}?secret=${totpSecret}&issuer=BroslunasMail`;
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    return NextResponse.json({
      enabled: false,
      email: session.email,
      name: session.name,
      picture: session.picture,
      method: 'app_setup',
      qrCodeUrl,
      secret: totpSecret, // For manual entry in authenticator app
      require2FA: user.require2FA === undefined ? false : !!user.require2FA,
    });
  } catch (error) {
    console.error('Error in 2FA Status API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Verify 2FA code and issue final session cookie
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado (sesión temporal inválida o expirada)' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'El código es obligatorio y debe ser una cadena' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: session.email });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    let isTokenValid = false;

    // 1. Try to verify via email code first (if one was generated and hasn't expired)
    if (user.email2faCode && user.email2faExpires) {
      const now = new Date();
      if (now <= new Date(user.email2faExpires) && code.trim() === user.email2faCode.trim()) {
        isTokenValid = true;
        // Consume the code
        await db.collection('users').updateOne(
          { email: session.email },
          {
            $unset: { email2faCode: "", email2faExpires: "" },
            $set: { updatedAt: new Date() }
          }
        );
      }
    }

    // 2. If not verified via email code, fallback to TOTP verification
    if (!isTokenValid) {
      if (user.twoFactorEnabled === true) {
        // User has app-based 2FA active: verify via TOTP
        if (!user.twoFactorSecret) {
          return NextResponse.json({ error: 'La configuración de 2FA no se inició correctamente' }, { status: 400 });
        }
        isTokenValid = verifyTOTP(code, user.twoFactorSecret);
      } else if (!session.isTemp) {
        // User is inside the dashboard and verifying app setup: verify via TOTP
        if (!user.twoFactorSecret) {
          return NextResponse.json({ error: 'La configuración de 2FA no se inició correctamente' }, { status: 400 });
        }
        isTokenValid = verifyTOTP(code, user.twoFactorSecret);
        if (isTokenValid) {
          await db.collection('users').updateOne(
            { email: session.email },
            { $set: { twoFactorEnabled: true, updatedAt: new Date() } }
          );
          try {
            const { send2FAStatusEmail } = await import('@/lib/mailjet');
            send2FAStatusEmail(session.email, session.name || 'Usuario', true)
              .catch(err => console.error('Failed to send 2FA enabled email:', err));
          } catch (err) {
            console.error('Error triggering 2FA enabled email:', err);
          }
        }
      }
    }

    if (!isTokenValid) {
      try {
        await db.collection('users').updateOne(
          { email: session.email },
          { $inc: { failedLoginAttempts: 1 } }
        );
        const updatedUser = await db.collection('users').findOne({ email: session.email });
        const failedAttempts = updatedUser?.failedLoginAttempts || 0;
        if (failedAttempts === 5 || failedAttempts === 10) {
          const ip = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') || 
                     'IP desconocida';
          const cleanIp = ip.split(',')[0].trim();
          
          const { sendBruteForceAlertEmail } = await import('@/lib/mailjet');
          sendBruteForceAlertEmail(session.email, user.name || session.name || 'Usuario', cleanIp, failedAttempts)
            .catch(err => console.error('Failed to send brute force email alert:', err));
        }
      } catch (err) {
        console.error('Error tracking failed login attempts:', err);
      }

      return NextResponse.json({ error: 'Código de verificación incorrecto. Inténtalo de nuevo.' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Autenticación completada con éxito',
    });

    if (session.isTemp) {
      // If logging in from temp session, issue permanent session cookie (valid for 7 days)
      const finalSessionToken = await new SignJWT({
        role: user.role || 'user',
        email: session.email,
        name: session.name,
        picture: session.picture,
        assignedAddresses: user.assignedAddresses || [],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET);

      response.cookies.set('webmail_session', finalSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      });

      // Clear temporary session cookie
      response.cookies.delete('webmail_temp_session');

      // Reset failed attempts upon successful login
      try {
        await db.collection('users').updateOne(
          { email: session.email },
          { $unset: { failedLoginAttempts: "" } }
        ).catch(err => console.error('Failed to reset login attempts:', err));
      } catch (err) {
        console.error('Error resetting login attempts:', err);
      }

      // Send login security email notification (non-blocking)
      try {
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('cf-connecting-ip') || 
                   'IP desconocida';
        const cleanIp = ip.split(',')[0].trim();
        const userAgent = request.headers.get('user-agent') || 'Dispositivo desconocido';
        
        // Format date and time in Spanish standard timezone
        const now = new Date();
        const formattedTime = now.toLocaleString('es-ES', {
          timeZone: 'Europe/Madrid',
          dateStyle: 'long',
          timeStyle: 'medium'
        });

        const { sendLoginNotificationEmail } = await import('@/lib/mailjet');
        sendLoginNotificationEmail(
          session.email,
          session.name || 'Usuario',
          cleanIp,
          userAgent,
          formattedTime
        ).catch(err => {
          console.error('Failed to send login notification email:', err);
        });
      } catch (err) {
        console.error('Error triggered during sending login security email:', err);
      }
    }

    return response;
  } catch (error) {
    console.error('Error verifying 2FA token in API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Deactivate 2FA (only if require2FA is false and user is fully logged in)
export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser(request);
    if (!session || session.isTemp) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: session.email });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Check if 2FA is forced for this user
    if (user.require2FA === true) {
      return NextResponse.json({ error: 'No puedes desactivar el 2FA porque tu cuenta requiere doble factor obligatorio.' }, { status: 400 });
    }

    // Disable 2FA
    await db.collection('users').updateOne(
      { email: session.email },
      { 
        $set: { 
          twoFactorEnabled: false, 
          twoFactorSecret: null, // Clear secret to force recreation upon next activation
          updatedAt: new Date() 
        } 
      }
    );
    try {
      const { send2FAStatusEmail } = await import('@/lib/mailjet');
      send2FAStatusEmail(session.email, session.name || 'Usuario', false)
        .catch(err => console.error('Failed to send 2FA disabled email:', err));
    } catch (err) {
      console.error('Error triggering 2FA disabled email:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Autenticación de dos factores desactivada correctamente.'
    });
  } catch (error) {
    console.error('Error disabling 2FA in API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
