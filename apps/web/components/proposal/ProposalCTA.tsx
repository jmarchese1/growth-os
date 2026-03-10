'use client';
import { useState } from 'react';

interface IntakeForm {
  businessName: string;
  industry: string;
  size: string;
  location: string;
  currentSystems: string;
  goals: string;
  contactName: string;
  contactEmail: string;
}

const initialForm: IntakeForm = {
  businessName: '',
  industry: 'restaurant',
  size: 'small',
  location: '',
  currentSystems: '',
  goals: '',
  contactName: '',
  contactEmail: '',
};

type Step = 'idle' | 'form' | 'loading' | 'done';

export default function ProposalCTA() {
  const [step, setStep] = useState<Step>('idle');
  const [form, setForm] = useState<IntakeForm>(initialForm);
  const [proposalUrl, setProposalUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');

    try {
      const res = await fetch(
        `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3008'}/proposals/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            size: form.size as 'solo' | 'small' | 'medium' | 'large',
          }),
        },
      );
      const data = (await res.json()) as { shareUrl: string };
      setProposalUrl(data.shareUrl);
      setStep('done');
    } catch {
      setStep('form');
      alert('Something went wrong. Please try again.');
    }
  };

  const update = (field: keyof IntakeForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <section id="proposal" className="pt-20 pb-20 px-6 text-gray-900 relative overflow-hidden bg-white">

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: copy + form */}
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-4">
              Custom Proposal
            </p>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-4">
              See exactly what{' '}
              <span className="text-gradient">AI</span>
              <br />
              can do for your business.
            </h2>
            <p className="text-gray-500 text-xl mb-10 leading-relaxed">
              We generate a <span className="text-gray-900 font-semibold">custom proposal in seconds</span> — specific to your business, your industry, and your goals.
            </p>

        {step === 'idle' && (
          <button
            onClick={() => setStep('form')}
            className="px-8 py-4 text-gray-900 text-base font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4ade80, #22c55e)',
              boxShadow: '0 0 24px rgba(74,222,128,0.50), 0 4px 16px rgba(34,197,94,0.30)',
            }}
          >
            Generate Custom Proposal →
          </button>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Business Name *</label>
                <input
                  required
                  value={form.businessName}
                  onChange={(e) => update('businessName', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm"
                  placeholder="The Golden Fork"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-400 shadow-sm"
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="salon">Salon / Spa</option>
                  <option value="fitness">Fitness Studio</option>
                  <option value="retail">Retail</option>
                  <option value="medical">Medical / Dental</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Business Size</label>
                <select
                  value={form.size}
                  onChange={(e) => update('size', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-400 shadow-sm"
                >
                  <option value="solo">Just me</option>
                  <option value="small">2–10 employees</option>
                  <option value="medium">11–50 employees</option>
                  <option value="large">50+ employees</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Location *</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm"
                  placeholder="Austin, TX"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Your biggest challenge (optional)</label>
              <textarea
                value={form.goals}
                onChange={(e) => update('goals', e.target.value)}
                rows={2}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm resize-none"
                placeholder="e.g. We miss too many calls. Our social media is inconsistent."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Your Name</label>
                <input
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm"
                  placeholder="jane@restaurant.com"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-8 py-4 text-gray-900 text-base font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                boxShadow: '0 0 24px rgba(74,222,128,0.50), 0 4px 16px rgba(34,197,94,0.30)',
              }}
            >
              Generate My Proposal →
            </button>
          </form>
        )}

        {step === 'loading' && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Generating your custom proposal...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">Your proposal is ready.</h3>
            <p className="text-gray-500 mb-8">A custom AI transformation proposal for your business.</p>
            <a
              href={proposalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-indigo-600 text-white text-base font-semibold rounded-full hover:bg-indigo-700 transition-all"
            >
              View Your Proposal →
            </a>
          </div>
        )}
          </div>{/* end left col */}

          {/* Right: floating animated proposal document */}
          <div className="hidden lg:flex items-center justify-center">
            <div style={{ animation: 'proposal-float 4s ease-in-out infinite' }}>
              <svg width="340" height="420" viewBox="0 0 340 420" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Drop shadow filter */}
                <defs>
                  <filter id="doc-shadow" x="-10%" y="-5%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="12" stdDeviation="20" floodColor="rgba(99,102,241,0.18)" />
                  </filter>
                  <linearGradient id="doc-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f5f3ff" />
                  </linearGradient>
                  <linearGradient id="header-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="bar-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Page curl / back sheet */}
                <rect x="24" y="18" width="292" height="380" rx="16" fill="#ede9fe" opacity="0.5" />

                {/* Main document */}
                <rect x="14" y="8" width="292" height="380" rx="16" fill="url(#doc-grad)" filter="url(#doc-shadow)" />

                {/* Header band */}
                <rect x="14" y="8" width="292" height="64" rx="16" fill="url(#header-grad)" />
                <rect x="14" y="48" width="292" height="24" fill="url(#header-grad)" />

                {/* Embedo logo mark in header */}
                <circle cx="48" cy="40" r="16" fill="rgba(255,255,255,0.2)" />
                <text x="48" y="46" textAnchor="middle" fontSize="13" fontWeight="700" fill="white" fontFamily="system-ui">E</text>

                {/* Header text lines */}
                <rect x="74" y="30" width="90" height="7" rx="3.5" fill="rgba(255,255,255,0.9)" />
                <rect x="74" y="43" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.55)" />

                {/* Sparkle top-right */}
                <g opacity="0.85" style={{ animation: 'proposal-sparkle 2.2s ease-in-out infinite' }}>
                  <path d="M272 28 L274 22 L276 28 L282 30 L276 32 L274 38 L272 32 L266 30 Z" fill="white" opacity="0.9" />
                </g>

                {/* Section: AI Score badge */}
                <rect x="30" y="86" width="80" height="26" rx="13" fill="#ede9fe" />
                <circle cx="46" cy="99" r="7" fill="#6366f1" />
                <text x="46" y="103" textAnchor="middle" fontSize="8" fontWeight="700" fill="white" fontFamily="system-ui">AI</text>
                <rect x="58" y="94" width="40" height="5" rx="2.5" fill="#6366f1" opacity="0.6" />
                <rect x="58" y="102" width="28" height="4" rx="2" fill="#a78bfa" opacity="0.45" />

                {/* Content lines */}
                <rect x="30" y="126" width="200" height="7" rx="3.5" fill="url(#bar-grad)" />
                <rect x="30" y="139" width="240" height="6" rx="3" fill="#e5e7eb" />
                <rect x="30" y="151" width="220" height="6" rx="3" fill="#e5e7eb" />
                <rect x="30" y="163" width="180" height="6" rx="3" fill="#e5e7eb" />

                {/* Divider */}
                <rect x="30" y="182" width="260" height="1" rx="0.5" fill="#ede9fe" />

                {/* Module chips row */}
                <rect x="30" y="193" width="66" height="20" rx="10" fill="#ede9fe" />
                <rect x="36" y="200" width="54" height="6" rx="3" fill="#6366f1" opacity="0.6" />

                <rect x="104" y="193" width="66" height="20" rx="10" fill="#fdf2f8" />
                <rect x="110" y="200" width="54" height="6" rx="3" fill="#ec4899" opacity="0.5" />

                <rect x="178" y="193" width="66" height="20" rx="10" fill="#f0fdf4" />
                <rect x="184" y="200" width="54" height="6" rx="3" fill="#22c55e" opacity="0.5" />

                {/* More content lines */}
                <rect x="30" y="226" width="240" height="6" rx="3" fill="#e5e7eb" />
                <rect x="30" y="238" width="200" height="6" rx="3" fill="#e5e7eb" />
                <rect x="30" y="250" width="220" height="6" rx="3" fill="#e5e7eb" />

                {/* Divider */}
                <rect x="30" y="270" width="260" height="1" rx="0.5" fill="#ede9fe" />

                {/* Pricing highlight box */}
                <rect x="30" y="280" width="260" height="52" rx="12" fill="#f5f3ff" />
                <rect x="44" y="292" width="50" height="6" rx="3" fill="#6366f1" opacity="0.5" />
                <rect x="44" y="304" width="80" height="10" rx="5" fill="#6366f1" opacity="0.85" />
                <rect x="200" y="289" width="70" height="34" rx="10" fill="#6366f1" />
                <rect x="210" y="299" width="50" height="6" rx="3" fill="white" opacity="0.9" />
                <rect x="214" y="309" width="42" height="5" rx="2.5" fill="white" opacity="0.55" />

                {/* CTA / signature line */}
                <rect x="30" y="348" width="120" height="8" rx="4" fill="url(#bar-grad)" />
                <rect x="30" y="362" width="80" height="5" rx="2.5" fill="#d1d5db" />

                {/* Floating sparkles outside doc */}
                <g style={{ animation: 'proposal-sparkle 3s ease-in-out infinite 0.8s' }}>
                  <path d="M316 80 L318 74 L320 80 L326 82 L320 84 L318 90 L316 84 L310 82 Z" fill="#8b5cf6" opacity="0.5" />
                </g>
                <g style={{ animation: 'proposal-sparkle 2.6s ease-in-out infinite 1.5s' }}>
                  <path d="M8 200 L10 195 L12 200 L17 202 L12 204 L10 209 L8 204 L3 202 Z" fill="#6366f1" opacity="0.4" />
                </g>
                <circle cx="308" cy="200" r="4" fill="#a78bfa" opacity="0.35" style={{ animation: 'proposal-sparkle 3.5s ease-in-out infinite 0.3s' }} />
                <circle cx="22" cy="320" r="3" fill="#6366f1" opacity="0.3" style={{ animation: 'proposal-sparkle 2.8s ease-in-out infinite 1.1s' }} />
              </svg>
            </div>
          </div>

        </div>{/* end grid */}
      </div>
    </section>
  );
}
