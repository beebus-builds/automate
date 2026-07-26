import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Teacher Portfolio CMS',
  description: 'Full-stack teacher portfolio website generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
