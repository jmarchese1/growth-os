'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap, Database, ShieldCheck } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import { EmbedoMark } from '../../components/EmbedoMark';
import authHero from '../../components/assets/auth-hero.jpg';

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
      setError(authError.message === 'Invalid login credentials' ? 'Invalid email or password' : authError.message);
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Enter your email address first'); return; }
    setLoading(true);
    setError('');
    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (resetError) setError(resetError.message);
    else setForgotSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen grid grid-cols-12 bg-ink-1 text-paper relative overflow-hidden">
      {/* Animated decorative blobs that span the whole page */}
      <BackgroundBlobs />

      {/* LEFT — hero */}
      <aside className="col-span-12 lg:col-span-7 relative flex flex-col justify-between p-10 lg:p-16 overflow-hidden">
        {/* Hero photo backdrop, soft */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-90"
          style={{
            backgroundImage: `url(${authHero.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Sheen overlay so the hero is always readable */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(165deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.78) 55%, rgba(255,255,255,0.95) 100%)',
          }}
        />

        {/* Wordmark */}
        <header className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <EmbedoMark size={36} />
            <p className="text-paper text-[20px] font-semibold leading-none tracking-tight">Embedo</p>
          </div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-paper-3 font-medium hidden sm:inline">
            Internal · Operator
          </span>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/10 border border-signal/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-signal" />
            <span className="text-[12px] font-semibold text-signal tracking-tight">
              AI agents working autonomously
            </span>
          </div>

          <h1 className="leading-[1.05] tracking-tight text-[48px] lg:text-[76px] font-semibold">
            Where cold{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #0071e3 0%, #5ac8fa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              becomes warm.
            </span>
          </h1>

          <p className="text-paper-2 text-[16px] mt-6 max-w-lg leading-relaxed">
            The outreach control room. Spawn agents, watch them discover prospects,
            personalize emails, and book meetings while you sleep.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <FeatureChip icon={Zap} title="Autonomous agents" body="Run on a schedule, no clicks." />
            <FeatureChip icon={Database} title="Live data" body="Every send, open, reply tracked." />
            <FeatureChip icon={ShieldCheck} title="Domain rotation" body="Three warmed domains, auto-failover." />
          </div>
        </div>

        {/* Footer line */}
        <footer className="relative z-10 flex items-center justify-between text-[12px] text-paper-3">
          <span>© Embedo</span>
          <span>All times Eastern</span>
        </footer>
      </aside>

      {/* RIGHT — form */}
      <section className="col-span-12 lg:col-span-5 relative flex items-center justify-center p-8 lg:p-16">
        <div
          className="w-full max-w-sm relative z-10 rounded-apple-lg p-8 lg:p-10"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(210,210,215,0.6)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,113,227,0.10)',
          }}
        >
          <div className="mb-8">
            <h2 className="text-paper text-[30px] leading-tight tracking-tight font-semibold">
              Welcome back
            </h2>
            <p className="text-paper-2 text-[14px] mt-2">
              Sign in to continue to your workspace.
            </p>
          </div>

          {showForgot ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotSent ? (
                <div className="rounded-apple bg-signal/10 px-4 py-3 border border-signal/30">
                  <p className="text-signal text-[14px] font-semibold">Reset link sent.</p>
                  <p className="text-[12px] text-paper-3 mt-1">
                    Check your inbox for a reset link.
                  </p>
                </div>
              ) : (
                <>
                  <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoFocus required />
                  {error && <ErrorMsg>{error}</ErrorMsg>}
                  <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotSent(false); setError(''); }}
                className="w-full text-[12px] text-paper-3 hover:text-signal transition-colors pt-2"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoFocus required />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-sm">Password</label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(''); }}
                    className="text-[12px] text-paper-3 hover:text-signal transition-colors font-medium"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="input w-full"
                />
              </div>

              {error && <ErrorMsg>{error}</ErrorMsg>}

              <button
                type="submit"
                disabled={loading || !email.trim() || !password.trim()}
                className="btn btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ height: 44 }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          <p className="mt-10 text-[12px] text-paper-3 text-center">
            Internal platform · Embedo
          </p>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Animated background — soft floating gradient blobs
   ───────────────────────────────────────────────────────────── */
function BackgroundBlobs() {
  return (
    <>
      <style jsx>{`
        @keyframes float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(40px, -30px) scale(1.06); }
        }
        @keyframes float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-30px, 40px) scale(1.08); }
        }
        @keyframes float-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(20px, 25px) scale(1.04); }
        }
        .blob-a { animation: float-a 14s ease-in-out infinite; }
        .blob-b { animation: float-b 18s ease-in-out infinite; }
        .blob-c { animation: float-c 22s ease-in-out infinite; }
      `}</style>
      <div
        aria-hidden
        className="blob-a absolute pointer-events-none"
        style={{
          left: '-10%',
          top: '10%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(0,113,227,0.32) 0%, rgba(0,113,227,0) 70%)',
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="blob-b absolute pointer-events-none"
        style={{
          right: '-8%',
          top: '40%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(90,200,250,0.28) 0%, rgba(90,200,250,0) 70%)',
          filter: 'blur(50px)',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="blob-c absolute pointer-events-none"
        style={{
          left: '30%',
          bottom: '-10%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(29,140,255,0.20) 0%, rgba(29,140,255,0) 70%)',
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />
    </>
  );
}

function FeatureChip({
  icon: Icon, title, body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-apple bg-white/55 backdrop-blur-md border border-white/60 px-3.5 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-signal" />
        <p className="text-paper text-[12px] font-semibold tracking-tight">{title}</p>
      </div>
      <p className="text-[11px] text-paper-2 leading-snug">{body}</p>
    </div>
  );
}

function Field({
  label, type = 'text', value, onChange, placeholder, autoFocus, required,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className="label-sm block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        className="input w-full"
      />
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-apple border border-ember/30 bg-ember/10 px-3 py-2">
      <p className="text-[13px] text-ember">{children}</p>
    </div>
  );
}
