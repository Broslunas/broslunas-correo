import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// Helper to authenticate session and retrieve user permissions in real-time
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

    return {
      success: true,
      email,
      assignedAddresses: user.assignedAddresses || [],
    };
  } catch (err) {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

// GET: Retrieve a list of emails filtered by folder, search query, and user's assigned addresses
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  const assignedAddresses = auth.assignedAddresses!;

  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const searchQuery = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 30; // Max items per page
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();

    // Build compound query using $and to join filters safely
    const andClauses: any[] = [];

    // 1. Folder condition
    andClauses.push({ folder });

    // 2. Access limit condition (Skip if user has wildcard access "*")
    if (!assignedAddresses.includes('*')) {
      if (folder === 'sent') {
        // Can only view emails sent from their assigned addresses
        andClauses.push({ 'from.address': { $in: assignedAddresses } });
      } else {
        // Can only view emails received by their assigned addresses (to, cc, bcc)
        andClauses.push({
          $or: [
            { to: { $in: assignedAddresses } },
            { cc: { $in: assignedAddresses } },
            { bcc: { $in: assignedAddresses } }
          ]
        });
      }
    }

    // 3. Search query condition (if provided)
    if (searchQuery) {
      const regex = new RegExp(searchQuery, 'i');
      andClauses.push({
        $or: [
          { subject: regex },
          { 'body.text': regex },
          { 'from.name': regex },
          { 'from.address': regex },
          { to: regex }
        ]
      });
    }

    const query = { $and: andClauses };

    // Execute query with sorting (newest first) and pagination
    const emails = await db
      .collection('emails')
      .find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination calculations
    const totalCount = await db.collection('emails').countDocuments(query);

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching emails in API:', error);
    return NextResponse.json({ error: 'Error al recuperar los correos' }, { status: 500 });
  }
}

// PATCH: Update properties of multiple emails (only those the user is allowed to access)
export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  const assignedAddresses = auth.assignedAddresses!;

  try {
    const body = await request.json().catch(() => ({}));
    const { ids, folder, isRead } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const objectIds = ids.map(id => new ObjectId(id));

    const updateFields: any = {};
    if (folder !== undefined) updateFields.folder = folder;
    if (isRead !== undefined) updateFields.isRead = isRead;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    // Build query with security restriction
    const updateQuery: any = { _id: { $in: objectIds } };

    if (!assignedAddresses.includes('*')) {
      updateQuery.$or = [
        { to: { $in: assignedAddresses } },
        { cc: { $in: assignedAddresses } },
        { bcc: { $in: assignedAddresses } },
        { 'from.address': { $in: assignedAddresses } }
      ];
    }

    const result = await db.collection('emails').updateMany(
      updateQuery,
      { $set: updateFields }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating emails in API:', error);
    return NextResponse.json({ error: 'Error al actualizar los correos' }, { status: 500 });
  }
}

// DELETE: Permanently delete emails (only those the user is allowed to access)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  const assignedAddresses = auth.assignedAddresses!;

  try {
    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const objectIds = ids.map(id => new ObjectId(id));

    // Build query with security restriction
    const deleteQuery: any = { _id: { $in: objectIds } };

    if (!assignedAddresses.includes('*')) {
      deleteQuery.$or = [
        { to: { $in: assignedAddresses } },
        { cc: { $in: assignedAddresses } },
        { bcc: { $in: assignedAddresses } },
        { 'from.address': { $in: assignedAddresses } }
      ];
    }

    const result = await db.collection('emails').deleteMany(deleteQuery);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting emails in API:', error);
    return NextResponse.json({ error: 'Error al eliminar los correos' }, { status: 500 });
  }
}
