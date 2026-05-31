import { NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import QRCode from 'qrcode';
import { connectToDatabase } from '@/lib/db';
import { generate2FASecret, verifyTOTP } from '@/lib/totp';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// Helper to verify temporary session token and return payload
async function getTempSession(request: Request) {
  const token = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('webmail_temp_session='))
    ?.split('=')[1];

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.step === '2fa_pending') {
      return payload as { email: string; name: string; picture: string; step: string };
    }
  } catch (err) {
    console.warn('Failed to verify temporary session JWT:', err);
  }
  return null;
}

// GET: Check 2FA state, generate secret & QR Code if not enabled
export async function GET(request: Request) {
  try {
    const tempSession = await getTempSession(request);
    if (!tempSession) {
      return NextResponse.json({ error: 'No autorizado (sesión temporal inválida)' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: tempSession.email });

    // 1. User has 2FA enabled
    if (user && user.twoFactorEnabled === true) {
      return NextResponse.json({
        enabled: true,
        email: tempSession.email,
        name: tempSession.name,
        picture: tempSession.picture,
      });
    }

    // 2. User does not have 2FA enabled yet. Retrieve or generate secret.
    let totpSecret = user?.twoFactorSecret;
    if (!totpSecret || totpSecret.length !== 32) {
      totpSecret = generate2FASecret();
      // Store secret in a pending verification state
      await db.collection('users').updateOne(
        { email: tempSession.email },
        {
          $set: {
            email: tempSession.email,
            twoFactorSecret: totpSecret,
            twoFactorEnabled: false,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    // Generate otpauth URL and QR code image
    const otpAuthUrl = `otpauth://totp/WebmailPrivado:${tempSession.email}?secret=${totpSecret}&issuer=WebmailPrivado`;
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    return NextResponse.json({
      enabled: false,
      email: tempSession.email,
      name: tempSession.name,
      picture: tempSession.picture,
      qrCodeUrl,
      secret: totpSecret, // For manual entry in authenticator app
    });
  } catch (error) {
    console.error('Error in 2FA Status API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Verify 2FA code and issue final session cookie
export async function POST(request: Request) {
  try {
    const tempSession = await getTempSession(request);
    if (!tempSession) {
      return NextResponse.json({ error: 'No autorizado (sesión temporal inválida o expirada)' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'El código es obligatorio y debe ser una cadena' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: tempSession.email });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'La configuración de 2FA no se inició correctamente' }, { status: 400 });
    }

    // Verify 6-digit TOTP code
    const isTokenValid = verifyTOTP(code, user.twoFactorSecret);
    if (!isTokenValid) {
      return NextResponse.json({ error: 'Código de autenticación incorrecto. Inténtalo de nuevo.' }, { status: 400 });
    }

    // If verification succeeds and 2FA wasn't enabled yet, enable it
    if (user.twoFactorEnabled !== true) {
      await db.collection('users').updateOne(
        { email: tempSession.email },
        { $set: { twoFactorEnabled: true, updatedAt: new Date() } }
      );
    }

    // Issue permanent session cookie (valid for 7 days)
    const finalSessionToken = await new SignJWT({
      role: 'admin',
      email: tempSession.email,
      name: tempSession.name,
      picture: tempSession.picture,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión completado',
    });

    // Set permanent session cookie
    response.cookies.set('webmail_session', finalSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    });

    // Clear temporary session cookie
    response.cookies.delete('webmail_temp_session');

    return response;
  } catch (error) {
    console.error('Error verifying 2FA token in API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
