import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { resolveThreadId, normalizeSubject } from '@/lib/threads';
import webPush from 'web-push';


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
    const { from, to, cc, bcc, subject, date, bodyText, bodyHtml, attachments, messageId, inReplyTo, references, authStatus } = body;

    // Validate minimum required fields
    if (!from || !from.address) {
      return NextResponse.json({ error: 'La dirección del remitente es obligatoria' }, { status: 400 });
    }

    // 3. Connect to DB
    const { db } = await connectToDatabase();

    // Helper to parse recipients flexibly (string, array of strings, array of objects, etc.)
    const parseRecipientField = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) {
        return field.map(f => {
          if (typeof f === 'string') return f;
          if (f && typeof f === 'object' && f.address) return f.address;
          return String(f);
        });
      }
      if (typeof field === 'string') {
        return field.split(',').map(s => s.trim());
      }
      if (typeof field === 'object' && field.address) {
        return [field.address];
      }
      return [];
    };

    // Verify that at least one recipient belongs to an allowed domain in the system
    const recipients = [
      ...parseRecipientField(to),
      ...parseRecipientField(cc),
      ...parseRecipientField(bcc)
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

    // 6. Resolve thread ID
    const threadId = await resolveThreadId(db, {
      messageId: messageId || undefined,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
      subject: subject || '',
    });

    // 7. Build email document
    const incomingEmailDocument = {
      from: {
        name: from.name || '',
        address: from.address.trim().toLowerCase(),
      },
      to: parseRecipientField(to).map((t: string) => t.trim().toLowerCase()),
      cc: parseRecipientField(cc).map((c: string) => c.trim().toLowerCase()),
      bcc: parseRecipientField(bcc).map((b: string) => b.trim().toLowerCase()),
      subject: subject || '(Sin Asunto)',
      normalizedSubject: normalizeSubject(subject || ''),
      date: date ? new Date(date) : new Date(),
      body: {
        text: bodyText || '',
        html: bodyHtml || bodyText || '',
      },
      attachments: formattedAttachments,
      folder: 'inbox',
      category: detectedFolder !== 'inbox' ? detectedFolder : undefined,
      isRead: false,
      isStarred: false,
      threadId,
      messageId: messageId || undefined,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
      authStatus: authStatus || {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
      },
      createdAt: new Date(),
    };

    const result = await db.collection('emails').insertOne(incomingEmailDocument);

    // 5.1. Handle Automatic Replies
    try {
      // Find all target mailboxes in the system that match the recipients of this email
      const activeMailboxes = await db.collection('mailboxes').find({
        email: { $in: recipients },
        autoReplyEnabled: true
      }).toArray();

      for (const mailbox of activeMailboxes) {
        const senderAddress = incomingEmailDocument.from.address.trim().toLowerCase();
        
        // Loop prevention rule 1: Do not auto-reply to ourselves
        if (senderAddress === mailbox.email.trim().toLowerCase()) {
          console.log(`Auto-reply skipped for ${mailbox.email}: Sender is the same as the recipient.`);
          continue;
        }

        // Loop prevention rule 2: Check if email is an automated mail
        const lowercaseSubject = (subject || '').toLowerCase();
        const lowercaseBody = (bodyText || '').toLowerCase();
        
        const isAutomated = 
          lowercaseSubject.includes('respuesta automática') ||
          lowercaseSubject.includes('respuesta automatica') ||
          lowercaseSubject.includes('auto-reply') ||
          lowercaseSubject.includes('autoreply') ||
          lowercaseSubject.includes('out of office') ||
          lowercaseSubject.includes('vacation') ||
          lowercaseBody.includes('auto-reply') ||
          request.headers.get('precedence') === 'bulk' ||
          request.headers.get('precedence') === 'junk' ||
          request.headers.get('x-autoreply') === 'yes';

        if (isAutomated) {
          console.log(`Auto-reply skipped for ${mailbox.email} to ${senderAddress}: Incoming email is classified as automated.`);
          continue;
        }

        // Loop prevention rule 3: Cooldown of 24 hours per sender
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingLog = await db.collection('auto_reply_logs').findOne({
          mailboxEmail: mailbox.email,
          senderEmail: senderAddress,
          lastSentAt: { $gt: oneDayAgo }
        });

        if (existingLog) {
          console.log(`Auto-reply skipped for ${mailbox.email} to ${senderAddress}: Cooldown active (last auto-reply sent within 24 hours).`);
          continue;
        }

        // Setup subject and body templates with placeholders replaced
        const originalSubject = subject || '(Sin Asunto)';
        const originalSenderName = incomingEmailDocument.from.name || senderAddress;

        let replySubject = mailbox.autoReplySubject || 'Respuesta automática: {{subject}}';
        replySubject = replySubject
          .replace(/\{\{subject\}\}/g, originalSubject)
          .replace(/\{\{sender\}\}/g, originalSenderName);

        let replyBodyText = mailbox.autoReplyBody || 'Hola,\n\nGracias por su mensaje. Hemos recibido su correo y le responderemos lo antes posible.\n\nSaludos cordiales.';
        replyBodyText = replyBodyText
          .replace(/\{\{subject\}\}/g, originalSubject)
          .replace(/\{\{sender\}\}/g, originalSenderName);

        // Convert plain text to simple HTML (replacing newlines with <br>)
        const replyBodyHtml = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
          ${replyBodyText.replace(/\n/g, '<br>')}
        </div>`;

        // Send via Mailjet
        const apiKey = process.env.MAILJET_API_KEY;
        const apiSecret = process.env.MAILJET_API_SECRET;

        if (apiKey && apiSecret) {
          console.log(`Sending auto-reply from ${mailbox.email} to ${senderAddress} with subject: "${replySubject}"`);

          const mailjetPayload = {
            Messages: [
              {
                From: {
                  Email: mailbox.email,
                  Name: mailbox.name
                },
                To: [
                  {
                    Email: senderAddress,
                    Name: incomingEmailDocument.from.name || ''
                  }
                ],
                Subject: replySubject,
                TextPart: replyBodyText,
                HTMLPart: replyBodyHtml
              }
            ]
          };

          const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
          const sendResponse = await fetch('https://api.mailjet.com/v3.1/send', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mailjetPayload)
          });

          if (sendResponse.ok) {
            const responseData = await sendResponse.json();
            const mailjetMessageId = responseData.Messages?.[0]?.To?.[0]?.MessageID || `sent-${crypto.randomUUID()}`;

            // Save copy to sent folder
            const sentEmailDocument = {
              from: {
                name: mailbox.name,
                address: mailbox.email
              },
              to: [senderAddress],
              cc: [],
              bcc: [],
              subject: replySubject,
              date: new Date(),
              body: {
                text: replyBodyText,
                html: replyBodyHtml
              },
              attachments: [],
              folder: 'sent',
              isRead: true,
              messageId: String(mailjetMessageId)
            };

            await db.collection('emails').insertOne(sentEmailDocument);

            // Update log
            await db.collection('auto_reply_logs').updateOne(
              { mailboxEmail: mailbox.email, senderEmail: senderAddress },
              { $set: { lastSentAt: new Date() } },
              { upsert: true }
            );

            console.log(`Auto-reply successfully sent and logged for ${mailbox.email} to ${senderAddress}`);
          } else {
            const errorResponse = await sendResponse.text();
            console.error(`Mailjet API error sending auto-reply:`, errorResponse);
          }
        } else {
          console.warn('Mailjet API keys are not configured. Cannot send auto-reply.');
        }
      }
    } catch (autoReplyErr) {
      console.error('Error handling automatic replies:', autoReplyErr);
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


