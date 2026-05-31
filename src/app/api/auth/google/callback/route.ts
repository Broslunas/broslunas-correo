import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { sendEmail2FACode } from '@/lib/mailjet';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function GET(request: NextRequest) {
  let appUrl = 'http://localhost:3000';
  try {
    const { searchParams, origin } = new URL(request.url);
    appUrl = origin;
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

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

    // 3. Connect to Database & Verify user authorization
    const { connectToDatabase } = await import('@/lib/db');
    const { db } = await connectToDatabase();
    const cleanEmail = email.trim().toLowerCase();

    // Auto-bootstrap main administrator if database is empty or owner is missing
    const ownerEmail = allowedEmail.trim().toLowerCase();
    const totalUsersCount = await db.collection('users').countDocuments();
    const ownerUser = await db.collection('users').findOne({ email: ownerEmail });

    if (totalUsersCount === 0 || !ownerUser) {
      console.log(`Bootstrapping main administrator account in callback: ${ownerEmail}`);
      await db.collection('users').updateOne(
        { email: ownerEmail },
        {
          $set: {
            email: ownerEmail,
            role: 'admin',
            twoFactorSecret: ownerUser?.twoFactorSecret || null,
            twoFactorEnabled: ownerUser?.twoFactorEnabled || false,
            assignedAddresses: ['*'],
            addedBy: 'SYSTEM',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    // Check for an invite token cookie to register the user dynamically
    const inviteToken = request.cookies.get('webmail_invite_token')?.value;
    let invitationDetails = null;

    if (inviteToken) {
      const invitation = await db.collection('invitations').findOne({ token: inviteToken });
      if (invitation && !invitation.used && new Date() < new Date(invitation.expiresAt)) {
        invitationDetails = invitation;
      }
    }

    // Check if the logging in user is authorized in the database
    let user = await db.collection('users').findOne({ email: cleanEmail });

    // Claim invitation if user is not yet authorized and has a valid token
    if (!user && invitationDetails) {
      console.log(`Registering new user ${cleanEmail} via invitation`);
      const newUser = {
        email: cleanEmail,
        role: invitationDetails.role,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        require2FA: invitationDetails.require2FA === true,
        assignedAddresses: invitationDetails.assignedAddresses,
        addedBy: invitationDetails.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: insertResult.insertedId };

      // Mark invitation as claimed
      await db.collection('invitations').updateOne(
        { _id: invitationDetails._id },
        { $set: { used: true, usedBy: cleanEmail, usedAt: new Date() } }
      );
    }

    if (!user) {
      console.warn(`Unauthorized login attempt by email: ${cleanEmail}`);
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Acceso no autorizado para esta cuenta')}`);
    }

    // 4. Generate temporary session JWT (valid for 10 minutes) and redirect to 2FA page
    const tempToken = await new SignJWT({
      email: cleanEmail,
      name: name || '',
      picture: picture || '',
      role: user.role,
      step: '2fa_pending'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m') // 10 minutes expiration
      .sign(JWT_SECRET);

    const response = NextResponse.redirect(new URL('/auth/2fa', request.url));
    response.cookies.delete('webmail_invite_token'); // Clear the invitation cookie

    response.cookies.set('webmail_temp_session', tempToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes in seconds
    });

    // Clear any leftover final token
    response.cookies.delete('webmail_session');

    if (user.twoFactorEnabled === true) {
      console.log(`Setting temp session cookie and redirecting to app-based /auth/2fa for email: ${cleanEmail}`);
    } else {
      // Email-based 2FA: generate 6-digit code and save to DB
      const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
      const emailExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      await db.collection('users').updateOne(
        { email: cleanEmail },
        {
          $set: {
            email2faCode: emailCode,
            email2faExpires: emailExpires,
            updatedAt: new Date()
          }
        }
      );

      console.log(`Generated email 2FA code for ${cleanEmail}: ${emailCode}`);

      // Send the email using Mailjet API
      try {
        await sendEmail2FACode(cleanEmail, name || 'Usuario', emailCode);
      } catch (err) {
        console.error('Error sending 2FA email in callback:', err);
      }
    }

    return response;
  } catch (error) {
    console.error('Error in Google Callback Route:', error);
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Error interno de autenticación')}`);
  }
}
