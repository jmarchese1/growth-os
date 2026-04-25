'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="min-h-screen grid grid-cols-12 bg-ink-1 text-paper">
      {/* LEFT — Apple panel with generated hero backdrop */}
      <aside className="col-span-12 lg:col-span-7 relative hairline-r flex flex-col justify-between p-10 lg:p-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${authHero.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.92) 100%)',
          }}
        />
        <header className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <EmbedoMark size={32} />
            <p className="text-paper text-[18px] font-semibold leading-none tracking-tight">Embedo</p>
          </div>
        </header>

        <div className="relative z-10 max-w-2xl">
          <h1 className="text-paper leading-tight tracking-tight text-[44px] lg:text-[64px] font-semibold">
            Where cold becomes <span className="text-signal">warm</span>.
          </h1>
          <p className="text-paper-2 text-[15px] mt-6 max-w-md leading-relaxed">
            The internal outreach platform. Campaigns, prospects, domains, and replies — everything
            in one place.
          </p>
        </div>

        <footer className="relative z-10 flex items-center justify-between text-[12px] text-paper-3">
          <span>Embedo</span>
          <span>All times Eastern</span>
        </footer>
      </aside>

      {/* RIGHT — form */}
      <section className="col-span-12 lg:col-span-5 flex items-center justify-center p-8 lg:p-16 bg-ink-1">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-paper text-[28px] leading-tight tracking-tight font-semibold">
              Welcome back
            </h2>
            <p className="text-paper-2 text-[14px] mt-2">
              Sign in to continue.
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
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          <p className="mt-12 text-[12px] text-paper-3 text-center">
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
    <div className="rounded-apple border border-ember/30 bg-ember/10 px-3 py-2">
      <p className="text-[13px] text-ember">{children}</p>
    </div>
  );
}
