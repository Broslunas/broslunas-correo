import React from 'react';
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
  contentId?: string | null;  // e.g. "<image001@domain>" for inline images
  disposition?: string | null; // 'inline' or 'attachment'
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

export default function EmailReader({
  email,
  onUpdateEmailStatus,
  onDeletePermanent,
  onReplyClick
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

  // Sanitize the HTML content safely using isomorphic-dompurify
  // Inline images: replace cid: references with real R2 proxy URLs before sanitizing
  const getSanitizedContent = (htmlContent: string) => {
    let processedHtml = htmlContent;

    const attachments = email.attachments || [];
    const imageAttachments = attachments.filter(a => a.contentType?.startsWith('image/'));

    // --- Strategy 1: Exact contentId match (new emails with updated worker) ---
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
    // Match remaining cid: references to image attachments by order
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
    // Prevents broken image placeholders from cluttering the email view
    processedHtml = processedHtml.replace(/<img[^>]*src=["'][^"']*cid:[^"']*["'][^>]*\/?>/gi, '');

    return {
      __html: DOMPurify.sanitize(processedHtml, {
        ADD_ATTR: ['target', 'src'],
        ADD_URI_SAFE_ATTR: ['src'],
        FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'embed', 'object'],
      })
    };
  };

  // Convert plain text breaks into HTML breaks
  const formatTextBody = (text: string) => {
    return text.split('\n').map((str, index) => (
      <React.Fragment key={index}>
        {str}
        <br />
      </React.Fragment>
    ));
  };

  const formattedDate = new Date(email.date).toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

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

        {/* Categories/Folders Actions */}
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

      {/* Reader Panel Scrollable content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        
        {/* Email Header Metadata */}
        <div className="space-y-4 border-b border-border/50 pb-6">
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

        {/* Attachments Section — only real (non-inline) attachments */}
        {(() => {
          const realAttachments = (email.attachments || []).filter(
            (att) => !(
              // Treat as inline if disposition is 'inline' OR it has a cid and is an image type
              att.disposition === 'inline' ||
              (att.contentId && att.contentType?.startsWith('image/'))
            )
          );
          return realAttachments.length > 0 ? (
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
          ) : null;
        })()}

        {/* HTML / Text Content display */}
        <div className="prose prose-invert max-w-none text-sm text-neutral-200 select-text leading-relaxed">
          {email.body.html ? (
            <div 
              className="webmail-html-body"
              dangerouslySetInnerHTML={getSanitizedContent(email.body.html)} 
            />
          ) : (
            <div className="font-sans whitespace-pre-wrap">
              {formatTextBody(email.body.text)}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
