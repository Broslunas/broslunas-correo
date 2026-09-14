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
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    }

    const assignedAddresses: string[] = (user.assignedAddresses || []).map((a: string) => a.toLowerCase().trim());
    const isWildcard = assignedAddresses.includes('*');

    const matchQuery: any = {
      folder: { $nin: ['trash', 'spam'] }
    };

    if (!isWildcard) {
      matchQuery.$or = [
        { 'from.address': { $in: assignedAddresses } },
        { to: { $in: assignedAddresses } },
        { 'to.address': { $in: assignedAddresses } },
        { cc: { $in: assignedAddresses } },
        { bcc: { $in: assignedAddresses } },
      ];
    }

    const recentEmails = await db.collection('emails')
      .find(matchQuery, {
        projection: {
          from: 1,
          to: 1,
          cc: 1,
          bcc: 1,
          date: 1
        }
      })
      .sort({ date: -1 })
      .limit(300)
      .toArray();

    const contactMap = new Map<string, { email: string; name: string; count: number }>();

    const selfSet = new Set<string>([userEmail, ...assignedAddresses]);

    const addContact = (addr: string, nameCandidate?: string) => {
      if (!addr || typeof addr !== 'string') return;
      const cleanEmail = addr.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || selfSet.has(cleanEmail)) return;

      const existing = contactMap.get(cleanEmail);
      const name = (nameCandidate && nameCandidate.trim() !== cleanEmail) ? nameCandidate.trim() : (existing?.name || '');

      if (existing) {
        existing.count += 1;
        if (!existing.name && name) existing.name = name;
      } else {
        contactMap.set(cleanEmail, {
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          count: 1
        });
      }
    };

    for (const email of recentEmails) {
      if (email.from?.address) {
        addContact(email.from.address, email.from.name);
      }
      if (Array.isArray(email.to)) {
        for (const t of email.to) {
          if (typeof t === 'string') addContact(t);
          else if (t?.address) addContact(t.address, t.name);
        }
      }
      if (Array.isArray(email.cc)) {
        for (const c of email.cc) {
          if (typeof c === 'string') addContact(c);
          else if (c?.address) addContact(c.address, c.name);
        }
      }
      if (Array.isArray(email.bcc)) {
        for (const b of email.bcc) {
          if (typeof b === 'string') addContact(b);
          else if (b?.address) addContact(b.address, b.name);
        }
      }
    }

    const contacts = Array.from(contactMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      .map(({ email, name }) => ({ email, name }));

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Error al obtener contactos' }, { status: 500 });
  }
}
