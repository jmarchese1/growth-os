import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { SessionProvider } from '../components/auth/session-provider';
import { BusinessProvider } from '../components/auth/business-provider';
import { ThemeProvider } from '../components/theme-provider';
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

export const metadata: Metadata = {
  title: 'Embedo — Dashboard',
  description: 'Your AI-powered business dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${fontSans.variable} ${fontHeading.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <SessionProvider initialUser={user}>
            <BusinessProvider>
              {children}
            </BusinessProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
