'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../components/auth/session-provider';
import { useBusiness } from '../../components/auth/business-provider';
import EmbedoLogo from '../../components/EmbedoLogo';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const BUSINESS_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'SALON', label: 'Salon' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'FITNESS', label: 'Fitness' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'OTHER', label: 'Other' },
];

export default function SetupPage() {
  const router = useRouter();
  const { user } = useSession();
  const { business, matchedBusiness, needsOnboarding, loading, refresh } = useBusiness();

  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'RESTAURANT',
    phone: '',
    email: '',
    website: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  // Read pending plan from sessionStorage on mount
  useEffect(() => {
    const plan = sessionStorage.getItem('pendingPlan');
    if (plan) setPendingPlan(plan);
  }, []);

  // Pre-fill email once session loads
  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((f) => ({ ...f, email: user.email ?? '' }));
    }
  }, [user?.email, form.email]);

  // Show import option when matched business is found
  useEffect(() => {
    if (matchedBusiness) setShowImport(true);
  }, [matchedBusiness]);

  // If user already has a business, redirect to dashboard
  useEffect(() => {
    if (!loading && business) {
      router.replace('/');
    }
  }, [loading, business, router]);

  const startCheckout = async (businessId: string, tier: string) => {
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          tier,
          successUrl: `${window.location.origin}/?checkout=success`,
          cancelUrl: `${window.location.origin}/setup`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        sessionStorage.removeItem('pendingPlan');
        window.location.href = data.url;
        return true;
      }
    } catch { /* fall through to dashboard */ }
    return false;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Business name is required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/me/business?supabaseId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          phone: form.phone || undefined,
          email: form.email || undefined,
          website: form.website || undefined,
          timezone: form.timezone,
          address: (form.street || form.city || form.state || form.zip)
            ? { street: form.street, city: form.city, state: form.state, zip: form.zip }
            : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create business');
        return;
      }

      const result = await res.json();
      await refresh();

      // If user came from pricing page, redirect to Stripe checkout
      const pendingPlan = sessionStorage.getItem('pendingPlan');
      if (pendingPlan && result.business?.id) {
        const redirected = await startCheckout(result.business.id, pendingPlan);
        if (redirected) return;
      }

      router.replace('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!matchedBusiness) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/me/business?supabaseId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importBusinessId: matchedBusiness.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to import business');
        return;
      }

      const result = await res.json();
      await refresh();

      // If user came from pricing page, redirect to Stripe checkout
      const pendingPlan = sessionStorage.getItem('pendingPlan');
      if (pendingPlan && result.business?.id) {
        const redirected = await startCheckout(result.business.id, pendingPlan);
        if (redirected) return;
      }

      router.replace('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Don't render until we know if setup is needed
  if (loading || (!needsOnboarding && business)) {
    return (
      <div className="min-h-screen bg-[#0c0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a18] relative overflow-hidden flex items-center justify-center p-6">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-violet-700/8 blur-[110px] animate-float-orb" />
        <div className="absolute top-2/3 -right-20 w-[420px] h-[420px] rounded-full bg-indigo-600/6 blur-[100px] animate-float-orb-b" />
        <div className="absolute bottom-0 left-10 w-[300px] h-[300px] rounded-full bg-violet-900/8 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-2 text-center">
            <div className="relative mx-auto mb-5 flex items-center justify-center" style={{ width: 100, height: 100, overflow: 'visible' }}>
              <div className="absolute inset-0 rounded-full bg-violet-500/15 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-violet-600/10 blur-xl" />
              <EmbedoLogo size={56} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Set up your business</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {pendingPlan
                ? 'Set up your business to activate your free trial'
                : 'Tell us about your business so we can configure your AI tools'}
            </p>
            {pendingPlan && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-medium text-violet-300">{pendingPlan} plan — 14-day free trial</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-6">
            {/* Matched business banner */}
            {matchedBusiness && showImport && (
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-violet-300">
                      We found an existing business profile
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      It looks like <strong className="text-white">{matchedBusiness.name}</strong> is already registered with Embedo.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleImport}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Import &quot;{matchedBusiness.name}&quot;
                      </button>
                      <button
                        onClick={() => setShowImport(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-white/[0.06] border border-white/[0.1] rounded-lg hover:bg-white/[0.1] transition-colors"
                      >
                        Create new instead
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create business form */}
            {(!matchedBusiness || !showImport) && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Business Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="My Restaurant"
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Industry</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all [&>option]:bg-slate-900 [&>option]:text-white"
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="hello@business.com"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://mybusiness.com"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Street</label>
                    <input
                      type="text"
                      value={form.street}
                      onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                      placeholder="123 Main St"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="New York"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                      placeholder="NY"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">ZIP Code</label>
                    <input
                      type="text"
                      value={form.zip}
                      onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                      placeholder="10001"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="w-full py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? (pendingPlan ? 'Setting up & redirecting to checkout...' : 'Setting up...') : (pendingPlan ? 'Create business & start trial' : 'Create business & continue')}
                </button>

                {matchedBusiness && !showImport && (
                  <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    className="w-full text-sm text-slate-500 hover:text-violet-400 transition-colors"
                  >
                    Import existing profile instead
                  </button>
                )}
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
