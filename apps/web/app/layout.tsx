import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Embedo — AI Infrastructure for Local Business',
  description:
    'Embedo installs a complete AI automation layer into your business. AI voice receptionist, chatbot, lead generation, social media, and more — deployed in days.',
  openGraph: {
    title: 'Embedo — AI Infrastructure for Local Business',
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
    <html lang="en" className={font.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
