'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TIER_KEYS, TIERS, FEATURES, CATEGORIES } from '../billing-data';
import type { FeatureValue, TierKey } from '../billing-data';
import type { ReactNode } from 'react';

// ─── Icons ──────────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, ReactNode> = {
  'AI Tools': (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M13 7H7v6h6V7z" />
      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
    </svg>
  ),
  'Website & QR': (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
    </svg>
  ),
  Marketing: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  ),
  CRM: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  ),
  Platform: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
};

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-600">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  if (value === false) {
    return <span className="text-xs text-slate-300 dark:text-slate-600">&mdash;</span>;
  }
  return <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{value}</span>;
}

export default function ComparePlansPage() {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(CATEGORIES));

  const toggle = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="p-8 animate-fade-up max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/billing"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-600 dark:text-slate-300">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Compare Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">See exactly what&apos;s included in each tier</p>
        </div>
      </div>

      {/* Sticky tier header */}
      <div className="sticky top-0 z-20 -mx-8 px-8 pb-3 pt-1 bg-gradient-to-b from-slate-50 via-slate-50 to-transparent dark:from-[#110f1d] dark:via-[#110f1d] dark:to-transparent">
        <div className="grid grid-cols-[1fr_repeat(5,100px)] gap-2 items-end">
          <div />
          {TIER_KEYS.map((key) => {
            const tier = TIERS[key];
            return (
              <div key={key} className="text-center">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{tier.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {tier.price === 0 ? 'Free' : `$${tier.price.toFixed(2)}/mo`}
                </p>
                {tier.popular && (
                  <span className="inline-block mt-1 px-1.5 py-px bg-violet-100 text-violet-700 text-[8px] font-bold uppercase tracking-wider rounded">
                    Popular
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category sections */}
      <div className="space-y-3">
        {CATEGORIES.map((category) => {
          const isOpen = openCategories.has(category);
          const features = FEATURES.filter((f) => f.category === category);

          return (
            <div key={category} className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
              {/* Category header — clickable */}
              <button
                onClick={() => toggle(category)}
                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors"
              >
                <span className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                  {CATEGORY_ICONS[category] ?? CATEGORY_ICONS['Platform']}
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{category}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{features.length} features</p>
                </div>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Feature rows */}
              {isOpen && (
                <div className="border-t border-slate-100 dark:border-white/[0.06]">
                  {features.map((feature, i) => (
                    <div
                      key={feature.label}
                      className={`grid grid-cols-[1fr_repeat(5,100px)] gap-2 px-5 py-3 items-center ${
                        i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/40 dark:bg-white/[0.02]'
                      }`}
                    >
                      <span className="text-[13px] text-slate-700 dark:text-slate-200 pl-11">{feature.label}</span>
                      {TIER_KEYS.map((key) => (
                        <div key={key} className="flex justify-center">
                          <FeatureCell value={feature.values[key]} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 text-center">
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back to Billing
        </Link>
      </div>
    </div>
  );
}
