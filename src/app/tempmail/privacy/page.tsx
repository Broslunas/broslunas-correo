'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

type TabId = 'privacy' | 'terms' | 'cookies';

const tabs: { id: TabId; label: string }[] = [
  { id: 'privacy', label: '📋 Privacidad' },
  { id: 'terms',   label: '📜 Términos' },
  { id: 'cookies', label: '🍪 Cookies' },
];

const sections: Record<TabId, { title: string; items: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Política de Privacidad',
    items: [
      {
        heading: '¿Qué datos recopilamos?',
        body: 'Broslunas Mail recopila únicamente los correos electrónicos enviados a tu alias temporal, así como la dirección del alias generado. No se recopilan datos personales identificables, direcciones IP, huellas digitales del navegador, ni información de usuario alguna.',
      },
      {
        heading: '¿Cómo usamos estos datos?',
        body: 'Los correos recibidos se almacenan en nuestra base de datos MongoDB exclusivamente para mostrártelos en el buzón temporal. Una vez transcurridas 24 horas, todos los correos y la sesión se eliminan automáticamente mediante un índice TTL de MongoDB.',
      },
      {
        heading: '¿Compartimos tus datos?',
        body: 'No vendemos, compartimos ni transferimos datos a terceros bajo ninguna circunstancia. Los datos se procesan íntegramente en nuestra infraestructura.',
      },
      {
        heading: 'Autodestrucción',
        body: 'Todos los datos del correo temporal (alias + emails) se eliminan automáticamente a las 24 horas de crear la sesión, sin intervención manual. No se realizan copias de seguridad de los correos temporales.',
      },
      {
        heading: 'Seguridad',
        body: 'Los correos entrantes se transmiten de Cloudflare a nuestro servidor mediante HTTPS cifrado. Los datos en reposo se almacenan en MongoDB con TTL automático. No almacenamos tokens de sesión en el servidor una vez expirada la sesión.',
      },
    ],
  },
  terms: {
    title: 'Términos de Uso',
    items: [
      {
        heading: 'Uso Aceptable',
        body: 'Broslunas Mail es un servicio diseñado para proteger tu privacidad al registrarte en sitios web y recibir verificaciones puntuales. Queda prohibido el uso del servicio para actividades ilegales, spam, fraude o cualquier actividad que vulnere derechos de terceros.',
      },
      {
        heading: 'Sin Garantía de Disponibilidad',
        body: 'El servicio se ofrece "tal cual" sin garantía de disponibilidad continua. Los correos temporales tienen un ciclo de vida de 24 horas y pueden perderse si el servicio sufre una interrupción. No uses este servicio para comunicaciones críticas.',
      },
      {
        heading: 'Limitación de Responsabilidad',
        body: 'Broslunas no se hace responsable de la pérdida de correos, la indisponibilidad del servicio o el uso inapropiado del mismo. El usuario acepta que el servicio es de naturaleza temporal y efímera.',
      },
      {
        heading: 'Modificaciones',
        body: 'Nos reservamos el derecho de modificar o interrumpir el servicio en cualquier momento sin previo aviso. Los términos pueden actualizarse; el uso continuado del servicio implica la aceptación de los términos vigentes.',
      },
    ],
  },
  cookies: {
    title: 'Política de Cookies',
    items: [
      {
        heading: 'Sin cookies analíticas',
        body: 'Broslunas Mail no utiliza cookies de rastreo, analíticas ni publicitarias. No hay Google Analytics, Meta Pixel ni ningún sistema de seguimiento de comportamiento.',
      },
      {
        heading: 'Almacenamiento Local (localStorage)',
        body: 'El alias temporal y el token de sesión se almacenan en el localStorage de tu navegador exclusivamente para mantener la sesión activa durante 24 horas. Estos datos jamás se envían a terceros. Puedes eliminarlos en cualquier momento desde la configuración de tu navegador o usando el botón de "Botón de Pánico".',
      },
      {
        heading: 'Datos que guardamos en tu navegador',
        body: '• tm_address: tu alias temporal actual\n• tm_created: timestamp de creación de la sesión (para calcular la expiración)\n• tm_session_token: token para operaciones de borrado seguro\n• tm_theme: tu preferencia de tema visual',
      },
      {
        heading: 'Cómo eliminar todos los datos',
        body: 'Puedes borrar todos los datos locales de Broslunas Mail en cualquier momento usando el "Botón de Pánico" (icono ⚠) en el dashboard, presionando Escape dos veces, o limpiando el localStorage de tu navegador.',
      },
    ],
  },
};

function PrivacyContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('privacy');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabId;
    if (tab && tabs.some(t => t.id === tab)) setActiveTab(tab);
  }, [searchParams]);

  const { title, items } = sections[activeTab];

  return (
    <div className="tempmail-scope min-h-screen flex flex-col" style={{ background: 'var(--tm-bg)', color: 'var(--tm-fg)' }}>
      {/* Background glow */}
      <div className="fixed top-[-30%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'rgba(212,175,55,0.04)' }} />

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ border: '1px solid var(--tm-accent)', background: 'var(--tm-bg)' }}>
            <Shield className="w-4 h-4" style={{ color: 'var(--tm-accent)' }} />
          </div>
          <span className="text-md font-black tracking-widest uppercase text-foreground">
            Broslunas <span style={{ color: 'var(--tm-accent)', fontWeight: 400 }}>Mail</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/tempmail"
            className="tm-btn px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: 'var(--tm-accent)' }} /> Volver
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 z-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
          <Link href="/tempmail" className="hover:text-foreground transition-colors">Inicio</Link>
          <ChevronRight className="w-3 h-3" />
          <span style={{ color: 'var(--tm-accent)' }}>{title}</span>
        </div>

        <h1 className="text-3xl font-light text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground text-xs mb-8 font-medium">
          Última actualización: 1 de junio de 2026 · Broslunas Mail — Correo Temporal Integrado
        </p>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                border: '1px solid',
                background: activeTab === tab.id ? 'hsl(var(--primary)/0.15)' : 'hsl(var(--muted))',
                borderColor: activeTab === tab.id ? 'hsl(var(--primary)/0.3)' : 'var(--tm-border)',
                color: activeTab === tab.id ? 'var(--tm-accent)' : 'hsl(var(--muted-foreground))',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">
          {items.map((item, idx) => (
            <div key={idx} className="tm-panel p-5 sm:p-6 bg-card border border-border">
              <h3 className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 text-foreground">
                <span className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: 'hsl(var(--primary)/0.12)', color: 'var(--tm-accent)' }}>
                  {(idx + 1).toString().padStart(2, '0')}
                </span>
                {item.heading}
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed font-medium whitespace-pre-line">{item.body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 p-6 rounded-2xl text-center"
          style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <p className="text-xs text-slate-400 font-medium mb-4">
            ¿Tienes alguna pregunta sobre privacidad o el uso del servicio?
          </p>
          <Link href="/tempmail"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-black transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(to right, var(--tm-accent), var(--tm-accent-s))', boxShadow: '0 6px 16px rgba(212,175,55,0.15)' }}>
            Generar Buzón Temporal <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <footer className="w-full max-w-4xl mx-auto px-6 pb-10 text-center text-[9px] font-bold text-slate-600 z-10 mt-8">
        <p>© 2026 Broslunas Mail — Parte de Broslunas Correo — Todos los derechos reservados</p>
      </footer>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
      </div>
    }>
      <PrivacyContent />
    </Suspense>
  );
}
