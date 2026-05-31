import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { to, cc, bcc, subject, bodyHtml, bodyText } = body;

    // 1. Validate inputs
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'El destinatario (To) es obligatorio' }, { status: 400 });
    }

    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_API_SECRET;
    const fromEmail = process.env.MAILJET_FROM_EMAIL;
    const fromName = process.env.MAILJET_FROM_NAME || 'Mi Webmail';

    if (!apiKey || !apiSecret || !fromEmail) {
      return NextResponse.json(
        { error: 'El servidor de envío no está configurado (API Keys de Mailjet faltantes).' },
        { status: 500 }
      );
    }

    // 2. Map arrays into Mailjet format
    const mailjetTo = to.map((email: string) => ({ Email: email.trim() }));
    const mailjetCc = cc && Array.isArray(cc) ? cc.map((email: string) => ({ Email: email.trim() })) : [];
    const mailjetBcc = bcc && Array.isArray(bcc) ? bcc.map((email: string) => ({ Email: email.trim() })) : [];

    // 3. Assemble Mailjet payload
    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: fromEmail,
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

    // 4. Invoke Mailjet Send API v3.1 using HTTP fetch
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

    // 5. Store copy in MongoDB 'sent' folder
    const { db } = await connectToDatabase();
    const sentEmailDocument = {
      from: {
        name: fromName,
        address: fromEmail
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
      attachments: [], // Optional: We can add attachments to outgoing mails in a future extension
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
