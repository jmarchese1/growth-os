'use client';
import Image from 'next/image';
import { useState } from 'react';
import ParticleCanvas from '@/components/ui/ParticleCanvas';
import CalModal from '@/components/booking/CalendlyModal';

// ── Orbital rings ────────────────────────────────────────
const RINGS = [
  { size: 324, r: 160, dash: '8 16',  dot: 3.0, dotColor: 'rgba(99,102,241,0.95)',  speed: '14s', cw: true  },
  { size: 390, r: 193, dash: '5 22',  dot: 2.5, dotColor: 'rgba(139,92,246,0.70)',  speed: '21s', cw: false },
  { size: 452, r: 224, dash: '3 30',  dot: 2.0, dotColor: 'rgba(167,139,250,0.45)', speed: '30s', cw: true  },
];
const PARTICLES = [
  { duration: '4.5s', delay: '0s',    radius: 152, sz: 2.8, a: 0.80, rgb: '167,139,250' },
  { duration: '3.8s', delay: '-1.5s', radius: 168, sz: 2.2, a: 0.62, rgb: '139,92,246'  },
  { duration: '5.2s', delay: '-2.8s', radius: 145, sz: 3.0, a: 0.70, rgb: '99,102,241'  },
  { duration: '4.0s', delay: '-0.7s', radius: 178, sz: 1.8, a: 0.50, rgb: '196,181,253' },
  { duration: '6.0s', delay: '-3.5s', radius: 196, sz: 1.6, a: 0.40, rgb: '139,92,246'  },
  { duration: '5.5s', delay: '-1.2s', radius: 212, sz: 1.4, a: 0.35, rgb: '167,139,250' },
];
const ORBIT_CONTAINER = 452 + 16;

const badges = [
  { label: 'Senior Data Scientist' },
  { label: 'M.S. Business Analytics' },
  { label: 'Founder, Embedo' },
];

// ── Proposal form ────────────────────────────────────────
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
  businessName: '', industry: 'restaurant', size: 'small',
  location: '', currentSystems: '', goals: '',
  contactName: '', contactEmail: '',
};
type Step = 'idle' | 'form' | 'loading' | 'done';

