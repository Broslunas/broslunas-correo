'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center p-4 md:p-8 overflow-hidden bg-background text-foreground"
    >
      {/* Aurora background orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full pointer-events-none opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)/0.15) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full pointer-events-none opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)/0.15) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-2xl relative z-10 animate-fadeInUp">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline transition-all cursor-pointer mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Inicio
        </Link>

        {/* Card Container */}
        <div
          className="relative rounded-2xl p-6 md:p-10 overflow-hidden text-left bg-card border border-border shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-8">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-primary/10 border border-primary/20 text-primary"
            >
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Términos y Condiciones</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Broslunas Correo — Última actualización: Junio de 2026</p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-normal">
            <section>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">1. Condiciones de Acceso</h2>
              <p>
                Broslunas Correo es un sistema de mensajería electrónica de carácter privado y restringido. El registro y uso de la plataforma requieren una invitación explícita emitida por un administrador del sistema. Queda terminantemente prohibido el acceso no autorizado o el intento de vulnerar las medidas de seguridad del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">2. Uso Aceptable</h2>
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
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">3. Propiedad y Licencia del Contenido</h2>
              <p>
                Mantienes la propiedad intelectual absoluta sobre todo el contenido de los correos que redactes y los archivos que adjuntes. Al utilizar el servicio, nos concedes una licencia limitada, técnica e indispensable para almacenar, procesar, transmitir y entregar dichos mensajes en tu nombre.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">4. Exclusión de Responsabilidades</h2>
              <p>
                Este servicio de correo electrónico es de carácter personal y autohospedado, por lo que <strong>no ofrece garantías comerciales implícitas ni explícitas de disponibilidad ininterrumpida (SLA)</strong>. Los administradores no se hacen responsables de pérdidas de datos, fallos temporales en pasarelas de entrega de terceros (ej. Mailjet, Cloudflare) ni pérdidas económicas resultantes del uso o imposibilidad de uso del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">5. Suspensión y Terminación</h2>
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
