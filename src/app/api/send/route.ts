import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function streamToBuffer(stream: any): Promise<Buffer> {
  if (stream.transformToByteArray) {
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

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
    const { from, to, cc, bcc, subject, bodyHtml, bodyText, fromName: customFromName, attachments } = body;

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

    // Parse base64 pasted images in bodyHtml
    let processedBodyHtml = bodyHtml || bodyText || '';
    const pastedImageAttachments: any[] = [];
    const mailjetPastedAttachments: any[] = [];

    const base64ImgRegex = /src=["']data:(image\/[^;]+);base64,([^"']+)["']/g;
    let match;
    let imgIdx = 1;

    while ((match = base64ImgRegex.exec(bodyHtml || '')) !== null) {
      const contentType = match[1];
      const base64Data = match[2];
      const extension = contentType.split('/')[1] || 'png';
      const filename = `imagen_pegada_${imgIdx}.${extension}`;
      const buffer = Buffer.from(base64Data, 'base64');
      const size = buffer.length;

      const uniqueId = crypto.randomUUID();
      const r2Key = `inline-${uniqueId}.${extension}`;
      const contentId = `cid-${uniqueId}`;

      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const putCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: r2Key,
          Body: buffer,
          ContentType: contentType,
        });
        await s3Client.send(putCommand);

        pastedImageAttachments.push({
          filename,
          contentType,
          size,
          r2Url: r2Key,
          contentId: `<${contentId}>`,
          disposition: 'inline'
        });

        mailjetPastedAttachments.push({
          ContentType: contentType,
          Filename: filename,
          Base64Content: base64Data,
          ContentID: contentId
        });

        processedBodyHtml = processedBodyHtml.replace(match[0], `src="cid:${contentId}"`);
        imgIdx++;
      } catch (r2Err) {
        console.error('Error processing pasted image:', r2Err);
      }
    }

    // Fetch and process attachments from R2 to Base64
    const mailjetAttachments: any[] = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: att.r2Url,
          });
          const s3Response = await s3Client.send(getCommand);
          if (s3Response.Body) {
            const buffer = await streamToBuffer(s3Response.Body);
            const base64Content = buffer.toString('base64');
            mailjetAttachments.push({
              ContentType: att.contentType,
              Filename: att.filename,
              Base64Content: base64Content,
            });
          }
        } catch (s3Err) {
          console.error(`Error reading attachment ${att.filename} from R2:`, s3Err);
          return NextResponse.json(
            { error: `No se pudo procesar el archivo adjunto: ${att.filename}` },
            { status: 500 }
          );
        }
      }
    }

    const combinedMailjetAttachments = [
      ...mailjetAttachments,
      ...mailjetPastedAttachments
    ];

    const combinedDbAttachments = [
      ...(attachments || []),
      ...pastedImageAttachments
    ];

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
          HTMLPart: processedBodyHtml || bodyText || '',
          Attachments: combinedMailjetAttachments.length > 0 ? combinedMailjetAttachments : undefined
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
        html: processedBodyHtml || bodyText || ''
      },
      attachments: combinedDbAttachments, 
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
