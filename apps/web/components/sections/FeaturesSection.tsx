'use client';

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

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.embedo.io';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0'}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export default function FeaturesSection() {
  const handleStartTrial = (tier: string) => {
    window.location.href = `${APP_URL}/login?plan=${tier}&signup=1`;
  };

  return (
    <section id="pricing" className="relative py-24 px-6 overflow-hidden" style={{ background: 'linear-gradient(180deg, #0c0a1a 0%, #110e24 50%, #0c0a1a 100%)' }}>
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid-dark opacity-40" />

      {/* Ambient glow orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/[0.07] blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.06] blur-[130px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-violet-500/[0.04] blur-[180px]" />

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase text-violet-300">The Offer</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
            <span className="text-white">Everything your business needs.</span>
            <br />
            <span className="text-gradient">One platform. One price.</span>
          </h2>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop paying for 8 different tools that don&apos;t talk to each other.
            Get the entire AI stack — connected and working together from day one.
          </p>
        </div>

        {/* Value stack card */}
        <div className="relative max-w-4xl mx-auto mb-20">
          {/* Glow behind card */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-violet-500/20 via-transparent to-indigo-500/10 blur-sm" />

          <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Header bar */}
            <div className="px-8 py-5 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(99,102,241,0.1) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-300/70">Included in every plan</p>
                  <h3 className="text-base font-bold text-white">Here&apos;s what you&apos;re getting</h3>
                </div>
              </div>
            </div>

            {/* Items grid */}
            <div className="px-8 py-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              {OFFER_ITEMS.map((item) => (
                <div key={item.label} className="flex items-start gap-3 group">
                  <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-violet-500/20 group-hover:border-violet-500/30 transition-colors">
                    <CheckIcon className="w-3 h-3 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white/90">{item.label}</p>
                      <p className="text-xs text-slate-500 line-through whitespace-nowrap font-mono">{item.value}</p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total value bar */}
            <div className="px-8 py-4 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">Total Value</p>
              <p className="text-lg font-bold text-slate-500 line-through font-mono">{TOTAL_VALUE}<span className="text-sm">/yr</span></p>
            </div>
          </div>
        </div>

        {/* Arrow / connector */}
        <div className="flex flex-col items-center mb-14">
          <div className="w-px h-8 bg-gradient-to-b from-violet-500/30 to-transparent" />
          <div className="px-5 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
            <p className="text-xs font-bold text-violet-300 tracking-wider uppercase">Choose your plan</p>
          </div>
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-violet-500/20" />
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`relative group rounded-2xl overflow-visible transition-all duration-300 ${
                plan.popular ? 'md:-mt-4 md:mb-4' : ''
              }`}
            >
              {/* Glow behind popular card */}
              {plan.popular && (
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet-500/40 via-violet-500/20 to-indigo-500/30 blur-sm group-hover:blur-md transition-all" />
              )}

              <div
                className={`relative h-full rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1 ${
                  plan.popular
                    ? 'bg-white/[0.06] backdrop-blur-xl border border-violet-500/30'
                    : 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] group-hover:border-white/[0.15]'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-center py-2">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">Most Popular</p>
                  </div>
                )}

                <div className={`px-7 ${plan.popular ? 'pt-14' : 'pt-8'} pb-8`}>
                  {/* Tier label + name */}
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-400 mb-1.5">{plan.highlight}</p>
                  <h3 className="text-xl font-bold text-white mb-5">{plan.name}</h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-[10px] text-slate-500 font-medium self-start mt-2">$</span>
                    <span className="text-5xl font-extrabold text-white tracking-tight">{plan.price}</span>
                    <span className="text-sm text-slate-500 font-medium">{plan.interval}</span>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleStartTrial(plan.tier)}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      plan.popular
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 hover:from-violet-500 hover:to-indigo-500 hover:-translate-y-0.5'
                        : 'bg-white/[0.08] text-white border border-white/[0.12] hover:bg-white/[0.14] hover:border-violet-500/30 hover:-translate-y-0.5'
                    }`}
                  >
                    Start 14-Day Free Trial
                  </button>
                  <p className="text-center text-[10px] text-slate-600 mt-2.5">No credit card required to start</p>

                  {/* Divider */}
                  <div className="h-px bg-white/[0.06] my-6" />

                  {/* Features */}
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Everything in the value stack, plus:</p>
                  <div className="space-y-3">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <CheckIcon className="w-3.5 h-3.5 text-violet-400/80 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-400 leading-snug">{f}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-14">
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldIcon />
            Secured by Stripe
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Cancel anytime
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            14-day free trial on all plans
          </span>
        </div>
      </div>
    </section>
  );
}
