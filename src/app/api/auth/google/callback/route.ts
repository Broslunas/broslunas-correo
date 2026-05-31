import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (errorParam) {
      console.error('Google OAuth redirect error:', errorParam);
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Acceso cancelado por el usuario')}`);
    }

    if (!code) {
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Falta el código de autorización')}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const allowedEmail = process.env.ALLOWED_USER_EMAIL;

    if (!clientId || !clientSecret || !allowedEmail) {
      console.error('Server configuration variables missing in Google Callback route');
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Error de configuración del servidor')}`);
    }

    // 1. Exchange OAuth code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Google token exchange failed:', errText);
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Error de comunicación con Google')}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // 2. Fetch user profile from Google UserInfo endpoint
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch user profile from Google');
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Error al obtener perfil de Google')}`);
    }

    const profileData = await profileResponse.json();
    const { email, name, picture } = profileData;

    // 3. Verify user email against ALLOWED_USER_EMAIL (case-insensitive)
    if (!email || email.trim().toLowerCase() !== allowedEmail.trim().toLowerCase()) {
      console.warn(`Unauthorized login attempt by email: ${email}`);
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Acceso no autorizado para esta cuenta')}`);
    }

    // 4. Generate temporary session JWT (valid for 10 minutes)
    const tempToken = await new SignJWT({
      email: email.trim().toLowerCase(),
      name: name || '',
      picture: picture || '',
      step: '2fa_pending'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m') // 10 minutes expiration
      .sign(JWT_SECRET);

    // 5. Build manual redirect response to ensure cookies are preserved in all Next.js versions
    const response = new NextResponse(null, {
      status: 307,
      headers: {
        Location: `${appUrl}/auth/2fa`,
      },
    });

    response.cookies.set('webmail_temp_session', tempToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 600, // 10 minutes in seconds
    });

    console.log(`Setting webmail_temp_session cookie and redirecting to /auth/2fa for email: ${email}`);

    return response;
  } catch (error) {
    console.error('Error in Google Callback Route:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Error interno de autenticación')}`);
  }
}
