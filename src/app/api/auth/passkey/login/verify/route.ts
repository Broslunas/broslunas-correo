import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { connectToDatabase } from '@/lib/db';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { credential } = body;
    if (!credential) {
      return NextResponse.json({ error: 'Credencial es obligatoria' }, { status: 400 });
    }

    const expectedChallenge = request.cookies.get('webmail_passkey_login_challenge')?.value;
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Desafío expirado o no encontrado. Por favor, reintenta.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const url = new URL(appUrl);
    const rpID = url.hostname;
    const origin = url.origin;

    // 1. Connect to DB and search for this credential
    const { db } = await connectToDatabase();
    const passkey = await db.collection('passkeys').findOne({ credentialID: credential.id });
    if (!passkey) {
      return NextResponse.json({ error: 'Esta llave de paso no está registrada en el sistema.' }, { status: 401 });
    }

    // 2. Fetch the associated user
    const user = await db.collection('users').findOne({ email: passkey.userEmail });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    // 3. Verify assertion
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialID,
          publicKey: Buffer.from(passkey.credentialPublicKey, 'base64'),
          counter: passkey.counter,
          transports: passkey.transports,
        },
      });
    } catch (err: any) {
      console.error('WebAuthn assertion verification failed:', err);
      return NextResponse.json({ error: `Autenticación fallida: ${err.message}` }, { status: 401 });
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return NextResponse.json({ error: 'La firma de la llave de paso no pudo ser verificada.' }, { status: 401 });
    }

    const { newCounter } = authenticationInfo;

    // 4. Update the credential counter in the DB
    await db.collection('passkeys').updateOne(
      { _id: passkey._id },
      { $set: { counter: newCounter, lastUsedAt: new Date() } }
    );

    // 5. Generate permanent session JWT (valid for 7 days)
    const finalSessionToken = await new SignJWT({
      role: user.role || 'user',
      email: user.email,
      name: user.name || user.email.split('@')[0],
      picture: user.picture || '',
      assignedAddresses: user.assignedAddresses || [],
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: 'Sesión iniciada con éxito',
    });

    response.cookies.set('webmail_session', finalSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    });

    // Clear login challenge cookie
    response.cookies.delete('webmail_passkey_login_challenge');

    // Reset failed attempts upon successful login
    try {
      await db.collection('users').updateOne(
        { email: user.email },
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
      
      const now = new Date();
      const formattedTime = now.toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        dateStyle: 'long',
        timeStyle: 'medium'
      });

      const { sendLoginNotificationEmail } = await import('@/lib/mailjet');
      sendLoginNotificationEmail(
        user.email,
        user.name || user.email.split('@')[0],
        cleanIp,
        userAgent,
        formattedTime + " (Vía Passkey)"
      ).catch(err => {
        console.error('Failed to send login notification email:', err);
      });
    } catch (err) {
      console.error('Error triggered during sending login security email:', err);
    }

    return response;
  } catch (error) {
    console.error('Error verifying passkey login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