export default function ClosingCTA() {
  const calLink = process.env['NEXT_PUBLIC_CAL_LINK'] ?? 'jason-marchese-mkfkwl/30min';
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
          body: JSON.stringify({ ...form, size: form.size as 'solo' | 'small' | 'medium' | 'large' }),
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

  const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm';
  const selectCls = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-400 shadow-sm';
  const labelCls = 'block text-sm text-gray-600 mb-1';

  return (
    <section id="book" className="relative bg-white bg-grid overflow-hidden py-20 px-6">
      {/* Neural network background */}
      <ParticleCanvas />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-indigo-50 opacity-60 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-4">
            Take the next step
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
            Ready to deploy AI<br />
            <span className="text-gray-400">into your business?</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Book a free strategy call, or generate a custom proposal in seconds — no commitment required.
          </p>
        </div>

        {/* Two-column split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* ── Left: About + Book a Call ─────────────────── */}
          <div id="about" className="flex flex-col items-center lg:items-start">

            {/* Photo with orbital rings */}
            <div className="flex justify-center lg:justify-start mb-8">
              <div
                className="relative flex items-center justify-center"
                style={{ width: ORBIT_CONTAINER, height: ORBIT_CONTAINER, maxWidth: '100%' }}
              >
                {/* Glow layers */}
                <div className="absolute rounded-full pointer-events-none" style={{ width: 380, height: 380, background: 'radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 68%)', animation: 'pulse-glow 3.5s ease-in-out infinite' }} />
                <div className="absolute rounded-full pointer-events-none" style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 68%)', animation: 'pulse-glow 2.8s ease-in-out infinite 0.7s' }} />

                {/* Orbital rings */}
                {RINGS.map((ring, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      width: ring.size, height: ring.size,
                      left: '50%', top: '50%',
                      marginLeft: -(ring.size / 2), marginTop: -(ring.size / 2),
                      animation: `logo-orbit ${ring.speed} linear infinite${ring.cw ? '' : ' reverse'}`,
                    }}
                  >
                    <svg width={ring.size} height={ring.size} viewBox={`0 0 ${ring.size} ${ring.size}`} fill="none">
                      <circle cx={ring.size / 2} cy={ring.size / 2} r={ring.r} stroke={`rgba(99,102,241,${0.20 - i * 0.04})`} strokeWidth={1.1 - i * 0.15} strokeDasharray={ring.dash} />
                      <circle cx={ring.size / 2} cy={ring.size / 2 - ring.r} r={ring.dot} fill={ring.dotColor} />
                    </svg>
                  </div>
                ))}

                {/* Orbiting particles */}
                {PARTICLES.map((p, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      width: p.radius * 2 + p.sz, height: p.radius * 2 + p.sz,
                      left: '50%', top: '50%',
                      marginLeft: -(p.radius + p.sz / 2), marginTop: -(p.radius + p.sz / 2),
                      animation: `logo-orbit ${p.duration} linear infinite`,
                      animationDelay: p.delay,
                    }}
                  >
                    <div className="absolute rounded-full" style={{ width: p.sz, height: p.sz, background: `rgba(${p.rgb}, ${p.a})`, top: 0, left: '50%', marginLeft: -(p.sz / 2), boxShadow: `0 0 ${p.sz * 3}px rgba(${p.rgb}, ${p.a * 0.8})` }} />
                  </div>
                ))}

                {/* Photo */}
                <div className="relative z-10">
                  <div className="w-80 h-80 lg:w-[360px] lg:h-[360px] rounded-3xl overflow-hidden shadow-2xl shadow-violet-900/20" style={{ border: '1.5px solid rgba(139,92,246,0.35)' }}>
                    <Image src="/workday_photo.jpeg" alt="Jason Marchese, Founder of Embedo" fill className="object-cover" style={{ objectPosition: '50% 8%' }} sizes="(max-width: 768px) 320px, 360px" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="max-w-sm text-center lg:text-left">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-3">
                Who you&apos;ll be talking to
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-gray-900 mb-3">
                Hey, I&apos;m Jason.
              </h3>
              <div className="flex flex-wrap gap-2 mb-4 justify-center lg:justify-start">
                {badges.map((b) => (
                  <span key={b.label} className="px-3 py-1 rounded-full text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700">
                    {b.label}
                  </span>
                ))}
              </div>
              <p className="text-gray-500 leading-relaxed text-sm mb-6">
                Senior Data Scientist and M.S. Analytics graduate who spent years building AI at scale —
                and watched small business owners get left behind. Embedo is the fix. I&apos;ll work with you
                personally every step of the way.
              </p>

              <CalModal calLink={calLink}>
                <span
                  className="inline-flex items-center gap-3 px-8 py-4 text-gray-900 text-sm font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                    boxShadow: '0 0 24px rgba(74,222,128,0.50), 0 4px 16px rgba(34,197,94,0.30)',
                  }}
                >
                  Book a Free 30-min Call
                  <span className="text-xl">→</span>
                </span>
              </CalModal>

              <p className="mt-3 text-xs text-gray-400">No obligation &nbsp;·&nbsp; No pressure &nbsp;·&nbsp; Free</p>
            </div>
          </div>

          {/* ── Right: Custom Proposal form ───────────────── */}
          <div id="proposal" className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-3">
              Custom Proposal
            </p>
            <h3 className="text-3xl font-bold tracking-tight leading-tight mb-3 text-gray-900">
              See exactly what{' '}
              <span className="text-gradient">AI</span>
              {' '}can do<br />for your business.
            </h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
              We generate a <span className="text-gray-900 font-semibold">custom proposal in seconds</span> — specific to your business, industry, and goals.
            </p>

            {step === 'idle' && (
              <button
                onClick={() => setStep('form')}
                className="px-8 py-4 text-gray-900 text-base font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 0 24px rgba(99,102,241,0.45), 0 4px 16px rgba(139,92,246,0.25)',
                  color: 'white',
                }}
              >
                Generate Custom Proposal →
              </button>
            )}

            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Business Name *</label>
                    <input required value={form.businessName} onChange={(e) => update('businessName', e.target.value)} className={inputCls} placeholder="The Golden Fork" />
                  </div>
                  <div>
                    <label className={labelCls}>Industry</label>
                    <select value={form.industry} onChange={(e) => update('industry', e.target.value)} className={selectCls}>
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
                    <label className={labelCls}>Business Size</label>
                    <select value={form.size} onChange={(e) => update('size', e.target.value)} className={selectCls}>
                      <option value="solo">Just me</option>
                      <option value="small">2–10 employees</option>
                      <option value="medium">11–50 employees</option>
                      <option value="large">50+ employees</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Location *</label>
                    <input required value={form.location} onChange={(e) => update('location', e.target.value)} className={inputCls} placeholder="Austin, TX" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Your biggest challenge (optional)</label>
                  <textarea value={form.goals} onChange={(e) => update('goals', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="e.g. We miss too many calls. Our social media is inconsistent." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Your Name</label>
                    <input value={form.contactName} onChange={(e) => update('contactName', e.target.value)} className={inputCls} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input required type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} className={inputCls} placeholder="jane@restaurant.com" />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-8 py-4 text-white text-base font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: '0 0 24px rgba(99,102,241,0.40), 0 4px 16px rgba(139,92,246,0.20)',
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
                <h4 className="text-2xl font-bold mb-3 text-gray-900">Your proposal is ready.</h4>
                <p className="text-gray-500 mb-8">A custom AI transformation proposal for your business.</p>
                <a href={proposalUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 bg-indigo-600 text-white text-base font-semibold rounded-full hover:bg-indigo-700 transition-all">
                  View Your Proposal →
                </a>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
