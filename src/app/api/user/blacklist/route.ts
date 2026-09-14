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

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ blacklist: user.blockedSenders || [] });
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ error: 'Error al consultar lista de bloqueados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userEmail = (payload.email as string || '').trim().toLowerCase();

    const body = await request.json();
    const emailToBlock = (body.email as string || '').trim().toLowerCase();

    if (!emailToBlock || !emailToBlock.includes('@')) {
      return NextResponse.json({ error: 'Dirección de correo inválida' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection('users').updateOne(
      { email: userEmail },
      { $addToSet: { blockedSenders: emailToBlock } as any }
    );

    return NextResponse.json({ success: true, blockedEmail: emailToBlock });
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    return NextResponse.json({ error: 'Error al bloquear remitente' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userEmail = (payload.email as string || '').trim().toLowerCase();

    const body = await request.json();
    const emailToUnblock = (body.email as string || '').trim().toLowerCase();

    if (!emailToUnblock) {
      return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection('users').updateOne(
      { email: userEmail },
      { $pull: { blockedSenders: emailToUnblock } as any }
    );

    return NextResponse.json({ success: true, unblockedEmail: emailToUnblock });
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    return NextResponse.json({ error: 'Error al desbloquear remitente' }, { status: 500 });
  }
}
