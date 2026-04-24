import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Times New Roman', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Ink (surfaces)
        ink: {
          0: '#0a0a0a',
          1: '#121212',
          2: '#171717',
          3: '#1d1d1d',
        },
        // Paper (text)
        paper: {
          DEFAULT: '#fafaf5',
          2: '#c9c9c3',
          3: '#8a8a85',
          4: '#55554f',
        },
        // Rules
        rule: {
          DEFAULT: '#222222',
          soft: '#1a1a1a',
          strong: '#2d2d2d',
        },
        // Signal accent
        signal: {
          DEFAULT: '#d6f84c',
          dim: '#a8c53a',
        },
        amber: {
          DEFAULT: '#f5a623',
        },
        ember: {
          DEFAULT: '#e0632a',
        },
      },
      letterSpacing: {
        micro: '0.12em',
        mega:  '0.18em',
      },
      fontSize: {
        'hero':      ['96px',  { lineHeight: '0.9',  letterSpacing: '-0.03em' }],
        'hero-sm':   ['72px',  { lineHeight: '0.9',  letterSpacing: '-0.03em' }],
        'hero-xs':   ['56px',  { lineHeight: '0.9',  letterSpacing: '-0.025em' }],
        'stat':      ['40px',  { lineHeight: '1',    letterSpacing: '-0.02em' }],
        'stat-sm':   ['28px',  { lineHeight: '1',    letterSpacing: '-0.015em' }],
      },
    },
  },
  plugins: [],
};

export default config;
