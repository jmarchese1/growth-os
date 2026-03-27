import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';

const display = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`}>
      {children}
    </div>
  );
}
