'use client';

import Link from 'next/link';
import { TIER_KEYS, TIERS, FEATURES, CATEGORIES } from '../billing-data';
import type { FeatureValue, TierKey } from '../billing-data';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4'}>
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
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100">
        <CheckIcon className="w-4 h-4 text-emerald-600" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100">
        <XIcon className="w-3.5 h-3.5 text-slate-400" />
      </span>
    );
  }
  return <span className="text-xs font-semibold text-slate-700">{value}</span>;
}

function PriceLabel({ tier }: { tier: TierKey }) {
  const t = TIERS[tier];
  if (t.price === 0) return <span className="text-sm font-bold text-slate-900">Free</span>;
  return (
    <span className="text-sm font-bold text-slate-900">
      ${t.price.toFixed(2)}<span className="text-[10px] font-normal text-slate-400">/mo</span>
    </span>
  );
}

export default function ComparePlansPage() {
  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/billing"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-600">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compare Plans</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full breakdown of what&apos;s included in each tier</p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Tier header row */}
        <div className="grid grid-cols-[240px_repeat(5,1fr)] border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
          <div className="px-6 py-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Features</p>
          </div>
          {TIER_KEYS.map((key) => {
            const tier = TIERS[key];
            return (
              <div key={key} className="px-3 py-4 text-center border-l border-slate-100">
                <p className="text-xs font-bold text-slate-900">{tier.name}</p>
                <div className="mt-1">
                  <PriceLabel tier={key} />
                </div>
                {tier.popular && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-bold uppercase tracking-wider rounded-full">
                    Popular
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Category groups */}
        {CATEGORIES.map((category) => (
          <div key={category}>
            {/* Category divider */}
            <div className="grid grid-cols-[240px_repeat(5,1fr)] bg-slate-50 border-y border-slate-100">
              <div className="px-6 py-2.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{category}</p>
              </div>
              {TIER_KEYS.map((key) => (
                <div key={key} className="border-l border-slate-100" />
              ))}
            </div>

            {/* Feature rows */}
            {FEATURES.filter((f) => f.category === category).map((feature, i) => (
              <div
                key={feature.label}
                className={`grid grid-cols-[240px_repeat(5,1fr)] border-b border-slate-50 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                } hover:bg-violet-50/20 transition-colors`}
              >
                <div className="px-6 py-3.5 flex items-center">
                  <span className="text-[13px] text-slate-700">{feature.label}</span>
                </div>
                {TIER_KEYS.map((key) => (
                  <div key={key} className="px-3 py-3.5 flex items-center justify-center border-l border-slate-50">
                    <FeatureCell value={feature.values[key]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Bottom row with CTAs */}
        <div className="grid grid-cols-[240px_repeat(5,1fr)] border-t border-slate-200 bg-slate-50/80">
          <div className="px-6 py-5" />
          {TIER_KEYS.map((key) => (
            <div key={key} className="px-3 py-5 flex justify-center border-l border-slate-100">
              {key === 'FREE' ? (
                <span className="text-xs text-slate-400 font-medium">Free forever</span>
              ) : (
                <Link
                  href="/billing"
                  className="px-4 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
                >
                  Get {TIERS[key].name}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
