'use client';
import { useState } from 'react';

type Step = 'idle' | 'loading' | 'done';

export default function LeadCaptureForm() {
  const [step, setStep] = useState<Step>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');

    try {
      const res = await fetch(
        `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/leads/capture`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            ...(businessName ? { businessName } : {}),
            interest: 'website-learn-more',
          }),
        },
      );

      if (res.ok) {
        setStep('done');
      } else {
        setStep('idle');
      }
    } catch {
      setStep('idle');
    }
  };

  if (step === 'done') {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in.</h3>
        <p className="text-gray-500 text-sm">
          We&apos;ll reach out within 24 hours with everything you need to know.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm text-sm"
          placeholder="Your name"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm text-sm"
          placeholder="you@restaurant.com"
        />
      </div>
      <input
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm text-sm"
        placeholder="Business name (optional)"
      />
      <button
        type="submit"
        disabled={step === 'loading'}
        className="w-full px-6 py-3.5 bg-black text-white text-sm font-semibold rounded-full transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
      >
        {step === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </span>
        ) : (
          'Get Started — Free Consultation'
        )}
      </button>
      <p className="text-center text-xs text-gray-400">
        No commitment. We&apos;ll show you exactly what Embedo can do for your business.
      </p>
    </form>
  );
}
