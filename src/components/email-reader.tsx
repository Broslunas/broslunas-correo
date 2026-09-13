'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  Trash2,
  CornerUpLeft,
  CornerUpRight,
  Forward,
  Download,
  FileText,
  ArchiveRestore,
  AlertOctagon,
  CheckCircle,
  FileArchive,
  MailOpen,
  ArrowLeft,
  Folder,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Star,
  ShieldCheck,
  ShieldAlert,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
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
  isStarred?: boolean;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  authStatus?: {
    spf?: 'pass' | 'fail' | 'neutral' | 'softfail' | string;
    dkim?: 'pass' | 'fail' | 'neutral' | string;
    dmarc?: 'pass' | 'fail' | 'none' | string;
  };
}

interface EmailReaderProps {
  email: Email | null;
  onUpdateEmailStatus: (ids: string[], updates: { folder?: string; isRead?: boolean; isStarred?: boolean }) => void;
  onDeletePermanent: (ids: string[]) => void;
  onReplyClick: (email: Email) => void;
  onReplyAllClick?: (email: Email) => void;
  onForwardClick?: (email: Email) => void;
  onBack?: () => void;
  isStandalone?: boolean;
}

function checkPhishingRisk(from: { name: string; address: string }, authStatus?: Email['authStatus']): { isSuspicious: boolean; reason: string } {
  const name = (from.name || '').toLowerCase();
  const address = (from.address || '').toLowerCase();
  const domain = address.split('@')[1] || '';

  const brandKeywords: { keyword: string; legitDomains: string[] }[] = [
    { keyword: 'paypal', legitDomains: ['paypal.com', 'paypal.es'] },
    { keyword: 'google', legitDomains: ['google.com', 'google.es', 'accounts.google.com'] },
    { keyword: 'apple', legitDomains: ['apple.com', 'icloud.com'] },
    { keyword: 'microsoft', legitDomains: ['microsoft.com', 'outlook.com', 'live.com'] },
    { keyword: 'netflix', legitDomains: ['netflix.com'] },
    { keyword: 'amazon', legitDomains: ['amazon.com', 'amazon.es'] },
    { keyword: 'banco', legitDomains: ['bbva.com', 'santander.com', 'caixabank.com'] },
    { keyword: 'soporte', legitDomains: [] },
  ];

  for (const { keyword, legitDomains } of brandKeywords) {
    if (name.includes(keyword)) {
      const isLegit = legitDomains.some(d => domain === d || domain.endsWith('.' + d));
      if (!isLegit && legitDomains.length > 0) {
        return {
          isSuspicious: true,
          reason: `El remitente dice llamarse "${from.name}", pero la dirección (@${domain}) no coincide con el dominio oficial. Podría tratarse de phishing o suplantación.`,
        };
      }
    }
  }

  if (authStatus?.spf === 'fail' || authStatus?.dkim === 'fail') {
    return {
      isSuspicious: true,
      reason: 'El mensaje no superó la autenticación SPF o DKIM del servidor. La dirección del remitente puede haber sido falsificada.',
    };
  }

  return { isSuspicious: false, reason: '' };
}

