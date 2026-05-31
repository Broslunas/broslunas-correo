import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Session and Retrieve User Permissions
    const token = request.cookies.get('webmail_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    let userEmail = '';
    let assignedAddresses: string[] = [];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userEmail = (payload.email as string || '').trim().toLowerCase();
    } catch (e) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: userEmail });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    }

    assignedAddresses = user.assignedAddresses || [];

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { from, to, cc, bcc, subject, bodyHtml, bodyText, fromName: customFromName } = body;

    // Validate inputs
    if (!from || typeof from !== 'string' || !from.includes('@')) {
      return NextResponse.json({ error: 'La dirección del remitente (From) es obligatoria y debe ser válida' }, { status: 400 });
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'El destinatario (To) es obligatorio' }, { status: 400 });
    }

    const cleanFrom = from.trim().toLowerCase();

    // 3. Verify if user is authorized to send from the requested email
    if (!assignedAddresses.includes('*') && !assignedAddresses.includes(cleanFrom)) {
      return NextResponse.json({ error: `No tienes permisos para enviar correos desde la cuenta: ${cleanFrom}` }, { status: 403 });
    }

    // Verify if the sender's domain is in the allowed domains collection
    const fromDomain = cleanFrom.split('@')[1];
    if (!fromDomain) {
      return NextResponse.json({ error: 'Dirección del remitente (From) inválida' }, { status: 400 });
    }

    const domainDoc = await db.collection('domains').findOne({ domain: fromDomain });
    if (!domainDoc) {
      return NextResponse.json({ 
        error: `El dominio del remitente (${fromDomain}) no está permitido en este servidor.` 
      }, { status: 400 });
    }

    // Verify if the sender is registered in the mailboxes collection
    const mailbox = await db.collection('mailboxes').findOne({ email: cleanFrom });
    if (!mailbox) {
      return NextResponse.json({
        error: `La cuenta de correo remitente (${cleanFrom}) no está registrada en el servidor. Regístrala en la sección de administración primero.`
      }, { status: 400 });
    }

    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'El servidor de envío no está configurado (API Keys de Mailjet faltantes).' },
        { status: 500 }
      );
    }

    const fromName = mailbox.name;

    // 4. Map arrays into Mailjet format
    const mailjetTo = to.map((email: string) => ({ Email: email.trim() }));
    const mailjetCc = cc && Array.isArray(cc) ? cc.map((email: string) => ({ Email: email.trim() })) : [];
    const mailjetBcc = bcc && Array.isArray(bcc) ? bcc.map((email: string) => ({ Email: email.trim() })) : [];

    // 5. Assemble Mailjet payload using the dynamically validated sender
    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: cleanFrom,
            Name: fromName
          },
          To: mailjetTo,
          Cc: mailjetCc.length > 0 ? mailjetCc : undefined,
          Bcc: mailjetBcc.length > 0 ? mailjetBcc : undefined,
          Subject: subject || '(Sin Asunto)',
          TextPart: bodyText || '',
          HTMLPart: bodyHtml || bodyText || ''
        }
      ]
    };

    // 6. Invoke Mailjet Send API v3.1 using HTTP fetch
    const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mailjetPayload)
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error('Mailjet API send error:', errorResponse);
      return NextResponse.json(
        { error: `Error en el proveedor de envío: ${response.statusText}` },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    const mailjetMessageId = responseData.Messages?.[0]?.To?.[0]?.MessageID || `sent-${crypto.randomUUID()}`;

    // 7. Store copy in MongoDB 'sent' folder
    const sentEmailDocument = {
      from: {
        name: fromName,
        address: cleanFrom
      },
      to: to,
      cc: cc || [],
      bcc: bcc || [],
      subject: subject || '(Sin Asunto)',
      date: new Date(),
      body: {
        text: bodyText || '',
        html: bodyHtml || bodyText || ''
      },
      attachments: [], 
      folder: 'sent',
      isRead: true,
      messageId: String(mailjetMessageId)
    };

    await db.collection('emails').insertOne(sentEmailDocument);

    return NextResponse.json({
      success: true,
      messageId: mailjetMessageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Error interno al enviar el correo' }, { status: 500 });
  }
}
