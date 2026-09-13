import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { PREDEFINED_TEMPLATES } from '@/lib/templates';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function getAuthenticatedUser(request: NextRequest): Promise<{ success: boolean; email?: string; errorResponse?: NextResponse }> {
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

    return { success: true, email };
  } catch (err) {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

// GET: Return predefined templates + user's custom templates
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { db } = await connectToDatabase();
    const customDocs = await db
      .collection('templates')
      .find({ userEmail: auth.email })
      .sort({ createdAt: -1 })
      .toArray();

    const custom = customDocs.map(doc => ({
      id: doc._id.toString(),
      title: doc.title,
      subject: doc.subject || '',
      bodyHtml: doc.bodyHtml,
      isCustom: true,
      createdAt: doc.createdAt,
    }));

    return NextResponse.json({
      predefined: PREDEFINED_TEMPLATES,
      custom,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 });
  }
}

// POST: Create a custom template for the authenticated user
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { title, subject, bodyHtml } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'El título de la plantilla es obligatorio' }, { status: 400 });
    }

    if (!bodyHtml || typeof bodyHtml !== 'string' || !bodyHtml.trim()) {
      return NextResponse.json({ error: 'El contenido de la plantilla es obligatorio' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const newTemplate = {
      userEmail: auth.email,
      title: title.trim(),
      subject: (subject || '').trim(),
      bodyHtml: bodyHtml.trim(),
      createdAt: new Date(),
    };

    const result = await db.collection('templates').insertOne(newTemplate);

    return NextResponse.json({
      success: true,
      template: {
        id: result.insertedId.toString(),
        ...newTemplate,
        isCustom: true,
      },
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Error al guardar la plantilla' }, { status: 500 });
  }
}

// DELETE: Delete a user's custom template
export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID de plantilla inválido' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('templates').deleteOne({
      _id: new ObjectId(id),
      userEmail: auth.email,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Error al eliminar la plantilla' }, { status: 500 });
  }
}
