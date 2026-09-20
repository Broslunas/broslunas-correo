import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  Loader2, 
  KeyRound, 
  AlertCircle, 
  CheckCircle,
  ShieldAlert
} from 'lucide-react';
import { showConfirm } from '@/lib/modal';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (enabled: boolean) => void;
}

interface User2FAStatus {
  enabled: boolean;
  email: string;
  name: string;
  picture: string;
  qrCodeUrl?: string;
  secret?: string;
  require2FA: boolean;
}

export default function TwoFactorModal({ isOpen, onClose, onStatusChange }: TwoFactorModalProps) {
  const [status, setStatus] = useState<User2FAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 6-digit code array state
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fetch2FAStatus = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/2fa/verify');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        // Reset code
        setCode(['', '', '', '', '', '']);
      } else {
        setError('No se pudo cargar la configuración de 2FA.');
      }
    } catch (err) {
      console.error('Error fetching 2FA status:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetch2FAStatus();
    }
  }, [isOpen]);

  // Autofocus first input when setup status loads and 2FA is not enabled
  useEffect(() => {
    if (status && !status.enabled && isOpen) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [status, isOpen]);

  if (!isOpen) return null;

  // Handle typing a digit
  const handleChange = (index: number, value: string) => {
    if (value && isNaN(Number(value))) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspaces
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      setCode(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // Handle Enable Form Submit
  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Por favor, ingresa los 6 dígitos.');
      return;
    }

    setError('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('¡Doble factor (2FA) activado correctamente!');
        if (onStatusChange) onStatusChange(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Código incorrecto. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Disable 2FA
  const handleDisable2FA = async () => {
    const confirmed = await showConfirm(
      '¿Estás seguro de que deseas desactivar la verificación en dos pasos (2FA)? Tu cuenta será menos segura.',
      {
        title: 'Desactivar 2FA',
        confirmText: 'Desactivar',
        destructive: true,
      }
    );
    if (!confirmed) {
      return;
    }

    setError('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Autenticación en dos pasos desactivada con éxito.');
        if (onStatusChange) onStatusChange(false);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'No se pudo desactivar el 2FA.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border text-foreground rounded-2xl p-6 shadow-2xl relative animate-zoomIn">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4 select-none">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          Seguridad: Autenticación 2FA
        </h3>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Cargando detalles de seguridad...</p>
          </div>
        ) : status ? (
          <div className="space-y-4">
            
            {/* Feedback Messages */}
            {error && (
              <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3 text-xs text-red-400 font-medium flex items-start gap-2.5 animate-shake">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-3 text-xs text-emerald-400 font-medium flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
                <p>{success}</p>
              </div>
            )}

            {status.enabled ? (
              /* Scenario 1: 2FA is currently Enabled */
              <div className="space-y-4 text-center py-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-950/30 border border-emerald-900/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-md">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Doble Factor Activo</h4>
                <p className="text-xs text-muted-foreground leading-relaxed px-4">
                  Tu cuenta está actualmente protegida con la verificación de dos pasos (2FA). Se te pedirá un código en cada inicio de sesión.
                </p>

                <div className="pt-6 flex gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>

                  {!status.require2FA ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleDisable2FA}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-destructive/15 hover:bg-destructive/25 border border-destructive/20 text-destructive py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Desactivando...
                        </>
                      ) : (
                        'Desactivar 2FA'
                      )}
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-muted border border-border text-[9px] text-amber-500 select-none">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>2FA Obligatorio por Admin</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Scenario 2: 2FA is currently Disabled */
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para activar la verificación de doble factor, escanea este código QR con tu aplicación autenticadora (Google Authenticator, Authy, Microsoft Authenticator, etc.) e introduce el código generado abajo.
                </p>

                {/* QR setup block */}
                {status.qrCodeUrl && (
                  <div className="flex flex-col items-center bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                    <div className="bg-white p-2 rounded-lg select-none">
                      <img
                        src={status.qrCodeUrl}
                        alt="QR de Autenticación"
                        className="h-36 w-36 pointer-events-none"
                      />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-[10px] text-muted-foreground">¿No puedes escanear? Copia esta clave:</p>
                      <code className="text-xs font-mono bg-background text-primary border border-border px-2 py-0.5 rounded mt-1.5 inline-block tracking-wider select-all">
                        {status.secret?.replace(/(.{4})/g, '$1 ').trim()}
                      </code>
                    </div>
                  </div>
                )}

                {/* Verification Form */}
                <form onSubmit={handleEnable2FA} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block text-center">
                      Código de 6 dígitos
                    </label>
                    <div className="flex justify-center gap-1.5" onPaste={handlePaste}>
                      {code.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { inputRefs.current[idx] = el; }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleChange(idx, e.target.value)}
                          onKeyDown={e => handleKeyDown(idx, e)}
                          className="w-10 h-11 text-center text-sm font-bold rounded-lg border border-border bg-background text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || code.some(d => d === '')}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Habilitando...
                        </>
                      ) : (
                        'Habilitar 2FA'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
