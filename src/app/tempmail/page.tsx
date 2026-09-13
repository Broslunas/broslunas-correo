'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Shield, ArrowRight, RefreshCw, Copy, Sparkles,
  ChevronDown, Lock, Zap, Eye, Terminal, Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { generateFunnyEmailName } from '@/lib/tempmail/nameGenerator';
import ThemeToggle from '@/components/theme-toggle';

const DOMAINS_RAW = process.env.NEXT_PUBLIC_TEMPMAIL_DOMAINS || 'broslunas.link';
const DOMAINS = DOMAINS_RAW.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

export default function TempMailLanding() {
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(DOMAINS[0]);
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Init email from localStorage ── */
  useEffect(() => {
    const saved = localStorage.getItem('tm_address');
    const savedTime = localStorage.getItem('tm_created');
    if (saved && savedTime && parseInt(savedTime) + 86_400_000 > Date.now()) {
      setEmailAddress(saved);
      const domain = saved.split('@')[1];
      if (DOMAINS.includes(domain)) setSelectedDomain(domain);
    } else {
      const name = generateFunnyEmailName();
      const addr = `${name}@${DOMAINS[0]}`;
      setEmailAddress(addr);
      localStorage.setItem('tm_address', addr);
      localStorage.setItem('tm_created', Date.now().toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── GSAP scroll animations ── */
  useEffect(() => {
    let gsap: any;
    let ScrollTrigger: any;
    let ctx: any;
    let timer: any;

    import('gsap').then(({ gsap: g }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger: ST }) => {
        gsap = g;
        ScrollTrigger = ST;
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          // Scroll progress bar
          gsap!.fromTo('.tm-scroll-bar', { scaleX: 0 }, {
            scaleX: 1, ease: 'none',
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.3 },
          });

          // Hero entry
          const tl = gsap!.timeline();
          tl.from('.tm-hero-badge', { opacity: 0, y: -15, duration: 0.6, ease: 'power2.out' });
          tl.from('.tm-hero-title', { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' }, '-=0.4');
          tl.from('.tm-hero-desc', { opacity: 0, y: 20, duration: 0.7, ease: 'power2.out' }, '-=0.5');
          tl.from('.tm-hero-stat', { opacity: 0, y: 15, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, '-=0.4');
          tl.from('.tm-hero-card', { opacity: 0, x: 40, rotation: 1.5, duration: 0.9, ease: 'power3.out' }, '-=0.8');

          // Parallax glows
          gsap!.to('.tm-glow-1', { yPercent: -15, scrollTrigger: { trigger: 'body', scrub: 1 } });
          gsap!.to('.tm-glow-2', { yPercent:  15, scrollTrigger: { trigger: 'body', scrub: 1 } });

          // Specs cards
          gsap!.from('.tm-spec-card', {
            scrollTrigger: { trigger: '.tm-specs', start: 'top 95%', toggleActions: 'play none none none' },
            opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: 'power1.out',
          });

          // FAQ items
          gsap!.from('.tm-faq-item', {
            scrollTrigger: { trigger: '.tm-faq', start: 'top 90%', toggleActions: 'play none none none' },
            opacity: 0, y: 25, duration: 0.6, stagger: 0.12, ease: 'power2.out',
          });
        }, containerRef);

        timer = setTimeout(() => ScrollTrigger!.refresh(), 400);
      });
    });

    return () => {
      ctx?.revert();
      clearTimeout(timer);
    };
  }, []);

  /* ── Handlers ── */
  const saveAddress = (addr: string) => {
    setEmailAddress(addr);
    localStorage.setItem('tm_address', addr);
    localStorage.setItem('tm_created', Date.now().toString());
  };

  const handleGenerate = () => {
    const addr = `${generateFunnyEmailName()}@${selectedDomain}`;
    saveAddress(addr);
    toast.success('Nueva dirección generada');
  };

  const handleApply = () => {
    if (!customUsername || customUsername.length < 3)
      return toast.error('El alias debe tener al menos 3 caracteres');
    const clean = customUsername.toLowerCase().replace(/[^a-z0-9.-]/g, '');
    const addr = `${clean}@${selectedDomain}`;
    saveAddress(addr);
    setCustomUsername('');
    toast.success(`Establecido: ${clean}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(emailAddress);
    toast.success('Copiado al portapapeles');
  };

  const handleOpenInbox = () => router.push('/tempmail/dashboard');

  /* ── FAQ data ── */
  const faqs = [
    {
      q: '¿Cómo funciona el correo temporal?',
      a: 'Genera un alias que recibe mensajes en tiempo real. Los correos se almacenan de forma temporal en nuestra base de datos. Transcurridas 24 horas, todo se elimina automáticamente y el alias caduca.',
    },
    {
      q: '¿Cuánto tiempo duran los correos?',
      a: 'Tu alias y todos los mensajes que recibas están activos durante 24 horas desde que creas la sesión. Pasado ese tiempo, la sesión y los correos se destruyen de forma permanente.',
    },
    {
      q: '¿Qué es el extractor de códigos OTP?',
      a: 'El motor de Broslunas Mail escanea cada correo entrante. Si detecta un código de verificación de 4-8 dígitos, lo resalta automáticamente en un bloque para que puedas copiarlo con un solo clic.',
    },
    {
      q: '¿Puedo elegir mi propio alias?',
      a: 'Sí. Escribe el alias que quieras en el campo de texto y pulsa "Aplicar". También puedes usar el botón de chispa para generar uno aleatorio divertido.',
    },
  ];

  return (
    <>
      <Toaster position="top-right" theme="dark" richColors />

      {/* Scroll progress bar */}
      <div className="tm-scroll-bar fixed top-0 left-0 right-0 h-[2px] origin-left z-50 pointer-events-none"
        style={{ background: 'linear-gradient(to right, var(--tm-accent), var(--tm-accent-s))' }} />

      <div
        ref={containerRef}
        className="tempmail-scope min-h-screen flex flex-col relative overflow-x-clip select-none"
        style={{ background: 'var(--tm-bg)', color: 'var(--tm-fg)' }}
      >
        {/* Background glows */}
        <div className="tm-glow-1 absolute top-[-30%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'rgba(212,175,55,0.05)' }} />
        <div className="tm-glow-2 absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'rgba(243,229,171,0.03)' }} />

        {/* ── Header ── */}
        <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{ border: '1px solid var(--tm-accent)', background: 'var(--tm-bg)' }}>
              <Shield className="w-4 h-4" style={{ color: 'var(--tm-accent)' }} />
            </div>
            <span className="text-md font-black tracking-widest uppercase text-foreground">
              Broslunas <span style={{ color: 'var(--tm-accent)', fontWeight: 400 }}>Mail</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleOpenInbox} className="tm-btn px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              Entrar a Bandeja <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--tm-accent)' }} />
            </button>
          </div>
        </header>

        {/* ── Hero ── */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 flex flex-col lg:flex-row items-center gap-12 z-10">
          {/* Left */}
          <div className="flex-1 flex flex-col gap-6 text-center lg:text-left">
            <div className="tm-hero-badge inline-flex self-center lg:self-start items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ background: 'hsl(var(--primary)/0.10)', border: '1px solid hsl(var(--primary)/0.20)', color: 'var(--tm-accent)' }}>
              <Lock className="w-3 h-3" /> Privacidad absoluta — sin login
            </div>

            <h1 className="tm-hero-title text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-tight text-foreground">
              Tu buzón temporal,<br />
              <span className="font-semibold"
                style={{ background: 'linear-gradient(to right, var(--tm-accent), var(--tm-accent-s))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                encriptado y minimalista.
              </span>
            </h1>

            <p className="tm-hero-desc text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              Genera correos de un solo uso para registrarte en cualquier plataforma, evitar el spam y recibir códigos OTP al instante. Almacenado en MongoDB con autodestrucción en 24 horas.
            </p>

            <div className="grid grid-cols-3 gap-6 border-t pt-8 mt-4 max-w-md mx-auto lg:mx-0"
              style={{ borderColor: 'var(--tm-border)' }}>
              {[
                { val: '100%', label: 'Anónimo', color: 'hsl(var(--foreground))' },
                { val: '< 1s',  label: 'Latencia', color: 'var(--tm-accent)' },
                { val: '24h',   label: 'Caducidad', color: 'var(--tm-accent-s)' },
              ].map(s => (
                <div key={s.label} className="tm-hero-stat">
                  <p className="text-xl sm:text-2xl font-semibold" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Card */}
          <div className="tm-hero-card flex-1 w-full max-w-lg">
            <div className="tm-panel p-6 sm:p-8 relative">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Módulo Anónimo</span>
                  <h3 className="text-sm font-black text-foreground mt-0.5">Buzón Asignado</h3>
                </div>
                <span className="text-[9px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"
                  style={{ background: 'hsl(var(--primary)/0.10)', border: '1px solid hsl(var(--primary)/0.20)', color: 'var(--tm-accent)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--tm-accent)' }} />
                  Conectado
                </span>
              </div>

              {/* Email display */}
              <div className="tm-input p-4 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ background: 'hsl(var(--primary)/0.10)', color: 'var(--tm-accent)' }}>@</div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Tu Email Temporal</span>
                    <span className="font-mono text-xs sm:text-sm text-foreground truncate font-bold">
                      {emailAddress || 'generando...'}
                    </span>
                  </div>
                </div>
                <button onClick={handleCopy} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground" title="Copiar">
                  <Copy className="w-4 h-4" style={{ color: 'var(--tm-accent)' }} />
                </button>
              </div>

              {/* Custom alias row */}
              <div className="mt-4 flex gap-2">
                <div className="flex-1 flex tm-input overflow-hidden items-center pr-2">
                  <input
                    value={customUsername}
                    onChange={e => setCustomUsername(e.target.value)}
                    placeholder="Crear apodo personalizado"
                    className="bg-transparent px-4 py-3 outline-none flex-1 text-xs text-foreground placeholder:text-muted-foreground font-medium"
                    style={{ fontFamily: 'var(--tm-font-sans)' }}
                    onKeyDown={e => e.key === 'Enter' && handleApply()}
                  />
                  <button onClick={() => setCustomUsername(generateFunnyEmailName())}
                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors pl-3"
                    style={{ borderLeft: '1px solid var(--tm-border)' }} title="Alias divertido">
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative">
                    <button onClick={() => setIsDomainOpen(!isDomainOpen)}
                      className="px-3 font-mono text-[10px] flex items-center gap-1 pl-3 ml-2"
                      style={{ color: 'var(--tm-accent)', borderLeft: '1px solid var(--tm-border)' }}>
                      @{selectedDomain.split('.')[0]} <ChevronDown className="w-3 h-3" />
                    </button>
                    {isDomainOpen && (
                      <div className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-2xl overflow-y-auto max-h-40 z-50 p-1.5"
                        style={{ background: 'var(--tm-card-bg)', border: '1px solid var(--tm-border)' }}>
                        {DOMAINS.map(dom => (
                          <button key={dom} onClick={() => { setSelectedDomain(dom); setIsDomainOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs font-mono rounded-lg hover:bg-muted transition-colors"
                            style={{ color: selectedDomain === dom ? 'var(--tm-accent)' : 'hsl(var(--muted-foreground))' }}>
                            @{dom}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={handleApply} className="tm-btn px-4 text-[10px] font-bold uppercase tracking-wider">
                  Aplicar
                </button>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button onClick={handleGenerate}
                  className="flex-1 py-3.5 tm-btn text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /> Cambiar Dirección
                </button>
                <button onClick={handleOpenInbox}
                  className="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/95 active:scale-[0.98]">
                  Abrir Buzón <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[9px] text-muted-foreground text-center font-bold font-mono mt-4">
                * El buzón caduca y se destruye automáticamente en 24 horas.
              </p>
            </div>
          </div>
        </main>

        {/* ── Features ── */}
        <section className="tm-specs w-full max-w-7xl mx-auto px-6 py-16" style={{ borderTop: '1px solid var(--tm-border)' }}>
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--tm-accent)' }}>Tecnología</span>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground mt-1">Diseñado sin intermediarios</h2>
            <p className="text-muted-foreground text-xs mt-2 leading-relaxed font-medium">
              Correo temporal integrado en la misma infraestructura del webmail. Sin servicios externos.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { Icon: Terminal, title: 'MongoDB Storage', desc: 'Los correos se almacenan directamente en MongoDB con un índice TTL que los borra a las 24 h.' },
              { Icon: Lock, title: 'Extractor OTP', desc: 'Detecta automáticamente códigos de verificación de 4-8 dígitos y los presenta en un bloque de un clic.' },
              { Icon: Zap, title: 'Sin Login', desc: 'No necesitas cuenta. Solo el alias y 24 horas de inbox desechable protegido por sesión.' },
            ].map(({ Icon, title, desc }, i) => (
              <div key={i} className="tm-spec-card tm-panel p-6 hover:bg-muted/50 transition-all group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300"
                  style={{ border: '1px solid hsl(var(--primary)/0.20)', background: 'hsl(var(--primary)/0.05)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'var(--tm-accent)' }} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">{title}</h3>
                <p className="text-muted-foreground text-xs mt-2 leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="tm-faq w-full max-w-3xl mx-auto px-6 py-12" style={{ borderTop: '1px solid var(--tm-border)' }}>
          <h2 className="text-xs font-black uppercase tracking-widest text-center mb-8 text-foreground">Preguntas Frecuentes</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="tm-faq-item tm-panel overflow-hidden">
                <button onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-white/[0.01] transition-colors">
                  <span className="text-xs sm:text-sm font-bold text-slate-200">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`}
                    style={{ color: activeFaq === idx ? 'var(--tm-accent)' : undefined }} />
                </button>
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      style={{ borderTop: '1px solid var(--tm-border)' }}>
                      <div className="p-4 text-xs text-slate-400 leading-relaxed font-medium bg-black/10">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="w-full max-w-6xl mx-auto border-3 border-black bg-white p-6 shadow-[6px_6px_0px_#000] mt-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-black">
          <div className="flex flex-col items-start gap-1 text-left">
            <p className="font-black uppercase tracking-wider text-xs">🔒 BROSLUNAS MAIL :: CORREO TEMPORAL INTEGRADO</p>
            <p className="text-slate-500 max-w-md font-mono mt-1">
              Sin cookies analíticas, sin rastreo. Autodestrucción en 24 horas. Powered by MongoDB + Cloudflare Workers.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
            <a href="/tempmail/privacy?tab=privacy" className="hover:underline hover:text-blue-600 bg-slate-100 hover:bg-slate-200 border border-black px-2.5 py-1.5 transition-all">[1. PRIVACIDAD]</a>
            <a href="/tempmail/privacy?tab=terms" className="hover:underline hover:text-pink-600 bg-slate-100 hover:bg-slate-200 border border-black px-2.5 py-1.5 transition-all">[2. TÉRMINOS]</a>
            <a href="/tempmail/privacy?tab=cookies" className="hover:underline hover:text-emerald-600 bg-slate-100 hover:bg-slate-200 border border-black px-2.5 py-1.5 transition-all">[3. COOKIES (CERO)]</a>
          </div>
        </footer>
      </div>
    </>
  );
}
