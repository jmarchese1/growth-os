import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Outfit, Syne, Fira_Code } from 'next/font/google';
import './globals.css';
import './v3/v3.css';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

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
  description:
    'Complete AI infrastructure for local businesses. Voice, chat, website, social, CRM — deployed in days.',
  openGraph: {
    title: 'Embedo — AI That Runs Your Business',
    description: 'Deploy a complete AI layer into your business. Voice agent, chatbot, leads, social, and more.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Embedo — AI for Local Business',
    description: 'The complete AI automation stack for restaurants and local businesses.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${font.variable} ${outfit.variable} ${syne.variable} ${firaCode.variable}`}>
      <body className="font-sans v3-page v3-noise">{children}</body>
    </html>
  );
}
