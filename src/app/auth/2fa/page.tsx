'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Loader2, KeyRound, AlertCircle, LogOut } from 'lucide-react';

interface User2FAStatus {
  enabled: boolean;
  email: string;
  name: string;
  picture: string;
  qrCodeUrl?: string;
  secret?: string;
}

export default function TwoFactorPage() {
  const [status, setStatus] = useState<User2FAStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  
  // 6-digit code array state
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch 2FA configuration state on mount
  useEffect(() => {
    async function fetch2FAStatus() {
      try {
        const res = await fetch('/api/auth/2fa/verify');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        } else {
          // If unauthenticated or temp session expired, redirect to home
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Error fetching 2FA status:', err);
        setError('Error de conexión con el servidor.');
      } finally {
        setLoadingStatus(false);
      }
    }
    fetch2FAStatus();
  }, []);

  // Autofocus first input when status loads
  useEffect(() => {
    if (status) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [status]);

  // Handle typing a digit in the 6-digit grid
  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && isNaN(Number(value))) return;

    const newCode = [...code];
    // Take the last typed character
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspaces in the 6-digit grid
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // If current box is empty, clear previous box and focus it
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  // Handle paste events (e.g. paste a 6-digit code copied from SMS/app)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newDigits = pastedData.split('');
      setCode(newDigits);
      // Focus last input box
      inputRefs.current[5]?.focus();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Por favor, ingresa los 6 dígitos.');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect to dashboard by reloading to let Next.js middleware update
        window.location.href = '/mail?inbox=main';
      } else {
        setError(data.error || 'Código incorrecto o vencido');
      }
    } catch (err) {
      console.error(err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setVerifying(false);
    }
  };

  // Handle logout / cancel login
  const handleCancel = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      window.location.href = '/';
    } catch (err) {
      window.location.href = '/';
    }
  };

  // Loader screen while checking session state
  if (loadingStatus) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando estado de seguridad...</p>
        </div>
      </main>
    );
  }

  if (!status) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950/80 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* User Google Avatar & Info */}
        <div className="flex items-center gap-3 bg-neutral-900/40 border border-neutral-900 p-3 rounded-xl mb-6">
          {status.picture ? (
            <img 
              src={status.picture} 
              alt={status.name} 
              className="h-9 w-9 rounded-full border border-neutral-800 pointer-events-none"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {status.name?.[0]?.toUpperCase() || status.email[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{status.name || 'Usuario'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{status.email}</p>
          </div>
          <button 
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-neutral-800 transition-all cursor-pointer"
            title="Cancelar y Salir"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 mb-3">
            {status.enabled ? <ShieldCheck className="h-5.5 w-5.5" /> : <KeyRound className="h-5.5 w-5.5 animate-pulse" />}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {status.enabled ? 'Verificación 2FA' : 'Configura tu 2FA'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 px-4 leading-relaxed">
            {status.enabled 
              ? 'Introduce el código de verificación de tu aplicación autenticadora.' 
              : 'Escanea el código QR en tu app autenticadora para configurar tu cuenta.'}
          </p>
        </div>

        {/* QR Code Setup block if not configured */}
        {!status.enabled && status.qrCodeUrl && (
          <div className="flex flex-col items-center bg-neutral-900/50 border border-neutral-900 rounded-xl p-4 mb-6 space-y-3">
            <div className="bg-white p-2.5 rounded-lg select-none">
              <img 
                src={status.qrCodeUrl} 
                alt="QR de Autenticación" 
                className="h-40 w-40 pointer-events-none"
              />
            </div>
            <div className="text-center w-full">
              <p className="text-[10px] text-muted-foreground">¿No puedes escanear el código? Usa esta clave:</p>
              <code className="text-xs font-mono bg-neutral-950 text-primary border border-neutral-850 px-2.5 py-1 rounded mt-1.5 inline-block tracking-widest select-all">
                {status.secret?.replace(/(.{4})/g, '$1 ').trim()}
              </code>
            </div>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block text-center">
              Código de Seguridad (6 dígitos)
            </label>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { inputRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-lg font-bold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3 text-xs text-red-400 font-medium flex items-start gap-2 animate-shake">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
              <p className="opacity-90">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-muted-foreground hover:text-foreground py-2.5 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={verifying || code.some(d => d === '')}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verificando...
                </>
              ) : (
                status.enabled ? 'Verificar y Entrar' : 'Habilitar y Entrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
