import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function GET(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    // 1. Verify session token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // 2. Connect to database
    const { db } = await connectToDatabase();

    // 3. Auto-bootstrap the main administrator if needed
    const ownerEmail = (process.env.ALLOWED_USER_EMAIL || 'pablo.luna.perez.008@gmail.com').trim().toLowerCase();
    const totalUsersCount = await db.collection('users').countDocuments();
    const ownerUser = await db.collection('users').findOne({ email: ownerEmail });

    if (totalUsersCount === 0 || !ownerUser) {
      console.log(`Bootstrapping main administrator account: ${ownerEmail}`);
      await db.collection('users').updateOne(
        { email: ownerEmail },
        {
          $set: {
            email: ownerEmail,
            role: 'admin',
            twoFactorSecret: ownerUser?.twoFactorSecret || null,
            twoFactorEnabled: ownerUser?.twoFactorEnabled || false,
            assignedAddresses: ['*'], // Wildcard for all access
            addedBy: 'SYSTEM',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    // Auto-bootstrap the default allowed domain if needed
    const totalDomainsCount = await db.collection('domains').countDocuments();
    if (totalDomainsCount === 0) {
      const fromEmail = (process.env.MAILJET_FROM_EMAIL || 'yo@broslunas.link').trim().toLowerCase();
      const domainParts = fromEmail.split('@');
      const defaultDomain = domainParts.length > 1 ? domainParts[1] : 'broslunas.link';
      
      console.log(`Bootstrapping default allowed domain: ${defaultDomain}`);
      await db.collection('domains').updateOne(
        { domain: defaultDomain },
        {
          $set: {
            domain: defaultDomain,
            addedBy: 'SYSTEM',
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    // 4. Fetch the user's real-time configuration
    const user = await db.collection('users').findOne({ email });

    // If user access was revoked (removed from MongoDB), deny access
    if (!user) {
      console.warn(`Authenticated session email ${email} no longer exists in authorized users.`);
      
      // Clear cookie response
      const response = NextResponse.json({ error: 'Acceso revocado' }, { status: 401 });
      response.cookies.delete('webmail_session');
      return response;
    }

    // 5. Return user metadata and assigned mailboxes
    return NextResponse.json({
      email: user.email,
      name: payload.name || user.email.split('@')[0],
      picture: payload.picture || '',
      role: user.role,
      assignedAddresses: user.assignedAddresses || [],
    });
  } catch (err) {
    console.error('Error fetching auth status:', err);
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
}
