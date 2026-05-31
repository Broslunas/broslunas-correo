import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function authenticateSession(request: NextRequest): Promise<{ success: boolean; email?: string; errorResponse?: NextResponse }> {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return { success: false, errorResponse: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    return { success: true, email };
  } catch (err) {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

// GET: Returns the public VAPID key to the client
export async function GET(request: NextRequest) {
  const auth = await authenticateSession(request);
  if (!auth.success) return auth.errorResponse!;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'Claves VAPID no configuradas en el servidor' }, { status: 500 });
  }

  return NextResponse.json({ publicKey });
}

// POST: Subscribe / Unsubscribe a client device
export async function POST(request: NextRequest) {
  const auth = await authenticateSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { subscription, action } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Ensure unique index on endpoint
    await db.collection('push_subscriptions').createIndex({ "subscription.endpoint": 1 }, { unique: true }).catch(() => {});

    if (action === 'unsubscribe') {
      const result = await db.collection('push_subscriptions').deleteOne({
        "subscription.endpoint": subscription.endpoint
      });
      return NextResponse.json({ success: true, message: 'Dispositivo desuscrito correctamente', deletedCount: result.deletedCount });
    } else {
      const userAgent = request.headers.get('user-agent') || '';
      
      const newSubDoc = {
        userId: auth.email,
        subscription,
        userAgent,
        createdAt: new Date()
      };

      await db.collection('push_subscriptions').updateOne(
        { "subscription.endpoint": subscription.endpoint },
        { $set: newSubDoc },
        { upsert: true }
      );

      return NextResponse.json({ success: true, message: 'Dispositivo suscrito correctamente' });
    }
  } catch (error) {
    console.error('Error in Push Subscribe API:', error);
    return NextResponse.json({ error: 'Error interno al registrar la suscripción' }, { status: 500 });
  }
}
