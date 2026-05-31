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

// GET: Retrieve list of all allowed domains (admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { db } = await connectToDatabase();
    
    // Ensure unique index on domain
    await db.collection('domains').createIndex({ domain: 1 }, { unique: true }).catch(() => {});

    const domains = await db.collection('domains')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const mappedDomains = domains.map(d => ({
      _id: d._id.toString(),
      domain: d.domain,
      addedBy: d.addedBy || 'System',
      createdAt: d.createdAt
    }));

    return NextResponse.json({ domains: mappedDomains });
  } catch (error) {
    console.error('Error fetching domains in API:', error);
    return NextResponse.json({ error: 'Error al recuperar la lista de dominios' }, { status: 500 });
  }
}

// POST: Add a new allowed domain (admin only)
export async function POST(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'El nombre de dominio es obligatorio' }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase();
    
    // Simple regex validation for domain names
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json({ error: 'Formato de dominio inválido (ej: midominio.com)' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if domain already exists
    const existingDomain = await db.collection('domains').findOne({ domain: cleanDomain });
    if (existingDomain) {
      return NextResponse.json({ error: 'El dominio ya está registrado en el sistema.' }, { status: 409 });
    }

    const newDomainDoc = {
      domain: cleanDomain,
      addedBy: auth.email,
      createdAt: new Date()
    };

    const result = await db.collection('domains').insertOne(newDomainDoc);

    return NextResponse.json({
      success: true,
      message: 'Dominio agregado correctamente',
      domainId: result.insertedId
    });
  } catch (error) {
    console.error('Error creating domain in API:', error);
    return NextResponse.json({ error: 'Error interno al agregar el dominio' }, { status: 500 });
  }
}

// DELETE: Remove an allowed domain (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'El nombre de dominio es obligatorio' }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase();

    const { db } = await connectToDatabase();

    // Warn if domain is still in use by checking user collections
    // (assignedAddresses containing cleanDomain or ending with '@' + cleanDomain)
    const usersWithDomain = await db.collection('users').find({
      assignedAddresses: {
        $elemMatch: {
          $regex: `@${cleanDomain}$`,
          $options: 'i'
        }
      }
    }).toArray();

    if (usersWithDomain.length > 0) {
      const userEmails = usersWithDomain.map(u => u.email).join(', ');
      return NextResponse.json({
        error: `No se puede eliminar el dominio porque está siendo usado por las direcciones asignadas de los siguientes usuarios: ${userEmails}. Revoque o edite sus accesos primero.`
      }, { status: 400 });
    }

    const result = await db.collection('domains').deleteOne({ domain: cleanDomain });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Dominio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Dominio eliminado correctamente'
    });
  } catch (error) {
    console.error('Error deleting domain in API:', error);
    return NextResponse.json({ error: 'Error interno al eliminar el dominio' }, { status: 500 });
  }
}
