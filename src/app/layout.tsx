import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import ModalProvider from '@/components/modal-provider';

export const metadata: Metadata = {
  title: 'Broslunas Correo — Bandeja de Entrada',
  description: 'Sistema de correo electrónico privado, auto-alojado y 100% serverless. Acceso seguro con Google OAuth y 2FA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Broslunas',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme') || localStorage.getItem('webmail_theme');
                const isDark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#f6f8fc" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111318" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Broslunas" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          defer
          src="https://analytics.broslunas.com/script.js"
          data-website-id="0d8fd1b0-3b2d-450d-98bd-5ec6f67f2e29"
        />
        <script
          defer
          src="https://analytics.broslunas.com/recorder.js"
          data-website-id="0d8fd1b0-3b2d-450d-98bd-5ec6f67f2e29"
        />
      </head>
      <body className="antialiased font-sans">
        {children}
        <Toaster richColors position="bottom-right" />
        <ModalProvider />
      </body>
    </html>
  );
}
