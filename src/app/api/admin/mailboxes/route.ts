import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// Helper to authenticate request and verify if the caller is an admin
async function verifyAdminSession(request: NextRequest): Promise<{ success: boolean; email?: string; errorResponse?: NextResponse }> {
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

// GET: Retrieve list of all registered mailboxes (admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { db } = await connectToDatabase();
    
    // Ensure unique index on email
    await db.collection('mailboxes').createIndex({ email: 1 }, { unique: true }).catch(() => {});

    const mailboxes = await db.collection('mailboxes')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const mappedMailboxes = mailboxes.map(m => ({
      _id: m._id.toString(),
      email: m.email,
      name: m.name,
      addedBy: m.addedBy || 'System',
      createdAt: m.createdAt
    }));

    return NextResponse.json({ mailboxes: mappedMailboxes });
  } catch (error) {
    console.error('Error fetching mailboxes in API:', error);
    return NextResponse.json({ error: 'Error al recuperar la lista de cuentas de correo' }, { status: 500 });
  }
}

// POST: Register a new mailbox (admin only)
export async function POST(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { email, name } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'La dirección de correo electrónico es obligatoria y debe ser válida' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del remitente es obligatorio' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const domain = cleanEmail.split('@')[1];

    const { db } = await connectToDatabase();

    // Verify if the domain is authorized in the domains collection
    const domainDoc = await db.collection('domains').findOne({ domain });
    if (!domainDoc) {
      return NextResponse.json({
        error: `El dominio del correo (${domain}) no está autorizado en el sistema. Regístralo en la pestaña de dominios primero.`
      }, { status: 400 });
    }

    // Check if mailbox already exists
    const existingMailbox = await db.collection('mailboxes').findOne({ email: cleanEmail });
    if (existingMailbox) {
      return NextResponse.json({ error: 'Esta cuenta de correo ya está registrada.' }, { status: 409 });
    }

    const newMailboxDoc = {
      email: cleanEmail,
      name: cleanName,
      addedBy: auth.email,
      createdAt: new Date()
    };

    const result = await db.collection('mailboxes').insertOne(newMailboxDoc);

    return NextResponse.json({
      success: true,
      message: 'Cuenta de correo registrada correctamente',
      mailboxId: result.insertedId
    });
  } catch (error) {
    console.error('Error creating mailbox in API:', error);
    return NextResponse.json({ error: 'Error interno al registrar la cuenta de correo' }, { status: 500 });
  }
}

// DELETE: Unregister a mailbox (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'La dirección de correo electrónico es obligatoria' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const { db } = await connectToDatabase();
    
    const result = await db.collection('mailboxes').deleteOne({ email: cleanEmail });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Cuenta de correo no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta de correo eliminada correctamente'
    });
  } catch (error) {
    console.error('Error deleting mailbox in API:', error);
    return NextResponse.json({ error: 'Error interno al eliminar la cuenta de correo' }, { status: 500 });
  }
}
