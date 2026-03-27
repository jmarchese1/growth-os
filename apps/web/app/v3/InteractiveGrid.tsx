'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animated dot-grid background with breathing pulse + mouse spotlight.
 * Uses DOM elements instead of canvas for guaranteed visibility.
 */
export default function InteractiveGrid({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onLeave = () => setMousePos(null);

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    >
      {/* CSS dot grid with pulse animation */}
      <div className="v3-dot-grid" />

      {/* Mouse spotlight */}
      {mousePos && (
        <div
          className="v3-mouse-spotlight"
          style={{
            left: mousePos.x,
            top: mousePos.y,
          }}
        />
      )}
    </div>
  );
}
