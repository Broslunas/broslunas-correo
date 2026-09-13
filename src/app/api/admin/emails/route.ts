import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { deleteR2Objects } from '@/lib/r2';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function verifyAdminSession(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) return { success: false, errorResponse: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });
    if (!user || user.role !== 'admin') {
      return { success: false, errorResponse: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
    }
    return { success: true, email };
  } catch {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

// GET: Search / list emails across all mailboxes for administration
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const mailbox = searchParams.get('mailbox');
    const search = searchParams.get('search')?.trim();
    const olderThanDays = searchParams.get('olderThanDays');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10));

    const query: any = {};

    if (folder) query.folder = folder;
    if (mailbox) {
      query.$or = [
        { 'from.address': mailbox.toLowerCase() },
        { 'to.address': mailbox.toLowerCase() }
      ];
    }

    if (olderThanDays) {
      const days = parseInt(olderThanDays, 10);
      if (!isNaN(days) && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query.date = { $lte: cutoffDate };
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { subject: searchRegex },
        { 'from.address': searchRegex },
        { 'from.name': searchRegex },
        { 'to.address': searchRegex }
      ];
    }

    const { db } = await connectToDatabase();
    const total = await db.collection('emails').countDocuments(query);
    const emails = await db.collection('emails')
      .find(query, {
        projection: {
          _id: 1,
          from: 1,
          to: 1,
          subject: 1,
          date: 1,
          folder: 1,
          attachments: 1,
          isRead: 1
        }
      })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      total,
      emails: emails.map(e => ({
        ...e,
        _id: e._id.toString(),
        attachmentCount: e.attachments?.length || 0,
        attachmentTotalBytes: e.attachments?.reduce((sum: number, a: any) => sum + (a.size || 0), 0) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return NextResponse.json({ error: 'Error al buscar correos' }, { status: 500 });
  }
}

// DELETE: Bulk purge emails and cleanup R2 attachments
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const { folder, olderThanDays, ids } = body;

    const query: any = {};

    if (Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids.map(id => new ObjectId(id)) };
    } else {
      if (!folder && !olderThanDays) {
        return NextResponse.json({ error: 'Debes especificar carpeta, antigüedad o IDs específicos para purgar' }, { status: 400 });
      }

      if (folder) query.folder = folder;

      if (olderThanDays) {
        const days = parseInt(olderThanDays, 10);
        if (!isNaN(days) && days > 0) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          query.date = { $lte: cutoff };
        }
      }
    }

    const { db } = await connectToDatabase();

    // 1. Find emails to identify attachments to delete from R2
    const targetEmails = await db.collection('emails').find(query, { projection: { attachments: 1 } }).toArray();

    if (targetEmails.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0, freedAttachmentsCount: 0, message: 'No se encontraron correos para purgar' });
    }

    const r2KeysToDelete: string[] = [];
    targetEmails.forEach(email => {
      if (email.attachments && Array.isArray(email.attachments)) {
        email.attachments.forEach((att: any) => {
          if (att.r2Url) r2KeysToDelete.push(att.r2Url);
        });
      }
    });

    // 2. Delete attachments from Cloudflare R2
    if (r2KeysToDelete.length > 0) {
      await deleteR2Objects(r2KeysToDelete);
    }

    // 3. Delete emails from MongoDB
    const deleteResult = await db.collection('emails').deleteMany(query);

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.deletedCount,
      freedAttachmentsCount: r2KeysToDelete.length,
      message: `Se eliminaron ${deleteResult.deletedCount} correos y ${r2KeysToDelete.length} adjuntos`
    });
  } catch (error) {
    console.error('Error purging admin emails:', error);
    return NextResponse.json({ error: 'Error al purgar correos' }, { status: 500 });
  }
}
