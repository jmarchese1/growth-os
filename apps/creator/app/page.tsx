'use client';

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState<'landing' | 'connect' | 'compose' | 'sending'>('landing');
  const [username, setUsername] = useState('');
  const [cookies, setCookies] = useState('');
  const [message, setMessage] = useState('');
  const [dailyLimit, setDailyLimit] = useState(20);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);

  if (step === 'landing') {
    return <Landing onStart={() => setStep('connect')} />;
  }

  return (
    <>
      <div className="stars" />
      <div className="nebula" />
      <main className="relative z-10 max-w-xl mx-auto px-6 py-10">
        {/* Nav */}
        <nav className="flex items-center justify-between mb-12 animate-fade-up">
          <button onClick={() => setStep('landing')} className="flex items-center gap-2.5 group">
            <MascotSmall />
            <span className="font-display text-lg font-semibold tracking-tight group-hover:text-white/80 transition-colors">Reach</span>
          </button>
          <Steps current={step} />
        </nav>

        {/* Connect */}
        {step === 'connect' && (
          <div className="stagger space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">Connect Instagram</h1>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed max-w-md">
                Paste your session cookies to authenticate. We never store your password.
              </p>
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="yourhandle" className="input pl-8" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Session Cookies</label>
                <textarea value={cookies} onChange={e => setCookies(e.target.value)} placeholder='[{"name":"sessionid","value":"..."}]' rows={4} className="input font-mono text-xs resize-none" />
                <p className="text-[10px] text-zinc-600 mt-1.5">DevTools &rarr; Console &rarr; paste the cookie export snippet</p>
              </div>
              <button onClick={() => { if (username && cookies) setStep('compose'); }} disabled={!username || !cookies} className="btn-primary w-full disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none">
                Connect Account
              </button>
            </div>
          </div>
        )}

        {/* Compose */}
        {step === 'compose' && (
          <div className="stagger space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">Write your DM</h1>
              <p className="text-sm text-zinc-500 mt-2">Short, personal messages get the best response rates.</p>
            </div>

            {/* Connected badge */}
            <div className="glass-card px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">@{username}</p>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Connected</p>
              </div>
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hey! Thanks for following along. I'm opening up a few coaching spots this month — want me to send you the details?" rows={4} className="input resize-none leading-relaxed" />
                <p className="text-[10px] text-zinc-600 mt-1.5 text-right">{message.length}/500</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Daily Limit</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={5} max={50} step={5} value={dailyLimit} onChange={e => setDailyLimit(parseInt(e.target.value))} className="flex-1 accent-pink-500 h-1" />
                  <div className="w-14 text-right">
                    <span className="text-xl font-display font-bold gradient-text">{dailyLimit}</span>
                    <span className="text-[9px] text-zinc-600 block">/day</span>
                  </div>
                </div>
              </div>

              {/* DM Preview bubble */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Preview</label>
                <div className="bg-[#0a0d16] rounded-2xl p-4 border border-white/[0.03]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex-shrink-0 mt-0.5" />
                    <div className="bg-white/[0.05] rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[90%]">
                      <p className="text-[12px] text-zinc-300 leading-relaxed">{message || <span className="text-zinc-700 italic">Your message here...</span>}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={() => { setSending(true); setStep('sending'); const i = setInterval(() => setSent(p => { if (p >= dailyLimit) { clearInterval(i); setSending(false); return p; } return p + 1; }), 2500); }} disabled={!message} className="btn-primary w-full disabled:opacity-30 disabled:cursor-not-allowed">
                Start Reaching Out
              </button>
            </div>
          </div>
        )}

        {/* Sending */}
        {step === 'sending' && (
          <div className="stagger space-y-8 text-center">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">Reaching out</h1>
              <p className="text-sm text-zinc-500 mt-2">Sending DMs with human-like timing</p>
            </div>

            {/* Progress ring */}
            <div className="flex justify-center">
              <div className="relative w-44 h-44">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#rg)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(sent / dailyLimit) * 251.3} 251.3`} className="transition-all duration-1000 ease-out" />
                  <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#833AB4" /><stop offset="50%" stopColor="#E1306C" /><stop offset="100%" stopColor="#F77737" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-display font-bold gradient-text">{sent}</span>
                  <span className="text-[10px] text-zinc-600 mt-0.5">of {dailyLimit}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[{ l: 'Sent', v: String(sent), c: 'text-emerald-400' }, { l: 'Remaining', v: String(dailyLimit - sent), c: 'text-pink-400' }, { l: 'Next in', v: sending ? '~3m' : 'Done', c: 'text-zinc-300' }].map(s => (
                <div key={s.l} className="glass-card p-4 text-center">
                  <p className={`text-xl font-display font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">{s.l}</p>
                </div>
              ))}
            </div>

            {sending && (
              <button onClick={() => setSending(false)} className="btn-secondary w-full">
                Pause
              </button>
            )}
          </div>
        )}
      </main>
    </>
  );
}

/* ── Mascot SVG ──────────────────────────────────────── */
function Mascot() {
  return (
    <div className="mascot relative w-28 h-28 mx-auto">
      {/* Glow ring */}
      <div className="absolute inset-[-8px] rounded-full bg-gradient-to-br from-[#833AB4]/20 via-[#E1306C]/15 to-[#F77737]/10 blur-xl pulse-ring" />
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
        {/* Body */}
        <rect x="25" y="30" width="70" height="65" rx="20" fill="url(#mascot-grad)" />
        {/* Antenna */}
        <path d="M48 30 Q45 15 38 12" stroke="#E1306C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M72 30 Q75 15 82 12" stroke="#F77737" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="38" cy="10" r="3" fill="#E1306C" />
        <circle cx="82" cy="10" r="3" fill="#F77737" />
        {/* Eyes */}
        <g className="eyelid" style={{ transformOrigin: '45px 55px' }}>
          <ellipse cx="45" cy="55" rx="10" ry="11" fill="#0a0d16" />
          <g className="eye-pupil">
            <circle cx="46" cy="54" r="4" fill="white" />
            <circle cx="47" cy="53" r="1.5" fill="#E1306C" />
          </g>
        </g>
        <g className="eyelid" style={{ transformOrigin: '75px 55px' }}>
          <ellipse cx="75" cy="55" rx="10" ry="11" fill="#0a0d16" />
          <g className="eye-pupil">
            <circle cx="76" cy="54" r="4" fill="white" />
            <circle cx="77" cy="53" r="1.5" fill="#F77737" />
          </g>
        </g>
        {/* Smile */}
        <path d="M50 72 Q60 80 70 72" stroke="#0a0d16" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Legs */}
        <rect x="38" y="92" width="12" height="16" rx="6" fill="url(#mascot-grad)" />
        <rect x="70" y="92" width="12" height="16" rx="6" fill="url(#mascot-grad)" />
        {/* IG icon on belly */}
        <rect x="51" y="62" width="18" height="18" rx="5" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
        <circle cx="60" cy="71" r="4" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
        <circle cx="66" cy="65" r="1" fill="rgba(255,255,255,0.2)" />
        <defs>
          <linearGradient id="mascot-grad" x1="25" y1="30" x2="95" y2="108">
            <stop offset="0%" stopColor="#833AB4" />
            <stop offset="50%" stopColor="#E1306C" />
            <stop offset="100%" stopColor="#F77737" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function MascotSmall() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-8 h-8">
      <rect x="25" y="30" width="70" height="65" rx="20" fill="url(#ms-g)" />
      <ellipse cx="45" cy="55" rx="8" ry="9" fill="#0a0d16" />
      <circle cx="46" cy="54" r="3" fill="white" />
      <circle cx="47" cy="53" r="1" fill="#E1306C" />
      <ellipse cx="75" cy="55" rx="8" ry="9" fill="#0a0d16" />
      <circle cx="76" cy="54" r="3" fill="white" />
      <circle cx="77" cy="53" r="1" fill="#F77737" />
      <path d="M50 72 Q60 78 70 72" stroke="#0a0d16" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <defs><linearGradient id="ms-g" x1="25" y1="30" x2="95" y2="108"><stop offset="0%" stopColor="#833AB4" /><stop offset="50%" stopColor="#E1306C" /><stop offset="100%" stopColor="#F77737" /></linearGradient></defs>
    </svg>
  );
}

function Steps({ current }: { current: string }) {
  const steps = ['connect', 'compose', 'sending'];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1.5">
      {['Connect', 'Compose', 'Send'].map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${i <= idx ? 'bg-gradient-to-r from-[#833AB4] to-[#E1306C] text-white' : 'bg-white/[0.04] text-zinc-700 border border-white/[0.06]'}`}>
            {i + 1}
          </div>
          <span className={`text-[10px] font-medium hidden sm:block ${i <= idx ? 'text-zinc-300' : 'text-zinc-700'}`}>{label}</span>
          {i < 2 && <div className={`w-5 h-px ${i < idx ? 'bg-pink-500/40' : 'bg-white/[0.04]'}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── Landing Page ────────────────────────────────────── */
function Landing({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="stars" />
      <div className="nebula" />
      <main className="relative z-10 max-w-3xl mx-auto px-6">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6 animate-fade-up">
          <div className="flex items-center gap-2.5">
            <MascotSmall />
            <span className="font-display text-lg font-semibold tracking-tight">Reach</span>
          </div>
        </nav>

        {/* Hero */}
        <header className="pt-16 pb-20 text-center animate-fade-up">
          <Mascot />

          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight mt-8 leading-[1.05]">
            <span className="gradient-text">Reach</span>
          </h1>
          <p className="font-display text-lg text-zinc-400 mt-2 font-medium">
            Instagram DM autopilot for creators.
          </p>

          <p className="text-sm text-zinc-500 mt-5 max-w-md mx-auto leading-relaxed">
            Automatically message your most engaged followers.<br />
            Turn likes into coaching clients, course sales, and brand deals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <button onClick={onStart} className="btn-primary">
              Get Started
            </button>
            <button className="btn-secondary">
              How it works
            </button>
          </div>
        </header>

        {/* What it does */}
        <section className="pb-16">
          <h2 className="font-display text-lg font-semibold text-white mb-6">
            <span className="section-accent">&rsaquo;</span>
            What It Does
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger">
            {[
              { icon: '💬', title: 'Auto-DM Followers', desc: 'Message people who liked your latest posts. They already know you.' },
              { icon: '⏱️', title: 'Human Timing', desc: '2-5 min between each DM. Types character by character. Undetectable.' },
              { icon: '🛡️', title: 'Account Safe', desc: 'Daily limits, smart scheduling, automatic pausing. No bans.' },
            ].map(f => (
              <div key={f.title} className="glass-card p-5">
                <div className="text-xl mb-2">{f.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="pb-16">
          <h2 className="font-display text-lg font-semibold text-white mb-6">
            <span className="section-accent">&rsaquo;</span>
            Three Steps
          </h2>
          <div className="space-y-3 stagger">
            {[
              { n: '1', title: 'Connect your Instagram', desc: 'Paste your session cookies. Takes 30 seconds.' },
              { n: '2', title: 'Write your message', desc: 'Keep it short and personal. Set your daily limit.' },
              { n: '3', title: 'Hit send', desc: 'We DM your followers on autopilot while you sleep.' },
            ].map(s => (
              <div key={s.n} className="glass-card p-5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] to-[#E1306C] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                  <p className="text-[12px] text-zinc-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Built for */}
        <section className="pb-16">
          <h2 className="font-display text-lg font-semibold text-white mb-6">
            <span className="section-accent">&rsaquo;</span>
            Built For
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
            {['Fitness Coaches', 'Course Creators', 'Agencies', 'Local Biz'].map(t => (
              <div key={t} className="glass-card p-4 text-center">
                <p className="text-xs font-medium text-zinc-300">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20 text-center">
          <div className="glass-card p-8 glow-purple" style={{ boxShadow: '0 0 80px rgba(131,58,180,0.08)' }}>
            <h2 className="font-display text-xl font-bold text-white">Ready to reach your audience?</h2>
            <p className="text-sm text-zinc-500 mt-2">Free to use. No credit card required.</p>
            <button onClick={onStart} className="btn-primary mt-5">
              Start Reaching Out
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pb-8 text-center text-[11px] text-zinc-700">
          Built by Embedo &middot; Not affiliated with Instagram
        </footer>
      </main>
    </>
  );
}
