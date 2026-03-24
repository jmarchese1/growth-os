'use client';

import { useState } from 'react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

/* ── Value stack items — what's included in every plan ─────────── */

const OFFER_ITEMS = [
  { label: 'AI Phone Receptionist', value: '$2,500', desc: 'Answers every call 24/7, takes orders, books reservations, captures leads' },
  { label: 'AI Website Chatbot', value: '$1,500', desc: 'Engages every visitor, answers questions, captures contact info automatically' },
  { label: 'AI-Generated Website', value: '$3,000', desc: 'Professional site built and deployed in 30 seconds, fully editable with AI' },
  { label: 'Social Media Automation', value: '$1,200', desc: 'AI creates posts, schedules them, monitors engagement — hands-free' },
  { label: 'QR Codes + Surveys', value: '$800', desc: 'Smart QR codes at every table, feedback collection, contact capture' },
  { label: 'CRM + Email Campaigns', value: '$1,500', desc: 'Unified customer database with AI-drafted email campaigns' },
  { label: 'Dedicated Phone Number', value: '$600', desc: 'Local number with call routing and after-hours AI backup' },
  { label: 'White-Glove Setup', value: '$2,000', desc: 'We configure everything — live in days, not months' },
];

const TOTAL_VALUE = '$13,100';

/* ── Plan tiers ────────────────────────────────────────────────── */

interface Plan {
  tier: string;
  name: string;
  price: number;
  interval: string;
  highlight: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    tier: 'SOLO',
    name: 'Solo',
    price: 249,
    interval: '/mo',
    highlight: 'For solo operators',
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
    highlight: 'Most popular',
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
    highlight: 'For growing teams',
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0">
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
          successUrl: 'https://app.embedo.io?checkout=success',
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Fallback to signup
      window.location.href = 'https://app.embedo.io';
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <section id="pricing" className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-600 mb-3">The Offer</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Everything your business needs.<br />
            <span className="text-gradient">One platform. One price.</span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Stop paying for 8 different tools that don&apos;t talk to each other. Get the entire AI stack — connected and working together from day one.
          </p>
        </div>

        {/* Value stack — full width */}
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-lg shadow-indigo-100/50 overflow-hidden mb-14 max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-5">
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-200 mb-1">Included in every plan</p>
            <h3 className="text-xl font-bold text-white">Here&apos;s what you&apos;re getting</h3>
          </div>

          <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {OFFER_ITEMS.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <CheckIcon />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400 line-through whitespace-nowrap">{item.value}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-8 py-4 border-t border-indigo-100 bg-indigo-50/50 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Total Value</p>
            <p className="text-lg font-bold text-gray-400 line-through">{TOTAL_VALUE}/yr</p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`relative bg-white rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? 'border-indigo-400 shadow-lg shadow-indigo-200/50 ring-1 ring-indigo-400'
                  : 'border-gray-200 shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-center text-xs font-bold py-1.5 uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className={`px-6 ${plan.popular ? 'pt-12' : 'pt-7'} pb-6`}>
                {/* Tier name + highlight */}
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">{plan.highlight}</p>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{plan.name}</h3>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.interval}</span>
                </div>

                {/* CTA */}
                <button
                  onClick={() => void handleCheckout(plan.tier)}
                  disabled={loadingTier !== null}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:-translate-y-0.5'
                      : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  } disabled:opacity-50`}
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
                <p className="text-center text-[11px] text-gray-400 mt-2">No credit card required to start</p>

                {/* Features */}
                <div className="mt-6 pt-5 border-t border-gray-100 space-y-2.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Everything in the value stack, plus:</p>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <p className="text-sm text-gray-600">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Secured by Stripe
          </span>
          <span>Cancel anytime</span>
          <span>14-day free trial on all plans</span>
        </div>
      </div>
    </section>
  );
}
