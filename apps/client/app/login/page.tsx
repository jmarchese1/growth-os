'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import EmbedoLogo from '../../components/EmbedoLogo';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8f7fc 0%, #f0ecf9 25%, #ebe6f6 50%, #e8e4f4 75%, #f3f1f9 100%)' }}>
      {/* Soft ambient glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-violet-200/25 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-200/20 blur-[130px]" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-visible" style={{ backgroundColor: 'rgba(12, 10, 24, 0.92)' }}>
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center overflow-visible">
            {/* Embedo Logo — isometric cube with orbiting particles */}
            <div className="relative mx-auto mb-6 flex items-center justify-center" style={{ width: 140, height: 140, overflow: 'visible' }}>
              {/* Glow behind logo */}
              <div className="absolute inset-0 rounded-full bg-violet-500/15 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-violet-600/10 blur-xl" />
              <EmbedoLogo size={72} />
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">Welcome to Embedo</h1>
            <p className="text-sm text-slate-500 mt-1.5">Sign in to your business dashboard</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {showForgot ? (
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
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
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
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-400">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setError(''); }}
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
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                  />
                </div>

                {error && (
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
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Powered by Embedo &middot; AI infrastructure for your business
        </p>
      </div>
    </div>
  );
}
