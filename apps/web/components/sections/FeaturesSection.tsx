'use client';

const features = [
  { icon: '🎙️', title: 'Never miss a call again', description: 'Your AI receptionist answers at 2am. Your chatbot engages visitors on Sunday. Revenue doesn\'t stop when you do.', accent: true },
  { icon: '⚡', title: 'Every lead, captured', description: 'Phone calls, DMs, form fills — every lead flows into one place and gets followed up within seconds. Automatically.', accent: false },
  { icon: '🎯', title: 'Built for your business', description: 'Each AI agent is trained on your menu, hours, tone, and personality. Not a generic bot — your brand, automated.', accent: false },
  { icon: '📱', title: 'Social that sells', description: 'AI generates posts, schedules them, and DMs anyone who engages. Your feed stays active even when you\'re slammed.', accent: false },
  { icon: '🔗', title: 'One connected system', description: 'Voice, chat, leads, social, surveys, booking — all talking to each other. One action triggers the next automatically.', accent: true },
  { icon: '🚀', title: 'Live in days, not months', description: 'From onboarding to fully deployed AI infrastructure in days. No dev team, no technical knowledge required.', accent: false },
];

const bullets = [
  {
    label: 'Answers every call, captures every lead',
    sub: 'Voice AI live 24/7 — reservations booked, info captured, zero staff required.',
  },
  {
    label: 'Social content created and posted for you',
    sub: 'AI writes captions, schedules posts, and auto-DMs anyone who engages.',
  },
  {
    label: 'Complete AI stack live in days',
    sub: 'No dev team. No months of setup. Every module connected from day one.',
  },
];

/* ── Grand Slam Offer ────────────────────────────────────────────── */

const OFFER_ITEMS = [
  {
    label: 'AI Phone Receptionist',
    value: '$2,500',
    desc: 'Answers every call 24/7, takes orders, books reservations, captures leads',
  },
  {
    label: 'AI Website Chatbot',
    value: '$1,500',
    desc: 'Engages every visitor, answers questions, captures contact info',
  },
  {
    label: 'AI-Generated Website',
    value: '$3,000',
    desc: 'Professional site built and deployed in 30 seconds, fully editable',
  },
  {
    label: 'Social Media Automation',
    value: '$1,200',
    desc: 'AI creates posts, schedules them, monitors engagement automatically',
  },
  {
    label: 'QR Code & Survey System',
    value: '$800',
    desc: 'Smart QR codes, feedback collection, contact capture at every table',
  },
  {
    label: 'CRM + Email Campaigns',
    value: '$1,500',
    desc: 'Unified customer database with AI-drafted email campaigns',
  },
  {
    label: 'Dedicated Phone Number',
    value: '$600',
    desc: 'Local business number with call routing and after-hours AI backup',
  },
  {
    label: 'Setup + Onboarding',
    value: '$2,000',
    desc: 'We configure everything for you — live in days, not months',
  },
];

const TOTAL_VALUE = '$13,100';

export default function FeaturesSection() {
  return (
    <section id="features" className="pt-8 pb-10 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch mb-16">

          {/* Left: stronger, more specific copy */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-4">Why Embedo</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
              Your competitors<br />
              hire staff.<br />
              <span className="text-gradient">You deploy AI.</span>
            </h2>

            <div className="space-y-5">
              {bullets.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.label}</p>
                    <p className="text-sm text-gray-500 leading-snug">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Grand Slam Offer Stack */}
          <div className="flex flex-col justify-center">
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-lg shadow-indigo-100/50 overflow-hidden">
              {/* Offer header */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-200 mb-1">Everything included</p>
                <h3 className="text-xl font-bold text-white">Here&apos;s what you&apos;re getting</h3>
              </div>

              {/* Value stack */}
              <div className="px-6 py-5 space-y-3">
                {OFFER_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-400 line-through whitespace-nowrap">{item.value}</p>
                      </div>
                      <p className="text-xs text-gray-500 leading-snug mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total + price */}
              <div className="px-6 py-5 border-t border-indigo-100 bg-indigo-50/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Total Value</p>
                  <p className="text-lg font-bold text-gray-400 line-through">{TOTAL_VALUE}/yr</p>
                </div>
                <div className="flex items-end gap-3 mb-4">
                  <p className="text-sm text-gray-500">Your price:</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-indigo-600">$249</span>
                    <span className="text-sm text-gray-500">/mo</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">14-day free trial</div>
                  <span className="text-xs text-gray-500">Cancel anytime. No contracts.</span>
                </div>
                <a
                  href="https://app.embedo.io"
                  className="block w-full text-center px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5"
                >
                  Start Your Free Trial
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-7 rounded-2xl border border-indigo-100 bg-indigo-50 cursor-default"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(-6px)';
                el.style.boxShadow = '0 12px 40px rgba(99,102,241,0.28), 0 4px 16px rgba(139,92,246,0.18)';
                el.style.borderColor = 'rgba(99,102,241,0.45)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = '';
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                el.style.borderColor = '';
              }}
            >
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="text-base font-semibold mb-2 text-indigo-900">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
