'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface SubscriptionData {
  id: string;
  pricingTier: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
}

// ─── Feature matrix ────────────────────────────────────────────────────────────
// true = included, false = not included, string = limit/note
type FeatureValue = boolean | string;

interface FeatureRow {
  label: string;
  category: string;
  values: Record<string, FeatureValue>;
}

const TIER_KEYS = ['FREE', 'SOLO', 'SMALL', 'MEDIUM', 'LARGE'] as const;

const TIERS: Record<string, { name: string; price: number; desc: string; color: string; popular?: boolean }> = {
  FREE:   { name: 'Free',   price: 0,      desc: 'Get started for free',      color: 'slate' },
  SOLO:   { name: 'Solo',   price: 249.99, desc: 'For solo operators',         color: 'blue' },
  SMALL:  { name: 'Small',  price: 399.99, desc: 'For small teams',            color: 'violet', popular: true },
  MEDIUM: { name: 'Medium', price: 549.99, desc: 'For growing businesses',     color: 'indigo' },
  LARGE:  { name: 'Large',  price: 999.99, desc: 'For enterprises',            color: 'slate' },
};

const FEATURES: FeatureRow[] = [
  // ── AI Tools ──
  { label: 'AI Chatbot Widget',       category: 'AI Tools',        values: { FREE: '1 widget',  SOLO: '1 widget',   SMALL: '3 widgets',    MEDIUM: '10 widgets',   LARGE: 'Unlimited' } },
  { label: 'AI Voice Agent',          category: 'AI Tools',        values: { FREE: false,        SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'Dedicated Phone Number',  category: 'AI Tools',        values: { FREE: false,        SOLO: '1 number',   SMALL: '1 number',     MEDIUM: '3 numbers',    LARGE: '10 numbers' } },
  { label: 'AI Image Generation',     category: 'AI Tools',        values: { FREE: '5/mo',      SOLO: '50/mo',      SMALL: '200/mo',       MEDIUM: '500/mo',       LARGE: 'Unlimited' } },
  // ── Website & QR ──
  { label: 'Custom Website',          category: 'Website & QR',    values: { FREE: false,        SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'QR Code Tools',           category: 'Website & QR',    values: { FREE: '3 codes',    SOLO: '10 codes',   SMALL: '50 codes',     MEDIUM: '200 codes',    LARGE: 'Unlimited' } },
  { label: 'Spin-to-Win / Discounts', category: 'Website & QR',    values: { FREE: true,         SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'Surveys',                 category: 'Website & QR',    values: { FREE: '1 survey',   SOLO: '5 surveys',  SMALL: 'Unlimited',    MEDIUM: 'Unlimited',    LARGE: 'Unlimited' } },
  // ── Marketing ──
  { label: 'Social Media Automation', category: 'Marketing',       values: { FREE: false,        SOLO: false,        SMALL: '30 posts/mo',  MEDIUM: '100 posts/mo', LARGE: 'Unlimited' } },
  { label: 'Email Campaigns',         category: 'Marketing',       values: { FREE: false,        SOLO: '100/mo',     SMALL: '1,000/mo',     MEDIUM: '10,000/mo',    LARGE: 'Unlimited' } },
  { label: 'Email Sequences',         category: 'Marketing',       values: { FREE: false,        SOLO: false,        SMALL: '5 sequences',  MEDIUM: 'Unlimited',    LARGE: 'Unlimited' } },
  { label: 'Reward Emails',           category: 'Marketing',       values: { FREE: '10/mo',      SOLO: '100/mo',     SMALL: '500/mo',       MEDIUM: '5,000/mo',     LARGE: 'Unlimited' } },
  // ── CRM ──
  { label: 'Contacts',                category: 'CRM',             values: { FREE: '50',         SOLO: '500',        SMALL: '2,000',        MEDIUM: '10,000',       LARGE: 'Unlimited' } },
  { label: 'Lead Capture',            category: 'CRM',             values: { FREE: true,         SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'Contact Activity History',category: 'CRM',             values: { FREE: '30 days',    SOLO: '90 days',    SMALL: '1 year',       MEDIUM: 'Unlimited',    LARGE: 'Unlimited' } },
  // ── Platform ──
  { label: 'Image Library Storage',   category: 'Platform',        values: { FREE: '50 images',  SOLO: '500 images', SMALL: '2,000 images', MEDIUM: '10,000 images',LARGE: 'Unlimited' } },
  { label: 'Custom Branding',         category: 'Platform',        values: { FREE: false,        SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'White-label',             category: 'Platform',        values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: false,          LARGE: true } },
  { label: 'Priority Support',        category: 'Platform',        values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: true,           LARGE: true } },
  { label: 'Dedicated Account Manager', category: 'Platform',      values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: false,          LARGE: true } },
  { label: 'SLA Guarantee',           category: 'Platform',        values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: false,          LARGE: true } },
];

const CATEGORIES = [...new Set(FEATURES.map((f) => f.category))];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4.5 h-4.5'}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4'}>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
        <XIcon className="w-3 h-3 text-slate-400" />
      </span>
    );
  }
  return <span className="text-xs font-semibold text-slate-700">{value}</span>;
}

