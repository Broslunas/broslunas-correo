import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TEMP_MAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getAllowedDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_TEMPMAIL_DOMAINS || '';
  return raw.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
}

// POST: Create a new temp mail session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { address: requestedAddress } = body;

    const { db } = await connectToDatabase();

    // Ensure TTL index exists
    await db.collection('temp_mail_sessions')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch(() => {});

    const allowedDomains = getAllowedDomains();
    let address = (requestedAddress || '').trim().toLowerCase();

    // Validate the address domain
    if (address && allowedDomains.length > 0) {
      const domain = address.split('@')[1];
      if (!domain || !allowedDomains.includes(domain)) {
        return NextResponse.json({ error: 'Dominio no permitido' }, { status: 400 });
      }
    }

    if (!address) {
      return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TEMP_MAIL_TTL_MS);

    // Upsert session (create or refresh)
    const sessionToken = crypto.randomUUID();
    await db.collection('temp_mail_sessions').updateOne(
      { address },
      {
        $set: {
          address,
          expiresAt,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          sessionToken,
        }
      },
      { upsert: true }
    );

    // Fetch the actual session (to get the original sessionToken if already existed)
    const session = await db.collection('temp_mail_sessions').findOne({ address });

    return NextResponse.json({
      address: session!.address,
      expiresAt: session!.expiresAt,
      sessionToken: session!.sessionToken,
      createdAt: session!.createdAt,
    });
  } catch (error) {
    console.error('Error creating temp mail session:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// GET: Verify a session exists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = (searchParams.get('address') || '').trim().toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const session = await db.collection('temp_mail_sessions').findOne({ address });

    if (!session) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      address: session.address,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Error checking temp mail session:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Destroy a session and its emails
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken') || '';
    const address = (searchParams.get('address') || '').trim().toLowerCase();

    if (!sessionToken && !address) {
      return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Find the session by token or address
    const query = sessionToken ? { sessionToken } : { address };
    const session = await db.collection('temp_mail_sessions').findOne(query);

    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    const sessionAddress = session.address;

    // Delete all temp emails for this address
    const emailResult = await db.collection('emails').deleteMany({
      folder: 'temp_mail',
      to: sessionAddress,
    });

    // Delete the session
    await db.collection('temp_mail_sessions').deleteOne({ _id: session._id });

    return NextResponse.json({
      success: true,
      deletedEmails: emailResult.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting temp mail session:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
