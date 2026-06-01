'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mail, RefreshCw, Copy, Inbox, Trash2, Shield, Download,
  AlertCircle, WifiOff, ChevronDown, Clock, Paperclip,
  Eye, EyeOff, Palette, Sparkles, QrCode, ArrowLeft, Lock,
  CheckCircle2, Search,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceStrict, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Toaster, toast } from 'sonner';
import { generateFunnyEmailName } from '@/lib/tempmail/nameGenerator';
import { playNotificationSound } from '@/lib/tempmail/audio';

/* ── Constants ── */
const DOMAINS_RAW = process.env.NEXT_PUBLIC_TEMPMAIL_DOMAINS || 'broslunas.link';
const DOMAINS = DOMAINS_RAW.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
const TTL_MS = 24 * 60 * 60 * 1000;

/* ── Types ── */
interface TmAttachment {
  filename: string;
  mimeType: string;
  size: number;
  r2Url: string;
}

interface TmEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  date: string;
  attachments?: TmAttachment[];
  otp?: string | null;
  isNew?: boolean;
}

/* ── Avatar gradient ── */
function getDynamicAvatarGradient(email: string) {
  if (!email) return 'linear-gradient(135deg, #d4af37, #8b5cf6)';
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    'linear-gradient(135deg, #d4af37, #f3e5ab)',
    'linear-gradient(135deg, #c5a880, #854d0e)',
    'linear-gradient(135deg, #d4af37, #1e1b4b)',
    'linear-gradient(135deg, #b45309, #fde047)',
    'linear-gradient(135deg, #c5a880, #57534e)',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function TempMailDashboard() {
  const [emailAddress, setEmailAddress] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(DOMAINS[0]);
  const [isDomainOpen, setIsDomainOpen] = useState(false);

  const [emails, setEmails] = useState<TmEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<TmEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [theme, setTheme] = useState('classic');
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [emailInvertColors, setEmailInvertColors] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [radarText, setRadarText] = useState('Escaneando base de datos...');
  const prevCount = useRef(0);

  /* ── Radar text loop ── */
  useEffect(() => {
    const msgs = [
      'Consultando base de datos MongoDB...', 'Estableciendo canal cifrado...',
      'Escudo Broslunas activo...', 'Escuchando correos entrantes...',
      'Comprobando firmas SPF/DKIM...', 'Filtrando rastreadores...',
    ];
    let i = 0;
    const iv = setInterval(() => { i = (i + 1) % msgs.length; setRadarText(msgs[i]); }, 4500);
    return () => clearInterval(iv);
  }, []);

  /* ── Online status ── */
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => { setIsOnline(true); toast.success('Conexión restaurada'); };
    const off = () => { setIsOnline(false); toast.error('Conexión perdida', { duration: 5000 }); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* ── TTL countdown ── */
  useEffect(() => {
    const iv = setInterval(() => {
      const t = localStorage.getItem('tm_created');
      if (!t) return;
      const expiry = parseInt(t) + TTL_MS;
      const now = Date.now();
      if (expiry > now) setTimeRemaining(formatDistanceStrict(expiry, now, { locale: es }));
      else { setTimeRemaining('Expirado'); handleGenerate(); }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Theme init ── */
  useEffect(() => {
    const saved = localStorage.getItem('tm_theme') || 'classic';
    setTheme(saved);
    setIsMounted(true);
  }, []);

  /* ── Panic button (Esc×2 or Ctrl+Shift+X) ── */
  useEffect(() => {
    let count = 0;
    let timer: ReturnType<typeof setTimeout>;
    const triggerPanic = () => {
      toast.error('¡Secuencia de escape! Limpiando sesión...', { duration: 1000 });
      localStorage.removeItem('tm_address');
      localStorage.removeItem('tm_created');
      localStorage.removeItem('tm_session_token');
      setEmailAddress(''); setEmails([]); setSelectedEmail(null);
      setTimeout(() => { window.location.href = 'https://www.google.com'; }, 500);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        count++;
        if (count === 2) triggerPanic();
        clearTimeout(timer);
        timer = setTimeout(() => { count = 0; }, 1000);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') triggerPanic();
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, []);

  /* ── Create / restore session ── */
  const createSession = useCallback(async (addr: string) => {
    try {
      const res = await fetch('/api/tempmail/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionToken(data.sessionToken);
        localStorage.setItem('tm_session_token', data.sessionToken);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const savedAddr = localStorage.getItem('tm_address');
    const savedTime = localStorage.getItem('tm_created');
    const savedToken = localStorage.getItem('tm_session_token');

    if (savedAddr && savedTime && parseInt(savedTime) + TTL_MS > Date.now()) {
      setEmailAddress(savedAddr);
      const domain = savedAddr.split('@')[1];
      if (DOMAINS.includes(domain)) setSelectedDomain(domain);
      if (savedToken) {
        setSessionToken(savedToken);
      } else {
        createSession(savedAddr);
      }
    } else {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Polling ── */
  const fetchEmails = useCallback(async (silent = false) => {
    if (!emailAddress) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/tempmail/emails?address=${encodeURIComponent(emailAddress)}`);
      if (res.ok) {
        const data = await res.json();
        const sorted: TmEmail[] = (data.emails || []).sort(
          (a: TmEmail, b: TmEmail) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        if (sorted.length > prevCount.current && prevCount.current > 0) {
          playNotificationSound();
          toast.info(`Nuevo correo de ${sorted[0].from.split('<')[0]}`, { icon: '📬' });
          sorted[0].isNew = true;
        }
        prevCount.current = sorted.length;
        setEmails(sorted);
      }
    } catch { /* silent */ } finally { if (!silent) setLoading(false); }
  }, [emailAddress]);

  useEffect(() => {
    if (!emailAddress || !autoRefresh || !isOnline) return;
    fetchEmails(false);
    const iv = setInterval(() => { if (document.visibilityState === 'visible') fetchEmails(true); }, 8000);
    return () => clearInterval(iv);
  }, [emailAddress, autoRefresh, isOnline, fetchEmails]);

  /* ── Handlers ── */
  const saveAndSetEmail = useCallback((addr: string) => {
    setEmailAddress(addr);
    setEmails([]); setSelectedEmail(null); prevCount.current = 0;
    localStorage.setItem('tm_address', addr);
    localStorage.setItem('tm_created', Date.now().toString());
    const domain = addr.split('@')[1];
    if (DOMAINS.includes(domain)) setSelectedDomain(domain);
    createSession(addr);
  }, [createSession]);

  const handleGenerate = () => {
    const addr = `${generateFunnyEmailName()}@${selectedDomain}`;
    saveAndSetEmail(addr);
    toast.success('Nueva dirección generada');
  };

  const handleApply = () => {
    if (!customUsername || customUsername.length < 3) return toast.error('Alias demasiado corto');
    const clean = customUsername.toLowerCase().replace(/[^a-z0-9.-]/g, '');
    saveAndSetEmail(`${clean}@${selectedDomain}`);
    setCustomUsername('');
    toast.success(`Establecido: ${clean}`);
  };

  const handleDeleteEmail = async (email: TmEmail) => {
    setIsDeleting(true);
    const prev = [...emails];
    setEmails(emails.filter(e => e.id !== email.id));
    if (selectedEmail?.id === email.id) setSelectedEmail(null);
    try {
      const token = sessionToken || localStorage.getItem('tm_session_token') || '';
      const addr = encodeURIComponent(emailAddress);
      await fetch(
        `/api/tempmail/emails?id=${email.id}&sessionToken=${encodeURIComponent(token)}&address=${addr}`,
        { method: 'DELETE' }
      );
      toast.success('Correo eliminado');
    } catch {
      setEmails(prev); toast.error('Error al eliminar');
    } finally { setIsDeleting(false); }
  };

  const changeTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem('tm_theme', t);
    setIsThemeOpen(false);
  };

  const filteredEmails = emails.filter(e => {
    const q = searchQuery.toLowerCase();
    return e.subject?.toLowerCase().includes(q) || e.from?.toLowerCase().includes(q) || e.text?.toLowerCase().includes(q);
  });

  /* ── Safe HTML renderer ── */
  const SafeHTML = ({ html, text, invert }: { html: string; text: string; invert: boolean }) => {
    if (!html) return (
      <pre className="absolute inset-0 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed p-6 text-slate-800 bg-white selection:bg-slate-200">
        {text}
      </pre>
    );
    let clean = html;
    if (typeof window !== 'undefined') {
      import('dompurify').then(({ default: DOMPurify }) => {
        clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['script', 'style', 'iframe'] });
      });
    }
    const style = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
             padding: 24px; color: #1e293b; line-height: 1.6; background: #fff; }
      a { color: #d4af37; text-decoration: underline; font-weight: 600; }
      img { max-width: 100%; border-radius: 12px; margin: 16px 0; }
      pre, code { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: .9em; }
      ${invert ? 'html { filter: invert(1) hue-rotate(180deg); } body { color: #f1f5f9!important; background: #050505!important; }' : ''}
    `;
    return (
      <iframe
        srcDoc={`<html><head><style>${style}</style></head><body>${clean}</body></html>`}
        className="absolute inset-0 w-full h-full border-0 bg-white"
        sandbox="allow-same-origin allow-popups"
        title="Email Reader"
      />
    );
  };

  if (!isMounted) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl border flex items-center justify-center animate-pulse"
          style={{ borderColor: '#d4af37', background: 'black' }}>
          <Shield className="w-6 h-6 animate-spin" style={{ color: '#d4af37' }} />
        </div>
      </div>
    );
  }

  const themeAttr = theme === 'classic' ? undefined : theme;

  return (
    <>
      <Toaster position="bottom-right" theme="dark" closeButton toastOptions={{
        classNames: {
          toast: 'bg-[#0c0c0e] text-[#e4e4e7] border border-[rgba(212,175,55,0.14)] shadow-2xl rounded-2xl p-4',
          title: 'text-xs font-black uppercase tracking-wide',
          description: 'text-[10px] text-slate-400 mt-1',
          closeButton: 'bg-black/60 border border-[rgba(212,175,55,0.14)] text-[#d4af37] hover:text-white',
        }
      }} />

      <div
        className="tempmail-scope h-screen h-[100dvh] w-screen flex flex-col p-4 md:p-6 select-none overflow-hidden relative"
        data-tm-theme={themeAttr}
      >
        {/* Background glows */}
        <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'rgba(212,175,55,0.04)' }} />
        <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'rgba(243,229,171,0.03)' }} />

        {/* ── Console Bar ── */}
        <div className="flex-shrink-0 tm-panel p-4 flex flex-col gap-3.5 z-20 mb-4 backdrop-blur-md relative"
          style={{ background: 'rgba(12,12,14,0.85)', border: '1px solid var(--tm-border)' }}>

          {/* Row 1 */}
          <div className="flex flex-wrap justify-between items-center gap-3" style={{ borderBottom: '1px solid rgba(212,175,55,0.10)', paddingBottom: '12px' }}>
            <div className="flex items-center gap-2.5">
              <Link href="/tempmail" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ border: '1px solid var(--tm-border)', background: 'rgba(0,0,0,0.4)' }}>
                <Shield className="w-4 h-4" style={{ color: 'var(--tm-accent)' }} />
              </Link>
              <h1 className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-white">
                Broslunas <span style={{ color: 'var(--tm-accent)', fontWeight: 400 }}>Mail</span>
                <span className="text-[7px] px-2 py-0.5 rounded-full font-mono font-bold"
                  style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.20)', color: 'var(--tm-accent)' }}>
                  TEMPORAL
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <div className="flex items-center gap-3 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg text-slate-400"
                style={{ border: '1px solid var(--tm-border)', background: 'rgba(0,0,0,0.4)' }}>
                {isOnline ? (
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--tm-accent)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: 'var(--tm-accent)' }} />
                    Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-red-400 animate-pulse"><WifiOff className="w-3 h-3" /> Offline</span>
                )}
                <span className="w-px h-3.5" style={{ background: 'var(--tm-border)' }} />
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" style={{ color: 'var(--tm-accent)' }} /> {timeRemaining}
                </span>
              </div>

              {/* Auto-sync toggle */}
              <button onClick={() => { const n = !autoRefresh; setAutoRefresh(n); toast.info(n ? 'Auto-sync activada' : 'Auto-sync pausada'); }}
                className="px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all"
                style={{
                  border: '1px solid',
                  color: autoRefresh ? 'var(--tm-accent)' : '#64748b',
                  background: autoRefresh ? 'rgba(212,175,55,0.10)' : 'rgba(100,116,139,0.05)',
                  borderColor: autoRefresh ? 'rgba(212,175,55,0.20)' : 'rgba(100,116,139,0.10)',
                }}>
                {autoRefresh ? 'Auto-Sync' : 'Pausado'}
              </button>

              {/* Sync */}
              <button onClick={() => { fetchEmails(false); toast.success('Bandeja sincronizada'); }}
                className="tm-btn p-2" title="Sincronizar">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--tm-accent)' }} />
              </button>

              {/* Theme */}
              <div className="relative">
                <button onClick={() => setIsThemeOpen(!isThemeOpen)}
                  className="tm-btn px-3 py-2 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" style={{ color: 'var(--tm-accent)' }} />
                  <span className="capitalize">{theme}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                </button>
                <AnimatePresence>
                  {isThemeOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-2 w-44 z-50 p-1.5 rounded-xl shadow-2xl"
                      style={{ background: 'var(--tm-card-bg)', border: '1px solid var(--tm-border)' }}>
                      {[{ id: 'classic', name: 'Classic Gold' }, { id: 'cyberpunk', name: 'Amber Glow' }, { id: 'nordic', name: 'Bronze Luxury' }, { id: 'ocean', name: 'Deep Sea Gold' }].map(t => (
                        <button key={t.id} onClick={() => changeTheme(t.id)}
                          className="w-full text-left px-3 py-2 text-[9px] font-bold rounded-lg hover:bg-white/5 transition-colors"
                          style={{ color: theme === t.id ? 'var(--tm-accent)' : '#94a3b8', background: theme === t.id ? 'rgba(255,255,255,0.05)' : undefined }}>
                          {t.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Panic */}
              <button onClick={() => { if (confirm('¿Limpiar sesión y salir?')) { localStorage.removeItem('tm_address'); localStorage.removeItem('tm_created'); localStorage.removeItem('tm_session_token'); window.location.href = 'https://www.google.com'; } }}
                className="tm-btn p-2 text-red-500" style={{ borderColor: 'rgba(239,68,68,0.20)', background: 'rgba(239,68,68,0.05)' }}
                title="Botón de Pánico (Esc×2)">
                <AlertCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Active address */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex-shrink-0 w-24">Buzón Activo:</span>
              <div className="flex-1 flex tm-input px-3.5 py-2.5 items-center justify-between gap-3" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <span className="font-mono text-xs truncate text-white select-all font-bold tracking-wide">{emailAddress}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => { navigator.clipboard.writeText(emailAddress); toast.success('Dirección copiada'); }}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="Copiar">
                    <Copy className="w-3.5 h-3.5" style={{ color: 'var(--tm-accent)' }} />
                  </button>
                  <button onClick={() => setIsQrOpen(true)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="QR">
                    <QrCode className="w-3.5 h-3.5" style={{ color: 'var(--tm-accent-s)' }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Alias creator */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 relative">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex-shrink-0 w-24">Nuevo Alias:</span>
              <div className="flex-grow flex tm-input overflow-hidden items-center pr-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <input value={customUsername} onChange={e => setCustomUsername(e.target.value)}
                  placeholder="ej. alias.secreto" onKeyDown={e => e.key === 'Enter' && handleApply()}
                  className="bg-transparent px-3.5 py-2.5 outline-none text-[11px] w-full text-white font-medium placeholder-slate-600" />
                <button onClick={() => setCustomUsername(generateFunnyEmailName())}
                  className="p-1.5 hover:bg-white/5 rounded text-slate-500 hover:text-white pl-2"
                  style={{ borderLeft: '1px solid var(--tm-border)' }} title="Alias divertido">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--tm-accent)' }} />
                </button>
                <button onClick={() => setIsDomainOpen(!isDomainOpen)}
                  className="px-2 text-[9px] font-mono flex items-center gap-1 ml-2 animate-pulse"
                  style={{ color: 'var(--tm-accent)', borderLeft: '1px solid var(--tm-border)' }}>
                  @{selectedDomain.split('.')[0]} <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
              <button onClick={handleApply} className="tm-btn px-4 py-2.5 text-[10px] font-black uppercase tracking-wider mt-2 sm:mt-0">OK</button>

              <AnimatePresence>
                {isDomainOpen && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute right-12 top-full mt-1.5 w-44 rounded-xl p-1.5 z-50 max-h-40 overflow-y-auto shadow-2xl"
                    style={{ background: 'var(--tm-card-bg)', border: '1px solid var(--tm-border)' }}>
                    {DOMAINS.map(dom => (
                      <button key={dom} onClick={() => { setSelectedDomain(dom); setIsDomainOpen(false); }}
                        className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-white/5 rounded-lg text-slate-300 transition-colors">
                        @{dom}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Generate button */}
            <div className="lg:w-36">
              <button onClick={handleGenerate}
                className="w-full py-2.5 rounded-lg font-black uppercase text-[9px] tracking-widest text-black transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(to right, var(--tm-accent), var(--tm-accent-s))', boxShadow: '0 4px 12px rgba(212,175,55,0.10)' }}>
                Generar Nuevo
              </button>
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-hidden z-10 mb-2">

          {/* Left: Inbox List */}
          <div className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 ${selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex-1 min-h-0 tm-panel overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 flex justify-between items-center bg-white/[0.01] flex-shrink-0"
                style={{ borderBottom: '1px solid var(--tm-border)' }}>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Inbox className="w-4 h-4" style={{ color: 'var(--tm-accent)' }} /> Bandeja Entrada
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.20)', color: 'var(--tm-accent)' }}>
                  {emails.length}
                </span>
              </div>

              {/* Search */}
              {emails.length > 0 && (
                <div className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0 bg-black/20"
                  style={{ borderBottom: '1px solid var(--tm-border)' }}>
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <input type="text" placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent border-0 outline-none text-[10px] w-full text-slate-300 placeholder-slate-600 font-medium" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-[9px] font-bold" style={{ color: 'var(--tm-accent)' }}>Limpiar</button>
                  )}
                </div>
              )}

              {/* List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5 bg-black/15">
                <AnimatePresence mode="popLayout">
                  {filteredEmails.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-black/20"
                      style={{ border: '1px dashed var(--tm-border)' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                        style={{ border: '1px solid var(--tm-accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}>
                        <Mail className="w-5 h-5 animate-pulse" style={{ color: 'var(--tm-accent)' }} />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Buscando transmisiones</span>
                      <p className="text-[8px] text-slate-500 font-mono mt-1.5 leading-relaxed uppercase max-w-[200px] animate-pulse">{radarText}</p>
                    </div>
                  ) : filteredEmails.map(email => (
                    <motion.button key={email.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      onClick={() => { setSelectedEmail(email); setEmails(p => p.map(e => e.id === email.id ? { ...e, isNew: false } : e)); }}
                      className="w-full text-left p-4 rounded-xl transition-all relative overflow-hidden flex flex-col gap-1"
                      style={{
                        border: '1px solid',
                        borderColor: selectedEmail?.id === email.id ? 'rgba(212,175,55,0.30)' : 'rgba(212,175,55,0.12)',
                        background: selectedEmail?.id === email.id ? 'rgba(212,175,55,0.10)' : 'rgba(0,0,0,0.25)',
                      }}>
                      {email.isNew && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'var(--tm-accent)' }} />}
                      <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 font-bold mb-1">
                        <span className="text-slate-300 truncate max-w-[150px] uppercase tracking-wider">{email.from.split('<')[0]}</span>
                        <span className="flex-shrink-0">{formatDistanceToNow(new Date(email.date), { locale: es })}</span>
                      </div>
                      <p className={`text-[11px] line-clamp-1 mb-1 font-bold ${email.isNew ? 'text-white' : 'text-slate-300'}`}>
                        {email.subject || '(Sin Asunto)'}
                      </p>
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono pt-2 mt-1"
                        style={{ borderTop: '1px solid rgba(212,175,55,0.08)' }}>
                        <span className="truncate flex-1 pr-2 font-medium">{email.text}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {email.attachments && email.attachments.length > 0 && <Paperclip className="w-3 h-3" style={{ color: 'var(--tm-accent)' }} />}
                          {email.otp && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.20)', color: 'var(--tm-accent)' }}>OTP</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right: Reader */}
          <div className={`lg:col-span-7 xl:col-span-8 tm-panel overflow-hidden flex flex-col h-full min-h-0 ${!selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
            {selectedEmail ? (
              <div className="flex flex-col h-full min-h-0">
                {/* Reader Header */}
                <div className="p-5 flex flex-col gap-4 flex-shrink-0 bg-white/[0.01]"
                  style={{ borderBottom: '1px solid var(--tm-border)' }}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => setSelectedEmail(null)}
                        className="lg:hidden p-2.5 tm-btn" title="Volver">
                        <ArrowLeft className="w-4 h-4" style={{ color: 'var(--tm-accent)' }} />
                      </button>
                      <h2 className="text-sm sm:text-base font-black text-white leading-tight mt-1 select-text">{selectedEmail.subject}</h2>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => setEmailInvertColors(!emailInvertColors)}
                        className={`p-2.5 rounded-xl transition-all`}
                        style={{
                          border: '1px solid',
                          borderColor: emailInvertColors ? 'rgba(212,175,55,0.30)' : 'var(--tm-border)',
                          background: emailInvertColors ? 'rgba(212,175,55,0.20)' : 'transparent',
                          color: 'var(--tm-accent)',
                        }}>
                        {emailInvertColors ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteEmail(selectedEmail)} disabled={isDeleting}
                        className="p-2.5 rounded-xl transition-all"
                        style={{ border: '1px solid rgba(239,68,68,0.20)', background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sender */}
                  <div className="p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    style={{ border: '1px solid var(--tm-border)', background: 'rgba(0,0,0,0.20)' }}>
                    <div className="flex items-center gap-3 max-w-full">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs border border-white/10 flex-shrink-0"
                        style={{ background: getDynamicAvatarGradient(selectedEmail.from) }}>
                        {selectedEmail.from.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-[10px] min-w-0">
                        <p className="font-bold text-white truncate select-text">DE: {selectedEmail.from}</p>
                        <p className="text-slate-500 font-mono mt-0.5 truncate select-text">PARA: {selectedEmail.to}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">
                      {new Date(selectedEmail.date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* OTP Block */}
                  {selectedEmail.otp && (
                    <div className="p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden"
                      style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.20)' }}>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--tm-accent)' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Código de Seguridad Detectado
                        </p>
                        <p className="text-2xl font-black text-white tracking-widest font-mono select-all mt-1 px-2 py-0.5 rounded border w-max"
                          style={{ background: 'rgba(0,0,0,0.20)', borderColor: 'var(--tm-border)' }}>
                          {selectedEmail.otp}
                        </p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(selectedEmail.otp!); toast.success('Código copiado'); }}
                        className="px-4 py-2.5 text-black text-xs font-black rounded-lg transition-all flex items-center gap-2"
                        style={{ background: 'var(--tm-accent)', boxShadow: '0 4px 12px rgba(212,175,55,0.15)' }}>
                        <Copy className="w-3.5 h-3.5" /> Copiar Código
                      </button>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="p-3 flex flex-wrap gap-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--tm-border)', background: 'rgba(212,175,55,0.05)' }}>
                    {selectedEmail.attachments.map((att, i) => (
                      <a key={i} href={att.r2Url} download={att.filename} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold text-white transition-all"
                        style={{ border: '1px solid var(--tm-border)', background: 'rgba(0,0,0,0.30)' }}>
                        <Paperclip className="w-3.5 h-3.5" style={{ color: 'var(--tm-accent)' }} />
                        <span className="truncate max-w-[150px]">{att.filename}</span>
                        <span className="text-[8px] text-slate-500 font-mono">({(att.size / 1024).toFixed(0)}KB)</span>
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    ))}
                  </div>
                )}

                {/* HTML View */}
                <div className="flex-1 bg-white relative min-h-0 rounded-b-2xl">
                  <SafeHTML html={selectedEmail.html} text={selectedEmail.text} invert={emailInvertColors} />
                </div>
              </div>
            ) : (
              <div className="m-auto flex flex-col items-center gap-6 text-center p-8 max-w-sm">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-dashed border-[rgba(212,175,55,0.10)] animate-spin" style={{ animationDuration: '30s' }} />
                  <div className="absolute inset-2 rounded-full border-double border-[rgba(212,175,55,0.20)] tm-animate-reverse-spin" style={{ borderWidth: '4px' }} />
                  <div className="absolute inset-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid var(--tm-border)' }}>
                    <Shield className="w-8 h-8 animate-pulse" style={{ color: 'var(--tm-accent)' }} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">Canal Seguro Inactivo</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    Bandeja temporal cifrada. Selecciona una transmisión entrante para leerla.
                  </p>
                </div>
                <div className="px-4 py-2 rounded-xl w-full flex flex-col gap-1 items-center"
                  style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(212,175,55,0.10)' }}>
                  <span className="text-[7px] text-slate-600 font-mono tracking-widest uppercase">Diagnóstico Consola</span>
                  <span className="text-[9px] font-mono uppercase truncate max-w-full animate-pulse" style={{ color: 'var(--tm-accent)' }}>{radarText}</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="flex-shrink-0 w-full border-t py-3 mt-3 text-center flex flex-col sm:flex-row justify-between items-center gap-3 text-[9px] font-bold text-slate-500 z-10"
          style={{ borderColor: 'var(--tm-border)' }}>
          <p className="flex items-center gap-1">
            <Lock className="w-3 h-3" style={{ color: 'var(--tm-accent)' }} />
            Broslunas Mail :: Datos Cifrados (MongoDB TTL 24h)
          </p>
          <div className="flex gap-4">
            <a href="/tempmail/privacy?tab=privacy" className="hover:underline transition-colors" style={{ color: 'inherit' }}>[1. PRIVACIDAD]</a>
            <a href="/tempmail/privacy?tab=terms" className="hover:underline transition-colors" style={{ color: 'inherit' }}>[2. TÉRMINOS]</a>
            <a href="/tempmail/privacy?tab=cookies" className="hover:underline transition-colors" style={{ color: 'inherit' }}>[3. COOKIES]</a>
          </div>
        </footer>
      </div>

      {/* ── QR Modal ── */}
      <AnimatePresence>
        {isQrOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsQrOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xs p-6 rounded-2xl flex flex-col items-center gap-4 shadow-2xl z-10 tempmail-scope"
              style={{ background: 'var(--tm-card-bg)', border: '1px solid var(--tm-border)' }}>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Código QR Buzón</h3>
              <div className="bg-white p-3 rounded-xl shadow-inner border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(emailAddress)}`}
                  alt="QR Code" className="w-40 h-40" />
              </div>
              <div className="p-3 rounded-xl border w-full text-center" style={{ background: 'rgba(0,0,0,0.30)', borderColor: 'var(--tm-border)' }}>
                <code className="font-mono text-[9px] select-all break-all" style={{ color: 'var(--tm-accent)' }}>{emailAddress}</code>
              </div>
              <button onClick={() => setIsQrOpen(false)}
                className="w-full py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-black"
                style={{ background: 'var(--tm-accent)' }}>
                Cerrar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
