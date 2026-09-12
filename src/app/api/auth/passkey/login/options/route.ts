import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getAppUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const rpID = new URL(appUrl).hostname;

    // Generate assertion options for passwordless login
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    const response = NextResponse.json(options);
    // Store challenge in a cookie
    response.cookies.set('webmail_passkey_login_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes
    });

    return response;
  } catch (error) {
    console.error('Error generating passkey login options:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
