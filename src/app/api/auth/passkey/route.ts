import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { jwtVerify } from 'jose';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// GET: List all passkeys for the logged in user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('webmail_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const passkeys = await db.collection('passkeys')
      .find({ userEmail: email })
      .project({ credentialPublicKey: 0 }) // Do not expose the public key to the frontend
      .toArray();

    return NextResponse.json({ success: true, passkeys });
  } catch (error) {
    console.error('Error listing passkeys:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Delete a passkey by ID
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('webmail_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'El ID de la llave de paso es obligatorio' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Verify that the passkey belongs to the user before deleting
    const passkey = await db.collection('passkeys').findOne({ 
      _id: new ObjectId(id),
      userEmail: email 
    });

    if (!passkey) {
      return NextResponse.json({ error: 'Llave de paso no encontrada o no pertenece a tu cuenta' }, { status: 404 });
    }

    await db.collection('passkeys').deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true, message: 'Llave de paso eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting passkey:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
