'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import EmbedoLogo from '../../components/EmbedoLogo';

/* ── Particle canvas ─────────────────────────────────────────────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  violet: boolean;
}

function OrbitalParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const COUNT = 120;
    const CONNECT_DIST = 180;
    const MOUSE_DIST = 200;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener('mousemove', handleMove);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w(),
        y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.6 + 0.5,
        opacity: Math.random() * 0.5 + 0.15,
        violet: Math.random() < 0.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w(), h());
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        // Mouse repulsion
        const dmx = a.x - mx;
        const dmy = a.y - my;
        const md = Math.sqrt(dmx * dmx + dmy * dmy);
        if (md < MOUSE_DIST && md > 0) {
          const force = (1 - md / MOUSE_DIST) * 0.4;
          a.vx += (dmx / md) * force;
          a.vy += (dmy / md) * force;
        }

        // Damping
        a.vx *= 0.995;
        a.vy *= 0.995;

        // Lines between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.18;
            const lineColor = (a.violet && b.violet)
              ? `rgba(139,92,246,${alpha})`
              : (!a.violet && !b.violet)
              ? `rgba(99,102,241,${alpha})`
              : `rgba(120,87,244,${alpha})`;
            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fillStyle = a.violet
          ? `rgba(167,139,250,${a.opacity})`
          : `rgba(99,102,241,${a.opacity})`;
        ctx.fill();

        // Move
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w()) a.vx *= -1;
        if (a.y < 0 || a.y > h()) a.vy *= -1;
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.6 }}
    />
  );
}

/* ── Login page ──────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : authError.message
      );
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address first');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setForgotSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-100 relative overflow-hidden">
      {/* Dynamic particle canvas background */}
      <OrbitalParticleCanvas />

      {/* Ambient glow orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-violet-300/15 blur-[110px]" />
        <div className="absolute top-2/3 -right-20 w-[420px] h-[420px] rounded-full bg-indigo-300/10 blur-[100px]" />
        <div className="absolute bottom-0 left-10 w-[300px] h-[300px] rounded-full bg-violet-200/15 blur-[80px]" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl shadow-slate-300/30">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            {/* Embedo Logo — isometric cube with orbiting particles */}
            <div className="relative mx-auto mb-6 flex items-center justify-center" style={{ width: 140, height: 140, overflow: 'visible' }}>
              {/* Glow behind logo */}
              <div className="absolute inset-0 rounded-full bg-violet-200/40 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-violet-300/20 blur-xl" />
              <EmbedoLogo size={72} />
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Welcome to Embedo</h1>
            <p className="text-sm text-slate-500 mt-1.5">Sign in to your business dashboard</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {showForgot ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotSent ? (
                  <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm text-emerald-700 font-medium">Password reset email sent</p>
                    <p className="text-xs text-slate-500 mt-1">Check your inbox for a reset link.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Email address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoFocus
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                      />
                    </div>
                    {error && (
                      <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-600">{error}</p>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Send Reset Link
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotSent(false); setError(''); }}
                  className="w-full text-sm text-slate-500 hover:text-violet-600 transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoFocus
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setError(''); }}
                      className="text-[11px] text-violet-500/70 hover:text-violet-600 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className="w-full py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-200/50"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Powered by Embedo &middot; AI infrastructure for your business
        </p>
      </div>
    </div>
  );
}
