import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './v3.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Embedo — AI That Runs Your Business',
  description: 'Complete AI infrastructure for local businesses. Voice, chat, website, social, CRM — deployed in days.',
};

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jakarta.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} v3-page v3-noise`}>
      {children}
    </div>
  );
}
