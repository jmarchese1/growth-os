import type { Metadata } from 'next';
import { Outfit, Syne, Fira_Code } from 'next/font/google';
import './v3.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-body',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
});

const firaCode = Fira_Code({
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
    <div className={`${outfit.variable} ${syne.variable} ${firaCode.variable} v3-page v3-noise`}>
      {children}
    </div>
  );
}