function buildEmailSrcdoc(email: Email, allowExternalImages: boolean): { srcdoc: string; hasExternalImages: boolean } {
  const attachments = email.attachments || [];
  const imageAttachments = attachments.filter((a) => a.contentType?.startsWith('image/'));

  let processedHtml = email.body.html || '';
  processedHtml = processedHtml.replace(/&amp;hairsp;/gi, '&hairsp;');

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

  const untaggedImages = imageAttachments.filter((a) => !a.contentId);
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

  const hasExternalImages = /<img[^>]+src=["']https?:\/\//i.test(processedHtml) || /url\(['"]?https?:\/\//i.test(processedHtml);

  if (!allowExternalImages && hasExternalImages) {
    processedHtml = processedHtml.replace(
      /<img([^>]+)src=["'](https?:\/\/[^"']+)["']([^>]*)>/gi,
      '<img$1src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'28\'><rect width=\'120\' height=\'28\' fill=\'%23374151\' rx=\'4\'/><text x=\'60\' y=\'18\' font-size=\'11\' font-family=\'sans-serif\' text-anchor=\'middle\' fill=\'%239ca3af\'>[Img bloqueada]</text></svg>"$3>'
    );
    processedHtml = processedHtml.replace(/url\(['"]?https?:\/\/[^)'"]+['"]?\)/gi, 'none');
  }

  const sanitized = DOMPurify.sanitize(processedHtml, {
    ADD_TAGS: ['style'],
    ADD_ATTR: [
      'target', 'src', 'style', 'class', 'id', 'align', 'valign',
      'bgcolor', 'border', 'cellpadding', 'cellspacing', 'width', 'height',
    ],
    ADD_URI_SAFE_ATTR: ['src'],
    FORBID_TAGS: ['script', 'iframe', 'form', 'embed', 'object'],
    WHOLE_DOCUMENT: false,
  });

  const bodyContent = sanitized.trim().length > 0
    ? sanitized
    : '<p style="color:#5f6368;font-style:italic;">El contenido de este mensaje no se puede mostrar de forma segura.</p>';

  const doc = `<!DOCTYPE html>
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
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.65;
    word-break: break-word;
    overflow-x: hidden;
  }
  @media (prefers-color-scheme: dark) {
    html, body { color: #e2e2e9; }
    a { color: #a8c7fa; text-decoration: underline; }
    a:hover { color: #d3e3fd; }
    blockquote { border-left: 3px solid #a8c7fa; color: #9aa0a6; margin: 8px 0 8px 16px; padding-left: 12px; }
    pre, code { background: rgba(255,255,255,0.08); border-radius: 6px; padding: 2px 6px; font-size: 12px; font-family: monospace; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 16px 0; }
  }
  @media (prefers-color-scheme: light) {
    html, body { color: #1f1f1f; }
    a { color: #0b57d0; text-decoration: underline; }
    a:hover { color: #0842a0; }
    blockquote { border-left: 3px solid #0b57d0; color: #5f6368; margin: 8px 0 8px 16px; padding-left: 12px; }
    pre, code { background: rgba(0,0,0,0.05); border-radius: 6px; padding: 2px 6px; font-size: 12px; font-family: monospace; }
    hr { border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 16px 0; }
  }
  img { max-width: 100%; height: auto; display: block; }
  table { border-collapse: collapse; max-width: 100%; }
  td, th { padding: 4px 8px; vertical-align: top; }
  pre { padding: 12px; overflow-x: auto; }
</style>
</head>
<body>${bodyContent}</body>
</html>`;

  return { srcdoc: doc, hasExternalImages };
}

