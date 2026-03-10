'use client';

const PARTICLES = [
  // Inner ring
  { duration: '4.5s', delay: '0s',    radius: 72,  sz: 2.8, a: 0.82, rgb: '167,139,250' },
  { duration: '3.8s', delay: '-1.5s', radius: 82,  sz: 2.2, a: 0.65, rgb: '139,92,246'  },
  { duration: '5.2s', delay: '-2.8s', radius: 68,  sz: 3.0, a: 0.72, rgb: '99,102,241'  },
  { duration: '4.0s', delay: '-0.7s', radius: 77,  sz: 1.8, a: 0.55, rgb: '196,181,253' },
  // Outer ring
  { duration: '7.0s', delay: '-1.0s', radius: 108, sz: 2.0, a: 0.48, rgb: '167,139,250' },
  { duration: '5.5s', delay: '-3.5s', radius: 120, sz: 1.5, a: 0.35, rgb: '139,92,246'  },
  { duration: '6.5s', delay: '-2.0s', radius: 104, sz: 1.8, a: 0.42, rgb: '99,102,241'  },
  { duration: '8.0s', delay: '-4.5s', radius: 115, sz: 1.4, a: 0.30, rgb: '196,181,253' },
];

// Business growth emojis — evenly spaced (60° apart), same speed, same radius
const EMOJI_ORBIT_RADIUS = 158;
const EMOJI_DURATION = '14s';
const EMOJI_COUNT = 6;
const EMOJIS = ['💰', '❤️', '✉️', '📈', '💬', '📱'].map((emoji, i) => ({
  emoji,
  radius: EMOJI_ORBIT_RADIUS,
  duration: EMOJI_DURATION,
  // Negative delay distributes them evenly: offset = -(i / count) * duration
  delay: `-${((i / EMOJI_COUNT) * 14).toFixed(2)}s`,
  size: 19,
}));

// Dashed orbit rings: {size: full px, dash/gap, clockwise, speed}
const RINGS = [
  { size: 180, r: 88,  dash: '10 18', dot: 3.5, dotColor: 'rgba(99,102,241,0.95)',  speed: '16s',  cw: true  },
  { size: 248, r: 122, dash: '5 24',  dot: 2.5, dotColor: 'rgba(139,92,246,0.70)', speed: '24s',  cw: false },
  { size: 300, r: 148, dash: '3 32',  dot: 2.0, dotColor: 'rgba(167,139,250,0.45)', speed: '32s',  cw: true  },
];

