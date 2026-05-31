'use client';

import React, { Suspense } from 'react';
import { Mail, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleGoogleLogin = () => {
    // Redirect to the Google login initiator API
    window.location.href = '/api/auth/google/login';
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950/80 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 relative">
      {/* Top subtle border highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 mb-4 animate-pulse">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground bg-clip-text bg-gradient-to-b from-white to-neutral-400 text-transparent">
          Webmail Privado
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Accede a tu bandeja de correo de forma segura</p>
      </div>

      {/* Main Action */}
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3 text-xs text-red-400 font-medium flex items-start gap-2.5 animate-shake">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Error de Acceso</p>
              <p className="opacity-90 mt-0.5">{decodeURIComponent(error)}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 rounded-lg bg-white hover:bg-neutral-100 text-neutral-950 py-3 text-sm font-semibold shadow-lg transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] select-none"
        >
          {/* Flat Google color logo */}
          <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M21.35,11.1H12v2.7h5.38C16.88,15.53,14.65,17,12,17c-2.76,0-5-2.24-5-5s2.24-5,5-5c1.21,0,2.3.43,3.15,1.14l2.03-2.03C15.9,4.9,14.07,4,12,4c-4.42,0-8,3.58-8,8s3.58,8,8,8c4.14,0,7-2.92,7-7A6.49,6.49,0,0,0,21.35,11.1Z" fill="#EA4335" />
              <path d="M21.35,11.1H12v2.7h5.38C16.88,15.53,14.65,17,12,17c-2.76,0-5-2.24-5-5s2.24-5,5-5c1.21,0,2.3.43,3.15,1.14l2.03-2.03C15.9,4.9,14.07,4,12,4c-4.42,0-8,3.58-8,8s3.58,8,8,8c4.14,0,7-2.92,7-7A6.49,6.49,0,0,0,21.35,11.1Z" fill="#4285F4" />
              <path d="M21.35,11.1H12v2.7h5.38C16.88,15.53,14.65,17,12,17c-2.76,0-5-2.24-5-5s2.24-5,5-5c1.21,0,2.3.43,3.15,1.14l2.03-2.03C15.9,4.9,14.07,4,12,4c-4.42,0-8,3.58-8,8s3.58,8,8,8c4.14,0,7-2.92,7-7A6.49,6.49,0,0,0,21.35,11.1Z" fill="#FBBC05" />
              <path d="M21.35,11.1H12v2.7h5.38C16.88,15.53,14.65,17,12,17c-2.76,0-5-2.24-5-5s2.24-5,5-5c1.21,0,2.3.43,3.15,1.14l2.03-2.03C15.9,4.9,14.07,4,12,4c-4.42,0-8,3.58-8,8s3.58,8,8,8c4.14,0,7-2.92,7-7A6.49,6.49,0,0,0,21.35,11.1Z" fill="#34A853" />
            </g>
          </svg>
          <span>Iniciar sesión con Google</span>
          <ArrowRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 leading-relaxed bg-neutral-900/40 p-3 rounded-lg border border-neutral-900">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-primary/70" />
          <p>
            Este es un sistema privado de webmail. El acceso está restringido únicamente a la cuenta de Google autorizada.
          </p>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-xs text-muted-foreground/40 border-t border-neutral-900 pt-4">
        Hospedado en Vercel Serverless • Cloudflare Edge
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black p-4 relative overflow-hidden">
      {/* Decorative ambient glowing background circles */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground mt-4">Iniciando interfaz...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
