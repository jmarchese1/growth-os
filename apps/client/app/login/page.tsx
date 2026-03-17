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
    const COUNT = 70;
    const CONNECT_DIST = 160;
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

        const dmx = a.x - mx;
        const dmy = a.y - my;
        const md = Math.sqrt(dmx * dmx + dmy * dmy);
        if (md < MOUSE_DIST && md > 0) {
          const force = (1 - md / MOUSE_DIST) * 0.4;
          a.vx += (dmx / md) * force;
          a.vy += (dmy / md) * force;
        }

        a.vx *= 0.995;
        a.vy *= 0.995;

        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.12;
            const lineColor = (a.violet && b.violet)
              ? `rgba(139,92,246,${alpha})`
              : (!a.violet && !b.violet)
              ? `rgba(99,102,241,${alpha})`
              : `rgba(120,87,244,${alpha})`;
            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 0.8;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fillStyle = a.violet
          ? `rgba(167,139,250,${a.opacity})`
          : `rgba(99,102,241,${a.opacity})`;
        ctx.fill();

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

/* ── Password strength ───────────────────────────────────────────── */
interface PasswordStrength {
  score: number; // 0–4
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Number', passed: /[0-9]/.test(password) },
    { label: 'Special character (!@#$%^&*)', passed: /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?/~`'"]/.test(password) },
  ];

  const score = checks.filter((c) => c.passed).length;

  // levels indexed 0–4; cap score so index never exceeds array bounds
  const levels = [
    { label: 'Very weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Good', color: 'bg-emerald-500' },
    { label: 'Strong', color: 'bg-emerald-400' },
  ];

  return { score, ...levels[Math.min(score, 4)]!, checks };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  const unmetChecks = strength.checks.filter((c) => !c.passed);

  return (
    <div className="mt-2 space-y-2">
      {/* Bar — always shown, all 5 segments filled when strong */}
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength.score ? strength.color : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        Strength: <span className={strength.score >= 4 ? 'text-emerald-400' : strength.score === 3 ? 'text-yellow-400' : 'text-red-400'}>{strength.label}</span>
      </p>
      {/* Checklist — each requirement disappears once satisfied */}
      {unmetChecks.length > 0 && (
        <ul className="space-y-0.5">
          {unmetChecks.map((c) => (
            <li key={c.label} className="flex items-center gap-1.5">
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-500">{c.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Login page ──────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnverifiedEmail('');

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setUnverifiedEmail(email);
      } else {
        setError(authError.message === 'Invalid login credentials'
          ? 'Invalid email or password'
          : authError.message
        );
      }
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resend({
      type: 'signup',
      email: unverifiedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    setError('');
    setUnverifiedEmail('');
    setError('Verification email resent — check your inbox.');
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    const strength = getPasswordStrength(password);
    if (strength.score < 2) {
      setError('Please choose a stronger password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
    } else {
      setSignupSent(true);
    }
    setLoading(false);
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

  const inputClass = 'w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a18] relative overflow-hidden">
      {/* Dynamic particle canvas background */}
      <OrbitalParticleCanvas />

      {/* Ambient glow orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-violet-700/8 blur-[110px] animate-float-orb" />
        <div className="absolute top-2/3 -right-20 w-[420px] h-[420px] rounded-full bg-indigo-600/6 blur-[100px] animate-float-orb-b" />
        <div className="absolute bottom-0 left-10 w-[300px] h-[300px] rounded-full bg-violet-900/8 blur-[80px]" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-visible">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center overflow-visible">
            <div className="relative mx-auto mb-6 flex items-center justify-center" style={{ width: 140, height: 140, overflow: 'visible' }}>
              <div className="absolute inset-0 rounded-full bg-violet-500/15 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-violet-600/10 blur-xl" />
              <EmbedoLogo size={72} />
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">Welcome to Embedo</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {showSignup ? 'Create your business account' : 'Sign in to your business dashboard'}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {showSignup ? (
              <form onSubmit={handleSignup} className="space-y-4">
                {signupSent ? (
                  <div className="px-4 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-sm text-emerald-400 font-medium">Check your email</p>
                    <p className="text-xs text-slate-400 mt-1">
                      We sent a confirmation link to <span className="text-white">{email}</span>.
                      Click it to activate your account and get started.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoFocus
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        className={inputClass}
                      />
                      <PasswordStrengthBar password={password} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        className={`${inputClass} ${
                          confirmPassword && confirmPassword !== password
                            ? 'border-red-500/40 focus:ring-red-500/30'
                            : confirmPassword && confirmPassword === password
                            ? 'border-emerald-500/40 focus:ring-emerald-500/30'
                            : ''
                        }`}
                      />
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
                      )}
                      {confirmPassword && confirmPassword === password && (
                        <p className="text-[11px] text-emerald-400 mt-1">Passwords match</p>
                      )}
                    </div>
                    {error && (
                      <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-red-400">{error}</p>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !email.trim() || !password.trim() || !confirmPassword.trim()}
                      className="w-full py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
                    >
                      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {loading ? 'Creating account...' : 'Create account'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setShowSignup(false); setSignupSent(false); setError(''); setConfirmPassword(''); setPassword(''); }}
                  className="w-full text-sm text-slate-500 hover:text-violet-400 transition-colors"
                >
                  Already have an account? Sign in
                </button>
              </form>
            ) : showForgot ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotSent ? (
                  <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-sm text-emerald-400 font-medium">Password reset email sent</p>
                    <p className="text-xs text-slate-400 mt-1">Check your inbox for a reset link.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoFocus
                        required
                        className={inputClass}
                      />
                    </div>
                    {error && (
                      <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-red-400">{error}</p>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Send Reset Link
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotSent(false); setError(''); }}
                  className="w-full text-sm text-slate-500 hover:text-violet-400 transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoFocus
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-400">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setError(''); setUnverifiedEmail(''); }}
                      className="text-[11px] text-violet-400/70 hover:text-violet-400 transition-colors"
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
                    className={inputClass}
                  />
                </div>

                {/* Email not verified notice */}
                {unverifiedEmail && (
                  <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-400 font-medium">Email not verified</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Check your inbox for the confirmation link we sent to <span className="text-white">{unverifiedEmail}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={loading}
                      className="text-xs text-violet-400 hover:text-violet-300 mt-2 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Sending...' : 'Resend verification email'}
                    </button>
                  </div>
                )}

                {error && !unverifiedEmail && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className="w-full py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-white/[0.08]" />
                  <span className="text-xs text-slate-500">or</span>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                </div>

                {/* Signup button */}
                <button
                  type="button"
                  onClick={() => { setShowSignup(true); setError(''); setUnverifiedEmail(''); }}
                  className="w-full py-3 bg-white/[0.06] border border-white/[0.12] text-white text-sm font-semibold rounded-xl hover:bg-white/[0.1] hover:border-violet-500/30 transition-all flex items-center justify-center gap-2"
                >
                  Create an account
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-700 mt-6">
          Powered by Embedo &middot; AI infrastructure for your business
        </p>
      </div>
    </div>
  );
}
