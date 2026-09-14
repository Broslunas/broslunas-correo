import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { resolveThreadId, normalizeSubject } from '@/lib/threads';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'Tu cuenta ha sido suspendida. Contacta a un administrador.' }, { status: 403 });
    }

    const rawAssigned: any[] = user.assignedAddresses || [];
    assignedAddresses = rawAssigned
      .map(a => (typeof a === 'string' ? a.trim().toLowerCase() : ''))
      .filter(Boolean);

    // Check daily send limit
    if (user.dailySendLimit && user.dailySendLimit > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const isFull = assignedAddresses.includes('*');
      const sentToday = await db.collection('emails').countDocuments({
        ...(isFull ? {} : { 'from.address': { $in: assignedAddresses } }),
        folder: 'sent',
        date: { $gte: startOfDay }
      });
      if (sentToday >= user.dailySendLimit) {
        return NextResponse.json({
          error: `Has alcanzado tu límite diario de envíos (${user.dailySendLimit} correos/día).`
        }, { status: 429 });
      }
    }

    // Check storage quota limit
    if (user.storageLimitMB && user.storageLimitMB > 0) {
      const isFull = assignedAddresses.includes('*');
      const userFilter = isFull ? {} : {
        $or: [
          { 'from.address': { $in: assignedAddresses } },
          { 'to.address': { $in: assignedAddresses } }
        ]
      };
      const emailCount = await db.collection('emails').countDocuments(userFilter);
      const userAttAgg = await db.collection('emails').aggregate([
        { $match: userFilter },
        { $unwind: '$attachments' },
        { $group: { _id: null, totalBytes: { $sum: '$attachments.size' } } }
      ]).toArray();
      const usedBytes = (emailCount * 2048) + (userAttAgg[0]?.totalBytes || 0);
      const limitBytes = user.storageLimitMB * 1024 * 1024;
      if (usedBytes >= limitBytes) {
        return NextResponse.json({
          error: `Has superado tu cuota de almacenamiento (${user.storageLimitMB} MB). Elimina correos o archivos antes de enviar.`
        }, { status: 413 });
      }
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { from, to, cc, bcc, subject, bodyHtml, bodyText, fromName: customFromName, saveMailbox, attachments, draftId, inReplyTo, references } = body;

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

    const domainDoc = await db.collection('domains').findOne({
      domain: { $regex: new RegExp(`^${fromDomain.trim()}$`, 'i') }
    });
    if (!domainDoc) {
      return NextResponse.json({ 
        error: `El dominio del remitente (${fromDomain}) no está permitido en este servidor.` 
      }, { status: 400 });
    }

    // Verify if the sender is registered in the mailboxes collection
    const mailbox = await db.collection('mailboxes').findOne({
      email: { $regex: new RegExp(`^${escapeRegex(cleanFrom)}$`, 'i') }
    });

    // Auto-register mailbox if missing but authorized (wildcard or assigned address)
    if (!mailbox) {
      await db.collection('mailboxes').insertOne({
        email: cleanFrom,
        name: (customFromName as string)?.trim() || cleanFrom.split('@')[0],
        storageLimitMB: 0,
        dailySendLimit: 0,
        status: 'active',
        addedBy: userEmail,
        createdAt: new Date()
      }).catch(() => {});
    }

    // Check mailbox level suspension and limits
    if (mailbox?.status === 'suspended') {
      return NextResponse.json({
        error: `La cuenta de correo remitente (${cleanFrom}) ha sido suspendida.`
      }, { status: 403 });
    }

    if (mailbox?.dailySendLimit && mailbox.dailySendLimit > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sentTodayMb = await db.collection('emails').countDocuments({
        'from.address': cleanFrom,
        folder: 'sent',
        date: { $gte: startOfDay }
      });
      if (sentTodayMb >= mailbox.dailySendLimit) {
        return NextResponse.json({
          error: `La cuenta (${cleanFrom}) alcanzó su límite diario de envíos (${mailbox.dailySendLimit} correos/día).`
        }, { status: 429 });
      }
    }

    if (mailbox?.storageLimitMB && mailbox.storageLimitMB > 0) {
      const mbFilter = {
        $or: [
          { 'from.address': cleanFrom },
          { 'to.address': cleanFrom }
        ]
      };
      const emailCountMb = await db.collection('emails').countDocuments(mbFilter);
      const attAggMb = await db.collection('emails').aggregate([
        { $match: mbFilter },
        { $unwind: '$attachments' },
        { $group: { _id: null, totalBytes: { $sum: '$attachments.size' } } }
      ]).toArray();
      const usedBytesMb = (emailCountMb * 2048) + (attAggMb[0]?.totalBytes || 0);
      const limitBytesMb = mailbox.storageLimitMB * 1024 * 1024;
      if (usedBytesMb >= limitBytesMb) {
        return NextResponse.json({
          error: `La cuenta (${cleanFrom}) superó su cuota de almacenamiento (${mailbox.storageLimitMB} MB). Elimina correos o archivos antes de enviar.`
        }, { status: 413 });
      }
    }

    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'El servidor de envío no está configurado (API Keys de Mailjet faltantes).' },
        { status: 500 }
      );
    }

    const fromName = (customFromName as string)?.trim() || mailbox?.name || cleanFrom.split('@')[0];

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
    const threadHeaders: Record<string, string> = {};
    if (inReplyTo) threadHeaders['In-Reply-To'] = inReplyTo;
    if (references) threadHeaders['References'] = references;

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
          Attachments: combinedMailjetAttachments.length > 0 ? combinedMailjetAttachments : undefined,
          ...(Object.keys(threadHeaders).length > 0 ? { Headers: threadHeaders } : {})
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

    // 7. Resolve thread ID for conversation continuity
    const threadId = await resolveThreadId(db, {
      messageId: String(mailjetMessageId),
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
      subject: subject || '',
    });

    // 8. Store copy in MongoDB 'sent' folder
    const sentEmailDocument: Record<string, any> = {
      from: {
        name: fromName,
        address: cleanFrom
      },
      to: to,
      cc: cc || [],
      bcc: bcc || [],
      subject: subject || '(Sin Asunto)',
      normalizedSubject: normalizeSubject(subject || ''),
      date: new Date(),
      body: {
        text: bodyText || '',
        html: processedBodyHtml || bodyText || ''
      },
      attachments: combinedDbAttachments,
      folder: 'sent',
      isRead: true,
      threadId,
      messageId: String(mailjetMessageId),
      ...(inReplyTo ? { inReplyTo } : {}),
      ...(references ? { references } : {}),
    };

    await db.collection('emails').insertOne(sentEmailDocument);

    if (draftId) {
      try {
        const { ObjectId } = await import('mongodb');
        await db.collection('emails').deleteOne({ _id: new ObjectId(draftId), folder: 'drafts' });
      } catch (draftDelErr) {
        console.error('Error deleting draft after sending:', draftDelErr);
      }
    }

    return NextResponse.json({
      success: true,
      messageId: mailjetMessageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Error interno al enviar el correo' }, { status: 500 });
  }
}
