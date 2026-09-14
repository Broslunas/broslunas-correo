import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function GET(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userEmail = (payload.email as string || '').trim().toLowerCase();

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const addresses = user.assignedAddresses || [];
    const isFull = addresses.includes('*');

    const userFilter = isFull ? {} : {
      $or: [
        { 'from.address': { $in: addresses } },
        { 'to.address': { $in: addresses } },
        { to: { $in: addresses } }
      ]
    };

    const emailCount = await db.collection('emails').countDocuments(userFilter);

    const userAttAgg = await db.collection('emails').aggregate([
      { $match: userFilter },
      { $unwind: '$attachments' },
      { $group: { _id: null, totalBytes: { $sum: '$attachments.size' } } }
    ]).toArray();
    const attachmentsBytes = userAttAgg[0]?.totalBytes || 0;

    const usedBytes = (emailCount * 2048) + attachmentsBytes;
    const storageLimitMB = user.storageLimitMB || 1024; // Default 1 GB (1024 MB)
    const limitBytes = storageLimitMB * 1024 * 1024;
    const percent = Math.min(100, Number(((usedBytes / limitBytes) * 100).toFixed(1)));

    return NextResponse.json({
      usedBytes,
      limitBytes,
      storageLimitMB,
      percent,
      emailCount,
      attachmentsBytes
    });
  } catch (error) {
    console.error('Error calculating user storage:', error);
    return NextResponse.json({ error: 'Error al calcular cuota' }, { status: 500 });
  }
}
