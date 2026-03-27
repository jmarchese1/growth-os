'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Interactive dot-grid canvas with idle pulse wave + mouse hover interactions.
 */
export default function InteractiveGrid({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const hovering = useRef(false);
  const hoverIntensity = useRef(0);
  const raf = useRef(0);
  const startTime = useRef(0);

  const SPACING = 48;
  const DOT_BASE = 0.6;
  const DOT_MAX = 3.5;
  const RADIUS = 240;

  // Idle vs hover base values
  const IDLE_ALPHA = 0.10;
  const PULSE_STRENGTH = 0.08; // how much the pulse adds
  const HOVER_ALPHA = 0.28;
  const ACTIVE_ALPHA = 0.9;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    if (!startTime.current) startTime.current = now;
    const elapsed = (now - startTime.current) / 1000; // seconds

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    // Smoothly animate hover intensity
    const target = hovering.current ? 1 : 0;
    hoverIntensity.current += (target - hoverIntensity.current) * 0.06;
    const hi = hoverIntensity.current;

    const mx = mouse.current.x;
    const my = mouse.current.y;

    const cols = Math.ceil(w / SPACING) + 1;
    const rows = Math.ceil(h / SPACING) + 1;
    const offsetX = (w % SPACING) / 2;
    const offsetY = (h % SPACING) / 2;

    // Center of grid for pulse origin
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * SPACING;
        const y = offsetY + row * SPACING;

        // ── Idle pulse wave ──
        // Radial wave expanding from center
        const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const normalizedDist = distFromCenter / maxDist;
        // Two overlapping waves at different speeds for organic feel
        const wave1 = Math.sin(normalizedDist * 8 - elapsed * 1.2) * 0.5 + 0.5;
        const wave2 = Math.sin(normalizedDist * 5 + elapsed * 0.7 + 1.5) * 0.5 + 0.5;
        const pulse = (wave1 * 0.6 + wave2 * 0.4); // 0..1
        const idlePulse = (1 - hi) * pulse; // fade pulse out when hovering

        // ── Mouse proximity ──
        const dx = x - mx;
        const dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.max(0, 1 - dist / RADIUS);
        const ease = t * t * t;

        // ── Combine ──
        const baseAlpha = IDLE_ALPHA + PULSE_STRENGTH * idlePulse + (HOVER_ALPHA - IDLE_ALPHA) * hi;
        const baseRadius = DOT_BASE + 0.2 * idlePulse * (1 - hi) + 0.15 * hi;

        const radius = baseRadius + (DOT_MAX - baseRadius) * ease;
        const alpha = baseAlpha + (ACTIVE_ALPHA - baseAlpha) * ease;

        // Color: subtle purple tint from pulse, stronger purple near cursor
        const pulseColor = idlePulse * 0.3;
        const cursorColor = ease * hi;
        const colorBlend = Math.min(1, pulseColor + cursorColor);
        const r = Math.round(255 - (255 - 124) * colorBlend);
        const g = Math.round(255 - (255 - 58) * colorBlend);
        const b = Math.round(255 - (255 - 237) * colorBlend);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();

        // Glow ring for very close dots
        if (ease > 0.4 && hi > 0.1) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 4 * ease, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(124,58,237,${ease * 0.18 * hi})`;
          ctx.fill();
        }
      }
    }

    // Radial cursor glow
    if (mx > 0 && my > 0 && hi > 0.05) {
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, RADIUS * 1.2);
      grad.addColorStop(0, `rgba(124,58,237,${0.09 * hi})`);
      grad.addColorStop(0.5, `rgba(124,58,237,${0.04 * hi})`);
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

    const onEnter = () => {
      hovering.current = true;
    };

    const onLeave = () => {
      hovering.current = false;
      mouse.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseenter', onEnter);
    canvas.addEventListener('mouseleave', onLeave);
    raf.current = requestAnimationFrame(draw);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseenter', onEnter);
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
