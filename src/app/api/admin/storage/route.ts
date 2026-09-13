import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

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

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { db } = await connectToDatabase();

    // Global counts and sizes
    const totalEmails = await db.collection('emails').countDocuments({});
    const trashCount = await db.collection('emails').countDocuments({ folder: 'trash' });
    const spamCount = await db.collection('emails').countDocuments({ folder: 'spam' });

    // Attachment totals via aggregation
    const attachmentAgg = await db.collection('emails').aggregate([
      { $unwind: '$attachments' },
      { $group: { _id: null, totalBytes: { $sum: '$attachments.size' }, count: { $sum: 1 } } }
    ]).toArray();
    const totalAttachmentBytes = attachmentAgg[0]?.totalBytes || 0;
    const totalAttachments = attachmentAgg[0]?.count || 0;

    // Database collection stats
    let dbSizeBytes = 0;
    try {
      const stats = await db.command({ collStats: 'emails' });
      dbSizeBytes = stats.size || 0;
    } catch {
      // ponytail: collStats not supported on shared clusters; fallback to approx 4KB per email
      dbSizeBytes = totalEmails * 4096;
    }

    // Per-user breakdown
    const users = await db.collection('users').find({}).toArray();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const userStats = await Promise.all(users.map(async (u) => {
      const addresses = u.assignedAddresses || [];
      const isFull = addresses.includes('*');

      // Email match filter for this user
      const userFilter = isFull ? {} : {
        $or: [
          { 'from.address': { $in: addresses } },
          { 'to.address': { $in: addresses } }
        ]
      };

      const emailCount = await db.collection('emails').countDocuments(userFilter);

      // Aggregate user attachment bytes
      const userAttAgg = await db.collection('emails').aggregate([
        { $match: userFilter },
        { $unwind: '$attachments' },
        { $group: { _id: null, totalBytes: { $sum: '$attachments.size' } } }
      ]).toArray();
      const attachmentsBytes = userAttAgg[0]?.totalBytes || 0;

      // Approximate storage: proportional email body + attachments
      const estimatedBytes = (emailCount * 2048) + attachmentsBytes;

      // Today sent count
      const sentToday = await db.collection('emails').countDocuments({
        ...(isFull ? {} : { 'from.address': { $in: addresses } }),
        folder: 'sent',
        date: { $gte: startOfDay }
      });

      return {
        email: u.email,
        role: u.role,
        status: u.status || 'active',
        storageLimitMB: u.storageLimitMB || 0,
        dailySendLimit: u.dailySendLimit || 0,
        usedBytes: estimatedBytes,
        usedMB: Number((estimatedBytes / (1024 * 1024)).toFixed(2)),
        emailCount,
        sentToday,
        percentUsed: u.storageLimitMB > 0
          ? Math.min(100, Number(((estimatedBytes / (u.storageLimitMB * 1024 * 1024)) * 100).toFixed(1)))
          : null
      };
    }));

    return NextResponse.json({
      global: {
        totalEmails,
        trashCount,
        spamCount,
        totalAttachments,
        totalAttachmentBytes,
        dbSizeBytes,
        totalStorageBytes: dbSizeBytes + totalAttachmentBytes,
        totalStorageMB: Number(((dbSizeBytes + totalAttachmentBytes) / (1024 * 1024)).toFixed(2))
      },
      users: userStats
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    return NextResponse.json({ error: 'Error al calcular almacenamiento' }, { status: 500 });
  }
}
