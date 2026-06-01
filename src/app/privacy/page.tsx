'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
              <ShieldCheck className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Política de Privacidad</h1>
              <p className="text-xs text-slate-500 mt-0.5">Broslunas Correo — Última actualización: Junio de 2026</p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-normal">
            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">1. Titularidad y Filosofía</h2>
              <p>
                Broslunas Correo es una plataforma de correo electrónico privada, autohospedada y diseñada bajo una estricta filosofía de soberanía de datos. A diferencia de las plataformas comerciales tradicionales, **no comercializamos, analizamos ni compartimos la información de tus correos** con fines publicitarios de ningún tipo.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">2. Información Recopilada</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong className="text-slate-200">Datos de Perfil de Google:</strong> Cuando inicias sesión con tu cuenta de Google (OAuth 2.0), únicamente accedemos a tu dirección de correo electrónico, nombre y avatar para validar tu autorización en nuestro sistema.
                </li>
                <li>
                  <strong className="text-slate-200">Archivos de Google Drive:</strong> Si decides adjuntar un archivo mediante el selector de Google Drive integrado, nuestra aplicación obtiene acceso temporal y estrictamente limitado a ese archivo con el único fin de descargarlo y guardarlo de forma segura en tu almacenamiento privado (Cloudflare R2) para enviar el correo.
                </li>
                <li>
                  <strong className="text-slate-200">Metadatos de Correo:</strong> Almacenamos el remitente, destinatario, fecha, asunto, adjuntos y contenido del mensaje exclusivamente para que estén disponibles en tu bandeja de entrada.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">3. Tecnologías y Seguridad</h2>
              <p>
                Nuestra plataforma cuenta con una infraestructura serverless distribuida. Los datos son almacenados en bases de datos cifradas (MongoDB) y en repositorios de almacenamiento de objetos (Cloudflare R2). Todas las conexiones de red están estrictamente protegidas bajo cifrado SSL/TLS.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">4. Cookies de Navegación</h2>
              <p>
                No empleamos cookies de rastreo comercial ni píxeles publicitarios. Solo utilizamos cookies estrictamente técnicas e indispensables para asegurar la persistencia de tu sesión y validar la seguridad mediante autenticación de doble factor (2FA).
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">5. Control y Derechos</h2>
              <p>
                Como usuario administrador o autorizado en este servidor, tienes el derecho de solicitar la baja de tu cuenta, la eliminación permanente de tus correos y la revocación del consentimiento para iniciar sesión mediante OAuth en cualquier momento desde tu cuenta de Google.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
