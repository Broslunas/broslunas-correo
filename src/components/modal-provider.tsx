'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';
import {
  ModalRequest,
  registerModalListener,
  dismissCurrentModal
} from '@/lib/modal';

export default function ModalProvider() {
  const [modal, setModal] = useState<ModalRequest | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return registerModalListener((active) => {
      setModal(active);
    });
  }, []);

  useEffect(() => {
    if (!modal) return;

    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissCurrentModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modal]);

  if (!modal) return null;

  const defaultTitles: Record<string, string> = {
    info: 'Información',
    warning: 'Atención',
    error: 'Error',
    success: 'Operación completada',
  };

  const title = modal.title || defaultTitles[modal.type] || 'Aviso';

  const iconConfig = {
    info: {
      icon: Info,
      bg: 'bg-primary/10 text-primary',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-destructive/15 text-destructive',
    },
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
  }[modal.type] || {
    icon: Info,
    bg: 'bg-primary/10 text-primary',
  };

  const Icon = iconConfig.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-message"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={() => dismissCurrentModal(false)}
    >
      <div
        className="w-full max-w-md bg-card border border-border text-foreground rounded-2xl p-6 shadow-2xl relative animate-fadeInUp cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => dismissCurrentModal(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-full shrink-0 ${iconConfig.bg}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 pt-0.5">
            <h3
              id="modal-title"
              className="text-base font-semibold text-foreground tracking-tight select-none"
            >
              {title}
            </h3>

            <p
              id="modal-message"
              className="mt-2 text-sm text-muted-foreground whitespace-pre-line leading-relaxed"
            >
              {modal.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          {modal.isConfirm && (
            <button
              type="button"
              onClick={() => dismissCurrentModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              {modal.cancelText || 'Cancelar'}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => dismissCurrentModal(true)}
            className={`px-4.5 py-2 text-sm font-medium rounded-xl transition-all shadow-xs cursor-pointer ${
              modal.destructive
                ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {modal.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
