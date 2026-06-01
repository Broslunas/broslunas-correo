'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Lock, 
  Mail, 
  Server,
  UserCheck
} from 'lucide-react';

interface InvitationInfo {
  role: 'admin' | 'user';
  assignedAddresses: string[];
  require2FA: boolean;
  expiresAt: string;
}

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [step, setStep] = useState(1);

  // Validate the invitation token on mount
  useEffect(() => {
    if (!token) {
      setError('Falta el token de invitación en la dirección URL.');
      setLoading(false);
      return;
    }

    async function verifyInvite() {
      try {
        const res = await fetch(`/api/auth/invite/verify?token=${token}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setInvitation(data.invitation);
        } else {
          setError(data.error || 'Esta invitación no es válida, ya expiró o fue utilizada.');
        }
      } catch (err) {
        console.error('Error verifying invitation:', err);
        setError('Error al verificar la invitación con el servidor.');
      } finally {
        setLoading(false);
      }
    }

    verifyInvite();
  }, [token]);

  // Listen for login completion or error from the popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'AUTH_SUCCESS') {
        window.location.href = '/mail?inbox=main';
      } else if (event.data?.type === 'AUTH_ERROR') {
        setError(event.data.error || 'Error al iniciar sesión con Google.');
        setLoggingIn(false);
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const handleClaimInvitation = () => {
    if (!token) return;
    setLoggingIn(true);

    // Set the invite token cookie so the backend callback can link it
    const isProd = window.location.protocol === 'https:';
    document.cookie = `webmail_invite_token=${token}; path=/; max-age=1800; SameSite=Lax${isProd ? '; Secure' : ''}`;

    // Open Google login popup
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      '/api/auth/google/login',
      'GoogleLogin',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    // Watch for popup manual closure
    const checkClosed = setInterval(() => {
      if (!loggingIn) {
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center max-w-sm w-full relative overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
        <p className="text-slate-400 text-sm">Validando invitación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center text-center max-w-md w-full relative overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
        <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 animate-bounce">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-slate-100 mb-2">Invitación Inválida</h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">{error}</p>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 transition-all cursor-pointer"
        >
          Volver a Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="w-[92vw] max-w-[480px] aspect-[3/4.1] max-h-[85vh] animate-fadeInUp relative flex flex-col">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full blur-[60px] pointer-events-none" style={{ background: 'hsl(var(--primary)/0.1)' }} />

      <div
        className="relative rounded-2xl p-6 sm:p-8 overflow-hidden flex flex-col justify-between flex-1 h-full"
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

        {/* Step Progress Dots Header */}
        <div className="flex items-center justify-between mb-6 select-none shrink-0">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: s === step ? '24px' : '8px',
                  background: s === step ? 'hsl(var(--primary))' : s < step ? 'hsl(var(--primary)/0.6)' : 'rgba(255,255,255,0.1)',
                  boxShadow: s === step ? '0 0 8px hsl(var(--primary)/0.6)' : 'none',
                }}
              />
            ))}
          </div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Paso {step} de 4
          </span>
        </div>

        {/* STEP 1: WELCOME & OVERVIEW */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-between text-center animate-fadeIn h-full">
            <div>
              <div className="flex justify-center mb-4">
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(34,211,238,0.08))',
                    border: '1px solid rgba(45,212,191,0.25)',
                    boxShadow: '0 0 20px rgba(45,212,191,0.15)',
                  }}
                >
                  <ShieldCheck className="h-6 w-6 animate-pulse" style={{ color: 'hsl(var(--primary))' }} />
                </div>
              </div>

              <h1 className="text-lg font-bold tracking-tight mb-1 text-slate-100">
                Invitación de Acceso
              </h1>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Has recibido una invitación para unirte al cliente privado de correo electrónico de <strong style={{ color: 'hsl(var(--primary))' }}>Broslunas Correo</strong>.
              </p>

              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3.5 text-left space-y-2 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-slate-200">¿Qué es Broslunas Correo?</p>
                <p className="opacity-80">
                  Es una plataforma de webmail en la nube protegida y privada que centraliza las cuentas corporativas y personales asignadas de forma segura.
                </p>
                <p className="opacity-80 text-[11px] leading-relaxed">
                  Antes de acceder, te explicaremos en detalle los permisos y las medidas de seguridad asociadas a tu invitación.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer mt-4"
            >
              Comenzar Explicación
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2: DETAILS & PERMISSIONS */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn text-left h-full">
            <div>
              <div className="flex justify-center mb-4 self-center">
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)/0.08))',
                    border: '1px solid hsl(var(--primary)/0.25)',
                  }}
                >
                  <Mail className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-100 text-center mb-1">
                Cuentas y Permisos
              </h2>
              <p className="text-[11px] text-slate-400 text-center mb-4 leading-relaxed">
                El administrador te ha concedido acceso a las siguientes cuentas:
              </p>

              {/* Permissions Box - Premium Design */}
              <div className="space-y-3 mb-4">
                {/* System Role Card */}
                <div className="flex items-center gap-3.5 p-3 rounded-xl backdrop-blur-md" style={{ border: '1px solid hsl(var(--primary)/0.15)', background: 'linear-gradient(to right, hsl(var(--primary)/0.1), transparent)' }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}>
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider block leading-none" style={{ color: 'hsl(var(--primary)/0.8)' }}>Rol Asignado</span>
                    <span className="text-xs font-bold text-slate-100 mt-1 block capitalize">
                      {invitation?.role === 'admin' ? 'Administrador del Sistema' : 'Usuario Estándar'}
                    </span>
                  </div>
                </div>

                {/* Authorized Accounts Card */}
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2 block">
                    <Mail className="h-3 w-3" style={{ color: 'hsl(var(--primary))' }} />
                    Cuentas a Vincular
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {invitation?.assignedAddresses.includes('*') ? (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary)/0.9)' }}>
                        <Server className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary))' }} />
                        <span className="text-[11px] font-semibold">Acceso Completo (Todas las cuentas)</span>
                      </div>
                    ) : (
                      invitation?.assignedAddresses.map((addr) => (
                        <div
                          key={addr}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300 group"
                        >
                          <span className="text-[11px] font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                            {addr}
                          </span>
                          <span className="text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary)/0.2)' }}>
                            Bandeja
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Permitted Actions */}
                <div className="space-y-2 px-3 py-2.5 text-[10px] text-slate-400 leading-relaxed bg-white/[0.01] border border-white/5 rounded-xl">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
                    <span>Lectura y sincronización en tiempo real de correos.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
                    <span>Capacidad para redactar, responder y programar envíos.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer"
              >
                Continuar
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SECURITY & PRIVACY */}
        {step === 3 && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn text-left h-full">
            <div>
              <div className="flex justify-center mb-4 self-center">
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)/0.08))',
                    border: '1px solid hsl(var(--primary)/0.25)',
                  }}
                >
                  <Lock className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-100 text-center mb-1">
                Políticas de Seguridad
              </h2>
              <p className="text-[11px] text-slate-400 text-center mb-4 leading-relaxed">
                Broslunas Correo prioriza tu privacidad con estrictos protocolos:
              </p>

              {/* Security items - Premium Modular Cards */}
              <div className="space-y-3.5 mb-4">
                {/* Card 1: Google Auth */}
                <div className="p-3.5 rounded-xl backdrop-blur-md flex gap-3 transition-all duration-300" style={{ border: '1px solid hsl(var(--primary)/0.1)', background: 'linear-gradient(to bottom, hsl(var(--primary)/0.03), transparent)' }}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}>
                    <UserCheck className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-200">Autenticación Google OAuth 2.0</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Tu acceso se vincula directamente a tu cuenta de Google. No almacenamos contraseñas, garantizando seguridad absoluta.
                    </p>
                  </div>
                </div>

                {/* Card 2: 2FA or Edge */}
                {invitation?.require2FA ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-transparent backdrop-blur-md flex gap-3 hover:border-emerald-500/30 hover:bg-emerald-500/[0.01] transition-all duration-300">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <ShieldCheck className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-emerald-300">2FA Obligatorio Activo</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Esta cuenta requiere verificación de dos factores. Deberás enlazar una aplicación autenticadora (ej. Google Authenticator) en tu primer acceso.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl backdrop-blur-md flex gap-3 transition-all duration-300" style={{ border: '1px solid hsl(var(--primary)/0.1)', background: 'linear-gradient(to bottom, hsl(var(--primary)/0.03), transparent)' }}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}>
                      <Server className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200">Procesamiento Seguro en Edge</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Los correos se gestionan y transmiten de forma encriptada e inmediata, con tokens de sesión que expiran automáticamente por inactividad.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nav Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Atrás
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer"
              >
                Entendido
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FINAL LINK & CLAIM */}
        {step === 4 && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn text-center h-full">
            <div>
              <div className="flex justify-center mb-4">
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)/0.08))',
                    border: '1px solid hsl(var(--primary)/0.25)',
                    boxShadow: '0 0 20px hsl(var(--primary)/0.15)',
                  }}
                >
                  <CheckCircle2 className="h-6 w-6 animate-pulse" style={{ color: 'hsl(var(--primary))' }} />
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-100 mb-1">
                Finalizar Registro
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Vincula tu cuenta de Google para reclamar la invitación y entrar a tu bandeja.
              </p>

              {/* Quick summary of accounts */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3.5 text-left mb-4 text-xs text-slate-300 leading-normal">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">Cuentas vinculadas a tu perfil:</span>
                <p className="font-semibold text-slate-200">
                  {invitation?.assignedAddresses.includes('*')
                    ? 'Acceso Completo (*)'
                    : invitation?.assignedAddresses.slice(0, 3).join(', ') + (invitation && invitation.assignedAddresses.length > 3 ? ' y más...' : '')}
                </p>
                <p className="text-[9.5px] text-slate-500 mt-2">
                  Recibirás un código de verificación por correo en tu primer inicio de sesión para activar tu sesión.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-4">
              <button
                onClick={handleClaimInvitation}
                disabled={loggingIn}
                className="group w-full flex items-center justify-center gap-3 rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] select-none cursor-pointer relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.3)] disabled:opacity-50"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                    <svg className="h-5 w-5 shrink-0 relative z-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="relative z-10">Vincular con Google</span>
                    <ArrowRight
                      className="h-4 w-4 absolute right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10" style={{ color: 'hsl(var(--primary))' }}
                    />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={loggingIn}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Regresar a paso anterior
              </button>
            </div>
          </div>
        )}

        {/* Small branding footer */}
        <p className="text-center text-[9.5px] text-slate-500 mt-6 tracking-wide select-none">
          Broslunas Correo &copy; 2026
        </p>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden"
      style={{ background: 'hsl(222 47% 4%)' }}
    >
      {/* Background orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)/0.06) 0%, transparent 70%)',
          animation: 'aurora-pulse 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] h-[350px] w-[350px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)/0.05) 0%, transparent 70%)',
          animation: 'aurora-pulse 10s ease-in-out infinite 2s',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--primary)/0.2) 1px, transparent 0)',
          backgroundSize: '32px 32px',
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
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
          <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Cargando...</p>
        </div>
      }>
        <InviteContent />
      </Suspense>
    </main>
  );
}
