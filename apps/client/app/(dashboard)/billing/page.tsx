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

const TIERS = [
  {
    key: 'SOLO',
    name: 'Solo',
    price: 497,
    desc: 'For solo operators',
    features: ['AI Voice Agent', 'Website Chatbot', 'Lead Capture', 'Custom Website'],
  },
  {
    key: 'SMALL',
    name: 'Small',
    price: 797,
    desc: 'For teams of 2–10',
    features: ['Everything in Solo', 'Social Media Automation', 'Survey Engine', 'Email Sequences'],
    popular: true,
  },
  {
    key: 'MEDIUM',
    name: 'Medium',
    price: 1297,
    desc: 'For teams of 11–50',
    features: ['Everything in Small', 'Priority Support', 'Custom Integrations', 'Advanced Analytics'],
  },
  {
    key: 'LARGE',
    name: 'Large',
    price: 2497,
    desc: 'For 50+ employees',
    features: ['Everything in Medium', 'Dedicated Account Manager', 'White-label Options', 'SLA Guarantee'],
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  TRIALING: 'bg-violet-100 text-violet-700',
  PAST_DUE: 'bg-amber-100 text-amber-700',
  CANCELED: 'bg-slate-100 text-slate-500',
  PAUSED: 'bg-slate-100 text-slate-500',
};

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
      if (!res.ok) {
        setError(data.error ?? 'Failed to create checkout session');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No checkout URL returned from Stripe');
      }
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
        body: JSON.stringify({
          businessId: business.id,
          returnUrl: `${window.location.origin}/billing`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to open billing portal');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
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
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to cancel subscription');
        return;
      }
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
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to resume subscription');
        return;
      }
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
  const currentTier = TIERS.find((t) => t.key === subscription?.pricingTier);

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {/* Current subscription card */}
      {subscription && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {currentTier?.name ?? subscription.pricingTier} Plan
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
              {currentTier && (
                <p className="text-3xl font-bold text-slate-900">
                  ${currentTier.price}<span className="text-base font-normal text-slate-400">/mo</span>
                </p>
              )}
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
                  <button
                    onClick={handleManage}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50"
                  >
                    Manage Payment
                  </button>
                  {subscription.cancelAtPeriodEnd ? (
                    <button
                      onClick={handleResume}
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
                    >
                      Resume Subscription
                    </button>
                  ) : (
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pricing tiers */}
      {!hasActiveSub && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Choose a plan</h2>
            <p className="text-sm text-slate-500 mt-1">All plans include a 14-day free trial. No credit card required to start.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {TIERS.map((tier) => (
              <div
                key={tier.key}
                className={`relative bg-white border rounded-xl p-6 flex flex-col ${
                  tier.popular
                    ? 'border-violet-300 ring-2 ring-violet-100'
                    : 'border-slate-200'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">{tier.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{tier.desc}</p>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-4">
                  ${tier.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(tier.key)}
                  disabled={actionLoading}
                  className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                    tier.popular
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* If active, show upgrade options */}
      {hasActiveSub && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Change Plan</h3>
          <p className="text-xs text-slate-500 mb-4">
            Upgrade or downgrade your plan. Changes take effect at the next billing cycle.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {TIERS.map((tier) => {
              const isCurrent = tier.key === subscription?.pricingTier;
              return (
                <button
                  key={tier.key}
                  onClick={() => !isCurrent && handleManage()}
                  disabled={isCurrent || actionLoading}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isCurrent
                      ? 'border-violet-300 bg-violet-50'
                      : 'border-slate-200 hover:border-violet-200 hover:bg-violet-50/50'
                  } disabled:cursor-default`}
                >
                  <p className="text-sm font-semibold text-slate-800">{tier.name}</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">${tier.price}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                  {isCurrent && (
                    <p className="text-[10px] text-violet-600 font-medium mt-1">Current plan</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
