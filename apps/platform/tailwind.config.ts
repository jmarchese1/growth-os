import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Display now resolves to UI sans for Apple-style chrome.
        // Fraunces is still loaded but unused here — kept available via .serif-italic.
        display: ['var(--font-ui)', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
        ui:      ['var(--font-ui)', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Ink (surfaces) — white to light grey
        ink: {
          0: '#ffffff',
          1: '#fbfbfd',
          2: '#f5f5f7',
          3: '#ebebed',
        },
        // Paper (text) — dark to muted grey
        paper: {
          DEFAULT: '#1d1d1f',
          2: '#424245',
          3: '#86868b',
          4: '#b8b8be',
        },
        // Rules — Apple borders
        rule: {
          DEFAULT: '#d2d2d7',
          soft:    '#ebebed',
          strong:  '#86868b',
        },
        // Signal accent — Apple blue
        signal: {
          DEFAULT: '#0071e3',
          dim:     '#0058b9',
        },
        amber: {
          DEFAULT: '#ff9500',
        },
        ember: {
          DEFAULT: '#ff3b30',
        },
      },
      letterSpacing: {
        micro: '0.10em',
        mega:  '0.14em',
      },
      fontSize: {
        'hero':      ['56px',  { lineHeight: '1',    letterSpacing: '-0.035em' }],
        'hero-sm':   ['44px',  { lineHeight: '1',    letterSpacing: '-0.03em' }],
        'hero-xs':   ['34px',  { lineHeight: '1',    letterSpacing: '-0.025em' }],
        'stat':      ['32px',  { lineHeight: '1',    letterSpacing: '-0.02em' }],
        'stat-sm':   ['24px',  { lineHeight: '1',    letterSpacing: '-0.015em' }],
      },
      borderRadius: {
        'apple': '10px',
        'apple-lg': '14px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
