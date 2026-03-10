'use client';
import { useEffect, useRef, useState } from 'react';

export default function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = ref.current?.closest('section');
    if (!section) return;

    const onMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', onLeave);
    return () => {
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none z-[6] transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
        background: `radial-gradient(circle 520px at ${pos.x}px ${pos.y}px, transparent 0%, transparent 28%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.07) 100%)`,
      }}
    />
  );
}
