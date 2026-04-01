'use client';

import { useState } from 'react';

type Step = 'landing' | 'connect' | 'compose' | 'sending';

export default function Home() {
  const [step, setStep] = useState<Step>('landing');
  const [username, setUsername] = useState('');
  const [cookies, setCookies] = useState('');
  const [message, setMessage] = useState('');
  const [dailyLimit, setDailyLimit] = useState(25);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);

  function handleConnect() {
    if (!username || !cookies) return;
    setStep('compose');
  }

  function handleSend() {
    if (!message) return;
    setSending(true);
    setStep('sending');
    const interval = setInterval(() => {
      setSent(prev => {
        if (prev >= dailyLimit) {
          clearInterval(interval);
          setSending(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
  }

  if (step === 'landing') {
    return <LandingPage onGetStarted={() => setStep('connect')} />;
  }

  return (
    <div className="min-h-screen relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/[0.07] blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-pink-600/[0.05] blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-orange-500/[0.04] blur-[80px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">Reach</span>
          </div>
          <div className="flex items-center gap-2">
            {['Connect', 'Compose', 'Send'].map((label, i) => {
              const stepIndex = ['connect', 'compose', 'sending'].indexOf(step);
              const isActive = i <= stepIndex;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white/5 text-zinc-600 border border-white/10'}`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-white' : 'text-zinc-600'}`}>{label}</span>
                  {i < 2 && <div className={`w-8 h-px ${isActive ? 'bg-purple-500/50' : 'bg-white/5'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Connect */}
        {step === 'connect' && (
          <div className="stagger space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Connect your Instagram</h1>
              <p className="text-zinc-500 mt-2 text-sm leading-relaxed">We use your browser cookies to send DMs as you. Your credentials never leave your device.</p>
            </div>
            <div className="glass rounded-2xl p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Instagram Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">@</span>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="yourhandle" className="w-full pl-9 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-700 transition-all hover:border-white/[0.12]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Session Cookies</label>
                <textarea value={cookies} onChange={e => setCookies(e.target.value)} placeholder='Paste your Instagram cookies JSON here...' rows={5} className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-700 font-mono transition-all hover:border-white/[0.12] resize-none" />
                <p className="text-[11px] text-zinc-600 mt-2">DevTools &rarr; Application &rarr; Cookies &rarr; instagram.com &rarr; Copy all as JSON</p>
              </div>
              <button onClick={handleConnect} disabled={!username || !cookies} className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white btn-lift disabled:opacity-30 disabled:cursor-not-allowed">
                Connect Account
              </button>
            </div>
          </div>
        )}

        {/* Compose */}
        {step === 'compose' && (
          <div className="stagger space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Compose your message</h1>
              <p className="text-zinc-500 mt-2 text-sm">This DM will be sent to your engaged followers.</p>
            </div>
            <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
              <div>
                <p className="text-sm font-semibold">@{username}</p>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected</p>
              </div>
            </div>
            <div className="glass rounded-2xl p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">DM Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hey! Thanks for the love on my recent post. I'm opening up a few coaching spots this month..." rows={5} className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-700 transition-all hover:border-white/[0.12] resize-none leading-relaxed" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-zinc-600">{message.length} characters</p>
                  <p className="text-[11px] text-zinc-600">Keep under 500 for best results</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Daily Limit</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={5} max={50} value={dailyLimit} onChange={e => setDailyLimit(parseInt(e.target.value))} className="flex-1 accent-purple-500" />
                  <span className="text-2xl font-bold gradient-text w-12 text-right">{dailyLimit}</span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-1">DMs per day. Start low and increase gradually.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Preview</label>
                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.04]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex-shrink-0" />
                    <div className="bg-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                      <p className="text-[13px] text-zinc-200 leading-relaxed">{message || 'Your message will appear here...'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={handleSend} disabled={!message} className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white btn-lift disabled:opacity-30 disabled:cursor-not-allowed">
                Start Sending DMs
              </button>
            </div>
          </div>
        )}

        {/* Sending */}
        {step === 'sending' && (
          <div className="stagger space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">Sending DMs</h1>
              <p className="text-zinc-500 mt-2 text-sm">Reaching out with human-like timing</p>
            </div>
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="url(#pg)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(sent / dailyLimit) * 264} 264`} className="transition-all duration-1000" />
                  <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#a855f7" /><stop offset="50%" stopColor="#ec4899" /><stop offset="100%" stopColor="#f97316" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold gradient-text">{sent}</span>
                  <span className="text-xs text-zinc-500 mt-1">of {dailyLimit}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{ l: 'Sent', v: sent, c: 'text-emerald-400' }, { l: 'Remaining', v: dailyLimit - sent, c: 'text-purple-400' }, { l: 'Est. Time', v: `${Math.max(0, (dailyLimit - sent) * 3)}m`, c: 'text-zinc-300' }].map(s => (
                <div key={s.l} className="glass rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-1">{s.l}</p>
                </div>
              ))}
            </div>
            {sending && (
              <button onClick={() => setSending(false)} className="w-full py-3 rounded-xl font-medium text-sm bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                Pause Sending
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full bg-purple-600/[0.08] blur-[150px] animate-float" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-pink-600/[0.06] blur-[130px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-orange-500/[0.04] blur-[100px] animate-pulse-glow" />
        <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] opacity-[0.04]">
          <div className="absolute inset-0 rounded-full border border-purple-400 animate-orbit" />
          <div className="absolute inset-[80px] rounded-full border border-pink-400 animate-orbit-reverse" />
          <div className="absolute inset-[160px] rounded-full border border-orange-400 animate-orbit" style={{ animationDuration: '30s' }} />
        </div>
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative z-10">
        <nav className="flex items-center justify-between px-8 py-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </div>
            <span className="text-xl font-bold tracking-tight">Reach</span>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-8 pt-24 pb-20 text-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-400 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Now in private beta
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.95]">
              Turn followers<br />into <span className="gradient-text">clients</span>
            </h1>
            <p className="text-lg text-zinc-500 mt-6 max-w-lg mx-auto leading-relaxed">
              Automatically DM your most engaged followers with personalized messages. Built for coaches, creators, and agencies.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <button onClick={onGetStarted} className="px-8 py-4 rounded-2xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white btn-lift shadow-lg shadow-purple-500/20">
                Get Started Free
              </button>
              <button className="px-8 py-4 rounded-2xl font-medium text-sm bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all">
                See how it works
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-20 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {[{ v: '80%+', l: 'DM open rate' }, { v: '3-5min', l: 'Between sends' }, { v: '$0', l: 'Per month' }].map(s => (
              <div key={s.l} className="glass rounded-2xl p-5">
                <p className="text-2xl font-bold gradient-text">{s.v}</p>
                <p className="text-[11px] text-zinc-600 uppercase tracking-wider mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
            {[
              { icon: '\u{1F3AF}', title: 'Engagement-Based', desc: 'DM people who liked or commented on your posts. The warmest leads possible.' },
              { icon: '\u{1F916}', title: 'Human-Like Sending', desc: "Types character by character with natural delays. Instagram can't tell the difference." },
              { icon: '\u{1F4CA}', title: 'Smart Limits', desc: 'Automatic rate limiting, daily caps, and scheduling. Your account stays safe.' },
            ].map(f => (
              <div key={f.title} className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-300">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
