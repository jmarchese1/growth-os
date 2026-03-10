'use client';
import { useEffect, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  variant?: 'up' | 'left' | 'right';
  delay?: number; // ms
}

export default function ScrollReveal({ children, className = '', variant = 'up', delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cls = variant === 'left' ? 'reveal-left' : variant === 'right' ? 'reveal-right' : 'reveal';
    el.classList.add(cls);
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