export default function LogoDisplay() {
  const S = 180; // cube SVG size in px

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{ minHeight: 380 }}
    >
      {/* ── Multi-layer glow ─────────────────────────────────── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(109,40,217,0.28) 0%, transparent 68%)',
          animation: 'pulse-glow 3.5s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(139,92,246,0.38) 0%, transparent 68%)',
          animation: 'pulse-glow 2.8s ease-in-out infinite 0.7s',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 130, height: 130,
          background: 'radial-gradient(circle, rgba(167,139,250,0.50) 0%, transparent 68%)',
          animation: 'pulse-glow 2.2s ease-in-out infinite 1.4s',
        }}
      />

      {/* ── Counter-rotating dashed rings with orbiting dots ─── */}
      {RINGS.map((ring, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: ring.size, height: ring.size,
            left: '50%', top: '50%',
            marginLeft: -(ring.size / 2),
            marginTop:  -(ring.size / 2),
            animation: `logo-orbit ${ring.speed} linear infinite${ring.cw ? '' : ' reverse'}`,
          }}
        >
          <svg width={ring.size} height={ring.size} viewBox={`0 0 ${ring.size} ${ring.size}`} fill="none">
            {/* Ring */}
            <circle
              cx={ring.size / 2} cy={ring.size / 2} r={ring.r}
              stroke={`rgba(99,102,241,${0.22 - i * 0.05})`}
              strokeWidth={1.2 - i * 0.2}
              strokeDasharray={ring.dash}
            />
            {/* Orbiting dot — sits at the top of the ring */}
            <circle cx={ring.size / 2} cy={ring.size / 2 - ring.r} r={ring.dot} fill={ring.dotColor} />
          </svg>
        </div>
      ))}

      {/* ── Particles ─────────────────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: p.radius * 2 + p.sz,
            height: p.radius * 2 + p.sz,
            left: '50%', top: '50%',
            marginLeft: -(p.radius + p.sz / 2),
            marginTop:  -(p.radius + p.sz / 2),
            animation: `logo-orbit ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: p.sz, height: p.sz,
              background: `rgba(${p.rgb}, ${p.a})`,
              top: 0, left: '50%',
              marginLeft: -(p.sz / 2),
              boxShadow: `0 0 ${p.sz * 3}px rgba(${p.rgb}, ${p.a * 0.8})`,
            }}
          />
        </div>
      ))}

      {/* ── Orbiting emojis ────────────────────────────────────── */}
      {EMOJIS.map((e, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: e.radius * 2 + e.size,
            height: e.radius * 2 + e.size,
            left: '50%', top: '50%',
            marginLeft: -(e.radius + e.size / 2),
            marginTop:  -(e.radius + e.size / 2),
            animation: `logo-orbit ${e.duration} linear infinite`,
            animationDelay: e.delay,
          }}
        >
          {/* Counter-rotate so emoji stays upright while orbiting */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: '50%',
              marginLeft: -(e.size / 2),
              width: e.size,
              height: e.size,
              fontSize: e.size,
              lineHeight: 1,
              textAlign: 'center',
              animation: `counter-orbit ${e.duration} linear infinite`,
              animationDelay: e.delay,
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))',
            }}
          >
            {e.emoji}
          </div>
        </div>
      ))}

      {/* ── Cube: breathing spin ───────────────────────────────── */}
      <div
        className="relative z-10"
        style={{ animation: 'cube-spin-breathe 30s ease-in-out infinite' }}
      >
        <svg
          width={S} height={S}
          viewBox="0 0 32 32"
          fill="none"
          style={{
            filter: [
              'drop-shadow(0 0 32px rgba(109,40,217,0.80))',
              'drop-shadow(0 0 12px rgba(139,92,246,0.60))',
              'drop-shadow(0 0 4px  rgba(167,139,250,0.50))',
            ].join(' '),
          }}
        >
          <defs>
            <linearGradient id="dlg2" x1="4" y1="4" x2="28" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="white" stopOpacity="0.30" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Top */}
          <polygon points="16,4 28,10 16,16 4,10" fill="#7C3AED" />
          <circle cx="10.5" cy="8.8"  r="1.2"  fill="rgba(0,0,0,0.28)" />
          <circle cx="16.5" cy="6.8"  r="0.85" fill="rgba(0,0,0,0.20)" />
          <circle cx="21.2" cy="10.2" r="1.1"  fill="rgba(0,0,0,0.24)" />
          <circle cx="13.8" cy="12.5" r="0.8"  fill="rgba(255,255,255,0.14)" />
          <circle cx="19.0" cy="13.5" r="0.7"  fill="rgba(0,0,0,0.18)" />
          <polygon points="16,4 28,10 16,16 4,10" fill="url(#dlg2)" />
          {/* Left */}
          <polygon points="4,10 16,16 16,28 4,22"  fill="#4C1D95" />
          <circle cx="7.2"  cy="18.5" r="1.0"  fill="rgba(0,0,0,0.30)" />
          <circle cx="9.8"  cy="24.8" r="0.85" fill="rgba(0,0,0,0.25)" />
          <circle cx="6.0"  cy="13.5" r="0.7"  fill="rgba(255,255,255,0.07)" />
          {/* Right */}
          <polygon points="28,10 16,16 16,28 28,22" fill="#6D28D9" />
          <circle cx="24.8" cy="18.5" r="1.0"  fill="rgba(0,0,0,0.20)" />
          <circle cx="22.2" cy="25.2" r="0.85" fill="rgba(0,0,0,0.18)" />
          <circle cx="26.0" cy="13.5" r="0.7"  fill="rgba(255,255,255,0.09)" />
          {/* Edges */}
          <polyline points="16,4 4,10 4,22 16,28 28,22 28,10 16,4" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" fill="none" />
          <line x1="16" y1="16" x2="4"  y2="10" stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
          <line x1="16" y1="16" x2="28" y2="10" stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
          <line x1="16" y1="16" x2="16" y2="28" stroke="rgba(0,0,0,0.20)" strokeWidth="0.4" />
        </svg>
      </div>
    </div>
  );
}
