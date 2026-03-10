'use client';
import { useState } from 'react';
import ParticleCanvas from '@/components/ui/ParticleCanvas';

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
    <section id="proposal" className="pt-12 pb-20 px-6 text-gray-900 relative overflow-hidden bg-white bg-grid">
      {/* Neural network — same as hero */}
      <ParticleCanvas />
      {/* Soft radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-50 opacity-70 blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
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
          We generate a <span className="text-gray-900 font-semibold">custom proposal in seconds</span> — specific to your business, your industry, and
          your goals.
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
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
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
      </div>
    </section>
  );
}
