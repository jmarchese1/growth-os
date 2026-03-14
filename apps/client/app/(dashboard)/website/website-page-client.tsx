'use client';

import { useState } from 'react';
import WebsiteBuilder from './website-builder';

export default function WebsitePageClient({ businessId }: { businessId: string }) {
  const [started, setStarted] = useState(false);

  if (started) return <WebsiteBuilder businessId={businessId} />;

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Website</h1>
        <p className="text-sm text-slate-500 mt-1">Your AI-generated business website, live on the web in minutes</p>
      </div>

      {/* Hero CTA */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-10 text-center mb-8 shadow-lg">
        <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-3">AI Website Generator</p>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Your restaurant, beautifully online</h2>
        <p className="text-violet-200 text-base max-w-md mx-auto mb-8 leading-relaxed">
          Point us at your existing website (or start fresh), choose a style, and we&apos;ll generate a stunning Apple-style site and deploy it live — in under 2 minutes.
        </p>
        <button
          onClick={() => setStarted(true)}
          className="px-8 py-3.5 bg-white text-violet-700 font-semibold rounded-full text-sm hover:bg-violet-50 transition-colors shadow-sm"
        >
          Build My Website
        </button>
      </div>

      {/* What you get */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { title: 'Scrapes Your Current Site', desc: 'Paste your existing URL — we pull your hours, menu, photos, and contact info automatically' },
          { title: 'You Pick the Style', desc: 'Choose a color palette, font pairing, and upload your hero image. Full control over the look.' },
          { title: 'Live in Minutes', desc: 'One click deploys your site live with a shareable URL. Custom domain available anytime.' },
        ].map(({ title, desc }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-1.5">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* What's included */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">What&apos;s included</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Hero Section', 'About & Story', 'Menu Highlights', 'Photo Gallery', 'Hours & Location', 'Reservations', 'Chat Widget', 'Mobile Ready'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                  <path d="M2 6l3 3 5-5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-slate-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
