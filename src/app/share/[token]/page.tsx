'use client';

import React, { useEffect, useState, use } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Mail, Lock, Key, Calendar, Eye, Download, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface SharedEmailData {
  subject: string;
  date: string;
  from: { name: string; address: string };
  to: string[];
  body: { text: string; html: string };
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    r2Url: string;
  }>;
}

export default function SharedEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [emailData, setEmailData] = useState<SharedEmailData | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [views, setViews] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const fetchSharedEmail = async (pwd?: string) => {
    setLoading(true);
    setError('');
    try {
      const headers: Record<string, string> = {};
      if (pwd) {
        headers['x-share-password'] = pwd;
      }
      const res = await fetch(`/api/emails/share?token=${encodeURIComponent(token)}`, {
        headers,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailData(data.email);
        setRequiresPassword(false);
        setViews(data.views || 1);
        setExpiresAt(data.expiresAt || null);
      } else if (res.status === 401 && data.requiresPassword) {
        setRequiresPassword(true);
        if (pwd) {
          setError('Contraseña incorrecta. Inténtalo de nuevo.');
        }
      } else {
        setError(data.error || 'No se pudo cargar el correo compartido.');
      }
    } catch {
      setError('Error de conexión al cargar el correo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSharedEmail();
    }
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    fetchSharedEmail(password);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start p-4 sm:p-8">
      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between pb-6 mb-6 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Broslunas Correo</h1>
            <p className="text-[11px] text-muted-foreground">Vista pública compartida</p>
          </div>
        </div>
        {expiresAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border">
            <Calendar className="h-3 w-3 text-primary" />
            <span>Expira: {new Date(expiresAt).toLocaleDateString('es-ES')}</span>
          </div>
        )}
      </header>

      <main className="w-full max-w-4xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">Cargando correspondencia compartida...</span>
          </div>
        ) : requiresPassword ? (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl border border-border bg-card shadow-lg animate-fadeIn">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary mx-auto">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-center mb-1">Contenido protegido</h2>
            <p className="text-xs text-muted-foreground text-center mb-6">
              El remitente protegió este correo con una contraseña. Introdúcela para acceder.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce la contraseña..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Desbloquear correo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <h2 className="text-sm font-bold text-foreground mb-1">Enlace no disponible</h2>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : emailData ? (
          <article className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-fadeIn">
            {/* Subject and metadata header */}
            <div className="p-5 sm:p-6 border-b border-border bg-muted/20">
              <h2 className="text-lg sm:text-xl font-bold mb-3 text-foreground">
                {emailData.subject || '(Sin asunto)'}
              </h2>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {emailData.from.name || emailData.from.address}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      &lt;{emailData.from.address}&gt;
                    </span>
                  </div>
                  {emailData.to && emailData.to.length > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Para: {emailData.to.join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                  <span>{new Date(emailData.date).toLocaleString('es-ES')}</span>
                  <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border border-border">
                    <Eye className="h-3 w-3" />
                    {views} {views === 1 ? 'vista' : 'vistas'}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="p-5 sm:p-8">
              {emailData.body.html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none break-words"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(emailData.body.html, {
                      ADD_TAGS: ['style'],
                      ADD_ATTR: ['target', 'src', 'style', 'class', 'id', 'align', 'valign'],
                    }),
                  }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90">
                  {emailData.body.text}
                </pre>
              )}
            </div>

            {/* Attachments section if any */}
            {emailData.attachments && emailData.attachments.length > 0 && (
              <div className="p-5 border-t border-border bg-muted/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Archivos adjuntos ({emailData.attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {emailData.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={`/api/attachments?key=${encodeURIComponent(att.r2Url)}&filename=${encodeURIComponent(att.filename)}`}
                      download={att.filename}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-xs"
                    >
                      <div className="truncate mr-2">
                        <p className="font-semibold text-foreground truncate">{att.filename}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p>
                      </div>
                      <Download className="h-4 w-4 text-primary shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </article>
        ) : null}
      </main>

      <footer className="mt-12 text-center text-xs text-muted-foreground/60">
        Generado con Broslunas Correo Webmail
      </footer>
    </div>
  );
}
