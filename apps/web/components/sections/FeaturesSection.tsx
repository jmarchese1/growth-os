'use client';

import { useState } from 'react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.embedo.io';

/* ── Value stack items ─────────────────────────────────────────── */

const OFFER_ITEMS = [
  { label: 'AI Phone Receptionist', value: '$2,500', desc: 'Answers every call 24/7, takes orders, books reservations' },
  { label: 'AI Website Chatbot', value: '$1,500', desc: 'Engages visitors, answers questions, captures leads' },
  { label: 'AI-Generated Website', value: '$3,000', desc: 'Professional site built in 30 seconds, fully editable' },
  { label: 'Social Media Automation', value: '$1,200', desc: 'AI creates, schedules, and monitors posts hands-free' },
  { label: 'QR Codes + Surveys', value: '$800', desc: 'Smart QR at every table, feedback + contact capture' },
  { label: 'CRM + Email Campaigns', value: '$1,500', desc: 'Unified customer database with AI-drafted campaigns' },
  { label: 'Dedicated Phone Number', value: '$600', desc: 'Local number with routing and AI after-hours backup' },
  { label: 'White-Glove Setup', value: '$2,000', desc: 'We configure everything — live in days, not months' },
];

/* ── Plan tiers ────────────────────────────────────────────────── */

interface Plan {
  tier: string;
  name: string;
  price: number;
  interval: string;
  tagline: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    tier: 'SOLO',
    name: 'Solo',
    price: 249,
    interval: '/mo',
    tagline: 'For solo operators',
    features: [
      '500 contacts',
      'AI Voice Agent + phone number',
      'AI Website + Chatbot',
      '10 QR codes, 5 surveys',
      '100 emails/mo',
      '50 AI images/mo',
    ],
  },
  {
    tier: 'SMALL',
    name: 'Small',
    price: 399,
    interval: '/mo',
    tagline: 'Most popular',
    popular: true,
    features: [
      '2,000 contacts',
      '3 chatbot widgets',
      'Social media automation',
      'Email sequences',
      '1,000 emails/mo',
      '200 AI images/mo',
      'Unlimited surveys',
    ],
  },
  {
    tier: 'MEDIUM',
    name: 'Medium',
    price: 549,
    interval: '/mo',
    tagline: 'For growing teams',
    features: [
      '10,000 contacts',
      '10 chatbot widgets',
      '3 phone numbers',
      '100 social posts/mo',
      'Unlimited email sequences',
      '10,000 emails/mo',
      '500 AI images/mo',
      'Priority support',
    ],
  },
];

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function FeaturesSection() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tier: string) => {
    setLoadingTier(tier);
    try {
      const res = await fetch(`${API_BASE}/billing/public-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          successUrl: `${APP_URL}/login?checkout=success&tier=${tier}`,
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      // API returned but no URL — Stripe may not be configured, fall back to signup
      console.error('public-checkout response:', data);
    } catch (err) {
      console.error('public-checkout failed:', err);
    }
    // Fallback: redirect to signup with plan selected
    window.location.href = `${APP_URL}/login?plan=${tier}&signup=1`;
    setLoadingTier(null);
  };

  return (
    <section id="pricing" className="py-24 lg:py-32 px-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-violet-600 mb-4">Pricing</p>
          <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1] mb-5">
            Everything your business needs.
            <br />
            <span className="text-violet-600">One platform. One price.</span>
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Stop paying for 8 different tools. Get the entire AI stack — connected from day one.
          </p>
        </div>

        {/* ── Value Stack ────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-8 py-5 bg-gradient-to-r from-violet-600 to-indigo-600">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-200">Included in every plan</p>
              <h3 className="text-lg font-bold text-white mt-0.5">Here&apos;s what you&apos;re getting</h3>
            </div>

            {/* Items */}
            <div className="px-8 py-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              {OFFER_ITEMS.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <Check />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400 line-through whitespace-nowrap">{item.value}</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total value</p>
              <p className="text-lg font-bold text-gray-400 line-through">$13,100<span className="text-sm">/yr</span></p>
            </div>
          </div>
        </div>

        {/* ── Plan Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 ${
                plan.popular
                  ? 'bg-white border-2 border-violet-600 shadow-xl shadow-violet-600/10'
                  : 'bg-white border border-gray-200 shadow-md hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="bg-violet-600 text-center py-2">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">Most Popular</p>
                </div>
              )}

              <div className={`px-7 ${plan.popular ? 'pt-7' : 'pt-8'} pb-8`}>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-600 mb-1">{plan.tagline}</p>
                <h3 className="text-xl font-bold text-gray-900 mb-5">{plan.name}</h3>

                <div className="flex items-baseline gap-0.5 mb-6">
                  <span className="text-sm text-gray-400 font-medium">$</span>
                  <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{plan.price}</span>
                  <span className="text-sm text-gray-400 font-medium ml-1">{plan.interval}</span>
                </div>

                <button
                  onClick={() => void handleCheckout(plan.tier)}
                  disabled={loadingTier !== null}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                    plan.popular
                      ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-600/20 hover:shadow-lg hover:-translate-y-0.5'
                      : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {loadingTier === plan.tier ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Redirecting to Stripe...
                    </span>
                  ) : (
                    'Start 14-Day Free Trial'
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2.5">No credit card required</p>

                <div className="h-px bg-gray-100 my-6" />

                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Everything above, plus:</p>
                <div className="space-y-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check />
                      <p className="text-sm text-gray-600">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Trust badges ───────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secured by Stripe
          </span>
          <span>Cancel anytime</span>
          <span>14-day free trial on all plans</span>
        </div>
      </div>
    </section>
  );
}
