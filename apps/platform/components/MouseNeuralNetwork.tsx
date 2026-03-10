'use client';

import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function MouseNeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let mx = W / 2;
    let my = H / 2;
    let raf: number;

    canvas.width = W;
    canvas.height = H;

    const COUNT = 60;
    const LINK_DIST = 175;
    const MOUSE_R = 170;

    const nodes: Node[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.8,
    }));

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      for (const n of nodes) {
        const dx = n.x - mx;
        const dy = n.y - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_R && d > 1) {
          const f = ((MOUSE_R - d) / MOUSE_R) * 0.055;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
        n.vx *= 0.975;
        n.vy *= 0.975;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > W) { n.x = W; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > H) { n.y = H; n.vy *= -1; }
      }

      // connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(232,90,220,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const dx = n.x - mx;
        const dy = n.y - my;
        const near = Math.sqrt(dx * dx + dy * dy) < MOUSE_R;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = near ? 'rgba(240,80,230,0.47)' : 'rgba(220,70,210,0.18)';
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    }

    tick();

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 0.45 }}
    />
  );
}