// ─── Status badge styles ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  TRIALING: 'bg-violet-100 text-violet-700',
  PAST_DUE: 'bg-amber-100 text-amber-700',
  CANCELED: 'bg-slate-100 text-slate-500',
  PAUSED: 'bg-slate-100 text-slate-500',
};

// ─── Page component ────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_BASE}/billing/subscription?businessId=${business.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch {
      // API may not be available
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const handleSubscribe = async (tier: string) => {
    if (!business?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          tier,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create checkout session'); return; }
      if (data.url) { window.location.href = data.url; }
      else { setError('No checkout URL returned from Stripe'); }
    } catch (err) {
      setError(`Could not reach billing API: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManage = async () => {
    if (!business?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, returnUrl: `${window.location.origin}/billing` }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to open billing portal'); return; }
      if (data.url) { window.location.href = data.url; }
    } catch (err) {
      setError(`Could not reach billing API: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!business?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/billing/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error ?? 'Failed to cancel'); return; }
      await fetchSubscription();
    } catch (err) {
      setError(`Could not reach billing API: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!business?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/billing/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error ?? 'Failed to resume'); return; }
      await fetchSubscription();
    } catch (err) {
      setError(`Could not reach billing API: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (bizLoading || loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveSub = subscription && (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING');
  const activeTierKey = subscription?.pricingTier ?? 'FREE';
  const isOnFree = activeTierKey === 'FREE' || !subscription;

  return (
    <div className="p-8 animate-fade-up">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your subscription and billing</p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="flex-1 text-sm font-medium text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Active paid subscription card ── */}
      {subscription && !isOnFree && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {TIERS[activeTierKey]?.name ?? activeTierKey} Plan
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[subscription.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {subscription.status === 'TRIALING' ? 'Free Trial' : subscription.status.toLowerCase().replace('_', ' ')}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Cancels {formatDate(subscription.currentPeriodEnd)}
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {formatPrice(TIERS[activeTierKey]?.price ?? 0)}<span className="text-base font-normal text-slate-400">/mo</span>
              </p>
              <div className="flex gap-6 mt-3 text-xs text-slate-500">
                {subscription.status === 'TRIALING' && subscription.trialEndsAt && (
                  <span>Trial ends {formatDate(subscription.trialEndsAt)}</span>
                )}
                {subscription.currentPeriodEnd && subscription.status !== 'TRIALING' && (
                  <span>Next billing {formatDate(subscription.currentPeriodEnd)}</span>
                )}
                <span>Started {formatDate(subscription.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {hasActiveSub && (
                <>
                  <button onClick={handleManage} disabled={actionLoading} className="px-4 py-2 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50">
                    Manage Payment
                  </button>
                  {subscription.cancelAtPeriodEnd ? (
                    <button onClick={handleResume} disabled={actionLoading} className="px-4 py-2 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50">
                      Resume
                    </button>
                  ) : (
                    <button onClick={handleCancel} disabled={actionLoading} className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50">
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tier cards row ── */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">
          {isOnFree ? 'Choose a plan' : 'Compare plans'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">All paid plans include a 14-day free trial. No credit card required to start.</p>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-10">
        {TIER_KEYS.map((key) => {
          const tier = TIERS[key];
          const isCurrent = key === activeTierKey;
          const isPopular = tier.popular;
          return (
            <div
              key={key}
              className={`relative bg-white border rounded-2xl p-5 flex flex-col items-center text-center transition-all ${
                isPopular
                  ? 'border-violet-300 ring-2 ring-violet-100 shadow-lg shadow-violet-100/50'
                  : isCurrent
                    ? 'border-emerald-300 ring-2 ring-emerald-100'
                    : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 px-3 py-0.5 bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Most Popular
                </div>
              )}
              {isCurrent && !isPopular && (
                <div className="absolute -top-3 px-3 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Current
                </div>
              )}

              <h3 className="text-sm font-bold text-slate-900 mt-1">{tier.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{tier.desc}</p>

              <div className="mt-3 mb-4">
                {tier.price === 0 ? (
                  <p className="text-2xl font-bold text-slate-900">Free</p>
                ) : (
                  <p className="text-2xl font-bold text-slate-900">
                    ${tier.price.toFixed(2)}<span className="text-xs font-normal text-slate-400">/mo</span>
                  </p>
                )}
              </div>

              {key === 'FREE' ? (
                <button
                  disabled
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-400 cursor-default"
                >
                  {isCurrent ? 'Current Plan' : 'Free Forever'}
                </button>
              ) : isCurrent ? (
                <button
                  onClick={handleManage}
                  disabled={actionLoading}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  Manage Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={actionLoading}
                  className={`w-full py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                    isPopular
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  Start Free Trial
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Feature comparison table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Feature comparison</h3>
          <p className="text-xs text-slate-500 mt-0.5">Everything included in each plan</p>
        </div>

        {/* Sticky tier header row */}
        <div className="grid grid-cols-[260px_repeat(5,1fr)] border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
          <div className="px-6 py-3" />
          {TIER_KEYS.map((key) => {
            const isCurrent = key === activeTierKey;
            return (
              <div key={key} className="px-2 py-3 text-center">
                <p className={`text-xs font-bold ${isCurrent ? 'text-violet-600' : 'text-slate-700'}`}>
                  {TIERS[key].name}
                </p>
              </div>
            );
          })}
        </div>

        {/* Feature rows grouped by category */}
        {CATEGORIES.map((category) => (
          <div key={category}>
            {/* Category header */}
            <div className="grid grid-cols-[260px_repeat(5,1fr)] bg-slate-50/80 border-b border-slate-100">
              <div className="px-6 py-2.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{category}</p>
              </div>
              <div className="col-span-5" />
            </div>

            {/* Feature rows */}
            {FEATURES.filter((f) => f.category === category).map((feature, i) => (
              <div
                key={feature.label}
                className={`grid grid-cols-[260px_repeat(5,1fr)] border-b border-slate-50 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                } hover:bg-violet-50/30 transition-colors`}
              >
                <div className="px-6 py-3 flex items-center">
                  <span className="text-xs text-slate-700">{feature.label}</span>
                </div>
                {TIER_KEYS.map((key) => (
                  <div key={key} className="px-2 py-3 flex items-center justify-center">
                    <FeatureCell value={feature.values[key]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Bottom CTA row */}
        <div className="grid grid-cols-[260px_repeat(5,1fr)] border-t border-slate-200 bg-slate-50/50">
          <div className="px-6 py-4" />
          {TIER_KEYS.map((key) => {
            const isCurrent = key === activeTierKey;
            return (
              <div key={key} className="px-2 py-4 flex justify-center">
                {key === 'FREE' ? (
                  <span className="text-xs text-slate-400 font-medium">{isCurrent ? 'Current' : 'Free'}</span>
                ) : isCurrent ? (
                  <span className="text-xs text-emerald-600 font-semibold">Current plan</span>
                ) : (
                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={actionLoading}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
