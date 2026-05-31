import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET: Retrieve a list of emails with optional folder filtering, searching, and pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const searchQuery = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 30; // Max items per page
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();

    // Build query filter
    const query: any = { folder };

    if (searchQuery) {
      // Create case-insensitive regex searches on multiple text fields
      const regex = new RegExp(searchQuery, 'i');
      query.$or = [
        { subject: regex },
        { 'body.text': regex },
        { 'from.name': regex },
        { 'from.address': regex },
        { to: regex }
      ];
    }

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

// PATCH: Update properties of multiple emails (e.g. folder, read/unread status)
export async function PATCH(request: Request) {
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

    const result = await db.collection('emails').updateMany(
      { _id: { $in: objectIds } },
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

// DELETE: Permanently delete emails
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const objectIds = ids.map(id => new ObjectId(id));

    const result = await db.collection('emails').deleteMany({
      _id: { $in: objectIds }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting emails in API:', error);
    return NextResponse.json({ error: 'Error al eliminar los correos' }, { status: 500 });
  }
}
