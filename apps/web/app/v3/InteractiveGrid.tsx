'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Interactive dot-grid canvas that reacts to mouse movement.
 * Dots near the cursor glow purple; a radial light follows the pointer.
 */
export default function InteractiveGrid({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const raf = useRef(0);

  const SPACING = 48;
  const DOT_BASE = 0.8;
  const DOT_MAX = 3.2;
  const RADIUS = 220; // glow radius in px

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const mx = mouse.current.x;
    const my = mouse.current.y;

    const cols = Math.ceil(w / SPACING) + 1;
    const rows = Math.ceil(h / SPACING) + 1;
    const offsetX = (w % SPACING) / 2;
    const offsetY = (h % SPACING) / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * SPACING;
        const y = offsetY + row * SPACING;

        const dx = x - mx;
        const dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.max(0, 1 - dist / RADIUS);

        // Ease: cubic
        const ease = t * t * t;

        const radius = DOT_BASE + (DOT_MAX - DOT_BASE) * ease;
        const alpha = 0.08 + 0.7 * ease;

        // Color: blend from dim white to purple as proximity increases
        const r = Math.round(255 - (255 - 124) * ease);
        const g = Math.round(255 - (255 - 58) * ease);
        const b = Math.round(255 - (255 - 237) * ease);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();

        // Glow ring for very close dots
        if (ease > 0.4) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 4 * ease, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(124,58,237,${ease * 0.15})`;
          ctx.fill();
        }
      }
    }

    // Radial cursor glow
    if (mx > 0 && my > 0) {
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, RADIUS * 1.2);
      grad.addColorStop(0, 'rgba(124,58,237,0.07)');
      grad.addColorStop(0.5, 'rgba(124,58,237,0.03)');
      grad.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    raf.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onLeave = () => {
      mouse.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    raf.current = requestAnimationFrame(draw);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
