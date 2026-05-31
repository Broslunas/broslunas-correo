'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  Trash2,
  CornerUpLeft,
  Download,
  FileText,
  ArchiveRestore,
  AlertOctagon,
  CheckCircle,
  FileArchive,
  MailOpen
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  r2Url: string;
  contentId?: string | null;
  disposition?: string | null;
}

interface Email {
  _id: string;
  from: { name: string; address: string };
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  date: string;
  body: { text: string; html: string };
  attachments?: Attachment[];
  folder: string;
  isRead: boolean;
}

interface EmailReaderProps {
  email: Email | null;
  onUpdateEmailStatus: (ids: string[], updates: { folder?: string; isRead?: boolean }) => void;
  onDeletePermanent: (ids: string[]) => void;
  onReplyClick: (email: Email) => void;
}

/** Build a sanitized srcdoc string for the email iframe */
function buildEmailSrcdoc(email: Email): string {
  const attachments = email.attachments || [];
  const imageAttachments = attachments.filter(a => a.contentType?.startsWith('image/'));

  let processedHtml = email.body.html || '';

  // --- Strategy 1: Exact contentId match ---
  attachments.forEach((att) => {
    if (att.contentId) {
      const rawCid = att.contentId.replace(/^<|>$/g, '');
      const r2ProxyUrl = `/api/attachments?key=${encodeURIComponent(att.r2Url)}&filename=${encodeURIComponent(att.filename)}`;
      processedHtml = processedHtml.replace(
        new RegExp(`cid:${rawCid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
        r2ProxyUrl
      );
    }
  });

  // --- Strategy 2: Positional fallback (old emails without contentId) ---
  const untaggedImages = imageAttachments.filter(a => !a.contentId);
  if (untaggedImages.length > 0) {
    let imgIdx = 0;
    processedHtml = processedHtml.replace(/cid:[^\s"'>)]+/gi, () => {
      const att = untaggedImages[imgIdx];
      if (!att) return '';
      imgIdx++;
      return `/api/attachments?key=${encodeURIComponent(att.r2Url)}&filename=${encodeURIComponent(att.filename)}`;
    });
  }

  // --- Strategy 3: Remove any still-unresolved cid: img tags ---
  processedHtml = processedHtml.replace(/<img[^>]*src=["'][^"']*cid:[^"']*["'][^>]*\/?>/gi, '');

  const sanitized = DOMPurify.sanitize(processedHtml, {
    ADD_ATTR: ['target', 'src'],
    ADD_URI_SAFE_ATTR: ['src'],
    FORBID_TAGS: ['script', 'iframe', 'form', 'embed', 'object'],
    WHOLE_DOCUMENT: false,
  });

  // Wrap in a minimal HTML document with reset styles
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<base target="_blank" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #e5e5e5;
    word-break: break-word;
    overflow-x: hidden;
  }
  a { color: #7c6af7; }
  img { max-width: 100%; height: auto; display: block; }
  table { border-collapse: collapse; max-width: 100%; }
  td, th { padding: 4px 8px; vertical-align: top; }
  blockquote {
    margin: 8px 0 8px 16px;
    padding-left: 12px;
    border-left: 3px solid #555;
    color: #999;
  }
  pre, code {
    background: #1a1a1a;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
    overflow-x: auto;
  }
  pre { padding: 12px; }
  hr { border: none; border-top: 1px solid #333; margin: 16px 0; }
</style>
</head>
<body>${sanitized}</body>
</html>`;
}

/** Plain text fallback renderer */
function PlainTextBody({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: 14,
        lineHeight: 1.6,
        color: '#e5e5e5',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text}
    </div>
  );
}

/** Auto-resizing iframe that renders the email body in a fully isolated CSS context */
function EmailIframe({ srcdoc }: { srcdoc: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const resize = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;
    const height = iframe.contentDocument.documentElement.scrollHeight;
    iframe.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      resize();
      // Re-check after images finish loading
      const doc = iframe.contentDocument;
      if (!doc) return;
      const imgs = doc.querySelectorAll('img');
      imgs.forEach(img => {
        if (!img.complete) img.addEventListener('load', resize);
      });
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [srcdoc, resize]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style={{
        width: '100%',
        border: 'none',
        display: 'block',
        minHeight: 80,
        background: 'transparent',
      }}
      title="Contenido del correo"
    />
  );
}

export default function EmailReader({
  email,
  onUpdateEmailStatus,
  onDeletePermanent,
  onReplyClick,
}: EmailReaderProps) {

  if (!email) {
    return (
      <div className="flex-1 bg-neutral-950 flex flex-col items-center justify-center p-8 text-center text-muted-foreground select-none">
        <div className="h-16 w-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4 border border-border/30">
          <MailOpen className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Ningún correo seleccionado</h3>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
          Selecciona un mensaje de la lista para ver su contenido, responder o descargar archivos adjuntos.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(email.date).toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Only real (non-inline) attachments shown in the panel
  const realAttachments = (email.attachments || []).filter(
    (att) => !(
      att.disposition === 'inline' ||
      (att.contentId && att.contentType?.startsWith('image/'))
    )
  );

  const srcdoc = email.body.html ? buildEmailSrcdoc(email) : null;

  return (
    <div className="flex-1 bg-neutral-950 flex flex-col h-full overflow-hidden">

      {/* Top action bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-neutral-950/80 backdrop-blur">

        {/* Reply Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReplyClick(email)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            Responder
          </button>
        </div>

        {/* Folder / Status Actions */}
        <div className="flex items-center gap-1.5">
          {email.folder !== 'inbox' && (
            <button
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'inbox' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/45 transition-all cursor-pointer"
              title="Restaurar a Bandeja de entrada"
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
              Recuperar
            </button>
          )}

          {email.folder !== 'spam' ? (
            <button
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'spam' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/45 transition-all cursor-pointer"
              title="Marcar como correo no deseado"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              Es Spam
            </button>
          ) : (
            <button
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'inbox' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/45 transition-all cursor-pointer"
              title="Quitar marca de Spam"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              No es Spam
            </button>
          )}

          {email.folder !== 'trash' ? (
            <button
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'trash' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/15 border border-border/45 hover:border-destructive/25 transition-all cursor-pointer"
              title="Mover a Papelera"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          ) : (
            <button
              onClick={() => onDeletePermanent([email._id])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-destructive-foreground bg-destructive/15 border border-destructive/20 hover:bg-destructive/25 transition-all cursor-pointer font-semibold"
              title="Eliminar permanentemente de la base de datos"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar Definitivo
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Email Header Metadata */}
        <div className="px-8 pt-8 pb-6 space-y-4 border-b border-border/50">
          <h1 className="text-xl font-bold tracking-tight text-foreground select-text">
            {email.subject}
          </h1>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary border border-border select-none">
                {email.from.name ? email.from.name[0].toUpperCase() : email.from.address[0].toUpperCase()}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground select-text">
                  {email.from.name || '(Sin Nombre)'}{' '}
                  <span className="text-muted-foreground font-normal">&lt;{email.from.address}&gt;</span>
                </p>
                <p className="text-muted-foreground mt-0.5 select-text">
                  para: {email.to.join(', ')}
                  {email.cc && email.cc.length > 0 && ` • cc: ${email.cc.join(', ')}`}
                </p>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground text-right select-none whitespace-nowrap">
              {formattedDate}
            </div>
          </div>
        </div>

        {/* Email Body — isolated inside an iframe */}
        <div className="px-8 py-6">
          {srcdoc ? (
            <EmailIframe key={email._id} srcdoc={srcdoc} />
          ) : (
            <PlainTextBody text={email.body.text} />
          )}
        </div>

        {/* Attachments — always at the bottom */}
        {realAttachments.length > 0 && (
          <div className="px-8 pb-8">
            <div className="bg-neutral-900/40 border border-border p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Archivos Adjuntos ({realAttachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {realAttachments.map((att, index) => (
                  <a
                    key={index}
                    href={`/api/attachments?key=${att.r2Url}&filename=${encodeURIComponent(att.filename)}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-neutral-900 hover:bg-secondary transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {att.filename}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p>
                      </div>
                    </div>
                    <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <Download className="h-4 w-4" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
