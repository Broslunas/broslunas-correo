'use client';

import React, { Suspense } from 'react';
import { ArrowRight, AlertCircle, ShieldAlert, Zap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google/login';
  };

  return (
    <div className="w-full max-w-sm animate-fadeInUp relative">
      {/* Glow orb behind the card */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-teal-400/10 blur-[60px] pointer-events-none" />

      <div
        className="relative rounded-2xl p-8 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,212,191,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Top shimmer line */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(45,212,191,0.5), transparent)' }}
        />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(34,211,238,0.08))',
              border: '1px solid rgba(45,212,191,0.25)',
              boxShadow: '0 0 24px rgba(45,212,191,0.15)',
            }}
          >
            <img
              src="/favicon.png"
              alt="Broslunas Correo"
              className="h-9 w-9 object-contain"
              style={{ filter: 'drop-shadow(0 0 8px rgba(45,212,191,0.4))' }}
            />
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ border: '1px solid rgba(45,212,191,0.6)', animationDuration: '2.5s' }}
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{
            background: 'linear-gradient(135deg, #e2f8f5 0%, #99f6e4 50%, #67e8f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Broslunas Correo
          </h1>
          <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>
            Accede de forma segura a tu bandeja
          </p>

          {/* Feature pills */}
          <div className="flex items-center gap-2 mt-3">
            {['OAuth 2.0', '2FA', 'Edge'].map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(45,212,191,0.1)',
                  border: '1px solid rgba(45,212,191,0.2)',
                  color: 'hsl(174 72% 65%)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl p-3.5 text-xs flex items-start gap-2.5 mb-5"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <div>
              <p className="font-semibold" style={{ color: '#fca5a5' }}>Error de acceso</p>
              <p className="mt-0.5 opacity-85" style={{ color: '#fca5a5' }}>{decodeURIComponent(error)}</p>
            </div>
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          id="btn-google-login"
          className="group w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(241,245,249,0.95))',
            color: '#0f172a',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.5) inset',
          }}
        >
          {/* Google SVG */}
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Iniciar sesión con Google</span>
          <ArrowRight
            className="h-4 w-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          />
        </button>

        {/* Privacy notice */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-xl p-3 text-[11px] leading-relaxed"
          style={{
            background: 'rgba(45,212,191,0.04)',
            border: '1px solid rgba(45,212,191,0.1)',
            color: 'hsl(215 20% 50%)',
          }}
        >
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(174 72% 52%)' }} />
          <p>
            Sistema privado de Broslunas. El acceso está restringido únicamente a la cuenta de Google autorizada.
          </p>
        </div>

        {/* Footer */}
        <div
          className="mt-6 pt-5 flex items-center justify-center gap-2 text-[10px]"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'hsl(215 20% 38%)' }}
        >
          <Zap className="h-3 w-3" style={{ color: 'hsl(174 72% 45%)' }} />
          Vercel Serverless · Cloudflare Edge · MongoDB Atlas
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center p-5 overflow-hidden"
      style={{ background: 'hsl(222 47% 4%)' }}
    >
      {/* Aurora background orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)',
          animation: 'aurora-pulse 6s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)',
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

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

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
            style={{ borderColor: 'hsl(174 72% 52%)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Iniciando interfaz...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
