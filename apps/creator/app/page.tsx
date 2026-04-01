'use client';

import { useState } from 'react';

type View = 'home' | 'connect' | 'compose' | 'live';

export default function Page() {
  const [view, setView] = useState<View>('home');
  const [username, setUsername] = useState('');
  const [cookies, setCookies] = useState('');
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(20);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);

  if (view === 'home') return <Home onStart={() => setView('connect')} />;

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(225,48,108,0.08)_0%,_transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 pt-8 pb-20">
        {/* Nav */}
        <nav className="flex items-center justify-between mb-16 animate-fade-up">
          <button onClick={() => setView('home')} className="text-[15px] font-semibold text-white tracking-tight hover:opacity-70 transition-opacity">
            reach<span className="text-[#E1306C]">.</span>
          </button>
          <div className="flex items-center gap-1">
            {['Connect', 'Compose', 'Send'].map((s, i) => {
              const idx = ['connect', 'compose', 'live'].indexOf(view);
              return (
                <div key={s} className="flex items-center">
                  <div className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${i <= idx ? 'bg-[#E1306C]' : 'bg-zinc-800'}`} />
                  {i < 2 && <div className={`w-6 h-px mx-1 transition-all duration-500 ${i < idx ? 'bg-[#E1306C]/40' : 'bg-zinc-800/50'}`} />}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Connect */}
        {view === 'connect' && (
          <div className="space-y-8">
            <div className="animate-fade-up">
              <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">Connect your account</h1>
              <p className="text-sm text-zinc-500 mt-2">Paste your Instagram session cookies to get started.</p>
            </div>

            <div className="space-y-4 animate-fade-up delay-100">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2">Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="yourhandle"
                  className="w-full px-4 py-3 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-xl text-[14px] text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#E1306C]/50 focus:ring-1 focus:ring-[#E1306C]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2">Session cookies</label>
                <textarea
                  value={cookies}
                  onChange={e => setCookies(e.target.value)}
                  placeholder='Paste JSON from DevTools...'
                  rows={4}
                  className="w-full px-4 py-3 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-xl text-[13px] text-white placeholder:text-zinc-700 font-mono focus:outline-none focus:border-[#E1306C]/50 focus:ring-1 focus:ring-[#E1306C]/20 transition-all resize-none"
                />
              </div>
              <button
                onClick={() => { if (username && cookies) setView('compose'); }}
                disabled={!username || !cookies}
                className="w-full py-3 rounded-xl text-[14px] font-medium bg-white text-black hover:bg-zinc-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Compose */}
        {view === 'compose' && (
          <div className="space-y-8">
            <div className="animate-fade-up">
              <h1 className="text-[28px] font-semibold text-white tracking-tight">Write your message</h1>
              <p className="text-sm text-zinc-500 mt-2">Keep it short. Personal messages convert best.</p>
            </div>

            {/* Account badge */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] animate-fade-up delay-100">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]" />
              <div>
                <p className="text-[13px] font-medium text-white">@{username}</p>
                <p className="text-[11px] text-emerald-500">Connected</p>
              </div>
            </div>

            <div className="space-y-5 animate-fade-up delay-200">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Hey! Thanks for following along. I just opened up a few coaching spots — interested in hearing more?"
                  rows={4}
                  className="w-full px-4 py-3 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-xl text-[14px] text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#E1306C]/50 focus:ring-1 focus:ring-[#E1306C]/20 transition-all resize-none leading-relaxed"
                />
                <p className="text-[11px] text-zinc-700 mt-1.5 text-right">{message.length} / 500</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-500">Daily limit</label>
                  <span className="text-[13px] font-semibold text-white tabular-nums">{limit}</span>
                </div>
                <input
                  type="range" min={5} max={50} step={5} value={limit}
                  onChange={e => setLimit(parseInt(e.target.value))}
                  className="w-full h-1 appearance-none bg-zinc-800 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(225,48,108,0.3)]"
                />
              </div>

              {/* Preview */}
              {message && (
                <div className="p-4 bg-[#0c0c0e] rounded-xl border border-[rgba(255,255,255,0.04)]">
                  <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Preview</p>
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex-shrink-0 mt-0.5" />
                    <div className="bg-zinc-800/50 rounded-2xl rounded-tl-md px-3.5 py-2.5">
                      <p className="text-[13px] text-zinc-300 leading-relaxed">{message}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setSending(true); setView('live'); const i = setInterval(() => setSent(p => { if (p >= limit) { clearInterval(i); setSending(false); return p; } return p + 1; }), 2500); }}
                disabled={!message}
                className="w-full py-3 rounded-xl text-[14px] font-medium bg-white text-black hover:bg-zinc-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                Start sending
              </button>
            </div>
          </div>
        )}

        {/* Live */}
        {view === 'live' && (
          <div className="space-y-10">
            <div className="text-center animate-fade-up">
              <h1 className="text-[28px] font-semibold text-white tracking-tight">
                {sending ? 'Sending...' : 'Complete'}
              </h1>
              <p className="text-sm text-zinc-500 mt-2">
                {sending ? 'DMs are going out with natural timing' : `Reached ${sent} followers`}
              </p>
            </div>

            {/* Ring */}
            <div className="flex justify-center animate-fade-up delay-100">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a1e" strokeWidth="2" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="url(#ring-g)" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray={`${(sent / limit) * 264} 264`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="ring-g" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#E1306C" />
                      <stop offset="100%" stopColor="#F77737" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold text-white tabular-nums">{sent}</span>
                  <span className="text-[11px] text-zinc-600">of {limit}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 animate-fade-up delay-200">
              {[
                { label: 'Sent', value: sent, color: 'text-emerald-400' },
                { label: 'Queue', value: Math.max(0, limit - sent), color: 'text-zinc-300' },
                { label: 'Rate', value: '~3m', color: 'text-zinc-500' },
              ].map(s => (
                <div key={s.label} className="text-center py-4 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <p className={`text-lg font-semibold tabular-nums ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {sending && (
              <button onClick={() => setSending(false)} className="w-full py-3 rounded-xl text-[14px] font-medium bg-[#111113] border border-[rgba(255,255,255,0.08)] text-zinc-400 hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all">
                Pause
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Home / Landing ──────────────────────────────── */
function Home({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-[#09090b] overflow-hidden">
      {/* Top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(225,48,108,0.07)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(131,58,180,0.05)_0%,_transparent_50%)]" style={{ transform: 'translateX(-200px)' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(247,119,55,0.04)_0%,_transparent_50%)]" style={{ transform: 'translateX(200px)' }} />
      </div>

      {/* Grid lines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px)',
        backgroundSize: '1px 80px',
        backgroundPosition: 'center',
        maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
      }} />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between max-w-5xl mx-auto px-6 py-5 animate-fade-up">
          <span className="text-[15px] font-semibold text-white tracking-tight">
            reach<span className="text-[#E1306C]">.</span>
          </span>
          <button onClick={onStart} className="px-4 py-2 text-[13px] font-medium text-white bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] transition-all">
            Get started
          </button>
        </nav>

        {/* Hero */}
        <div className="max-w-3xl mx-auto px-6 pt-28 sm:pt-36 text-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-zinc-500 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Now in beta
            </div>
          </div>

          <h1 className="text-[clamp(36px,6vw,64px)] font-semibold text-white tracking-[-0.03em] leading-[1.1] animate-fade-up delay-100">
            Turn followers into<br />
            <span className="gradient-text">clients, automatically</span>
          </h1>

          <p className="text-[16px] sm:text-[18px] text-zinc-500 mt-5 max-w-md mx-auto leading-relaxed animate-fade-up delay-200">
            DM your most engaged followers on autopilot.<br className="hidden sm:block" />
            Built for coaches, creators, and agencies.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8 animate-fade-up delay-300">
            <button onClick={onStart} className="px-6 py-3 text-[14px] font-medium bg-white text-black rounded-xl hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Start for free
            </button>
            <button className="px-6 py-3 text-[14px] font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:text-white hover:bg-white/[0.08] transition-all">
              How it works
            </button>
          </div>
        </div>

        {/* Product mock */}
        <div className="max-w-2xl mx-auto px-6 mt-20 animate-fade-up delay-400">
          <div className="gradient-border rounded-2xl p-6 bg-[#0c0c0e]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <span className="ml-3 text-[11px] text-zinc-700 font-mono">reach / sending</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#833AB4] to-[#E1306C] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white font-medium">@fitness_coach_mike</p>
                  <p className="text-[11px] text-zinc-600 truncate">Hey! Thanks for following along. I just opened up...</p>
                </div>
                <span className="text-[10px] text-emerald-500 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">Sent</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E1306C] to-[#F77737] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white font-medium">@sarah_transforms</p>
                  <p className="text-[11px] text-zinc-600 truncate">Hey! Thanks for following along. I just opened up...</p>
                </div>
                <span className="text-[10px] text-emerald-500 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">Sent</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/[0.04] opacity-50">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F77737] to-[#833AB4] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white font-medium">@jakelifts_</p>
                  <p className="text-[11px] text-zinc-600 truncate">Hey! Thanks for following along. I just opened up...</p>
                </div>
                <span className="text-[10px] text-zinc-600 font-medium px-2 py-0.5 bg-zinc-800 rounded-full">Queued</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-3xl mx-auto px-6 mt-32 mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Engagement-first', desc: 'Message people who already liked your posts. Warm leads, not cold DMs.' },
              { title: 'Undetectable', desc: 'Types like a human. Random delays between sends. No automation flags.' },
              { title: 'Set and forget', desc: 'Configure once, run daily. Smart limits keep your account safe.' },
            ].map((f, i) => (
              <div key={f.title} className={`p-5 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-all animate-fade-up`} style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                <h3 className="text-[14px] font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pb-10">
          <p className="text-[11px] text-zinc-800">Built by Embedo</p>
        </footer>
      </div>
    </div>
  );
}
