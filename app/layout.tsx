import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import CsrfInjector from '@/components/CsrfInjector';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teacherfolio.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'TeacherFolio — Teaching websites ready in minutes', template: '%s | TeacherFolio' },
  description: 'Chat-based builder for teacher portfolios. Pick from 1,000+ themes, publish to Vercel or download a standalone ZIP. No coding required.',
  keywords: ['teacher portfolio', 'teacher website builder', 'educator portfolio', 'teaching website'],
  authors: [{ name: 'TeacherFolio' }],
  manifest: '/manifest.json',
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'TeacherFolio',
    title: 'TeacherFolio — Your teaching website, ready in minutes',
    description: 'Answer a few questions and get a standalone portfolio site you can download or publish live.',
  },
  twitter: { card: 'summary_large_image', title: 'TeacherFolio', description: 'Your teaching website. Ready in minutes.' },
  appleWebApp: { capable: true, title: 'TeacherFolio', statusBarStyle: 'black-translucent', startupImage: [] },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    other: [{ rel: 'mask-icon', url: '/icon.svg', color: '#6366f1' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="TeacherFolio" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="mask-icon" href="/icon.svg" color="#6366f1" />
      </head>
      <body suppressHydrationWarning className="bg-surface-950 text-slate-200 font-sans antialiased">
        <div className="noise-overlay" />
        <div className="fixed inset-x-0 top-0 h-[2px] z-50 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 opacity-60" />
        {children}
        <CsrfInjector />
        <PwaRegister />
      </body>
    </html>
  );
}
