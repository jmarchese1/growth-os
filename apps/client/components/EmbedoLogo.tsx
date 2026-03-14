'use client';

interface EmbedoLogoProps {
  size?: number;
}

const PARTICLES = [
  { duration: '3.2s', delay: '0s',    radius: 20, sz: 2.5, alpha: 0.75 },
  { duration: '2.6s', delay: '-0.9s', radius: 24, sz: 1.5, alpha: 0.50 },
  { duration: '4.0s', delay: '-1.8s', radius: 17, sz: 2.0, alpha: 0.60 },
  { duration: '3.6s', delay: '-2.4s', radius: 22, sz: 1.5, alpha: 0.40 },
  { duration: '2.9s', delay: '-0.5s', radius: 19, sz: 1.8, alpha: 0.55 },
];

export default function EmbedoLogo({ size = 30 }: EmbedoLogoProps) {
  const scale = size / 30; // base size is 30, scale particles proportionally
  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, overflow: 'visible' }}
    >
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            animation: `logo-orbit ${p.duration} linear infinite`,
            animationDelay: p.delay,
            overflow: 'visible',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: p.sz * scale,
              height: p.sz * scale,
              background: `rgba(167, 139, 250, ${p.alpha})`,
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${p.radius * scale}px), -50%)`,
              boxShadow: `0 0 ${p.sz * scale * 2}px rgba(167, 139, 250, ${p.alpha * 0.8})`,
            }}
          />
        </div>
      ))}

      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="tg-client" x1="4" y1="4" x2="28" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="white" stopOpacity="0.22" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
        <circle cx="10.5" cy="8.8" r="1.2" fill="rgba(0,0,0,0.28)" />
        <circle cx="16.5" cy="6.8" r="0.85" fill="rgba(0,0,0,0.20)" />
        <circle cx="21.2" cy="10.2" r="1.1" fill="rgba(0,0,0,0.24)" />
        <circle cx="13.8" cy="12.5" r="0.8" fill="rgba(255,255,255,0.12)" />
        <circle cx="19.0" cy="13.5" r="0.7" fill="rgba(0,0,0,0.18)" />
        <polygon points="16,4 28,10 16,16 4,10" fill="url(#tg-client)" />
        <polygon points="4,10 16,16 16,28 4,22" fill="#4C1D95" />
        <circle cx="7.2" cy="18.5" r="1.0" fill="rgba(0,0,0,0.30)" />
        <circle cx="9.8" cy="24.8" r="0.85" fill="rgba(0,0,0,0.25)" />
        <circle cx="6.0" cy="13.5" r="0.7" fill="rgba(255,255,255,0.06)" />
        <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
        <circle cx="24.8" cy="18.5" r="1.0" fill="rgba(0,0,0,0.20)" />
        <circle cx="22.2" cy="25.2" r="0.85" fill="rgba(0,0,0,0.18)" />
        <circle cx="26.0" cy="13.5" r="0.7" fill="rgba(255,255,255,0.08)" />
        <polyline
          points="16,4 4,10 4,22 16,28 28,22 28,10 16,4"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.6"
          fill="none"
        />
        <line x1="16" y1="16" x2="4"  y2="10" stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
        <line x1="16" y1="16" x2="28" y2="10" stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
        <line x1="16" y1="16" x2="16" y2="28" stroke="rgba(0,0,0,0.20)" strokeWidth="0.4" />
      </svg>
    </div>
  );
}
