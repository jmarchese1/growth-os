'use client';

import { useState, useEffect } from 'react';
import WebsiteBuilder from './website-builder';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface DeployedSite {
  id: string;
  deployUrl: string | null;
  vercelProjectId: string | null;
  status: string;
  updatedAt: string;
  config: Record<string, unknown> | null;
}

export default function WebsitePageClient({ businessId }: { businessId: string }) {
  const [started, setStarted] = useState(false);
  const [site, setSite] = useState<DeployedSite | null>(null);
  const [siteLoading, setSiteLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/businesses/${businessId}/website`)
      .then((r) => r.json())
      .then((d: { success: boolean; website?: DeployedSite }) => {
        if (d.success && d.website) setSite(d.website);
      })
      .catch(() => {})
      .finally(() => setSiteLoading(false));
  }, [businessId]);

  if (started) return <WebsiteBuilder businessId={businessId} />;

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Website</h1>
        <p className="text-sm text-slate-500 mt-1">Your AI-generated business website, live on the web in minutes</p>
      </div>

      {/* Live site card — shown when a site is already deployed */}
      {!siteLoading && site?.deployUrl && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
          {/* Browser chrome mockup */}
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-500 flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-400 flex-shrink-0">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="truncate">{site.deployUrl.replace(/^https?:\/\//, '')}</span>
            </div>
            <a
              href={site.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
            >
              Open
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
          {/* Iframe preview */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={site.deployUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="Your live website"
              loading="lazy"
            />
          </div>
          {/* Footer with meta */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">Live</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">
                Last updated {new Date(site.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
            >
              Rebuild
            </button>
          </div>
        </div>
      )}

      {/* Hero CTA — shown when no site is deployed yet */}
      {!siteLoading && !site?.deployUrl && (
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
      )}

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
