import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SessionProvider } from '@/lib/session';
import { RegisterSW } from '@/components/RegisterSW';
import './globals.css';

export const metadata: Metadata = {
  title: 'GLT Academic Unit',
  description: 'Events, tutorials, timetable and help for the GLT Academic Unit, Ife Extension.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'GLT Academic', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#238021' }, { media: '(prefers-color-scheme: dark)', color: '#06100A' }],
  width: 'device-width', initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
