'use client';
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  teal: boolean;
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const COUNT = 78;
    const CONNECT_DIST = 190;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    canvas.addEventListener('mousemove', onMouseMove);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.36,
        vy: (Math.random() - 0.5) * 0.36,
        radius: Math.random() * 1.9 + 0.9,
        opacity: Math.random() * 0.72 + 0.38,
        teal: Math.random() < 0.28,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        // Particle-to-particle lines
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.22;
            // Blend color: rose-rose = rose, indigo-indigo = indigo, mixed = soft violet
            const lineColor = (a.teal && b.teal)
              ? `rgba(244,114,182,${alpha})`
              : (!a.teal && !b.teal)
              ? `rgba(99,102,241,${alpha})`
              : `rgba(168,100,220,${alpha})`;
            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.2;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Mouse-to-particle lines
        const mdx = a.x - mouse.x;
        const mdy = a.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 135) {
          const alpha = (1 - mdist / 135) * 0.36;
          ctx.beginPath();
          ctx.strokeStyle = a.teal ? `rgba(249,168,212,${alpha})` : `rgba(129,140,248,${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fillStyle = a.teal
          ? `rgba(244,114,182,${a.opacity})`
          : `rgba(99,102,241,${a.opacity})`;
        ctx.fill();

        // Move
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > canvas.width) a.vx *= -1;
        if (a.y < 0 || a.y > canvas.height) a.vy *= -1;
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ opacity: 0.95 }}
    />
  );
}
