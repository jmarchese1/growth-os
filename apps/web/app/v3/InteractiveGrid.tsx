'use client';

import { useEffect, useRef } from 'react';

/**
 * Mesh gradient background with slow morphing blobs + mouse-reactive glow.
 */
export default function InteractiveGrid({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const glow = glowRef.current;
    if (!el || !glow) return;

    let hovering = false;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      glow.style.left = `${x}px`;
      glow.style.top = `${y}px`;
    };

    const onEnter = () => {
      hovering = true;
      glow.style.opacity = '1';
    };

    const onLeave = () => {
      hovering = false;
      glow.style.opacity = '0';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    >
      {/* Mesh blobs — 3 distinct purple shades */}
      <div className="v3-mesh-blob v3-mesh-1" />
      <div className="v3-mesh-blob v3-mesh-2" />
      <div className="v3-mesh-blob v3-mesh-3" />

      {/* Subtle grid lines */}
      <div className="v3-grid-lines" />

      {/* Mouse-following glow */}
      <div
        ref={glowRef}
        className="v3-cursor-glow"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
