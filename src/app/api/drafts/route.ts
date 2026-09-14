import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getAuthenticatedUser(request: NextRequest): Promise<{ success: boolean; email?: string; assignedAddresses?: string[]; errorResponse?: NextResponse }> {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return { success: false, errorResponse: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return { success: false, errorResponse: NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 }) };
    }

    const rawAssigned: any[] = user.assignedAddresses || [];
    const assignedAddresses = rawAssigned
      .map(a => (typeof a === 'string' ? a.trim().toLowerCase() : ''))
      .filter(Boolean);

    return {
      success: true,
      email,
      assignedAddresses,
    };
  } catch (err) {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

// POST: Create a new draft
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  const assignedAddresses = auth.assignedAddresses!;

  try {
    const body = await request.json().catch(() => ({}));
    const { from, to, cc, bcc, subject, bodyHtml, bodyText, attachments, inReplyTo, references } = body;

    if (!from || typeof from !== 'string' || !from.includes('@')) {
      return NextResponse.json({ error: 'La dirección del remitente es requerida' }, { status: 400 });
    }

    const cleanFrom = from.trim().toLowerCase();

    // Verify user authorization for this address
    if (!assignedAddresses.includes('*') && !assignedAddresses.includes(cleanFrom)) {
      return NextResponse.json({ error: 'No autorizado para esta dirección' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const mailbox = await db.collection('mailboxes').findOne({ email: cleanFrom });
    const fromName = (body.fromName as string)?.trim() || mailbox?.name || cleanFrom.split('@')[0];

    const draftDoc: Record<string, any> = {
      from: {
        name: fromName,
        address: cleanFrom
      },
      to: to || [],
      cc: cc || [],
      bcc: bcc || [],
      subject: subject || '',
      date: new Date(),
      body: {
        text: bodyText || '',
        html: bodyHtml || ''
      },
      attachments: attachments || [],
      folder: 'drafts',
      isRead: true,
      ...(inReplyTo ? { inReplyTo } : {}),
      ...(references ? { references } : {}),
    };

    const result = await db.collection('emails').insertOne(draftDoc);

    return NextResponse.json({
      success: true,
      draftId: result.insertedId.toString()
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ error: 'Error al crear el borrador' }, { status: 500 });
  }
}

// PUT: Update an existing draft
export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  const assignedAddresses = auth.assignedAddresses!;

  try {
    const body = await request.json().catch(() => ({}));
    const { id, from, to, cc, bcc, subject, bodyHtml, bodyText, attachments, inReplyTo, references } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID de borrador inválido' }, { status: 400 });
    }

    if (!from || typeof from !== 'string' || !from.includes('@')) {
      return NextResponse.json({ error: 'La dirección del remitente es requerida' }, { status: 400 });
    }

    const cleanFrom = from.trim().toLowerCase();

    // Verify user authorization for this address
    if (!assignedAddresses.includes('*') && !assignedAddresses.includes(cleanFrom)) {
      return NextResponse.json({ error: 'No autorizado para esta dirección' }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Double check that the draft belongs to the allowed addresses of the user
    const draftQuery: any = { _id: new ObjectId(id), folder: 'drafts' };
    if (!assignedAddresses.includes('*')) {
      const addressRegexes = assignedAddresses.map(a => new RegExp(`^${escapeRegex(a)}$`, 'i'));
      draftQuery['from.address'] = { $in: addressRegexes };
    }

    const draft = await db.collection('emails').findOne(draftQuery);
    if (!draft) {
      return NextResponse.json({ error: 'Borrador no encontrado o no autorizado' }, { status: 404 });
    }

    const mailbox = await db.collection('mailboxes').findOne({ email: cleanFrom });
    const fromName = (body.fromName as string)?.trim() || mailbox?.name || cleanFrom.split('@')[0];

    const updateFields: Record<string, any> = {
      from: {
        name: fromName,
        address: cleanFrom
      },
      to: to || [],
      cc: cc || [],
      bcc: bcc || [],
      subject: subject || '',
      date: new Date(),
      body: {
        text: bodyText || '',
        html: bodyHtml || ''
      },
      attachments: attachments || [],
      ...(inReplyTo !== undefined ? { inReplyTo: inReplyTo || null } : {}),
      ...(references !== undefined ? { references: references || null } : {}),
    };

    await db.collection('emails').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json({ error: 'Error al actualizar el borrador' }, { status: 500 });
  }
}

// DELETE: Delete a draft
export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  const assignedAddresses = auth.assignedAddresses!;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de borrador inválido' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const query: any = { _id: new ObjectId(id), folder: 'drafts' };
    if (!assignedAddresses.includes('*')) {
      const addressRegexes = assignedAddresses.map(a => new RegExp(`^${escapeRegex(a)}$`, 'i'));
      query['from.address'] = { $in: addressRegexes };
    }

    const result = await db.collection('emails').deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Borrador no encontrado o no autorizado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Error al eliminar el borrador' }, { status: 500 });
  }
}
