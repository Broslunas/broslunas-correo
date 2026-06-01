import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import webPush from 'web-push';
import { pushInboundToWildDuck, ensureWildDuckUser } from '@/lib/wildduck';

export const dynamic = 'force-dynamic';

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
          contentId: att.contentId || null,         // e.g. "<image001@domain>" for inline images
          disposition: att.disposition || 'attachment', // 'inline' or 'attachment'
        }))
      : [];

    // 5. Auto-classify folder based on content
    let detectedFolder = 'inbox';
    const textToAnalyze = `${subject} ${bodyText} ${bodyHtml}`.toLowerCase();
    const senderToAnalyze = from.address.toLowerCase();

    // 1. Social Media classification
    const socialDomains = ['linkedin.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'github.com', 'gitlab.com', 'pinterest.com', 'reddit.com'];
    const isSocialSender = socialDomains.some(domain => senderToAnalyze.endsWith(domain) || senderToAnalyze.includes('@' + domain));
    const socialKeywords = ['nuevo seguidor', 'solicitud de amistad', 'mencionó', 'comentó', 'te sigue', 'retweet', 'notificación de github', 'pull request', 'issue', 'social'];
    const isSocialKeyword = socialKeywords.some(kw => textToAnalyze.includes(kw));

    if (isSocialSender || isSocialKeyword) {
      detectedFolder = 'social';
    } 
    // 2. Commercial / Promotional classification
    else {
      const commercialKeywords = [
        'oferta', 'descuento', 'promoción', 'promo', 'compra', 'pedido', 'factura', 'pago', 'descuentos', 'tienda', 'shop', 
        'sale', 'order', 'invoice', 'payment', 'receipt', 'boleta', 'voucher', 'cupón', 'coupon', 'adquiere', 'suscripción',
        'suscribete', 'comprar', 'precio', 'tarifa', 'servicio', 'anuncio', 'publicidad'
      ];
      const isCommercialKeyword = commercialKeywords.some(kw => textToAnalyze.includes(kw));
      const commercialDomains = ['paypal.com', 'stripe.com', 'amazon.', 'aliexpress', 'ebay', 'shopify', 'netflix', 'spotify', 'booking.com'];
      const isCommercialSender = commercialDomains.some(domain => senderToAnalyze.includes(domain));

      if (isCommercialKeyword || isCommercialSender) {
        detectedFolder = 'commercial';
      }
      // 3. Newsletter / Boletines classification
      else {
        const newsletterKeywords = [
          'newsletter', 'boletín', 'boletin', 'weekly digest', 'weekly', 'daily digest', 'digest', 'monthly', 
          'novedades', 'resumen semanal', 'leído de la semana', 'suscrito', 'suscribirse', 'unsubscribe'
        ];
        const isNewsletterKeyword = newsletterKeywords.some(kw => textToAnalyze.includes(kw));
        
        if (isNewsletterKeyword) {
          detectedFolder = 'newsletter';
        }
        // 4. Work classification
        else {
          const workKeywords = [
            'reunión', 'proyecto', 'tarea', 'urgente', 'avance', 'minuta', 'trabajo', 'oficina', 'cliente', 
            'presupuesto', 'propuesta', 'agenda', 'meeting', 'project', 'task', 'client', 'deadline'
          ];
          const isWorkKeyword = workKeywords.some(kw => textToAnalyze.includes(kw));
          
          if (isWorkKeyword) {
            detectedFolder = 'work';
          }
        }
      }
    }

    // 6. Build email document
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
      folder: detectedFolder,
      isRead: false,
      createdAt: new Date(),
    };

    const result = await db.collection('emails').insertOne(incomingEmailDocument);

    console.log(`Successfully ingested incoming email from ${from.address} with ID: ${result.insertedId}`);

    // 5b. Mirror the message to WildDuck so it appears via IMAP for external clients.
    // WildDuck stores the canonical MIME; we pass the raw base64 body reconstructed
    // from the parsed fields. This is best-effort: a WildDuck outage must not block
    // the webmail pipeline.
    if (process.env.WILDDUCK_API_URL) {
      try {
        const rawMime = reconstructRawMime(incomingEmailDocument);
        for (const recipient of recipients) {
          const wdUser = await ensureWildDuckUser(recipient, recipient, '');
          if (wdUser?._id || wdUser?.id) {
            const userId = String(wdUser._id || wdUser.id);
            const mirrorSuccess = await pushInboundToWildDuck({
              userId,
              mailboxPath: 'INBOX',
              rawMime,
              flags: [], // Empty flags means the email will be marked as UNREAD
            });
            console.log(`[wildduck] Mirrored inbound message for ${recipient} (userId: ${userId}) -> Success: ${mirrorSuccess}`);
          }
        }
      } catch (wdErr) {
        console.warn('[wildduck] Failed to mirror inbound message (non-fatal):', wdErr);
      }
    }

    // 6. Trigger push notifications for recipients
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:pablo.luna.perez.008@gmail.com';

    if (vapidPublicKey && vapidPrivateKey) {
      try {
        webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        // Find users with wildcard or with assigned address matching any recipient
        const targetUsers = await db.collection('users').find({
          $or: [
            { assignedAddresses: '*' },
            { assignedAddresses: { $in: recipients } }
          ]
        }).toArray();

        const targetUserEmails = targetUsers.map((u: any) => u.email);

        if (targetUserEmails.length > 0) {
          // Find subscriptions for those users
          const subscriptions = await db.collection('push_subscriptions').find({
            userId: { $in: targetUserEmails }
          }).toArray();

          if (subscriptions.length > 0) {
            const senderName = incomingEmailDocument.from.name || incomingEmailDocument.from.address;
            const pushTitle = `Nuevo correo de: ${senderName}`;
            const subjectSnippet = incomingEmailDocument.subject;
            const textBodySnippet = incomingEmailDocument.body.text
              ? incomingEmailDocument.body.text.substring(0, 80) + (incomingEmailDocument.body.text.length > 80 ? '...' : '')
              : '';
            const pushBody = `Asunto: ${subjectSnippet}${textBodySnippet ? `\n\n${textBodySnippet}` : ''}`;
            const pushPayload = JSON.stringify({
              title: pushTitle,
              body: pushBody,
              url: '/mail?inbox=main'
            });

            const pushPromises = subscriptions.map(async (subDoc: any) => {
              try {
                await webPush.sendNotification(subDoc.subscription, pushPayload);
              } catch (err: any) {
                console.error(`Error sending push notification to user ${subDoc.userId}:`, err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                  console.log(`Removing expired or invalid push subscription for user ${subDoc.userId}`);
                  await db.collection('push_subscriptions').deleteOne({ _id: subDoc._id });
                }
              }
            });

            await Promise.allSettled(pushPromises);
          }
        }
      } catch (pushErr) {
        console.error('Error during push notification dispatching:', pushErr);
      }
    } else {
      console.warn('VAPID keys not fully configured. Skipping push notification dispatch.');
    }

    return NextResponse.json({
      success: true,
      emailId: result.insertedId,
    });
  } catch (error) {
    console.error('Error in Email Ingress API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Reconstruct a minimal RFC 5322 MIME message from the parsed fields
 * stored in MongoDB. WildDuck stores the canonical raw MIME per user,
 * so any external IMAP client (Thunderbird, Outlook) sees the same
 * message that the webmail UI displays.
 */
function reconstructRawMime(doc: {
  from: { name: string; address: string };
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  date: Date;
  body: { text: string; html: string };
}): Buffer {
  const formatAddress = (a: { name?: string; address: string }) =>
    a.name ? `"${a.name}" <${a.address}>` : a.address;

  const headers: string[] = [
    `From: ${formatAddress(doc.from)}`,
    `To: ${doc.to.join(', ')}`,
  ];
  if (doc.cc.length > 0) headers.push(`Cc: ${doc.cc.join(', ')}`);
  headers.push(`Subject: ${doc.subject}`);
  headers.push(`Date: ${new Date(doc.date).toUTCString()}`);
  headers.push(`MIME-Version: 1.0`);

  if (doc.body.html && doc.body.html !== doc.body.text) {
    const boundary = `mixed-${Date.now()}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const body = [
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      doc.body.text || '',
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      doc.body.html || '',
      `--${boundary}--`,
      ``,
    ].join('\r\n');
    return Buffer.from(headers.join('\r\n') + '\r\n\r\n' + body, 'utf-8');
  }

  headers.push(`Content-Type: text/plain; charset=utf-8`);
  return Buffer.from(headers.join('\r\n') + '\r\n\r\n' + (doc.body.text || ''), 'utf-8');
}
