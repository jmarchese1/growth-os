'use client';
import { useEffect, useRef, useState } from 'react';

export default function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -1, y: -1 }); // -1 signals "use section center"
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const section = ref.current?.closest('section');
    if (!section) return;

    // Set initial position to center of section
    const rect = section.getBoundingClientRect();
    setPos({ x: rect.width / 2, y: rect.height / 2 });

    const onMove = (e: MouseEvent) => {
      const r = section.getBoundingClientRect();
      setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      setVisible(true);
    };
    const onLeave = () => {
      // Return to center instead of hiding
      const r = section.getBoundingClientRect();
      setPos({ x: r.width / 2, y: r.height / 2 });
    };

    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', onLeave);
    return () => {
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const gradientCenter = pos.x === -1 ? '50% 50%' : `${pos.x}px ${pos.y}px`;

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none z-[6] transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
        background: `radial-gradient(circle 520px at ${gradientCenter}, transparent 0%, transparent 28%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.07) 100%)`,
      }}
    />
  );
}
