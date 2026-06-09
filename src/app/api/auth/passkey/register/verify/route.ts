import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { connectToDatabase } from '@/lib/db';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is logged in
    const token = request.cookies.get('webmail_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    // 2. Read body and cookie challenge
    const body = await request.json().catch(() => ({}));
    const { credential, name } = body;
    if (!credential) {
      return NextResponse.json({ error: 'Credencial es obligatoria' }, { status: 400 });
    }

    const expectedChallenge = request.cookies.get('webmail_passkey_reg_challenge')?.value;
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Desafío expirado o no encontrado. Por favor, reintenta.' }, { status: 400 });
    }

    // 3. WebAuthn Config
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const url = new URL(appUrl);
    const rpID = url.hostname;
    const origin = url.origin;

    // 4. Verify registration response
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (err: any) {
      console.error('WebAuthn verification failed:', err);
      return NextResponse.json({ error: `Verificación fallida: ${err.message}` }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: 'La credencial no pudo ser verificada.' }, { status: 400 });
    }

    const { credential: regCredential, credentialDeviceType, credentialBackedUp } = registrationInfo;
    const { id: credentialID, publicKey: credentialPublicKey, counter, transports } = regCredential;

    // 5. Connect to DB and store the new Passkey
    const { db } = await connectToDatabase();
    
    // Convert to base64 to store in MongoDB
    const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');
    const credentialIDString = credentialID;

    const passkeyName = name?.trim() || `Llave de paso (${new Date().toLocaleDateString('es-ES')})`;

    await db.collection('passkeys').insertOne({
      userEmail: email,
      credentialID: credentialIDString,
      credentialPublicKey: publicKeyBase64,
      counter,
      transports: transports || [],
      name: passkeyName,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      createdAt: new Date(),
    });

    // 6. Respond and clear challenge cookie
    const response = NextResponse.json({ success: true, message: 'Llave de paso registrada con éxito' });
    response.cookies.delete('webmail_passkey_reg_challenge');
    return response;
  } catch (error) {
    console.error('Error verifying passkey registration:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
