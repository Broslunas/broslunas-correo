import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Convert secret string to Uint8Array for jose compatibility
const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass check for next assets, public files, and auth callback/ingress endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/api/emails/ingress' ||
    pathname.startsWith('/api/auth/google') ||
    pathname === '/api/auth/2fa/verify' ||
    pathname === '/api/auth' // Logout endpoint
  ) {
    return NextResponse.next();
  }

  // 2. Extract JWT tokens from cookies
  const token = request.cookies.get('webmail_session')?.value;
  const tempToken = request.cookies.get('webmail_temp_session')?.value;

  let isFullyAuthenticated = false;
  let isTempAuthenticated = false;

  // Verify permanent session token
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isFullyAuthenticated = true;
    } catch (e: any) {
      console.warn('Invalid webmail_session token in middleware:', e.message || e);
    }
  }

  // Verify temporary session token (if permanent is not valid)
  if (!isFullyAuthenticated && tempToken) {
    try {
      const { payload } = await jwtVerify(tempToken, JWT_SECRET);
      if (payload.step === '2fa_pending') {
        isTempAuthenticated = true;
      }
    } catch (e: any) {
      console.warn('Invalid webmail_temp_session token in middleware:', e.message || e);
    }
  }

  // 3. Handle routing based on authentication state

  // Scenario A: Fully Authenticated User
  if (isFullyAuthenticated) {
    // Prevent access to Login page or 2FA verification page, redirect to Dashboard
    if (pathname === '/' || pathname === '/auth/2fa') {
      const url = new URL('/dashboard', request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Scenario B: Temporary Session User (Needs to verify 2FA)
  if (isTempAuthenticated) {
    // Only allow access to the 2FA verification page. Redirect all other pages there.
    if (pathname !== '/auth/2fa') {
      const url = new URL('/auth/2fa', request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Scenario C: Unauthenticated User
  // Redirect access to dashboard, 2FA, or API endpoints to login page '/'
  if (
    pathname.startsWith('/dashboard') ||
    pathname === '/auth/2fa' ||
    (pathname.startsWith('/api') && pathname !== '/')
  ) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Config to run middleware on all routes except static resource routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
