'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

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

  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="min-h-screen grid grid-cols-12 bg-ink-0 text-paper">
      {/* LEFT — editorial panel */}
      <aside className="col-span-12 lg:col-span-7 relative hairline-r flex flex-col justify-between p-10 lg:p-16 bg-ink-0 overflow-hidden">
        {/* Subtle grid behind */}
        <div className="absolute inset-0 bg-grid-fine opacity-40 pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />

        <header className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-paper flex items-center justify-center">
              <span className="font-display italic font-light text-paper text-[17px] leading-none">E</span>
            </div>
            <div>
              <p className="font-display italic font-light text-paper text-[18px] leading-none">Embedo</p>
              <p className="font-mono text-[9px] tracking-mega text-paper-4 mt-1 uppercase">Operator</p>
            </div>
          </div>
          <div className="hidden sm:flex items-baseline gap-4 font-mono text-[10px] tracking-mega uppercase text-paper-4">
            <span>{dateString}</span>
            <span className="text-paper">{timeString} ET</span>
          </div>
        </header>

        <div className="relative z-10 max-w-2xl">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            § Vol. 01 · Issue {String(now.getDate()).padStart(3, '0')}
          </span>
          <h1 className="font-display italic font-light text-paper mt-6 leading-[0.92] tracking-tight text-[72px] lg:text-[104px]">
            Where <br />
            <span className="text-signal not-italic font-normal" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em', letterSpacing: '-0.03em' }}>
              cold
            </span>{' '}becomes <br /> warm.
          </h1>
          <p className="font-ui text-paper-2 text-[15px] mt-8 max-w-md leading-relaxed">
            The internal outreach terminal for Embedo. Campaigns, prospects, domains, replies,
            everything in one frame.
          </p>
        </div>

        <footer className="relative z-10 flex items-center justify-between font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          <span>Embedo · Growth OS</span>
          <span>All times Eastern</span>
        </footer>
      </aside>

      {/* RIGHT — form */}
      <section className="col-span-12 lg:col-span-5 flex items-center justify-center p-8 lg:p-16 bg-ink-1">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <span className="label">§ 01 — Identify</span>
            <h2 className="font-display italic font-light text-paper text-[48px] leading-none tracking-tight mt-3">
              Welcome back.
            </h2>
            <p className="font-ui text-paper-2 text-sm mt-3">
              Sign in to continue to Embedo Operator.
            </p>
          </div>

          {showForgot ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              {forgotSent ? (
                <div className="hairline bg-signal-soft p-4">
                  <p className="font-display italic text-signal text-lg">Reset link sent.</p>
                  <p className="font-mono text-[11px] tracking-micro uppercase text-paper-3 mt-2">
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
                className="w-full font-mono text-[11px] tracking-micro uppercase text-paper-3 hover:text-signal transition-colors pt-2"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoFocus required />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-sm">Password</label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(''); }}
                    className="font-mono text-[10px] tracking-micro uppercase text-paper-3 hover:text-signal transition-colors"
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
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          <p className="mt-12 font-mono text-[10px] tracking-mega text-paper-4 uppercase text-center">
            Internal platform · Embedo
          </p>
        </div>
      </section>
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
    <div className="hairline border-ember bg-ember/10 px-3 py-2">
      <p className="font-mono text-[11px] tracking-micro text-ember">{children}</p>
    </div>
  );
}
