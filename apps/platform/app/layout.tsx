import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, Lexend } from 'next/font/google';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { SessionProvider } from '../components/auth/session-provider';
import './globals.css';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const fontHeading = DM_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const fontBody = Lexend({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  title: 'Embedo — Admin',
  description: 'Embedo internal operations platform',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${fontSans.variable} ${fontHeading.variable} ${fontBody.variable}`}>
      <body className="font-sans antialiased">
        <SessionProvider initialUser={user}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
