import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { parseSearchQuery } from '@/lib/search-parser';
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
    const id = searchParams.get('id');

    if (id) {
      const { db } = await connectToDatabase();
      const query: any = { _id: new ObjectId(id) };

      if (!assignedAddresses.includes('*')) {
        query.$or = [
          { to: { $in: assignedAddresses } },
          { cc: { $in: assignedAddresses } },
          { bcc: { $in: assignedAddresses } },
          { 'from.address': { $in: assignedAddresses } }
        ];
      }

      const email = await db.collection('emails').findOne(query);
      if (!email) {
        return NextResponse.json({ error: 'Correo no encontrado' }, { status: 404 });
      }

      // If the email has a threadId, retrieve all messages in the thread
      let threadEmails: any[] = [email];
      if (email.threadId) {
        const threadQuery: any = { threadId: email.threadId };
        if (!assignedAddresses.includes('*')) {
          threadQuery.$or = [
            { to: { $in: assignedAddresses } },
            { cc: { $in: assignedAddresses } },
            { bcc: { $in: assignedAddresses } },
            { 'from.address': { $in: assignedAddresses } }
          ];
        }
        threadEmails = await db.collection('emails').find(threadQuery).sort({ date: 1 }).toArray();
      }

      return NextResponse.json({ email, threadEmails });
    }

    const folder = searchParams.get('folder') || 'inbox';
    const searchQuery = searchParams.get('search') || '';
    const account = (searchParams.get('account') || '').trim().toLowerCase();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 30; // Max items per page
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();

    // Security check: if a specific account is requested, verify access
    if (account && !assignedAddresses.includes('*') && !assignedAddresses.includes(account)) {
      return NextResponse.json({ error: 'No autorizado para ver esta cuenta' }, { status: 403 });
    }

    // Build compound query using $and to join filters safely
    const andClauses: any[] = [];

    // 1. Folder condition (handle virtual 'unread' and 'starred' folders)
    if (folder === 'unread') {
      andClauses.push({ isRead: false, folder: { $nin: ['trash', 'spam', 'sent', 'temp_mail'] } });
    } else if (folder === 'starred') {
      andClauses.push({ isStarred: true, folder: { $nin: ['trash', 'spam'] } });
    } else {
      andClauses.push({ folder });
    }

    // 2. Account filter and Access limit conditions
    if (account) {
      // Filter specifically by this account
      if (folder === 'sent') {
        andClauses.push({ 'from.address': account });
      } else {
        andClauses.push({
          $or: [
            { to: account },
            { cc: account },
            { bcc: account }
          ]
        });
      }
    } else if (!assignedAddresses.includes('*')) {
      // Fallback: Limit view to only user's assigned addresses
      if (folder === 'sent' || folder === 'drafts') {
        // Can only view emails sent or drafted from their assigned addresses
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
      const searchClauses = parseSearchQuery(searchQuery);
      if (searchClauses.length > 0) {
        andClauses.push(...searchClauses);
      }
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

    // Enrich emails with thread message counts
    const threadIds = Array.from(new Set(emails.map(e => e.threadId).filter(Boolean)));
    if (threadIds.length > 0) {
      const threadCounts = await db.collection('emails').aggregate([
        { $match: { threadId: { $in: threadIds } } },
        { $group: { _id: '$threadId', count: { $sum: 1 } } }
      ]).toArray();

      const countMap = new Map<string, number>(threadCounts.map(tc => [String(tc._id), tc.count]));
      for (const email of emails) {
        if (email.threadId && countMap.has(email.threadId)) {
          email.threadCount = countMap.get(email.threadId);
        }
      }
    }

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
    const { ids, folder, isRead, isStarred } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const objectIds = ids.map(id => new ObjectId(id));

    const updateFields: any = {};
    if (folder !== undefined) updateFields.folder = folder;
    if (isRead !== undefined) updateFields.isRead = isRead;
    if (isStarred !== undefined) updateFields.isStarred = isStarred;

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
