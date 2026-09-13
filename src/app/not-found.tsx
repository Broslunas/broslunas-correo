'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center relative p-4 overflow-hidden bg-background text-foreground">
      {/* Background lights */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-accent/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      <div className="w-full max-w-md animate-fadeInUp relative z-10">
        <div
          className="relative rounded-2xl p-8 overflow-hidden text-center bg-card border border-border shadow-2xl"
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm"
            >
              <Compass className="h-8 w-8 text-primary" style={{ animation: 'spin-slow 15s linear infinite' }} />
              {/* Alert mark */}
              <div className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-primary flex items-center justify-center border border-background">
                <span className="text-[10px] font-extrabold text-primary-foreground">!</span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-6xl font-extrabold tracking-widest text-primary mb-3">
            404
          </h1>

          <h2 className="text-lg font-bold text-foreground mb-2">
            Página No Encontrada
          </h2>

          <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-8 leading-relaxed">
            La dirección que buscas no existe o ha sido movida temporalmente. Regresa a un lugar seguro.
          </p>

          {/* Link button */}
          <Link
            href="/mail?inbox=main"
            className="group flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none cursor-pointer bg-primary text-primary-foreground shadow hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Volver a la Bandeja de Entrada</span>
          </Link>
        </div>

        {/* Small branding text */}
        <p className="text-center text-[10px] text-muted-foreground mt-6 tracking-wide">
          Broslunas Correo &copy; 2026
        </p>
      </div>
    </div>
  );
}
