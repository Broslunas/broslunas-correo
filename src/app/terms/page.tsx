'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center p-4 md:p-8 overflow-hidden"
      style={{ background: 'hsl(222 47% 4%)' }}
    >
      {/* Aurora background orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(rgba(45,212,191,0.2) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-2xl relative z-10 animate-fadeInUp">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-all cursor-pointer mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Inicio
        </Link>

        {/* Card Container */}
        <div
          className="relative rounded-2xl p-6 md:p-10 overflow-hidden text-left"
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

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-8">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(34,211,238,0.08))',
                border: '1px solid rgba(45,212,191,0.25)',
              }}
            >
              <FileText className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Términos y Condiciones</h1>
              <p className="text-xs text-slate-500 mt-0.5">Broslunas Correo — Última actualización: Junio de 2026</p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-normal">
            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">1. Condiciones de Acceso</h2>
              <p>
                Broslunas Correo es un sistema de mensajería electrónica de carácter privado y restringido. El registro y uso de la plataforma requieren una invitación explícita emitida por un administrador del sistema. Queda terminantemente prohibido el acceso no autorizado o el intento de vulnerar las medidas de seguridad del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">2. Uso Aceptable</h2>
              <p>
                Como usuario autorizado, te comprometes a hacer un uso lícito y razonable de la plataforma. Quedan explícitamente prohibidos los siguientes usos:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1.5">
                <li>El envío masivo de correos comerciales no solicitados (Spam).</li>
                <li>Actividades de suplantación de identidad (Phishing) o estafas digitales.</li>
                <li>Transmisión de virus, malware o cualquier código dañino.</li>
                <li>Cualquier actividad que intente saturar la infraestructura serverless o bloquear el dominio.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">3. Propiedad y Licencia del Contenido</h2>
              <p>
                Mantienes la propiedad intelectual absoluta sobre todo el contenido de los correos que redactes y los archivos que adjuntes. Al utilizar el servicio, nos concedes una licencia limitada, técnica e indispensable para almacenar, procesar, transmitir y entregar dichos mensajes en tu nombre.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">4. Exclusión de Responsabilidades</h2>
              <p>
                Este servicio de correo electrónico es de carácter personal y autohospedado, por lo que **no ofrece garantías comerciales implícitas ni explícitas de disponibilidad ininterrumpida (SLA)**. Los administradores no se hacen responsables de pérdidas de datos, fallos temporales en pasarelas de entrega de terceros (ej. Mailjet, Cloudflare) ni pérdidas económicas resultantes del uso o imposibilidad de uso del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">5. Suspensión y Terminación</h2>
              <p>
                Los administradores de Broslunas Correo se reservan el derecho de suspender, desactivar o eliminar permanentemente el buzón y acceso de cualquier usuario que incumpla estos términos, sin necesidad de previo aviso y con el fin de proteger la reputación del dominio emisor.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
