import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

function extractOTP(text: string): string | null {
  if (!text) return null;
  // Match 4-8 digit codes, optionally spaced
  const match = text.match(/\b(\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d?[\s-]?\d?[\s-]?\d?[\s-]?\d?)\b/);
  if (!match) return null;
  const cleaned = match[1].replace(/[\s-]/g, '');
  if (cleaned.length >= 4 && cleaned.length <= 8) return cleaned;
  return null;
}

// GET: List temp emails for an address, or get a single email by id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = (searchParams.get('address') || '').trim().toLowerCase();
    const id = searchParams.get('id');

    const { db } = await connectToDatabase();

    // Fetch single email by id
    if (id) {
      let objectId: ObjectId;
      try { objectId = new ObjectId(id); } catch {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
      }
      const email = await db.collection('emails').findOne({
        _id: objectId,
        folder: 'temp_mail',
      });
      if (!email) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json({ email });
    }

    if (!address || address.length < 5) {
      return NextResponse.json({ error: 'Dirección inválida' }, { status: 400 });
    }

    // Verify the session exists
    const session = await db.collection('temp_mail_sessions').findOne({ address });
    if (!session) {
      return NextResponse.json({ error: 'Sesión expirada o inexistente' }, { status: 404 });
    }

    // Fetch emails for this alias
    const emails = await db
      .collection('emails')
      .find({ folder: 'temp_mail', to: address })
      .sort({ date: -1 })
      .limit(50)
      .toArray();

    // Enrich with OTP extraction (from plain text body)
    const enriched = emails.map((email: any) => ({
      id: email._id.toString(),
      from: email.from?.address
        ? `${email.from.name ? email.from.name + ' ' : ''}<${email.from.address}>`
        : 'Desconocido',
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      subject: email.subject || '(Sin Asunto)',
      text: email.body?.text?.substring(0, 200) || '',
      html: email.body?.html || '',
      date: email.date instanceof Date ? email.date.toISOString() : email.date,
      attachments: (email.attachments || []).map((a: any) => ({
        filename: a.filename,
        mimeType: a.contentType,
        size: a.size,
        r2Url: a.r2Url,
      })),
      otp: extractOTP(email.body?.text || ''),
    }));

    return NextResponse.json({ emails: enriched });
  } catch (error) {
    console.error('Error fetching temp emails:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Remove a single temp email (requires sessionToken for security)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const sessionToken = searchParams.get('sessionToken') || '';
    const address = (searchParams.get('address') || '').trim().toLowerCase();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Verify the session
    const sessionQuery = sessionToken ? { sessionToken } : { address };
    const session = await db.collection('temp_mail_sessions').findOne(sessionQuery);
    if (!session) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 403 });
    }

    let objectId: ObjectId;
    try { objectId = new ObjectId(id); } catch {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const result = await db.collection('emails').deleteOne({
      _id: objectId,
      folder: 'temp_mail',
      to: session.address,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Correo no encontrado o no autorizado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting temp email:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
