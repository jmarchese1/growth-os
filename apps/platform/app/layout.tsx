import type { Metadata } from 'next';
import { Fraunces, Geist, JetBrains_Mono } from 'next/font/google';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { SessionProvider } from '../components/auth/session-provider';
import './globals.css';

// Editorial display — variable serif with optical sizing + soft/wonk axes
const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT', 'WONK'],
});

// UI sans — Geist for precision
const fontUI = Geist({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Data / labels — JetBrains Mono
const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Embedo',
  description: 'Embedo internal outreach operations',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontUI.variable} ${fontMono.variable}`}>
      <body className="font-ui antialiased">
        <SessionProvider initialUser={user}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
