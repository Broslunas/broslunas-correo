'use client';

import React, { useEffect, useState, use } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  FileText,
  Download,
  Calendar,
  Lock,
  Mail,
  CheckCircle,
  FileArchive,
  ArrowRight,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface PreRevealMeta {
  from: { name?: string; address: string };
  to?: string[];
  subject: string;
  date: string;
  maxViews?: number | null;
  viewCount: number;
  expiresAt?: string | null;
  hasAttachments: boolean;
  attachmentCount: number;
}

interface RevealedData {
  from: { name?: string; address: string };
  to?: string[];
  cc?: string[];
  subject: string;
  date: string;
  body: { text: string; html: string };
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    r2Url: string;
  }>;
  viewCount: number;
  maxViews?: number | null;
  expiresAt?: string | null;
  isBurnedNow: boolean;
}

export default function BurnEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState('');
  const [isBurned, setIsBurned] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [meta, setMeta] = useState<PreRevealMeta | null>(null);
  const [revealedData, setRevealedData] = useState<RevealedData | null>(null);

  // Initial check: get status and pre-reveal metadata WITHOUT consuming view count
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const checkStatus = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/self-destruct?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok) {
          setError(data.error || 'Error al comprobar el mensaje.');
          return;
        }

        if (data.isBurned) {
          setIsBurned(true);
          setIsExpired(!!data.isExpired);
          setMeta({
            from: data.from || { address: 'remitente' },
            subject: data.subject || '(Sin Asunto)',
            date: data.date || new Date().toISOString(),
            viewCount: 0,
            hasAttachments: false,
            attachmentCount: 0,
          });
          return;
        }

        if (data.requiresConfirmation) {
          setMeta(data);
        }
      } catch {
        if (isMounted) setError('Error de conexión con el servidor seguro.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handler to reveal content after user confirms the warning
  const handleReveal = async () => {
    setRevealing(true);
    setError('');
    try {
      const res = await fetch(`/api/self-destruct?token=${encodeURIComponent(token)}&reveal=true`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo revelar el mensaje.');
        return;
      }

      if (data.isBurned) {
        setIsBurned(true);
        setIsExpired(!!data.isExpired);
        return;
      }

      if (data.success) {
        setRevealedData(data);
      }
    } catch {
      setError('Error de conexión al revelar el contenido.');
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8">
      {/* Top branding header */}
      <header className="w-full max-w-3xl flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Broslunas Correo Seguro</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Autodestrucción
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Servicio de mensajes confidenciales temporales</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <Lock className="h-3 w-3 text-sky-400" />
          <span className="hidden sm:inline">Cifrado de tránsito</span>
        </div>
      </header>

      <main className="w-full max-w-3xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-72 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Verificando estado del mensaje confidencial...</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-center max-w-md mx-auto my-12 space-y-3">
            <AlertTriangle className="h-8 w-8 mx-auto text-rose-400" />
            <h2 className="text-sm font-bold text-white">No se pudo acceder al mensaje</h2>
            <p className="text-xs leading-relaxed text-rose-200">{error}</p>
          </div>
        ) : isBurned ? (
          /* Burned / Expired Screen */
          <div className="max-w-md mx-auto my-10 p-8 rounded-3xl border border-rose-500/30 bg-[#111827] shadow-2xl text-center space-y-5 animate-fadeIn">
            <div className="h-16 w-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Flame className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isExpired ? 'Mensaje expirado' : 'Mensaje autodestruido'}
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {isExpired
                  ? 'El plazo máximo establecido por el remitente para consultar este correo ha vencido.'
                  : 'Este mensaje ha alcanzado su límite de visualizaciones y el acceso ha sido revocado permanentemente.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d131f] border border-slate-800 text-xs text-left space-y-1 text-slate-300">
              <div className="truncate">
                <span className="font-semibold text-white">Remitente: </span>
                {meta?.from?.name ? `${meta.from.name} <${meta.from.address}>` : meta?.from?.address}
              </div>
              <div className="truncate">
                <span className="font-semibold text-white">Asunto: </span>
                {meta?.subject}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Por motivos de seguridad y confidencialidad, el acceso a este mensaje y a sus archivos adjuntos ha sido revocado de forma definitiva.
            </p>
          </div>
        ) : !revealedData && meta ? (
          /* Step 1: Warning Confirmation Screen before viewing */
          <div className="max-w-lg mx-auto my-6 p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827] shadow-2xl space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Advertencia de autodestrucción</h2>
                <p className="text-xs text-slate-400">Se requiere confirmación previa antes de abrir</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Has recibido un mensaje confidencial enviado por{' '}
              <strong className="text-white">
                {meta.from.name ? `${meta.from.name} (${meta.from.address})` : meta.from.address}
              </strong>
              .
            </p>

            {/* Email Metadata Card */}
            <div className="rounded-2xl bg-[#0d131f] border border-slate-800 p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 shrink-0 font-medium">Asunto:</span>
                <span className="font-semibold text-white text-right truncate max-w-xs">{meta.subject}</span>
              </div>
              {meta.maxViews && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 shrink-0 font-medium">Visualizaciones permitidas:</span>
                  <span className="font-semibold text-rose-400 font-mono">
                    {meta.maxViews - meta.viewCount} restante(s) de {meta.maxViews}
                  </span>
                </div>
              )}
              {meta.expiresAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 shrink-0 font-medium">Fecha de expiración:</span>
                  <span className="font-semibold text-slate-200">
                    {new Date(meta.expiresAt).toLocaleString('es-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}
              {meta.hasAttachments && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 shrink-0 font-medium">Archivos adjuntos:</span>
                  <span className="font-semibold text-sky-400 flex items-center gap-1">
                    <FileArchive className="h-3.5 w-3.5" />
                    {meta.attachmentCount} archivo(s)
                  </span>
                </div>
              )}
            </div>

            {/* High-visibility Warning Notice */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-[#201505] text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-300">¿Deseas revelar el contenido ahora?</p>
                <p className="leading-relaxed text-[11px] text-amber-200/90">
                  Al pulsar el botón de abajo, se consumirá <strong>1 visualización</strong> del mensaje. Si se alcanza el límite de visualizaciones, el acceso al mensaje se revocará permanentemente y no podrás volver a consultarlo.
                </p>
              </div>
            </div>

            {/* Big Action Button */}
            <button
              type="button"
              disabled={revealing}
              onClick={handleReveal}
              className="w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {revealing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Revelando mensaje confidencial...</span>
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4" />
                  <span>Confirmar y revelar mensaje confidencial</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ) : revealedData ? (
          /* Step 2: Revealed Content */
          <div className="space-y-6 animate-fadeIn">
            {/* Status Notice Banner */}
            {revealedData.isBurnedNow ? (
              <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-300 text-xs flex items-center gap-2.5 font-semibold">
                <Flame className="h-4 w-4 shrink-0 text-rose-400 animate-pulse" />
                <span>
                  🔥 Última visualización consumida. El acceso a este mensaje ha sido revocado y no podrá volver a abrirse.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">Visualización {revealedData.viewCount} de {revealedData.maxViews}</span>
                </div>
                {revealedData.maxViews && (
                  <span className="text-[11px] font-medium bg-slate-900 px-2.5 py-0.5 rounded-full border border-rose-500/30 text-rose-300">
                    Quedan {revealedData.maxViews - revealedData.viewCount} apertura(s)
                  </span>
                )}
              </div>
            )}

            {/* Email card */}
            <div className="rounded-3xl border border-slate-800 bg-[#111827] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 space-y-3 bg-[#0d131f]">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {revealedData.subject || '(Sin Asunto)'}
                  </h2>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <span className="text-slate-400 font-normal">De:</span>
                    <span>{revealedData.from.name || revealedData.from.address}</span>
                    <span className="text-slate-400 font-normal">&lt;{revealedData.from.address}&gt;</span>
                  </div>
                  {revealedData.to && revealedData.to.length > 0 && (
                    <div className="text-slate-400 text-[11px]">
                      <span>Para: </span>
                      <span className="text-slate-300">{revealedData.to.join(', ')}</span>
                    </div>
                  )}
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5 pt-0.5">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>
                      {new Date(revealedData.date).toLocaleString('es-ES', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-6 sm:p-8 bg-[#111827] text-slate-100">
                {revealedData.body.html ? (
                  <div
                    className="prose prose-invert max-w-none text-slate-200 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(revealedData.body.html, {
                        ADD_TAGS: ['style'],
                        ADD_ATTR: ['target', 'src', 'style', 'class', 'href'],
                        FORBID_TAGS: ['script', 'iframe', 'form'],
                      }),
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200 font-sans">
                    {revealedData.body.text}
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {revealedData.attachments && revealedData.attachments.length > 0 && (
                <div className="p-6 border-t border-slate-800 bg-[#0d131f] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-sky-400">
                    <FileArchive className="h-4 w-4" />
                    Archivos adjuntos ({revealedData.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {revealedData.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={`/api/attachments?key=${encodeURIComponent(att.r2Url)}&filename=${encodeURIComponent(att.filename)}`}
                        download={att.filename}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-[#161c28] hover:bg-slate-800 transition-colors text-xs text-white group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-sky-400 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold truncate">{att.filename}</p>
                            <p className="text-[10px] text-slate-400">{formatBytes(att.size)}</p>
                          </div>
                        </div>
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ml-2 text-sky-400 bg-sky-500/10 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
