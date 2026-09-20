import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { SharedEmailRecord } from '@/lib/types/email-features';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, 'hex');
    return timingSafeEqual(computed, stored);
  } catch {
    return false;
  }
}

// POST: Create a new shareable link
export async function POST(request: NextRequest) {
  const tokenCookie = request.cookies.get('webmail_session')?.value;
  if (!tokenCookie) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(tokenCookie, JWT_SECRET);
    const userEmail = (payload.email as string || '').trim().toLowerCase();

    const body = await request.json();
    const { emailId, expiresInDays, password, hideSensitive, allowAttachments } = body;

    if (!emailId) {
      return NextResponse.json({ error: 'ID de correo requerido' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const email = await db.collection('emails').findOne({ _id: new ObjectId(emailId) });
    if (!email) {
      return NextResponse.json({ error: 'Correo no encontrado' }, { status: 404 });
    }

    const shareToken = randomBytes(24).toString('hex');
    const expiresAt = expiresInDays && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    let passwordHash: string | undefined;
    let passwordSalt: string | undefined;
    if (password && password.trim()) {
      const hp = hashPassword(password.trim());
      passwordHash = hp.hash;
      passwordSalt = hp.salt;
    }

    const record: SharedEmailRecord = {
      token: shareToken,
      emailId,
      creatorEmail: userEmail,
      expiresAt,
      passwordHash,
      passwordSalt,
      hideSensitive: !!hideSensitive,
      allowAttachments: allowAttachments !== false,
      views: 0,
      createdAt: new Date(),
      revoked: false,
    };

    await db.collection('shared_emails').insertOne(record);

    return NextResponse.json({
      success: true,
      token: shareToken,
      shareUrl: `/share/${shareToken}`,
      expiresAt,
      hasPassword: !!passwordHash,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al generar enlace' }, { status: 500 });
  }
}

// GET: Retrieve shared email details (public or password-protected)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const password = request.headers.get('x-share-password') || searchParams.get('password') || '';

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const shareRecord = await db.collection<SharedEmailRecord>('shared_emails').findOne({ token });

    if (!shareRecord || shareRecord.revoked) {
      return NextResponse.json({ error: 'Enlace no válido o revocado' }, { status: 404 });
    }

    if (shareRecord.expiresAt && new Date(shareRecord.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Este enlace ha expirado' }, { status: 410 });
    }

    if (shareRecord.passwordHash && shareRecord.passwordSalt) {
      if (!password || !verifyPassword(password, shareRecord.passwordHash, shareRecord.passwordSalt)) {
        return NextResponse.json({
          requiresPassword: true,
          error: password ? 'Contraseña incorrecta' : 'Este enlace está protegido por contraseña',
        }, { status: 401 });
      }
    }

    // Increment views
    await db.collection('shared_emails').updateOne({ _id: (shareRecord as any)._id }, { $inc: { views: 1 } });

    const email = await db.collection('emails').findOne({ _id: new ObjectId(shareRecord.emailId) });
    if (!email) {
      return NextResponse.json({ error: 'El correo original ya no existe' }, { status: 404 });
    }

    const maskEmail = (addr: string) => {
      const [name, domain] = addr.split('@');
      if (!domain) return '***';
      return `${name.slice(0, 2)}***@${domain}`;
    };

    const sanitizedEmail = {
      subject: email.subject,
      date: email.date,
      from: {
        name: email.from?.name || '',
        address: shareRecord.hideSensitive ? maskEmail(email.from?.address || '') : email.from?.address || '',
      },
      to: shareRecord.hideSensitive ? email.to?.map(maskEmail) : email.to,
      body: email.body,
      attachments: shareRecord.allowAttachments ? email.attachments : [],
    };

    return NextResponse.json({
      success: true,
      email: sanitizedEmail,
      expiresAt: shareRecord.expiresAt,
      views: shareRecord.views + 1,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al obtener correo compartido' }, { status: 500 });
  }
}
