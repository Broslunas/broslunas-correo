import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID).' },
      { status: 500 }
    );
  }

  const scope = 'openid email profile';
  
  // Build Google OAuth authorization URL
  const googleAuthUrl = 
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return NextResponse.redirect(googleAuthUrl);
}
