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
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userEmail = (payload.email as string || '').trim().toLowerCase();

    if (!userEmail) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Find the user to retrieve their permissions
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    }

    const assignedAddresses: string[] = user.assignedAddresses || [];

    // Ensure unique index on email for mailboxes
    await db.collection('mailboxes').createIndex({ email: 1 }, { unique: true }).catch(() => {});

    // Fetch all registered mailboxes
    const allMailboxes = await db.collection('mailboxes')
      .find({})
      .sort({ email: 1 })
      .toArray();

    let authorizedMailboxes: any[] = [];

    if (assignedAddresses.includes('*')) {
      // Wildcard access: Can send from any registered mailbox
      authorizedMailboxes = allMailboxes;
    } else {
      // Filter only registered mailboxes that match the user's assigned addresses
      const assignedSet = new Set(assignedAddresses.map(addr => addr.trim().toLowerCase()));
      authorizedMailboxes = allMailboxes.filter(m => assignedSet.has((m.email || '').trim().toLowerCase()));

      // Fallback: Ensure all explicitly assigned addresses are present even if not created in mailboxes collection yet
      const registeredEmails = new Set(authorizedMailboxes.map(m => (m.email || '').trim().toLowerCase()));
      for (const addr of assignedAddresses) {
        const clean = (addr || '').trim().toLowerCase();
        if (clean && clean !== '*' && !registeredEmails.has(clean)) {
          authorizedMailboxes.push({
            email: clean,
            name: clean.split('@')[0],
            signature: ''
          });
        }
      }
    }

    const result = authorizedMailboxes.map(m => ({
      email: m.email,
      name: m.name,
      signature: m.signature || ''
    }));

    const domains = await db.collection('domains').find({}).toArray();
    const domainList = domains.map(d => d.domain);

    return NextResponse.json({
      mailboxes: result,
      hasFullAccess: assignedAddresses.includes('*'),
      domains: domainList
    });
  } catch (err) {
    console.error('Error fetching authorized mailboxes:', err);
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
}
