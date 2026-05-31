import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // 1. Authenticate with Ingress Secret
    const authHeader = request.headers.get('Authorization');
    const expectedSecret = process.env.INGRESS_SECRET;

    if (!expectedSecret) {
      console.error('INGRESS_SECRET is not configured on the server.');
      return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      console.warn('Unauthorized access attempt to email ingress endpoint.');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { from, to, cc, bcc, subject, date, bodyText, bodyHtml, attachments } = body;

    // Validate minimum required fields
    if (!from || !from.address) {
      return NextResponse.json({ error: 'La dirección del remitente es obligatoria' }, { status: 400 });
    }

    // 3. Connect to DB
    const { db } = await connectToDatabase();

    // Verify that at least one recipient belongs to an allowed domain in the system
    const recipients = [
      ...(Array.isArray(to) ? to : []),
      ...(Array.isArray(cc) ? cc : []),
      ...(Array.isArray(bcc) ? bcc : [])
    ].map((r: string) => r.trim().toLowerCase());

    const recipientDomains = Array.from(new Set(recipients.map(r => r.split('@')[1]).filter(Boolean)));
    
    // Ensure unique index on domain
    await db.collection('domains').createIndex({ domain: 1 }, { unique: true }).catch(() => {});
    
    const allowedDomains = await db.collection('domains').find({}).toArray();
    const allowedDomainNames = new Set(allowedDomains.map(d => d.domain.toLowerCase()));
    
    if (allowedDomainNames.size > 0) {
      const hasAllowedRecipient = recipientDomains.some(domain => allowedDomainNames.has(domain));
      if (!hasAllowedRecipient) {
        console.warn(`Ingress email rejected: No recipient domains match allowed domains list. Recipient domains: ${recipientDomains.join(', ')}`);
        return NextResponse.json({ error: 'El dominio del destinatario no está permitido en este servidor.' }, { status: 400 });
      }
    }

    // 4. Map attachments to frontend schema (key -> r2Url)
    const formattedAttachments = Array.isArray(attachments)
      ? attachments.map((att: any) => ({
          filename: att.filename || 'adjunto',
          contentType: att.contentType || 'application/octet-stream',
          size: att.size || 0,
          r2Url: att.key || '', // Match client-side UI expectation (r2Url parameter is the S3 key)
        }))
      : [];

    // 5. Build email document
    const incomingEmailDocument = {
      from: {
        name: from.name || '',
        address: from.address.trim().toLowerCase(),
      },
      to: Array.isArray(to) ? to.map((t: string) => t.trim().toLowerCase()) : [],
      cc: Array.isArray(cc) ? cc.map((c: string) => c.trim().toLowerCase()) : [],
      bcc: Array.isArray(bcc) ? bcc.map((b: string) => b.trim().toLowerCase()) : [],
      subject: subject || '(Sin Asunto)',
      date: date ? new Date(date) : new Date(),
      body: {
        text: bodyText || '',
        html: bodyHtml || bodyText || '',
      },
      attachments: formattedAttachments,
      folder: 'inbox',
      isRead: false,
      createdAt: new Date(),
    };

    const result = await db.collection('emails').insertOne(incomingEmailDocument);

    console.log(`Successfully ingested incoming email from ${from.address} with ID: ${result.insertedId}`);

    return NextResponse.json({
      success: true,
      emailId: result.insertedId,
    });
  } catch (error) {
    console.error('Error in Email Ingress API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
