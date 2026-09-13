import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

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

// GET: Retrieve list of all authorized users (admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { db } = await connectToDatabase();
    const users = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Map to remove sensitive 2FA secrets from output
    const mappedUsers = users.map(u => ({
      _id: u._id.toString(),
      email: u.email,
      role: u.role,
      twoFactorEnabled: !!u.twoFactorEnabled,
      require2FA: u.require2FA === undefined ? false : !!u.require2FA,
      assignedAddresses: u.assignedAddresses || [],
      storageLimitMB: typeof u.storageLimitMB === 'number' ? u.storageLimitMB : 0,
      dailySendLimit: typeof u.dailySendLimit === 'number' ? u.dailySendLimit : 0,
      status: u.status || 'active',
      addedBy: u.addedBy || 'System',
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    console.error('Error fetching users in API:', error);
    return NextResponse.json({ error: 'Error al recuperar la lista de usuarios' }, { status: 500 });
  }
}

// POST: Add a new authorized user (admin only)
export async function POST(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { email, role, assignedAddresses, require2FA, storageLimitMB, dailySendLimit, status } = body;

    // Validate inputs
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Dirección de correo inválida' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role === 'admin' ? 'admin' : 'user';
    
    // Ensure assignedAddresses is a clean array of strings
    const cleanAddresses = Array.isArray(assignedAddresses)
      ? assignedAddresses.map((addr: string) => addr.trim().toLowerCase()).filter(Boolean)
      : [];

    if (cleanAddresses.length === 0) {
      return NextResponse.json({ error: 'Debes asignar al menos una dirección o usar "*" para acceso total.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Validate that all domains in assignedAddresses (excluding '*') are allowed
    if (cleanAddresses.length > 0 && !cleanAddresses.includes('*')) {
      const domainsToCheck = Array.from(new Set(cleanAddresses.map(addr => addr.split('@')[1]).filter(Boolean)));
      
      // Ensure unique index on domain
      await db.collection('domains').createIndex({ domain: 1 }, { unique: true }).catch(() => {});
      
      const allowedDomains = await db.collection('domains').find({ domain: { $in: domainsToCheck } }).toArray();
      const allowedDomainNames = new Set(allowedDomains.map(d => d.domain.toLowerCase()));
      
      const unallowedDomains = domainsToCheck.filter(domain => !allowedDomainNames.has(domain));
      if (unallowedDomains.length > 0) {
        return NextResponse.json({ 
          error: `Los siguientes dominios no están autorizados en el sistema: ${unallowedDomains.join(', ')}. Registra los dominios en la sección de administración primero.` 
        }, { status: 400 });
      }
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'El usuario ya está registrado en el sistema.' }, { status: 409 });
    }

    // Insert user document
    const newUser = {
      email: cleanEmail,
      role: cleanRole,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      require2FA: require2FA === true,
      assignedAddresses: cleanAddresses,
      storageLimitMB: typeof storageLimitMB === 'number' && storageLimitMB >= 0 ? storageLimitMB : 0,
      dailySendLimit: typeof dailySendLimit === 'number' && dailySendLimit >= 0 ? dailySendLimit : 0,
      status: status === 'suspended' ? 'suspended' : 'active',
      addedBy: auth.email,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);

    // Send welcome email notification (non-blocking)
    try {
      const { sendWelcomeUserEmail } = await import('@/lib/mailjet');
      sendWelcomeUserEmail(cleanEmail, cleanRole, cleanAddresses)
        .catch(err => console.error('Failed to send welcome user email:', err));
    } catch (err) {
      console.error('Error triggering welcome user email:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario agregado correctamente',
      userId: result.insertedId
    });
  } catch (error) {
    console.error('Error creating user in API:', error);
    return NextResponse.json({ error: 'Error interno al agregar el usuario' }, { status: 500 });
  }
}

// PATCH: Update role or assigned addresses of an existing user (admin only)
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { email, role, assignedAddresses, require2FA, storageLimitMB, dailySendLimit, status } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'El correo del usuario es obligatorio' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const updateFields: any = { updatedAt: new Date() };

    if (role === 'admin' || role === 'user') {
      updateFields.role = role;
    }

    if (require2FA !== undefined) {
      updateFields.require2FA = require2FA === true;
    }

    if (typeof storageLimitMB === 'number') {
      updateFields.storageLimitMB = Math.max(0, storageLimitMB);
    }

    if (typeof dailySendLimit === 'number') {
      updateFields.dailySendLimit = Math.max(0, dailySendLimit);
    }

    if (status === 'active' || status === 'suspended') {
      if (cleanEmail === auth.email && status === 'suspended') {
        return NextResponse.json({ error: 'No puedes suspender tu propia cuenta de administrador.' }, { status: 400 });
      }
      updateFields.status = status;
    }

    const { db } = await connectToDatabase();

    if (assignedAddresses && Array.isArray(assignedAddresses)) {
      const cleanAddresses = assignedAddresses.map((addr: string) => addr.trim().toLowerCase()).filter(Boolean);
      if (cleanAddresses.length === 0) {
        return NextResponse.json({ error: 'Debes asignar al menos una dirección o usar "*" para acceso total.' }, { status: 400 });
      }

      // Validate that all domains in assignedAddresses (excluding '*') are allowed
      if (cleanAddresses.length > 0 && !cleanAddresses.includes('*')) {
        const domainsToCheck = Array.from(new Set(cleanAddresses.map(addr => addr.split('@')[1]).filter(Boolean)));
        
        // Ensure unique index on domain
        await db.collection('domains').createIndex({ domain: 1 }, { unique: true }).catch(() => {});
        
        const allowedDomains = await db.collection('domains').find({ domain: { $in: domainsToCheck } }).toArray();
        const allowedDomainNames = new Set(allowedDomains.map(d => d.domain.toLowerCase()));
        
        const unallowedDomains = domainsToCheck.filter(domain => !allowedDomainNames.has(domain));
        if (unallowedDomains.length > 0) {
          return NextResponse.json({ 
            error: `Los siguientes dominios no están autorizados en el sistema: ${unallowedDomains.join(', ')}. Registra los dominios en la sección de administración primero.` 
          }, { status: 400 });
        }
      }

      updateFields.assignedAddresses = cleanAddresses;
    }

    // Prevent administrators from de-admining or altering themselves to avoid locking themselves out
    if (cleanEmail === auth.email && updateFields.role === 'user') {
      return NextResponse.json({ error: 'No puedes degradar tu propio rol de administrador.' }, { status: 400 });
    }

    const result = await db.collection('users').updateOne(
      { email: cleanEmail },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating user in API:', error);
    return NextResponse.json({ error: 'Error interno al actualizar el usuario' }, { status: 500 });
  }
}

// DELETE: Revoke access for a user (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'El correo del usuario es obligatorio' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Prevent administrators from deleting themselves
    if (cleanEmail === auth.email) {
      return NextResponse.json({ error: 'No puedes revocar tu propio acceso de administrador.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('users').deleteOne({ email: cleanEmail });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log(`Administrator ${auth.email} successfully revoked access for email: ${cleanEmail}`);

    // Send revoked email notification (non-blocking)
    try {
      const { sendRevokeUserEmail } = await import('@/lib/mailjet');
      sendRevokeUserEmail(cleanEmail)
        .catch(err => console.error('Failed to send revoke access email:', err));
    } catch (err) {
      console.error('Error triggering revoke access email:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Acceso revocado correctamente'
    });
  } catch (error) {
    console.error('Error deleting user in API:', error);
    return NextResponse.json({ error: 'Error interno al revocar el acceso' }, { status: 500 });
  }
}