function PlainTextBody({ text }: { text: string }) {
  const cleanedText = (text || '')
    .replace(/&amp;hairsp;/gi, '')
    .replace(/&hairsp;/gi, '');

  if (!cleanedText.trim()) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Este mensaje no tiene contenido de texto.
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words font-sans">
      {cleanedText}
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
      imgs.forEach((img) => {
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

function SenderAvatar({ name, address }: { name: string; address: string }) {
  const letter = (name || address)[0]?.toUpperCase() ?? '?';
  const colors = [
    ['#2563eb', '#1d4ed8'],
    ['#0891b2', '#0e7490'],
    ['#059669', '#047857'],
    ['#7c3aed', '#6d28d9'],
    ['#db2777', '#be185d'],
    ['#ea580c', '#c2410c'],
    ['#4b5563', '#374151'],
  ];
  const idx = (name || address).charCodeAt(0) % colors.length;
  const [from, to] = colors[idx];
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none text-white shadow-xs"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
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
  onReplyAllClick,
  onForwardClick,
  onBack,
  isStandalone = false,
}: EmailReaderProps) {
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [allowExternalImages, setAllowExternalImages] = useState(false);

  useEffect(() => {
    setMoveDropdownOpen(false);
    setAiSummary(null);
    setLoadingSummary(false);
    setSummaryError(null);
    setAllowExternalImages(false);
  }, [email]);

  const handleSummarize = async () => {
    if (!email) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          emailContext: {
            from: email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address,
            subject: email.subject,
            body: email.body.text || email.body.html || '',
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.text);
      } else {
        const errData = await res.json();
        setSummaryError(errData.error || 'No se pudo obtener el resumen.');
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummaryError('Error de red al obtener el resumen.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handlePopOut = () => {
    if (typeof window !== 'undefined' && email) {
      const width = 900;
      const height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        `/mail/view?id=${email._id}`,
        `ViewEmail_${email._id}`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    }
  };

  if (!email) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center select-none bg-background">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
          <MailOpen className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold mb-1 text-foreground">
          Ningún correo seleccionado
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
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

  const rawHtml = email.body.html || '';
  const hasContent = rawHtml.trim().length > 0;
  const { srcdoc, hasExternalImages } = useMemo(() => {
    if (!hasContent) return { srcdoc: null, hasExternalImages: false };
    return buildEmailSrcdoc(email, allowExternalImages);
  }, [email, allowExternalImages, hasContent]);

  const phishingRisk = useMemo(() => {
    return checkPhishingRisk(email.from, email.authStatus);
  }, [email.from, email.authStatus]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-card animate-fadeIn">
      {/* Top action toolbar */}
      <div className="shrink-0 h-14 flex items-center justify-between px-4 md:px-6 gap-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </button>
          )}

          {/* Reply */}
          <button
            id="btn-reply"
            onClick={() => onReplyClick(email)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Responder</span>
          </button>

          {/* Reply All */}
          {onReplyAllClick && (
            <button
              id="btn-reply-all"
              onClick={() => onReplyAllClick(email)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <CornerUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Responder a todos</span>
            </button>
          )}

          {/* Forward */}
          {onForwardClick && (
            <button
              id="btn-forward"
              onClick={() => onForwardClick(email)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <Forward className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Reenviar</span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Star button */}
          <button
            id="btn-star"
            type="button"
            onClick={() => onUpdateEmailStatus([email._id], { isStarred: !email.isStarred })}
            title={email.isStarred ? 'Quitar de destacados' : 'Destacar mensaje'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            <Star className={`h-3.5 w-3.5 ${email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
            <span className="hidden sm:inline">{email.isStarred ? 'Destacado' : 'Destacar'}</span>
          </button>

          {/* Mark unread */}
          <button
            type="button"
            onClick={() => onUpdateEmailStatus([email._id], { isRead: false })}
            title="Marcar como no leído"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">No leído</span>
          </button>

          {/* Popout email button */}
          {!isStandalone && (
            <button
              id="btn-popout"
              type="button"
              onClick={handlePopOut}
              title="Ver en nueva ventana"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden sm:inline">Nueva ventana</span>
            </button>
          )}

          {/* Categorize / Move dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoveDropdownOpen(!moveDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden sm:inline">Mover</span>
              <ChevronDown
                className={`h-3 w-3 text-muted-foreground transition-transform ${
                  moveDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {moveDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoveDropdownOpen(false)} />
                <div className="absolute right-0 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl z-20 w-40 animate-fadeIn">
                  {[
                    { id: 'inbox', label: 'Principal' },
                    { id: 'personal', label: 'Personal' },
                    { id: 'work', label: 'Trabajo' },
                    { id: 'commercial', label: 'Comercial' },
                    { id: 'newsletter', label: 'Newsletter' },
                    { id: 'social', label: 'Redes Sociales' },
                  ].map((targetFolder) => {
                    const isCurrent = email.folder === targetFolder.id;
                    return (
                      <button
                        type="button"
                        key={targetFolder.id}
                        onClick={() => {
                          onUpdateEmailStatus([email._id], { folder: targetFolder.id });
                          setMoveDropdownOpen(false);
                        }}
                        disabled={isCurrent}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer font-medium mt-0.5 ${
                          isCurrent
                            ? 'bg-accent text-accent-foreground font-bold'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {targetFolder.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {email.folder !== 'inbox' && (
            <button
              id="btn-restore"
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'inbox' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <ArchiveRestore className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Recuperar</span>
            </button>
          )}

          {email.folder !== 'spam' ? (
            <button
              id="btn-spam"
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'spam' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Spam</span>
            </button>
          ) : (
            <button
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'inbox' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">No es Spam</span>
            </button>
          )}

          {email.folder !== 'trash' ? (
            <button
              id="btn-trash"
              onClick={() => onUpdateEmailStatus([email._id], { folder: 'trash' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          ) : (
            <button
              id="btn-delete-permanent"
              onClick={() => onDeletePermanent([email._id])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
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
        <div className="px-5 md:px-8 pt-6 pb-5 border-b border-border bg-card">
          <h1 className="text-lg md:text-xl font-bold mb-4 leading-snug select-text text-foreground">
            {email.subject || '(Sin asunto)'}
          </h1>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <SenderAvatar name={email.from.name} address={email.from.address} />
              <div>
                <p className="text-sm font-semibold select-text text-foreground">
                  {email.from.name || '(Sin nombre)'}{' '}
                  <span className="font-normal text-xs text-muted-foreground">
                    &lt;{email.from.address}&gt;
                  </span>
                </p>
                <p className="text-xs mt-0.5 select-text text-muted-foreground">
                  Para: {email.to.join(', ')}
                  {email.cc && email.cc.length > 0 && <span> · CC: {email.cc.join(', ')}</span>}
                </p>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {email.authStatus?.spf === 'fail' || email.authStatus?.dkim === 'fail' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <ShieldAlert className="h-3 w-3" />
                      Fallo de autenticación (SPF/DKIM)
                    </span>
                  ) : email.authStatus?.spf === 'pass' || email.authStatus?.dkim === 'pass' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="h-3 w-3" />
                      Verificado (SPF/DKIM)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                      <Shield className="h-3 w-3" />
                      Sin firma digital
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <time className="text-xs shrink-0 capitalize text-muted-foreground">
                {formattedDate}
              </time>

              <button
                type="button"
                onClick={handleSummarize}
                disabled={loadingSummary}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3 animate-pulse" />
                Resumir IA
              </button>
            </div>
          </div>
        </div>

        {/* AI Summary Section */}
        {(loadingSummary || aiSummary || summaryError) && (
          <div className="px-5 md:px-8 pt-6">
            <div className="rounded-2xl p-4 border border-primary/20 bg-primary/5 text-xs text-foreground">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-primary">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  Resumen por Gemini IA
                </h4>
                {aiSummary && (
                  <button
                    onClick={() => setAiSummary(null)}
                    className="text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
                  >
                    Ocultar
                  </button>
                )}
              </div>
              {loadingSummary && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Generando resumen inteligente...
                </div>
              )}
              {summaryError && <div className="text-destructive font-medium">{summaryError}</div>}
              {aiSummary && (
                <div className="text-foreground leading-relaxed whitespace-pre-line select-text">
                  {aiSummary}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phishing warning banner */}
        {phishingRisk.isSuspicious && (
          <div className="px-5 md:px-8 pt-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs animate-fadeIn">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">Aviso de seguridad: Remitente sospechoso</strong>
                <span>{phishingRisk.reason}</span>
              </div>
            </div>
          </div>
        )}

        {/* External Images Blocker banner */}
        {hasExternalImages && !allowExternalImages && (
          <div className="px-5 md:px-8 pt-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
                <span>Se han bloqueado las imágenes remotas para proteger tu privacidad y evitar rastreadores espía.</span>
              </div>
              <button
                type="button"
                onClick={() => setAllowExternalImages(true)}
                className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Mostrar imágenes
              </button>
            </div>
          </div>
        )}

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
            <div className="rounded-2xl p-4 space-y-3 bg-muted/40 border border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                <FileArchive className="h-4 w-4" />
                Archivos adjuntos ({realAttachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {realAttachments.map((att, index) => (
                  <a
                    key={index}
                    href={`/api/attachments?key=${att.r2Url}&filename=${encodeURIComponent(att.filename)}`}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/80 transition-colors text-xs text-foreground"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold truncate">{att.filename}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p>
                      </div>
                    </div>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ml-2 text-primary bg-primary/10">
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
