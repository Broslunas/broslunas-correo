'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center relative p-4 overflow-hidden" style={{ background: 'hsl(222 47% 4%)' }}>
      
      {/* Aurora lights background effect */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-teal-500/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{
             backgroundImage: 'radial-gradient(rgba(45,212,191,0.15) 1px, transparent 0)',
             backgroundSize: '24px 24px'
           }} 
      />

      <div className="w-full max-w-md animate-fadeInUp relative z-10">
        
        {/* Glow orb behind the card */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-36 w-36 rounded-full bg-teal-400/10 blur-[50px] pointer-events-none" />

        <div
          className="relative rounded-2xl p-8 overflow-hidden text-center"
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

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.12), rgba(34,211,238,0.05))',
                border: '1px solid rgba(45,212,191,0.2)',
                boxShadow: '0 0 20px rgba(45,212,191,0.1)',
              }}
            >
              {/* Spinning compass */}
              <Compass className="h-8 w-8 text-teal-400" style={{ animation: 'spin-slow 15s linear infinite', color: 'hsl(174 72% 55%)' }} />
              {/* Alert mark */}
              <div className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-teal-500 flex items-center justify-center border border-[#060a14]">
                <span className="text-[10px] font-extrabold text-[#060a14]">!</span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-6xl font-extrabold tracking-widest text-gradient-teal mb-3">
            404
          </h1>
          
          <h2 className="text-lg font-bold text-slate-100 mb-2">
            Página No Encontrada
          </h2>
          
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-8 leading-relaxed">
            La dirección que buscas no existe o ha sido movida temporalmente. Regresa a un lugar seguro.
          </p>

          {/* Link button */}
          <Link
            href="/mail?inbox=main"
            className="group flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, hsl(174 72% 52%), hsl(192 85% 58%))',
              color: 'hsl(222 47% 4%)',
              boxShadow: '0 4px 20px rgba(45,212,191,0.25)',
            }}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Volver a la Bandeja de Entrada</span>
          </Link>
        </div>

        {/* Small branding text */}
        <p className="text-center text-[10px] text-slate-500 mt-6 tracking-wide">
          Broslunas Correo &copy; 2026
        </p>
      </div>
    </div>
  );
}
