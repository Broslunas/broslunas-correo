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
  Send,
  Loader2,
  ChevronsUpDown,
  Paperclip,
  Printer,
  FileDown,
  Ban,
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
  threadId?: string;
  threadCount?: number;
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
  userEmail?: string;
  availableAccounts?: { email: string; name: string }[];
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
    color: inherit;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e5e7eb; }
    a { color: #60a5fa !important; }
    hr { border-color: rgba(255,255,255,0.1) !important; }
  }
  @media (prefers-color-scheme: light) {
    body { color: #1f2937; }
    a { color: #2563eb !important; }
    hr { border-color: rgba(0,0,0,0.08) !important; }
  }
  a { text-decoration: underline; }
  blockquote {
    border-left: 3px solid #3b82f6;
    margin: 12px 0;
    padding: 4px 12px;
    color: #6b7280;
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
      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none text-white shadow-xs"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {letter}
    </div>
  );
}

// Single message card inside conversation thread
function ThreadMessageItem({
  msg,
  isExpanded,
  isOnly,
  onToggle,
  onReplyClick,
  onForwardClick,
  onUpdateEmailStatus,
}: {
  msg: Email;
  isExpanded: boolean;
  isOnly: boolean;
  onToggle: () => void;
  onReplyClick: (email: Email) => void;
  onForwardClick?: (email: Email) => void;
  onUpdateEmailStatus: (ids: string[], updates: { isStarred?: boolean }) => void;
}) {
  const [allowExternalImages, setAllowExternalImages] = useState(false);

  const rawHtml = msg.body.html || '';
  const hasContent = rawHtml.trim().length > 0;
  const { srcdoc, hasExternalImages } = useMemo(() => {
    if (!hasContent) return { srcdoc: null, hasExternalImages: false };
    return buildEmailSrcdoc(msg, allowExternalImages);
  }, [msg, allowExternalImages, hasContent]);

  const phishingRisk = useMemo(() => {
    return checkPhishingRisk(msg.from, msg.authStatus);
  }, [msg.from, msg.authStatus]);

  const formattedDate = new Date(msg.date).toLocaleString('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const realAttachments = (msg.attachments || []).filter(
    (att) => att.disposition !== 'inline' && !att.contentId
  );

  if (!isExpanded) {
    return (
      <div
        onClick={onToggle}
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <SenderAvatar name={msg.from.name} address={msg.from.address} />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {msg.from.name || msg.from.address}
            </span>
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {msg.body.text ? msg.body.text.replace(/\s+/g, ' ').slice(0, 80) : '(Sin contenido de texto)'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          {realAttachments.length > 0 && <Paperclip className="h-3 w-3 text-muted-foreground" />}
          <span className="text-[11px]">{formattedDate}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-4">
      {/* Message Header */}
      <div
        onClick={!isOnly ? onToggle : undefined}
        className={`px-5 py-4 border-b border-border/60 bg-muted/10 ${!isOnly ? 'cursor-pointer hover:bg-muted/20' : ''}`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <SenderAvatar name={msg.from.name} address={msg.from.address} />
            <div>
              <p className="text-sm font-semibold select-text text-foreground">
                {msg.from.name || '(Sin nombre)'}{' '}
                <span className="font-normal text-xs text-muted-foreground">
                  &lt;{msg.from.address}&gt;
                </span>
              </p>
              <p className="text-xs mt-0.5 select-text text-muted-foreground">
                Para: {msg.to.join(', ')}
                {msg.cc && msg.cc.length > 0 && <span> · CC: {msg.cc.join(', ')}</span>}
              </p>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {msg.authStatus?.spf === 'fail' || msg.authStatus?.dkim === 'fail' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <ShieldAlert className="h-3 w-3" />
                    Fallo SPF/DKIM
                  </span>
                ) : msg.authStatus?.spf === 'pass' || msg.authStatus?.dkim === 'pass' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" />
                    Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                    <Shield className="h-3 w-3" />
                    Sin firma
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <time className="text-xs text-muted-foreground">
              {formattedDate}
            </time>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateEmailStatus([msg._id], { isStarred: !msg.isStarred });
              }}
              title={msg.isStarred ? 'Quitar de destacados' : 'Destacar'}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Star className={`h-3.5 w-3.5 ${msg.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReplyClick(msg);
              }}
              title="Responder a este mensaje"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
            </button>
            {onForwardClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onForwardClick(msg);
                }}
                title="Reenviar este mensaje"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Forward className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phishing warning banner */}
      {phishingRisk.isSuspicious && (
        <div className="mx-5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold block">Aviso de seguridad</span>
            <span>{phishingRisk.reason}</span>
          </div>
        </div>
      )}

      {/* External images banner */}
      {hasExternalImages && (
        <div className="mx-5 p-2.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between text-xs gap-3">
          <span className="text-muted-foreground text-[11px]">
            {allowExternalImages ? 'Mostrando imágenes remotas.' : 'Las imágenes externas han sido bloqueadas.'}
          </span>
          <button
            type="button"
            onClick={() => setAllowExternalImages(!allowExternalImages)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            {allowExternalImages ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{allowExternalImages ? 'Bloquear imágenes' : 'Cargar imágenes'}</span>
          </button>
        </div>
      )}

      {/* Message Body */}
      <div className="px-5 pb-4">
        {srcdoc ? <EmailIframe srcdoc={srcdoc} /> : <PlainTextBody text={msg.body.text} />}
      </div>

      {/* Attachments */}
      {realAttachments.length > 0 && (
        <div className="mx-5 mb-5 rounded-xl p-3 space-y-2 bg-muted/30 border border-border">
          <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
            <FileArchive className="h-3.5 w-3.5" />
            Adjuntos ({realAttachments.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {realAttachments.map((att, index) => (
              <a
                key={index}
                href={`/api/attachments?key=${att.r2Url}&filename=${encodeURIComponent(att.filename)}`}
                className="group flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-muted/80 transition-colors text-xs text-foreground"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold truncate">{att.filename}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p>
                  </div>
                </div>
                <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 ml-2 text-primary bg-primary/10">
                  <Download className="h-3 w-3" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
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
  userEmail,
  availableAccounts,
}: EmailReaderProps) {
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Mailboxes and domains for sender resolution
  const [mailboxes, setMailboxes] = useState<{ email: string; name: string }[]>(availableAccounts || []);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<string>('');

  useEffect(() => {
    if (availableAccounts && availableAccounts.length > 0) {
      setMailboxes(availableAccounts);
    }
  }, [availableAccounts]);

  useEffect(() => {
    fetch('/api/mailboxes')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.mailboxes && Array.isArray(data.mailboxes)) {
          setMailboxes(data.mailboxes);
        }
        if (data.domains && Array.isArray(data.domains)) {
          setAllowedDomains(data.domains);
        }
      })
      .catch(() => {});
  }, []);

  const isLocalAddress = (addr?: string) => {
    if (!addr) return false;
    const clean = addr.trim().toLowerCase();
    if (mailboxes.some((m) => m.email.toLowerCase() === clean)) return true;
    const domain = clean.split('@')[1];
    if (domain && allowedDomains.includes(domain)) return true;
    return false;
  };

  // Thread management
  const [threadMessages, setThreadMessages] = useState<Email[]>(email ? [email] : []);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(email ? [email._id] : []));
  const [quickReplyText, setQuickReplyText] = useState('');
  const [quickReplySending, setQuickReplySending] = useState(false);
  const [quickReplyError, setQuickReplyError] = useState<string | null>(null);

  useEffect(() => {
    setMoveDropdownOpen(false);
    setAiSummary(null);
    setLoadingSummary(false);
    setSummaryError(null);
    setQuickReplyText('');
    setQuickReplyError(null);

    if (!email) {
      setThreadMessages([]);
      setExpandedIds(new Set());
      return;
    }

    setThreadMessages([email]);
    setExpandedIds(new Set([email._id]));

    let isMounted = true;
    fetch(`/api/emails?id=${email._id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.threadEmails && Array.isArray(data.threadEmails) && data.threadEmails.length > 0) {
          setThreadMessages(data.threadEmails);
          // By default expand the newest message
          const latest = data.threadEmails[data.threadEmails.length - 1];
          setExpandedIds(new Set([latest._id]));
        }
      })
      .catch((err) => console.error('Error fetching thread:', err));

    return () => {
      isMounted = false;
    };
  }, [email?._id]);

  const toggleExpandMessage = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedIds.size === threadMessages.length) {
      // Keep only latest expanded
      const latest = threadMessages[threadMessages.length - 1];
      setExpandedIds(new Set(latest ? [latest._id] : []));
    } else {
      // Expand all
      setExpandedIds(new Set(threadMessages.map((m) => m._id)));
    }
  };

  const latestMessage = threadMessages[threadMessages.length - 1] || email;
  const isLatestFromLocal = latestMessage ? isLocalAddress(latestMessage.from?.address) : false;

  const toRecipient = latestMessage
    ? isLatestFromLocal
      ? ((latestMessage.to || []).find((a) => !isLocalAddress(a)) || latestMessage.to?.[0] || '')
      : (latestMessage.from?.address || '')
    : '';

  const recipientName = latestMessage
    ? isLatestFromLocal
      ? toRecipient
      : (latestMessage.from?.name || latestMessage.from?.address || '')
    : '';

  const defaultFrom = latestMessage
    ? isLatestFromLocal
      ? latestMessage.from.address
      : ((latestMessage.to || []).find((a) => isLocalAddress(a)) || (mailboxes[0]?.email || ''))
    : (mailboxes[0]?.email || '');

  useEffect(() => {
    if (defaultFrom) {
      setSelectedFrom(defaultFrom);
    }
  }, [defaultFrom]);

  const handleQuickReplySend = async () => {
    if (!quickReplyText.trim() || !email) return;
    setQuickReplySending(true);
    setQuickReplyError(null);

    try {
      const latestMsg = threadMessages[threadMessages.length - 1] || email;
      const fromSender = selectedFrom || defaultFrom || (Array.isArray(latestMsg.to) && latestMsg.to[0]) || '';
      const replySubject = latestMsg.subject.startsWith('Re:') ? latestMsg.subject : `Re: ${latestMsg.subject}`;

      if (!fromSender) {
        setQuickReplyError('No se encontró una cuenta remitente válida autorizada en el servidor.');
        setQuickReplySending(false);
        return;
      }
      if (!toRecipient) {
        setQuickReplyError('No se encontró el destinatario para responder.');
        setQuickReplySending(false);
        return;
      }

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromSender,
          to: [toRecipient],
          subject: replySubject,
          bodyText: quickReplyText,
          bodyHtml: `<p>${quickReplyText.replace(/\n/g, '<br>')}</p>`,
          inReplyTo: latestMsg.messageId || undefined,
          references: latestMsg.messageId ? `${latestMsg.references || ''} ${latestMsg.messageId}`.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQuickReplyText('');
        // Refresh thread emails
        const refRes = await fetch(`/api/emails?id=${email._id}`);
        if (refRes.ok) {
          const refData = await refRes.json();
          if (refData.threadEmails) {
            setThreadMessages(refData.threadEmails);
            const newest = refData.threadEmails[refData.threadEmails.length - 1];
            setExpandedIds((prev) => {
              const next = new Set(Array.from(prev));
              next.add(newest._id);
              return next;
            });
          }
        }
      } else {
        setQuickReplyError(data.error || 'Error al enviar respuesta rápida');
      }
    } catch (err: any) {
      setQuickReplyError('Error de conexión al enviar respuesta');
    } finally {
      setQuickReplySending(false);
    }
  };

  const handleSummarize = async () => {
    if (!email) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const fullContext = threadMessages
        .map((m) => `De: ${m.from.name || m.from.address}\nTexto: ${m.body.text || m.body.html || ''}`)
        .join('\n---\n');

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          emailContext: {
            from: email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address,
            subject: email.subject,
            body: fullContext,
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

  const handlePrintEmail = () => {
    if (!email) return;
    const printWindow = window.open('', '_blank');
    const latest = threadMessages[threadMessages.length - 1] || email;
    const bodyHtml = latest.body.html || `<p>${(latest.body.text || '').replace(/\n/g, '<br>')}</p>`;
    const dateStr = new Date(latest.date).toLocaleString('es-ES');

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${latest.subject || 'Correo'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.5; }
    .header { border-bottom: 2px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
    .subject { font-size: 20px; font-weight: bold; margin-bottom: 15px; }
    .meta { font-size: 13px; color: #555; line-height: 1.6; }
    .meta strong { color: #222; }
    .content { font-size: 14px; line-height: 1.6; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="subject">${latest.subject || '(Sin Asunto)'}</div>
    <div class="meta">
      <div><strong>De:</strong> ${latest.from.name ? `${latest.from.name} &lt;${latest.from.address}&gt;` : latest.from.address}</div>
      <div><strong>Para:</strong> ${latest.to.join(', ')}</div>
      ${latest.cc && latest.cc.length > 0 ? `<div><strong>CC:</strong> ${latest.cc.join(', ')}</div>` : ''}
      <div><strong>Fecha:</strong> ${dateStr}</div>
    </div>
  </div>
  <div class="content">
    ${bodyHtml}
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportEml = () => {
    if (!email) return;
    const latest = threadMessages[threadMessages.length - 1] || email;
    const dateUTC = new Date(latest.date).toUTCString();
    const messageId = latest.messageId || `<${latest._id}@broslunas.local>`;
    const bodyContent = latest.body.html || latest.body.text || '';

    const emlLines = [
      `From: ${latest.from.name ? `"${latest.from.name}" <${latest.from.address}>` : latest.from.address}`,
      `To: ${latest.to.join(', ')}`,
      latest.cc && latest.cc.length > 0 ? `Cc: ${latest.cc.join(', ')}` : '',
      `Subject: ${latest.subject || '(Sin Asunto)'}`,
      `Date: ${dateUTC}`,
      `Message-ID: ${messageId}`,
      latest.inReplyTo ? `In-Reply-To: ${latest.inReplyTo}` : '',
      latest.references ? `References: ${latest.references}` : '',
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      bodyContent
    ].filter(line => line !== null && line !== undefined);

    const emlString = emlLines.join('\r\n');
    const blob = new Blob([emlString], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSubject = (latest.subject || 'correo').replace(/[^a-z0-9áéíóúñ_\-]/gi, '_').slice(0, 50);
    a.download = `${safeSubject}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [blockingSender, setBlockingSender] = useState(false);
  const [blacklist, setBlacklist] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/user/blacklist')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.blacklist)) {
          setBlacklist(data.blacklist.map((e: string) => e.toLowerCase()));
        }
      })
      .catch(() => {});
  }, []);

  const isSenderBlocked = useMemo(() => {
    if (!email?.from?.address) return false;
    return blacklist.includes(email.from.address.toLowerCase().trim());
  }, [email, blacklist]);

  const handleBlockSender = async () => {
    if (!email || !email.from?.address) return;
    const sender = email.from.address.toLowerCase().trim();
    if (!confirm(`¿Bloquear al remitente "${sender}"?\n\nLos futuros correos de este remitente se clasificarán automáticamente en Spam y este hilo se moverá a Spam ahora.`)) {
      return;
    }

    setBlockingSender(true);
    try {
      const res = await fetch('/api/user/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sender })
      });
      if (res.ok) {
        setBlacklist((prev) => [...prev, sender]);
        onUpdateEmailStatus(allThreadIds, { folder: 'spam' });
      } else {
        const d = await res.json();
        alert(d.error || 'Error al bloquear remitente');
      }
    } catch {
      alert('Error de red al bloquear remitente');
    } finally {
      setBlockingSender(false);
    }
  };

  const handleUnblockSender = async () => {
    if (!email || !email.from?.address) return;
    const sender = email.from.address.toLowerCase().trim();
    setBlockingSender(true);
    try {
      const res = await fetch('/api/user/blacklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sender })
      });
      if (res.ok) {
        setBlacklist((prev) => prev.filter((e) => e !== sender));
        onUpdateEmailStatus(allThreadIds, { folder: 'inbox' });
      } else {
        const d = await res.json();
        alert(d.error || 'Error al desbloquear remitente');
      }
    } catch {
      alert('Error de red al desbloquear remitente');
    } finally {
      setBlockingSender(false);
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

  const allThreadIds = threadMessages.map((m) => m._id);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-card animate-fadeIn">
      {/* Top action toolbar */}
      <div className="shrink-0 h-14 flex items-center justify-between px-3 sm:px-4 md:px-6 gap-2 border-b border-border bg-card relative z-20">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              title="Volver"
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer mr-1 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Volver</span>
            </button>
          )}

          {/* Reply */}
          <button
            id="btn-reply"
            onClick={() => onReplyClick(latestMessage)}
            title="Responder"
            className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Responder</span>
          </button>

          {/* Reply All */}
          {onReplyAllClick && (
            <button
              id="btn-reply-all"
              onClick={() => onReplyAllClick(latestMessage)}
              title="Responder a todos"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
            >
              <CornerUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden 2xl:inline">Responder a todos</span>
            </button>
          )}

          {/* Forward */}
          {onForwardClick && (
            <button
              id="btn-forward"
              onClick={() => onForwardClick(latestMessage)}
              title="Reenviar"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
            >
              <Forward className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden 2xl:inline">Reenviar</span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Star button */}
          <button
            id="btn-star"
            type="button"
            onClick={() => onUpdateEmailStatus(allThreadIds, { isStarred: !email.isStarred })}
            title={email.isStarred ? 'Quitar de destacados' : 'Destacar mensaje'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
          >
            <Star className={`h-3.5 w-3.5 ${email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
            <span className="hidden 2xl:inline">{email.isStarred ? 'Destacado' : 'Destacar'}</span>
          </button>

          {/* Mark unread */}
          <button
            type="button"
            onClick={() => onUpdateEmailStatus(allThreadIds, { isRead: false })}
            title="Marcar como no leído"
            className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
          >
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden 2xl:inline">No leído</span>
          </button>

          {/* Popout email button */}
          {!isStandalone && (
            <button
              id="btn-popout"
              type="button"
              onClick={handlePopOut}
              title="Ver en nueva ventana"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden 2xl:inline">Nueva ventana</span>
            </button>
          )}

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrintEmail}
            title="Imprimir correo"
            className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden 2xl:inline">Imprimir</span>
          </button>

          {/* Export .eml button */}
          <button
            type="button"
            onClick={handleExportEml}
            title="Descargar como archivo .eml"
            className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
          >
            <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden 2xl:inline">Exportar</span>
          </button>

          {/* Block / Unblock sender button */}
          {email.from?.address && (
            isSenderBlocked ? (
              <button
                type="button"
                onClick={handleUnblockSender}
                disabled={blockingSender}
                title={`Desbloquear remitente ${email.from.address}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="hidden 2xl:inline">Desbloquear</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBlockSender}
                disabled={blockingSender}
                title={`Bloquear remitente ${email.from.address}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors cursor-pointer shrink-0"
              >
                <Ban className="h-3.5 w-3.5" />
                <span className="hidden 2xl:inline">Bloquear</span>
              </button>
            )
          )}

          {/* Categorize / Move dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMoveDropdownOpen(!moveDropdownOpen)}
              title="Mover a carpeta"
              className="flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
            >
              <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden xl:inline">Mover</span>
              <ChevronDown
                className={`h-3 w-3 text-muted-foreground transition-transform ${
                  moveDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {moveDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMoveDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 rounded-xl border border-border bg-card p-1 shadow-2xl z-30 w-44 animate-fadeIn">
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
                          onUpdateEmailStatus(allThreadIds, { folder: targetFolder.id });
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
              onClick={() => onUpdateEmailStatus(allThreadIds, { folder: 'inbox' })}
              title="Recuperar a recibidos"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
            >
              <ArchiveRestore className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden 2xl:inline">Recuperar</span>
            </button>
          )}

          {email.folder !== 'spam' ? (
            <button
              id="btn-spam"
              onClick={() => onUpdateEmailStatus(allThreadIds, { folder: 'spam' })}
              title="Marcar como spam"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-muted text-amber-600 dark:text-amber-400 transition-colors cursor-pointer shrink-0"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">Spam</span>
            </button>
          ) : (
            <button
              onClick={() => onUpdateEmailStatus(allThreadIds, { folder: 'inbox' })}
              title="Marcar como no spam"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">No es Spam</span>
            </button>
          )}

          {email.folder !== 'trash' ? (
            <button
              id="btn-trash"
              onClick={() => onUpdateEmailStatus(allThreadIds, { folder: 'trash' })}
              title="Mover a la papelera"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs border border-border bg-background hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">Eliminar</span>
            </button>
          ) : (
            <button
              id="btn-delete-permanent"
              onClick={() => onDeletePermanent(allThreadIds)}
              title="Eliminar definitivamente"
              className="flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3 rounded-full text-xs font-semibold bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">Eliminar definitivo</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable email content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
        {/* Thread Header */}
        <div className="pb-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg md:text-xl font-bold leading-snug select-text text-foreground">
              {email.subject || '(Sin asunto)'}
            </h1>
            {threadMessages.length > 1 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Conversación con {threadMessages.length} mensajes
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {threadMessages.length > 1 && (
              <button
                type="button"
                onClick={toggleExpandAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer font-medium"
              >
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {expandedIds.size === threadMessages.length ? 'Colapsar anteriores' : 'Expandir todos'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSummarize}
              disabled={loadingSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3 animate-pulse" />
              Resumir hilo con IA
            </button>
          </div>
        </div>

        {/* AI Summary Section */}
        {(loadingSummary || aiSummary || summaryError) && (
          <div className="rounded-2xl p-4 border border-primary/20 bg-primary/5 text-xs text-foreground">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-primary">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Resumen por IA
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
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Generando resumen inteligente de la conversación...</span>
              </div>
            )}

            {summaryError && (
              <p className="text-destructive font-medium">{summaryError}</p>
            )}

            {aiSummary && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                {aiSummary}
              </div>
            )}
          </div>
        )}

        {/* Blocked Sender Banner */}
        {isSenderBlocked && (
          <div className="rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10 text-xs text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertOctagon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  El remitente <span className="font-mono text-amber-700 dark:text-amber-300">&lt;{email.from.address}&gt;</span> está bloqueado.
                </p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  Sus mensajes se desvían automáticamente a <strong>Spam</strong>. Si este correo te interesa, puedes desbloquear al remitente para restaurar el mensaje a tu bandeja principal.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleUnblockSender}
                disabled={blockingSender}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Desbloquear y Restaurar
              </button>
            </div>
          </div>
        )}

        {/* Chronological Message Chain */}
        <div className="space-y-3">
          {threadMessages.map((msg) => (
            <ThreadMessageItem
              key={msg._id}
              msg={msg}
              isExpanded={expandedIds.has(msg._id)}
              isOnly={threadMessages.length === 1}
              onToggle={() => toggleExpandMessage(msg._id)}
              onReplyClick={onReplyClick}
              onForwardClick={onForwardClick}
              onUpdateEmailStatus={onUpdateEmailStatus}
            />
          ))}
        </div>

        {/* Quick Reply Box */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CornerUpLeft className="h-3.5 w-3.5 text-primary" />
              Respuesta rápida a {recipientName || (latestMessage ? (latestMessage.from.name || latestMessage.from.address) : '')}
            </span>
            <button
              type="button"
              onClick={() => onReplyClick(latestMessage)}
              className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
            >
              Abrir en editor completo
            </button>
          </div>

          <textarea
            value={quickReplyText}
            onChange={(e) => setQuickReplyText(e.target.value)}
            placeholder="Escribe una respuesta rápida aquí..."
            rows={3}
            className="w-full rounded-xl p-3 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />

          {quickReplyError && (
            <p className="text-xs text-destructive font-medium">{quickReplyError}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
              <span>De:</span>
              {mailboxes.length > 1 ? (
                <select
                  value={selectedFrom || defaultFrom}
                  onChange={(e) => setSelectedFrom(e.target.value)}
                  className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                >
                  {mailboxes.map((m) => (
                    <option key={m.email} value={m.email}>
                      {m.email}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-foreground">{selectedFrom || defaultFrom || 'Buzón principal'}</span>
              )}
              <span className="text-muted-foreground/60">•</span>
              <span>Para:</span>
              <span className="font-semibold text-foreground">{toRecipient || latestMessage.from.address}</span>
            </div>

            <button
              type="button"
              disabled={!quickReplyText.trim() || quickReplySending}
              onClick={handleQuickReplySend}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs shrink-0"
            >
              {quickReplySending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Enviar respuesta
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
