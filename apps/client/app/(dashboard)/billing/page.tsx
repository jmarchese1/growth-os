'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useBusiness } from '../../../components/auth/business-provider';
import { TIER_KEYS, TIERS } from './billing-data';
import type { TierKey } from './billing-data';

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

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014';
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
  const activeTierKey = (subscription?.pricingTier ?? 'FREE') as TierKey;
  const isOnFree = activeTierKey === 'FREE' || !subscription;

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="flex-1 text-sm font-medium text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>
      )}

      {/* Active paid subscription card */}
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
                ${TIERS[activeTierKey]?.price.toFixed(2)}<span className="text-base font-normal text-slate-400">/mo</span>
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

      {/* Plan selection header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {isOnFree ? 'Choose a plan' : 'Plans'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">All paid plans include a 14-day free trial</p>
        </div>
        <Link
          href="/billing/compare"
          className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1.5 transition-colors"
        >
          Compare all features
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {TIER_KEYS.map((key) => {
          const tier = TIERS[key];
          const isCurrent = key === activeTierKey;
          const isPopular = tier.popular;
          const isFree = key === 'FREE';

          return (
            <div
              key={key}
              className={`relative bg-white border rounded-2xl p-6 flex flex-col transition-all ${
                isPopular
                  ? 'border-violet-300 ring-2 ring-violet-100 shadow-lg shadow-violet-100/50'
                  : isCurrent
                    ? 'border-emerald-300 ring-2 ring-emerald-100'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}
              {isCurrent && !isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Current
                </div>
              )}

              {/* Name + price */}
              <div className="mb-5">
                <h3 className="text-base font-bold text-slate-900">{tier.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{tier.desc}</p>
                <div className="mt-3">
                  {tier.price === 0 ? (
                    <p className="text-3xl font-bold text-slate-900">Free</p>
                  ) : (
                    <p className="text-3xl font-bold text-slate-900">
                      ${tier.price.toFixed(2)}<span className="text-sm font-normal text-slate-400">/mo</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Highlight features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded-full bg-violet-100 flex items-center justify-center">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-violet-600">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-xs text-slate-600 leading-snug">{h}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isFree ? (
                <button
                  disabled
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-slate-100 text-slate-400 cursor-default"
                >
                  {isCurrent ? 'Current Plan' : 'Free Forever'}
                </button>
              ) : isCurrent ? (
                <button
                  onClick={handleManage}
                  disabled={actionLoading}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  Manage Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={actionLoading}
                  className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
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

      {/* Compare link at bottom */}
      <div className="mt-8 text-center">
        <Link
          href="/billing/compare"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          See full feature comparison across all plans
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
