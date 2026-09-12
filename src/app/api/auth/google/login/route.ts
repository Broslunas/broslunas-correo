import { NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // Log so you can see what's being sent (visible in terminal)
  console.log('[OAuth Login] redirect_uri =>', redirectUri);
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
