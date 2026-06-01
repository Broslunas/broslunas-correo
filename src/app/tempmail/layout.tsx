import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broslunas Mail | Correo Temporal Seguro y Anónimo',
  description:
    'Crea correos electrónicos temporales al instante. Protege tu privacidad, evita el spam y recibe códigos OTP de forma segura. Sin registro ni contraseñas.',
  robots: { index: false, follow: false },
};

export default function TempMailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
