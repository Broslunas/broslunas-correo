import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { connectToDatabase } from '@/lib/db';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function GET(request: NextRequest) {
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

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 2. Fetch existing passkeys to exclude them
    const existingPasskeys = await db.collection('passkeys').find({ userEmail: email }).toArray();
    const excludeCredentials = existingPasskeys.map((pk) => ({
      id: pk.credentialID,
      type: 'public-key' as const,
      transports: pk.transports || [],
    }));

    // 3. WebAuthn Config
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const rpID = new URL(appUrl).hostname;

    // 4. Generate options
    const options = await generateRegistrationOptions({
      rpName: 'Broslunas Correo',
      rpID,
      userID: new TextEncoder().encode(email),
      userName: email,
      userDisplayName: user.name || email.split('@')[0],
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      excludeCredentials,
    });

    // 5. Store challenge in a short-lived HTTP-only cookie
    const response = NextResponse.json(options);
    response.cookies.set('webmail_passkey_reg_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes
    });

    return response;
  } catch (error) {
    console.error('Error generating passkey registration options:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
