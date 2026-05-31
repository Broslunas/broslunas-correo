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
  MailOpen,
  ArrowLeft,
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
  onBack?: () => void; // Mobile back button
}

function buildEmailSrcdoc(email: Email): string {
  const attachments = email.attachments || [];
  const imageAttachments = attachments.filter(a => a.contentType?.startsWith('image/'));

  let processedHtml = email.body.html || '';

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

  processedHtml = processedHtml.replace(/<img[^>]*src=["'][^"']*cid:[^"']*["'][^>]*\/?>/gi, '');

  const sanitized = DOMPurify.sanitize(processedHtml, {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target', 'src', 'style', 'class', 'id', 'align', 'valign', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'width', 'height'],
    ADD_URI_SAFE_ATTR: ['src'],
    FORBID_TAGS: ['script', 'iframe', 'form', 'embed', 'object'],
    WHOLE_DOCUMENT: false,
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<base target="_blank" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: transparent;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.65;
    color: #d4dae8;
    word-break: break-word;
    overflow-x: hidden;
  }
  a { color: #2dd4bf; text-decoration: underline; }
  a:hover { color: #5eead4; }
  img { max-width: 100%; height: auto; display: block; }
  table { border-collapse: collapse; max-width: 100%; }
  td, th { padding: 4px 8px; vertical-align: top; }
  blockquote {
    margin: 8px 0 8px 16px;
    padding-left: 12px;
    border-left: 2px solid rgba(45,212,191,0.4);
    color: #7d8ba3;
  }
  pre, code {
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 12px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    overflow-x: auto;
  }
  pre { padding: 12px; }
  hr { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 16px 0; }
</style>
</head>
<body>${sanitized}</body>
</html>`;
}

function PlainTextBody({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontSize: 14,
        lineHeight: 1.65,
        color: '#d4dae8',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text}
    </div>
  );
}

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
      const doc = iframe.contentDocument;
      if (!doc) return;
      const imgs = doc.querySelectorAll('img');
      imgs.forEach(img => { if (!img.complete) img.addEventListener('load', resize); });
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

function SenderAvatar({ name, address }: { name: string; address: string }) {
  const letter = (name || address)[0]?.toUpperCase() ?? '?';
  const colors = [
    ['#2dd4bf', '#0f766e'], ['#22d3ee', '#0e7490'], ['#34d399', '#059669'],
    ['#60a5fa', '#1d4ed8'], ['#a78bfa', '#6d28d9'], ['#f472b6', '#be185d'],
    ['#fb923c', '#c2410c'],
  ];
  const idx = (name || address).charCodeAt(0) % colors.length;
  const [from, to] = colors[idx];
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: '#fff',
        boxShadow: `0 4px 12px ${from}40`,
      }}
    >
      {letter}
    </div>
  );
}

export default function EmailReader({
  email,
  onUpdateEmailStatus,
  onDeletePermanent,
  onReplyClick,
  onBack,
}: EmailReaderProps) {

  if (!email) {
    return (
      <div
        className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center select-none"
        style={{ background: 'transparent' }}
      >
        <div
          className="h-20 w-20 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(45,212,191,0.06)',
            border: '1px solid rgba(45,212,191,0.12)',
            boxShadow: '0 0 32px rgba(45,212,191,0.05)',
          }}
        >
          <MailOpen className="h-9 w-9" style={{ color: 'hsl(174 72% 45%)' }} />
        </div>
        <h3 className="text-base font-semibold mb-1.5" style={{ color: 'hsl(210 40% 85%)' }}>
          Ningún correo seleccionado
        </h3>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'hsl(215 20% 45%)' }}>
          Selecciona un mensaje de la lista para ver su contenido, responder o gestionar archivos adjuntos.
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

  const realAttachments = (email.attachments || []).filter(
    (att) => !(
      att.disposition === 'inline' ||
      (att.contentId && att.contentType?.startsWith('image/'))
    )
  );

  const srcdoc = email.body.html ? buildEmailSrcdoc(email) : null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fadeIn">

      {/* Top action toolbar */}
      <div
        className="shrink-0 h-14 flex items-center justify-between px-4 md:px-6 gap-3"
        style={{
          background: 'rgba(255,255,255,0.018)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer mr-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'hsl(210 40% 75%)',
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </button>
          )}

          {/* Reply */}
          <button
            id="btn-reply"
            onClick={() => onReplyClick(email)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, hsl(174 72% 52%), hsl(192 85% 58%))',
              color: 'hsl(222 47% 4%)',
              boxShadow: '0 4px 16px rgba(45,212,191,0.2)',
            }}
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Responder</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {email.folder !== 'inbox' && (
            <button
              id="btn-restore"
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'inbox' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'hsl(215 20% 60%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'hsl(210 40% 90%)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'hsl(215 20% 60%)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Recuperar</span>
            </button>
          )}

          {email.folder !== 'spam' ? (
            <button
              id="btn-spam"
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'spam' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'hsl(215 20% 60%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'hsl(38 92% 65%)';
                e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'hsl(215 20% 60%)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Es Spam</span>
            </button>
          ) : (
            <button
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'inbox' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: 'hsl(152 69% 55%)',
              }}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">No es Spam</span>
            </button>
          )}

          {email.folder !== 'trash' ? (
            <button
              id="btn-trash"
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'trash' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'hsl(215 20% 60%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'hsl(0 78% 65%)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'hsl(215 20% 60%)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          ) : (
            <button
              id="btn-delete-permanent"
              onClick={() => onDeletePermanent([email._id])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'hsl(0 78% 65%)',
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eliminar definitivo</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable email content */}
      <div className="flex-1 overflow-y-auto">

        {/* Email header */}
        <div
          className="px-5 md:px-8 pt-7 pb-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h1
            className="text-lg md:text-xl font-bold mb-4 leading-snug select-text"
            style={{ color: 'hsl(210 40% 96%)' }}
          >
            {email.subject}
          </h1>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <SenderAvatar name={email.from.name} address={email.from.address} />
              <div>
                <p className="text-sm font-semibold select-text" style={{ color: 'hsl(210 40% 92%)' }}>
                  {email.from.name || '(Sin nombre)'}
                  {' '}
                  <span className="font-normal text-xs" style={{ color: 'hsl(215 20% 50%)' }}>
                    &lt;{email.from.address}&gt;
                  </span>
                </p>
                <p className="text-xs mt-0.5 select-text" style={{ color: 'hsl(215 20% 50%)' }}>
                  Para: {email.to.join(', ')}
                  {email.cc && email.cc.length > 0 && (
                    <span> · CC: {email.cc.join(', ')}</span>
                  )}
                </p>
              </div>
            </div>

            <time
              className="text-xs shrink-0 capitalize"
              style={{ color: 'hsl(215 20% 45%)' }}
            >
              {formattedDate}
            </time>
          </div>
        </div>

        {/* Email body */}
        <div className="px-5 md:px-8 py-6">
          {srcdoc ? (
            <EmailIframe key={email._id} srcdoc={srcdoc} />
          ) : (
            <PlainTextBody text={email.body.text} />
          )}
        </div>

        {/* Attachments */}
        {realAttachments.length > 0 && (
          <div className="px-5 md:px-8 pb-8">
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: 'rgba(45,212,191,0.04)',
                border: '1px solid rgba(45,212,191,0.12)',
              }}
            >
              <h4
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'hsl(174 72% 55%)' }}
              >
                <FileArchive className="h-4 w-4" />
                Archivos adjuntos ({realAttachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {realAttachments.map((att, index) => (
                  <a
                    key={index}
                    href={`/api/attachments?key=${att.r2Url}&filename=${encodeURIComponent(att.filename)}`}
                    className="group flex items-center justify-between p-2.5 rounded-xl transition-all text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(45,212,191,0.07)';
                      e.currentTarget.style.borderColor = 'rgba(45,212,191,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.15)' }}
                      >
                        <FileText className="h-4 w-4" style={{ color: 'hsl(174 72% 55%)' }} />
                      </div>
                      <div className="truncate">
                        <p className="font-medium truncate transition-colors" style={{ color: 'hsl(210 40% 85%)' }}>
                          {att.filename}
                        </p>
                        <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>
                          {formatBytes(att.size)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ml-2 transition-all"
                      style={{ background: 'rgba(45,212,191,0.06)', color: 'hsl(174 72% 55%)' }}
                    >
                      <Download className="h-3.5 w-3.5" />
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
