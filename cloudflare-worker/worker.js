/**
 * CLOUDFLARE WORKER FOR SECURE EMAIL INGRESS & ATTACHMENTS ROUTING
 * 
 * This Worker runs on Cloudflare Email Routing. It parses incoming emails at the edge,
 * uploads attachments directly to Cloudflare R2, and posts metadata to the Next.js ingress endpoint.
 * This architecture avoids Next.js serverless payload limits.
 * 
 * Required Worker Environment Variables (Configure in Cloudflare Dashboard):
 * - WEBMAIL_DOMAIN: e.g. "mail.midominio.com" or "tu-webmail.vercel.app"
 * - INGRESS_SECRET: Secure random authorization token matching the one in Next.js .env
 * 
 * Required Worker Bindings:
 * - BUCKET: Bind to your Cloudflare R2 bucket (e.g. "webmail-attachments")
 * 
 * Required NPM Dependency:
 * - postal-mime (Install in worker project via `npm install postal-mime`)
 */

import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    try {
      console.log(`Received incoming email from: ${message.from} to: ${message.to}`);

      // 1. Verify environment configuration
      if (!env.WEBMAIL_DOMAIN || !env.INGRESS_SECRET) {
        console.error('Missing Worker Environment variables WEBMAIL_DOMAIN or INGRESS_SECRET.');
        message.setReject('Mail server configuration error.');
        return;
      }

      if (!env.BUCKET) {
        console.error('R2 Bucket binding "BUCKET" is missing.');
        message.setReject('Mail server storage configuration error.');
        return;
      }

      // 2. Read raw email MIME data
      const rawEmailArrayBuffer = await new Response(message.raw).arrayBuffer();

      // 3. Parse raw email with PostalMime
      const parser = new PostalMime();
      const email = await parser.parse(rawEmailArrayBuffer);

      console.log(`Successfully parsed email: "${email.subject}"`);

      // 4. Process and upload attachments to Cloudflare R2
      const uploadedAttachments = [];
      if (email.attachments && email.attachments.length > 0) {
        console.log(`Processing ${email.attachments.length} attachments...`);
        
        for (const attachment of email.attachments) {
          // Generate a secure unique R2 key
          const uuid = crypto.randomUUID();
          const safeFilename = attachment.filename 
            ? attachment.filename.replace(/[^a-zA-Z0-9.-]/g, '_') 
            : 'unnamed_file';
          const key = `attachments/${uuid}-${safeFilename}`;

          console.log(`Uploading attachment: "${attachment.filename}" to R2 key: "${key}"...`);

          // Upload directly to Cloudflare R2 via binding API (R2 put uses stream or ArrayBuffer)
          await env.BUCKET.put(key, attachment.content, {
            httpMetadata: {
              contentType: attachment.mimeType || 'application/octet-stream',
            },
            customMetadata: {
              filename: attachment.filename || 'adjunto',
              size: attachment.content.byteLength.toString(),
            }
          });

          uploadedAttachments.push({
            filename: attachment.filename || 'adjunto',
            contentType: attachment.mimeType || 'application/octet-stream',
            size: attachment.content.byteLength,
            key: key
          });
        }
      }

      // 5. Construct payload for Next.js Ingress Webhook
      const ingressPayload = {
        from: {
          name: email.from.name || '',
          address: email.from.address || message.from
        },
        to: email.to ? email.to.map(t => t.address) : [message.to],
        cc: email.cc ? email.cc.map(c => c.address) : [],
        bcc: email.bcc ? email.bcc.map(b => b.address) : [],
        subject: email.subject || '(Sin Asunto)',
        date: email.date || new Date().toISOString(),
        bodyText: email.text || '',
        bodyHtml: email.html || email.text || '',
        attachments: uploadedAttachments
      };

      // 6. Forward payload to Next.js API endpoint
      const ingressUrl = `https://${env.WEBMAIL_DOMAIN}/api/emails/ingress`;
      console.log(`Forwarding email metadata to Next.js Ingress API: ${ingressUrl}`);

      const response = await fetch(ingressUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.INGRESS_SECRET}`,
          'ngrok-skip-browser-warning': 'true', // Bypass ngrok warning page
          'Bypass-Tunnel-Reminder': 'true'     // Bypass localtunnel warning page
        },
        body: JSON.stringify(ingressPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Next.js backend ingress failed with status ${response.status}:`, errorText);
        // Rejecting the email triggers a delivery bounce back to the sender
        message.setReject(`Internal storage rejection: ${response.status} ${response.statusText}`);
      } else {
        console.log('Email successfully stored and indexed in Next.js database.');
      }
    } catch (error) {
      console.error('Fatal error in email worker routing:', error);
      message.setReject(`Internal mail parsing error: ${error.message}`);
    }
  }
};
