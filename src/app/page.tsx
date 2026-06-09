'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { 
  ArrowRight, 
  AlertCircle, 
  ShieldAlert, 
  Zap, 
  Shield, 
  Lock, 
  Search,
  Sparkles,
  KeyRound,
  Loader2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SecurityCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      icon: Shield,
      title: "Verificación Dual 2FA",
      description: "Resguarda tu cuenta mediante aplicación autenticadora (TOTP) o códigos seguros por correo electrónico."
    },
    {
      icon: Zap,
      title: "Arquitectura Serverless",
      description: "Infraestructura sin servidores integrada con Cloudflare Edge y Vercel para una velocidad inmediata."
    },
    {
      icon: Lock,
      title: "Acceso Restringido",
      description: "Seguridad empresarial con autorización explícita por administrador y Google OAuth 2.0."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="mt-8 pt-6 border-t border-white/5 relative">
      {/* Progress Line Animation Style */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress-bar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}} />

      <div className="min-h-[85px] flex flex-col justify-start">
        {slides.map((slide, idx) => {
          const Icon = slide.icon;
          const isActive = idx === currentSlide;
          return (
            <div
              key={idx}
              className={`transition-all duration-500 ease-in-out ${
                isActive 
                  ? 'opacity-100 translate-y-0 relative block' 
                  : 'opacity-0 translate-y-2 absolute pointer-events-none hidden'
              }`}
            >
              {isActive && (
                <div className="flex gap-3 text-left">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200">{slide.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{slide.description}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {slides.map((_, idx) => {
          const isActive = idx === currentSlide;
          return (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className="group relative h-1 rounded-full overflow-hidden transition-all duration-300 cursor-pointer"
              style={{ width: isActive ? '24px' : '6px', background: 'rgba(255,255,255,0.1)' }}
            >
              {isActive && (
                <div 
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))',
                    width: '100%',
                    animation: 'progress-bar 4.5s linear forwards'
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InboxSimulation() {
  const mockupEmails = [
    {
      sender: "Google Cloud Security",
      avatar: "G",
      avatarBg: "linear-gradient(135deg, #4285F4, #34A853)",
      subject: "Nueva cuenta autorizada para Broslunas Correo",
      snippet: "El usuario admin@broslunas.com ha completado satisfactoriamente el registro OAuth...",
      time: "18:18",
      unread: true
    },
    {
      sender: "Vercel Deployments",
      avatar: "V",
      avatarBg: "linear-gradient(135deg, #000, #333)",
      subject: "Producción: Broslunas Correo en ejecución en Edge",
      snippet: "Despliegue exitoso de la rama main. Listo en 11 regiones serverless distribuidas...",
      time: "17:42",
      unread: false
    },
    {
      sender: "Mailjet Notifications",
      avatar: "M",
      avatarBg: "linear-gradient(135deg, #fb923c, #c2410c)",
      subject: "Envío completado: Código de seguridad 2FA",
      snippet: "El código 402859 ha sido enviado con éxito a la dirección de recuperación en 0.8s...",
      time: "Ayer",
      unread: false
    }
  ];

  return (
    <div className="relative w-full max-w-lg select-none">
      {/* Background radial glow */}
      <div className="absolute -inset-10 blur-[80px] rounded-full pointer-events-none" style={{ background: 'hsl(var(--primary)/0.05)' }} />
      
      {/* Floating security card 1 */}
      <div 
        className="absolute -top-10 -left-8 z-20 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md animate-bounce"
        style={{
          background: 'hsl(var(--primary)/0.06)',
          border: '1px solid hsl(var(--primary)/0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animationDuration: '6s'
        }}
      >
        <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'hsl(var(--primary))' }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--primary)/0.9)' }}>Conexión Encriptada SSL</span>
      </div>

      {/* Floating security card 2 */}
      <div 
        className="absolute -bottom-6 -right-6 z-20 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md animate-bounce"
        style={{
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animationDuration: '7s',
          animationDelay: '1.5s'
        }}
      >
        <Shield className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
        <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">2FA Activo ✓</span>
      </div>

      {/* Mock Client Window */}
      <div
        className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative"
        style={{
          background: 'rgba(8,14,30,0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Window Chrome / Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.01]">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/40" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/40" />
            <span className="h-2 w-2 rounded-full bg-green-500/40" />
          </div>
          {/* Window Title */}
          <div className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase">Bandeja de Entrada — Vista Previa</div>
          <div className="w-10" />
        </div>

        {/* Mock Search Bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.005] border-b border-white/5">
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-3 h-3 w-3 text-slate-500" />
            <div className="w-full bg-white/5 rounded-lg py-1.5 pl-9 text-[11px] text-slate-500 border border-white/[0.03] text-left">
              Buscar correos...
            </div>
          </div>
          <div className="h-6 px-2.5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}>
            Redactar
          </div>
        </div>

        {/* Email Rows */}
        <div className="divide-y divide-white/5 p-2">
          {mockupEmails.map((email, idx) => (
            <div 
              key={idx} 
              className="p-3 flex gap-3 transition-colors hover:bg-white/[0.02] rounded-lg cursor-pointer text-left"
            >
              {/* Sender Avatar */}
              <div 
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-lg"
                style={{ background: email.avatarBg }}
              >
                {email.avatar}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] truncate ${email.unread ? 'font-bold text-slate-100' : 'text-slate-300'}`}>
                    {email.sender}
                  </span>
                  <span className="text-[9px] text-slate-500 shrink-0">{email.time}</span>
                </div>
                <div className={`text-[10px] truncate mt-0.5 ${email.unread ? 'font-semibold text-slate-200' : 'text-slate-400'}`}>
                  {email.subject}
                </div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">
                  {email.snippet}
                </div>
              </div>

              {/* Unread indicator */}
              {email.unread && (
                <div className="flex items-center justify-center shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--primary))', boxShadow: '0 0 8px hsl(var(--primary)/0.8)' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const displayError = loginError || (error ? decodeURIComponent(error) : '');

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    setLoginError('');

    try {
      const optionsRes = await fetch('/api/auth/passkey/login/options');
      if (!optionsRes.ok) {
        const errData = await optionsRes.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudieron obtener las opciones de inicio de sesión.');
      }
      const options = await optionsRes.json();

      const { startAuthentication } = await import('@simplewebauthn/browser');

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'El inicio de sesión con llave de paso falló.');
      }

      window.location.href = '/mail?inbox=main';
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'NotAllowedError') {
        setLoginError(err.message || 'Error al iniciar sesión con llave de paso.');
      }
    } finally {
      passkeyLoading && setPasskeyLoading(false);
    }
  };

  // Detect if this page is loading inside the popup as an error redirect
  useEffect(() => {
    if (window.opener && window.name === 'GoogleLogin') {
      const err = new URLSearchParams(window.location.search).get('error');
      if (err) {
        try {
          window.opener.postMessage({ type: 'AUTH_ERROR', error: err }, window.location.origin);
          window.close();
        } catch (e) {
          console.error('Error sending auth error message:', e);
        }
      }
    }
  }, []);

  // Listen for login completion or error from the popup
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'AUTH_SUCCESS') {
        window.location.href = '/mail?inbox=main';
      } else if (event.data?.type === 'AUTH_ERROR') {
        window.location.href = `/?error=${encodeURIComponent(event.data.error)}`;
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const handleGoogleLogin = () => {
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      '/api/auth/google/login',
      'GoogleLogin',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
  };

  return (
    <div className="w-full max-w-sm animate-fadeInUp relative">
      {/* Glow orb behind the card */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full blur-[60px] pointer-events-none" style={{ background: 'hsl(var(--primary)/0.1)' }} />

      <div
        className="relative rounded-2xl p-8 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px hsl(var(--primary)/0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Top shimmer line */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)/0.5), transparent)' }}
        />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)/0.08))',
              border: '1px solid hsl(var(--primary)/0.25)',
              boxShadow: '0 0 24px hsl(var(--primary)/0.15)',
            }}
          >
            <img
              src="/favicon.png"
              alt="Broslunas Correo"
              className="h-9 w-9 object-contain"
              style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary)/0.4))' }}
            />
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ border: '1px solid hsl(var(--primary)/0.6)', animationDuration: '2.5s' }}
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{
            background: 'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--accent)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Broslunas Correo
          </h1>
          <p className="text-xs" style={{ color: 'hsl(215 20% 55%)' }}>
            Acceso seguro y privado en la nube
          </p>
        </div>

        {/* Error */}
        {displayError && (
          <div
            className="rounded-xl p-3.5 text-xs flex items-start gap-2.5 mb-5"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <div className="text-left">
              <p className="font-semibold" style={{ color: '#fca5a5' }}>Error de acceso</p>
              <p className="mt-0.5 opacity-85" style={{ color: '#fca5a5' }}>{displayError}</p>
            </div>
          </div>
        )}

        {/* Passkey Login Button */}
        <button
          onClick={handlePasskeyLogin}
          disabled={passkeyLoading}
          id="btn-passkey-login"
          className="group w-full flex items-center justify-center gap-3 rounded-xl py-3.5 px-6 text-sm font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] select-none cursor-pointer relative overflow-hidden text-neutral-950 shadow-[0_4px_24px_hsl(var(--primary)/0.2)] disabled:opacity-50 mb-3"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
            border: '1px solid hsl(var(--primary)/0.3)',
          }}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          {passkeyLoading ? (
            <Loader2 className="h-5 w-5 shrink-0 relative z-10 animate-spin text-neutral-950" />
          ) : (
            <KeyRound className="h-5 w-5 shrink-0 relative z-10 text-neutral-950" />
          )}
          <span className="relative z-10 font-bold">
            {passkeyLoading ? 'Iniciando sesión...' : 'Iniciar sesión con Passkey'}
          </span>
          <ArrowRight
            className="h-4 w-4 absolute right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10 text-neutral-950"
          />
        </button>

        {/* Divider */}
        <div className="flex items-center my-4 select-none">
          <div className="flex-1 h-px bg-white/5" />
          <span className="px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">o también</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          id="btn-google-login"
          className="group w-full flex items-center justify-center gap-3 rounded-xl py-3.5 px-6 text-sm font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] select-none cursor-pointer relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.3)]" style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Google SVG */}
          <svg className="h-5 w-5 shrink-0 relative z-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="relative z-10">Iniciar sesión con Google</span>
          <ArrowRight
            className="h-4 w-4 absolute right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10" style={{ color: 'hsl(var(--primary))' }}
          />
        </button>

        {/* Security Carousel */}
        <SecurityCarousel />

        {/* Privacy notice */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-xl p-3 text-[10px] leading-relaxed text-left"
          style={{
            background: 'hsl(var(--primary)/0.04)',
            border: '1px solid hsl(var(--primary)/0.1)',
            color: 'hsl(215 20% 50%)',
          }}
        >
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
          <p>
            Acceso restringido únicamente a usuarios autorizados. Los accesos son auditados.
          </p>
        </div>

        {/* Legal links footer */}
        <div className="mt-5 pt-4 border-t border-white/5 flex justify-center gap-4 text-[10px] text-slate-500 font-semibold select-none">
          <Link href="/privacy" className="transition-colors" style={{}} onMouseEnter={e => (e.currentTarget.style.color='hsl(var(--primary))')} onMouseLeave={e => (e.currentTarget.style.color='')}>
            Política de Privacidad
          </Link>
          <span>•</span>
          <Link href="/terms" className="transition-colors" onMouseEnter={e => (e.currentTarget.style.color='hsl(var(--primary))')} onMouseLeave={e => (e.currentTarget.style.color='')}>
            Términos y Condiciones
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center p-4 lg:p-0 overflow-hidden"
      style={{ background: 'hsl(222 47% 4%)' }}
    >
      {/* Aurora background orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)/0.08) 0%, transparent 70%)',
          animation: 'aurora-pulse 6s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)/0.07) 0%, transparent 70%)',
          animation: 'aurora-pulse 8s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute top-[40%] right-[20%] h-[250px] w-[250px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
          animation: 'aurora-pulse 10s ease-in-out infinite 4s',
        }}
      />

      {/* Grid overlay (Radial dots) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--primary)/0.2) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center relative z-10 p-4">
        
        {/* Left Column: Login Portal */}
        <div className="col-span-12 lg:col-span-5 flex items-center justify-center">
          <Suspense fallback={
            <div
              className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center justify-center gap-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="h-8 w-8 rounded-full border-2 animate-spin"
                style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }}
              />
              <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Iniciando interfaz...</p>
            </div>
          }>
            <LoginContent />
          </Suspense>
        </div>

        {/* Right Column: Visual Showcase (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col items-center justify-center relative text-center">
          <div className="mb-8 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}>
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Plataforma Segura de Webmail
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 leading-tight">
              Bandeja de Entrada Privada con Experiencia Fluida
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Explora una interfaz de correo ultrarrápida diseñada con técnicas avanzadas de desenfoque de cristal, optimizada para rendimiento móvil y protegida por autenticación de dos factores.
            </p>
          </div>
          
          <InboxSimulation />
        </div>
      </div>
    </main>
  );
}
