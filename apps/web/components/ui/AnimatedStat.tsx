'use client';
import { useEffect, useRef, useState } from 'react';

interface AnimatedStatProps {
  value: string;  // e.g. "73%", "4x"
  label: string;
}

function parseTarget(value: string): { num: number; suffix: string; prefix: string } {
  const match = value.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return { num: 0, suffix: '', prefix: '' };
  return { prefix: match[1] ?? '', num: parseFloat(match[2] ?? '0'), suffix: match[3] ?? '' };
}

export default function AnimatedStat({ value, label }: AnimatedStatProps) {
  const { num, suffix, prefix } = parseTarget(value);
  const [display, setDisplay] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'counting' | 'done'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger when element enters viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPhase('counting');
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Count-up animation
  useEffect(() => {
    if (phase !== 'counting') return;
    const duration = 1600;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out quart
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(eased * num));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase('done');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, num]);

  const progress = phase === 'idle' ? 0 : phase === 'counting' ? (display / num) * 100 : 100;

  return (
    <div
      ref={containerRef}
      className="bg-white p-8 hover:bg-gray-50 transition-colors relative overflow-hidden group"
    >
      {/* Subtle completion tint */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-indigo-50/30 to-transparent transition-opacity duration-1000 pointer-events-none ${
          phase === 'done' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* Top fill line */}
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 transition-all ease-out"
          style={{
            width: `${progress}%`,
            transitionDuration: phase === 'counting' ? '1600ms' : '0ms',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Number — drifts upward 6px as it counts, settles on done */}
        <p
          className="text-6xl font-bold mb-2 text-gradient tabular-nums transition-all duration-500 ease-out"
          style={{
            display: 'inline-block',
            transform: phase === 'idle'
              ? 'translateY(6px)'
              : phase === 'counting'
              ? `translateY(${6 - (display / num) * 6}px)`
              : 'translateY(0px)',
            opacity: phase === 'idle' ? 0.4 : 1,
          }}
        >
          {prefix}{display}{suffix}
        </p>

        {/* Thin progress bar */}
        <div className="h-px bg-gray-100 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-pink-400 transition-all ease-out"
            style={{
              width: `${progress}%`,
              transitionDuration: phase === 'counting' ? '1600ms' : '0ms',
            }}
          />
        </div>

        <p className="text-gray-500 leading-relaxed text-sm">{label}</p>
      </div>
    </div>
  );
}
