'use client';

import { useEffect, useRef } from 'react';

export type CubeyMood = 'happy' | 'thinking' | 'excited' | 'waving' | 'love';

interface Props {
  size?: number;
  mood?: CubeyMood;
  bounce?: boolean;
  className?: string;
}

/**
 * Animated Embedo cube character with googly eyes.
 * Used as a cute guide mascot in the setup wizard.
 */
export function EmbedoCubeMascot({ size = 80, mood = 'happy', bounce = true, className = '' }: Props) {
  const eyeRef = useRef<SVGGElement>(null);

  // Blink animation
  useEffect(() => {
    const el = eyeRef.current;
    if (!el) return;
    const blink = () => {
      el.style.transform = 'scaleY(0.1)';
      setTimeout(() => { el.style.transform = 'scaleY(1)'; }, 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const s = size / 80;
  const bounceClass = bounce ? 'animate-mascot-bounce' : '';
  const moodClass = mood === 'excited' ? 'animate-mascot-wiggle' : '';

  return (
    <div className={`relative inline-flex items-center justify-center ${bounceClass} ${moodClass} ${className}`} style={{ width: size, height: size * 1.1 }}>
      {/* Shadow */}
      <div
        className="absolute rounded-full bg-violet-500/20 blur-md animate-mascot-shadow"
        style={{ width: size * 0.6, height: size * 0.15, bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Glow */}
      <div
        className="absolute rounded-full bg-violet-400/15 blur-xl"
        style={{ width: size * 1.2, height: size * 1.2, top: '50%', left: '50%', transform: 'translate(-50%, -55%)' }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        className="relative z-10"
        style={{ marginBottom: size * 0.1 }}
      >
        <defs>
          <linearGradient id={`mascot-top-${mood}`} x1="10" y1="15" x2="70" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id={`mascot-left-${mood}`} x1="10" y1="35" x2="40" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6D28D9" />
            <stop offset="1" stopColor="#4C1D95" />
          </linearGradient>
          <linearGradient id={`mascot-right-${mood}`} x1="40" y1="35" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#5B21B6" />
          </linearGradient>
          <filter id={`mascot-glow-${mood}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Cube body — top face */}
        <polygon points="40,12 70,28 40,44 10,28" fill={`url(#mascot-top-${mood})`} />
        {/* Top face shine */}
        <polygon points="40,12 70,28 40,44 10,28" fill="white" opacity="0.08" />

        {/* Cube body — left face */}
        <polygon points="10,28 40,44 40,68 10,52" fill={`url(#mascot-left-${mood})`} />

        {/* Cube body — right face */}
        <polygon points="70,28 40,44 40,68 70,52" fill={`url(#mascot-right-${mood})`} />

        {/* Edge highlights */}
        <polyline points="40,12 10,28 10,52 40,68 70,52 70,28 40,12" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" fill="none" />
        <line x1="40" y1="44" x2="10" y2="28" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        <line x1="40" y1="44" x2="70" y2="28" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        <line x1="40" y1="44" x2="40" y2="68" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />

        {/* Face — on top face */}
        {mood !== 'love' && (
          <g ref={eyeRef} style={{ transition: 'transform 0.1s ease', transformOrigin: '40px 28px' }}>
            {/* Left eye */}
            <ellipse cx="30" cy="26" rx="5" ry="5.5" fill="white" />
            <ellipse cx="31" cy="26.5" rx="2.8" ry="3" fill="#1e1b4b" />
            <ellipse cx="32" cy="25.5" rx="1" ry="1.2" fill="white" />

            {/* Right eye */}
            <ellipse cx="50" cy="26" rx="5" ry="5.5" fill="white" />
            <ellipse cx="51" cy="26.5" rx="2.8" ry="3" fill="#1e1b4b" />
            <ellipse cx="52" cy="25.5" rx="1" ry="1.2" fill="white" />
          </g>
        )}

        {/* Mouth */}
        {mood === 'happy' && (
          <path d="M35 33 Q40 37 45 33" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        )}
        {mood === 'excited' && (
          <ellipse cx="40" cy="34" rx="4" ry="3" fill="#1e1b4b" />
        )}
        {mood === 'thinking' && (
          <ellipse cx="42" cy="34" rx="2.5" ry="2" fill="#1e1b4b" />
        )}
        {mood === 'waving' && (
          <>
            <path d="M35 33 Q40 37 45 33" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Little hand waving */}
            <g className="animate-mascot-wave" style={{ transformOrigin: '72px 30px' }}>
              <path d="M70 32 Q76 24 80 28" stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <circle cx="80" cy="27" r="2.5" fill="#8B5CF6" />
            </g>
          </>
        )}
        {mood === 'love' && (
          <>
            {/* Heart eyes */}
            <g>
              {/* Left heart */}
              <path d="M26 24 C26 21, 30 21, 30 24 C30 21, 34 21, 34 24 C34 27, 30 30, 30 30 C30 30, 26 27, 26 24Z" fill="#EC4899" />
              {/* Right heart */}
              <path d="M46 24 C46 21, 50 21, 50 24 C50 21, 54 21, 54 24 C54 27, 50 30, 50 30 C50 30, 46 27, 46 24Z" fill="#EC4899" />
            </g>
            {/* Big smile */}
            <path d="M33 33 Q40 39 47 33" stroke="#1e1b4b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Cheek blush */}
        <ellipse cx="24" cy="32" rx="3.5" ry="2" fill="#EC4899" opacity="0.2" />
        <ellipse cx="56" cy="32" rx="3.5" ry="2" fill="#EC4899" opacity="0.2" />

        {/* Sparkle particles */}
        {mood === 'excited' && (
          <>
            <g className="animate-mascot-sparkle">
              <line x1="18" y1="14" x2="18" y2="8" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="15" y1="11" x2="21" y2="11" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            <g className="animate-mascot-sparkle" style={{ animationDelay: '0.3s' }}>
              <line x1="64" y1="12" x2="64" y2="6" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="61" y1="9" x2="67" y2="9" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            <g className="animate-mascot-sparkle" style={{ animationDelay: '0.6s' }}>
              <circle cx="8" cy="22" r="1.5" fill="#A78BFA" />
            </g>
          </>
        )}
        {mood === 'love' && (
          <>
            <g className="animate-mascot-sparkle">
              <path d="M16 12 C16 10.5, 17.5 10.5, 17.5 12 C17.5 10.5, 19 10.5, 19 12 C19 13.5, 17.5 15, 17.5 15 C17.5 15, 16 13.5, 16 12Z" fill="#F472B6" opacity="0.7" />
            </g>
            <g className="animate-mascot-sparkle" style={{ animationDelay: '0.4s' }}>
              <path d="M62 10 C62 8.5, 63.5 8.5, 63.5 10 C63.5 8.5, 65 8.5, 65 10 C65 11.5, 63.5 13, 63.5 13 C63.5 13, 62 11.5, 62 10Z" fill="#F472B6" opacity="0.7" />
            </g>
            <g className="animate-mascot-sparkle" style={{ animationDelay: '0.7s' }}>
              <path d="M6 24 C6 22.5, 7.5 22.5, 7.5 24 C7.5 22.5, 9 22.5, 9 24 C9 25.5, 7.5 27, 7.5 27 C7.5 27, 6 25.5, 6 24Z" fill="#F472B6" opacity="0.5" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
