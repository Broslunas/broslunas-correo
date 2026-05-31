import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function verifyAdminSession(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return { success: false, errorResponse: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    const { db } = await connectToDatabase();
    const callerUser = await db.collection('users').findOne({ email });
    if (!callerUser || callerUser.role !== 'admin') {
      return { success: false, errorResponse: NextResponse.json({ error: 'No autorizado. Permisos de administrador requeridos.' }, { status: 403 }) };
    }
    return { success: true, email };
  } catch (err) {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

// GET: Retrieve list of all invitations (admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { db } = await connectToDatabase();
    const invitations = await db.collection('invitations')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Error al recuperar la lista de invitaciones' }, { status: 500 });
  }
}

// POST: Generate a new invitation (admin only)
export async function POST(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { role, assignedAddresses, require2FA } = body;

    const cleanRole = role === 'admin' ? 'admin' : 'user';
    const cleanAddresses = Array.isArray(assignedAddresses)
      ? assignedAddresses.map((addr: string) => addr.trim().toLowerCase()).filter(Boolean)
      : [];

    if (cleanAddresses.length === 0) {
      return NextResponse.json({ error: 'Debes asignar al menos una dirección o usar "*" para acceso total.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Verify domains if not '*'
    if (!cleanAddresses.includes('*')) {
      const domainsToCheck = Array.from(new Set(cleanAddresses.map(addr => addr.split('@')[1]).filter(Boolean)));
      const allowedDomains = await db.collection('domains').find({ domain: { $in: domainsToCheck } }).toArray();
      const allowedDomainNames = new Set(allowedDomains.map(d => d.domain.toLowerCase()));
      const unallowedDomains = domainsToCheck.filter(domain => !allowedDomainNames.has(domain));
      if (unallowedDomains.length > 0) {
        return NextResponse.json({ 
          error: `Los siguientes dominios no están autorizados en el sistema: ${unallowedDomains.join(', ')}` 
        }, { status: 400 });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = {
      token,
      role: cleanRole,
      assignedAddresses: cleanAddresses,
      require2FA: require2FA === true,
      createdBy: auth.email,
      used: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    await db.collection('invitations').insertOne(invitation);

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Error interno al generar la invitación' }, { status: 500 });
  }
}

// DELETE: Revoke/delete an invitation (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de invitación obligatorio' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('invitations').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Invitación eliminada con éxito' });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json({ error: 'Error interno al eliminar la invitación' }, { status: 500 });
  }
}
