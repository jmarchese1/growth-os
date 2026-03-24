'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { EmbedoCubeMascot } from './embedo-cube-mascot';
import { PLAN_LIMITS, TIERS } from '../../app/(dashboard)/billing/billing-data';
import type { TierKey } from '../../app/(dashboard)/billing/billing-data';

interface BusinessData {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  elevenLabsAgentId: string | null;
  twilioPhoneNumber: string | null;
  settings: Record<string, unknown> | null;
  counts: { contacts: number; callLogs: number; chatSessions: number; appointments: number; leads: number };
}

interface Props {
  business: BusinessData;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = ['Welcome', 'Plan', 'Hours', 'Quick Setup', 'Launch'] as const;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

// Mascot speech bubbles per step
const MASCOT_LINES: Record<number, string> = {
  0: "Hey there! I'm Cubey, your setup buddy. Let's get you up and running!",
  1: 'Pick a plan to unlock all the AI tools. Every paid plan starts with a 14-day free trial!',
  2: "When are you open? Your AI agents will use this to know when to take calls.",
  3: "Describe your dream setup and I'll build everything for you in seconds!",
  4: "Amazing! You're all set. Your AI-powered business is live!",
};

// ── Sound effects (Web Audio API — no external files) ─────────────────────
function playSfx(type: 'advance' | 'back' | 'toggle' | 'success' | 'celebrate') {
  try {
    const ctx = new AudioContext();
    const g = ctx.createGain();
    g.connect(ctx.destination);

    if (type === 'advance') {
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
      o.connect(g);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.25);
    } else if (type === 'back') {
      g.gain.setValueAtTime(0.04, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.15);
      o.connect(g);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.2);
    } else if (type === 'toggle') {
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(700, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.06);
      o.connect(g);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.12);
    } else if (type === 'success') {
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(660, ctx.currentTime);
      o1.connect(g);
      o1.start(ctx.currentTime);
      o1.stop(ctx.currentTime + 0.2);
      const g2 = ctx.createGain();
      g2.connect(ctx.destination);
      g2.gain.setValueAtTime(0.07, ctx.currentTime + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      o2.connect(g2);
      o2.start(ctx.currentTime + 0.15);
      o2.stop(ctx.currentTime + 0.6);
    } else if (type === 'celebrate') {
      [0, 0.12, 0.24].forEach((delay, i) => {
        const freq = [523, 659, 784][i]!;
        const gn = ctx.createGain();
        gn.connect(ctx.destination);
        gn.gain.setValueAtTime(0.06, ctx.currentTime + delay);
        gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        osc.connect(gn);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
    }
  } catch { /* audio not available */ }
}

// ── Recommended tiers for the plan step (skip FREE — it's the default fallback) ──
const PLAN_OPTIONS: TierKey[] = ['SOLO', 'SMALL', 'MEDIUM'];

export function OnboardingWizard({ business, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => playSfx('success'), 300);
  }, []);

  // ── Subscription state ──
  const [planTier, setPlanTier] = useState<TierKey>('FREE');
  const [checkingPlan, setCheckingPlan] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/subscription?businessId=${business.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.subscription?.pricingTier) {
          const tier = data.subscription.pricingTier as TierKey;
          setPlanTier(tier);
          return tier;
        }
      }
    } catch { /* default FREE */ }
    return 'FREE' as TierKey;
  }, [business.id]);

  useEffect(() => { void fetchPlan(); }, [fetchPlan]);

  // Stop polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startCheckout = async (tier: TierKey) => {
    setCheckingPlan(true);
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          tier,
          successUrl: window.location.href,
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        // Poll for subscription change every 3s
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          const newTier = await fetchPlan();
          if (newTier !== 'FREE') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setCheckingPlan(false);
            playSfx('success');
          }
        }, 3000);
        // Stop polling after 5 minutes
        setTimeout(() => {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setCheckingPlan(false);
          }
        }, 5 * 60 * 1000);
      }
    } catch {
      setCheckingPlan(false);
    }
  };

  // ── Plan limits ──
  const websiteLimit = PLAN_LIMITS[planTier].websites;
  const canGenerateWebsite = websiteLimit > 0;
  const voiceAgentLimit = PLAN_LIMITS[planTier].voiceAgents;
  const canProvisionVoice = voiceAgentLimit > 0;

  // ── Hours state ──
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(() => {
    const saved = (business.settings as Record<string, unknown> | null)?.['hours'] as Record<string, { open: string; close: string }> | undefined;
    const result: Record<string, { open: string; close: string; closed: boolean }> = {};
    for (const day of DAYS) {
      const d = day.toLowerCase();
      if (saved?.[d]) {
        result[d] = { open: saved[d].open, close: saved[d].close, closed: false };
      } else {
        result[d] = { open: '09:00', close: '21:00', closed: day === 'Sunday' };
      }
    }
    return result;
  });

  // ── Quick Setup state ──
  const [dreamPrompt, setDreamPrompt] = useState('');
  const [setupStatus, setSetupStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [setupProgress, setSetupProgress] = useState<{
    website: 'pending' | 'running' | 'done' | 'error' | 'skipped';
    chatbot: 'pending' | 'running' | 'done' | 'error' | 'skipped';
    voice: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  }>({
    website: business.settings?.['onboardingComplete'] ? 'skipped' : 'pending',
    chatbot: business.settings?.['chatbotEnabled'] ? 'done' : 'pending',
    voice: business.elevenLabsAgentId ? 'done' : 'pending',
  });

  // ── Confetti ──
  const [showConfetti, setShowConfetti] = useState(false);

  const saveHours = useCallback(async () => {
    const hoursData: Record<string, { open: string; close: string }> = {};
    for (const day of DAYS) {
      const d = day.toLowerCase();
      const h = hours[d];
      if (h && !h.closed) {
        hoursData[d] = { open: h.open, close: h.close };
      }
    }
    await fetch(`${API_BASE}/businesses/${business.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...((business.settings as Record<string, unknown>) ?? {}), hours: hoursData } }),
    });
  }, [hours, business.id, business.settings]);

  // ── Quick Setup: run everything in parallel ──
  async function runQuickSetup() {
    setSetupStatus('running');

    const promises: Promise<void>[] = [];

    // 1. Website generation
    if (canGenerateWebsite && setupProgress.website === 'pending') {
      setSetupProgress(prev => ({ ...prev, website: 'running' }));
      promises.push(
        (async () => {
          try {
            // Save dream prompt to settings
            await fetch(`${API_BASE}/businesses/${business.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                settings: {
                  ...((business.settings as Record<string, unknown>) ?? {}),
                  description: dreamPrompt || undefined,
                },
              }),
            });
            const res = await fetch(`${API_BASE}/websites/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId: business.id,
                businessName: business.name,
                dreamPrompt: dreamPrompt || `A professional website for ${business.name}`,
                colorScheme: 'midnight',
                fontPairing: 'modern',
                chatbotEnabled: true,
                chatbotBusinessId: business.id,
              }),
            });
            if (!res.ok) throw new Error('Website generation failed');
            setSetupProgress(prev => ({ ...prev, website: 'done' }));
          } catch {
            setSetupProgress(prev => ({ ...prev, website: 'error' }));
          }
        })()
      );
    } else if (!canGenerateWebsite) {
      setSetupProgress(prev => ({ ...prev, website: 'skipped' }));
    }

    // 2. Chatbot enable
    if (setupProgress.chatbot === 'pending') {
      setSetupProgress(prev => ({ ...prev, chatbot: 'running' }));
      promises.push(
        (async () => {
          try {
            const res = await fetch(`${API_BASE}/chatbot/enable`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId: business.id }),
            });
            if (!res.ok) throw new Error('Chatbot enable failed');
            setSetupProgress(prev => ({ ...prev, chatbot: 'done' }));
          } catch {
            setSetupProgress(prev => ({ ...prev, chatbot: 'error' }));
          }
        })()
      );
    }

    // 3. Voice agent provision
    if (canProvisionVoice && setupProgress.voice === 'pending') {
      setSetupProgress(prev => ({ ...prev, voice: 'running' }));
      promises.push(
        (async () => {
          try {
            // Save persona first
            await fetch(`${API_BASE}/businesses/${business.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                settings: {
                  ...((business.settings as Record<string, unknown>) ?? {}),
                  chatbotPersona: 'friendly',
                },
              }),
            });
            const res = await fetch(`${API_BASE}/voice-agent/provision`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId: business.id }),
            });
            if (!res.ok) throw new Error('Voice provision failed');
            // Set greeting
            await fetch(`${API_BASE}/voice-agent/prompt/${business.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firstMessage: `Hi, thanks for calling ${business.name}! How can I help you today?` }),
            }).catch(() => {});
            setSetupProgress(prev => ({ ...prev, voice: 'done' }));
          } catch {
            setSetupProgress(prev => ({ ...prev, voice: 'error' }));
          }
        })()
      );
    } else if (!canProvisionVoice) {
      setSetupProgress(prev => ({ ...prev, voice: 'skipped' }));
    }

    await Promise.allSettled(promises);
    setSetupStatus('done');
    playSfx('success');
  }

  async function completeOnboarding() {
    setSaving(true);
    try {
      await saveHours();
      await fetch(`${API_BASE}/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...((business.settings as Record<string, unknown>) ?? {}),
            onboardingComplete: true,
            enabledTools: ['voice', 'chatbot', 'website', 'qrcodes'],
          },
        }),
      });
      setShowConfetti(true);
      setTimeout(() => onComplete(), 1500);
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step === STEPS.length - 1) {
      playSfx('celebrate');
      void completeOnboarding();
    } else {
      playSfx('advance');
      if (step === 2) void saveHours();
      setStep(step + 1);
    }
  }

  function back() {
    if (step > 0) {
      playSfx('back');
      setStep(step - 1);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  if (!mounted || typeof document === 'undefined') return null;

  const mascotMood = (
    step === 0 ? 'waving' :
    step === 1 ? 'excited' :
    step === 2 ? 'happy' :
    step === 3 ? 'thinking' :
    'excited'
  ) as 'happy' | 'thinking' | 'excited' | 'waving' | 'surprised';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0a18]/90 backdrop-blur-md p-4">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-violet-700/8 blur-[110px] animate-float-orb" />
        <div className="absolute top-2/3 -right-20 w-[420px] h-[420px] rounded-full bg-indigo-600/6 blur-[100px] animate-float-orb-b" />
      </div>

      {showConfetti && <ConfettiOverlay />}

      <div className="relative z-10 w-full max-w-2xl animate-fade-up">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`text-[10px] font-medium transition-colors ${
                  i <= step ? 'text-violet-400' : 'text-slate-600'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
          {/* Mascot + speech bubble header */}
          <div className="px-8 pt-6 pb-2 flex items-start gap-4">
            <EmbedoCubeMascot size={56} mood={mascotMood} bounce={step !== 3 || setupStatus !== 'running'} />
            <div className="flex-1 min-w-0">
              <div className="relative bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-sm text-slate-300 leading-relaxed">{MASCOT_LINES[step]}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-5 min-h-[320px] max-h-[55vh] overflow-y-auto">
            <div key={step} className="animate-step-slide-in">

              {/* ── Step 0: Welcome ── */}
              {step === 0 && (
                <div className="text-center py-4">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome, {business.name}!
                  </h2>
                  <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed mb-8">
                    We&apos;ll set up your AI-powered business tools in about 2 minutes.
                    By the end, you&apos;ll have a website, phone agent, and chatbot ready to go.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: <RocketIcon />, label: 'AI Website', desc: 'Built in seconds' },
                      { icon: <PhoneIcon />, label: 'Phone Agent', desc: 'Answers 24/7' },
                      { icon: <ChatIcon />, label: 'Chat Widget', desc: 'Instant support' },
                    ].map((item) => (
                      <div key={item.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-violet-400">
                          {item.icon}
                        </div>
                        <p className="text-xs font-semibold text-white">{item.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 1: Choose Plan ── */}
              {step === 1 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Choose Your Plan</h2>
                  <p className="text-sm text-slate-500 mb-4">
                    Every paid plan includes a 14-day free trial. Cancel anytime.
                  </p>

                  {/* Current plan badge */}
                  {planTier !== 'FREE' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 flex-shrink-0">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">You&apos;re on the {TIERS[planTier].name} plan!</p>
                        <p className="text-[11px] text-slate-400">All features unlocked. Continue to set everything up.</p>
                      </div>
                    </div>
                  )}

                  {checkingPlan && planTier === 'FREE' && (
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <p className="text-xs text-violet-400">Waiting for subscription... Complete checkout in the new tab.</p>
                    </div>
                  )}

                  {/* Plan cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {PLAN_OPTIONS.map((tier) => {
                      const info = TIERS[tier];
                      const isActive = planTier === tier;
                      return (
                        <div
                          key={tier}
                          className={`relative rounded-xl border-2 p-4 transition-all ${
                            isActive
                              ? 'border-emerald-500/50 bg-emerald-500/5'
                              : info.popular
                                ? 'border-violet-500/40 bg-violet-500/5'
                                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
                          }`}
                        >
                          {info.popular && !isActive && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-violet-500 text-[9px] font-bold text-white">
                              POPULAR
                            </div>
                          )}
                          <p className="text-sm font-bold text-white">{info.name}</p>
                          <div className="flex items-baseline gap-0.5 mt-1 mb-3">
                            <span className="text-2xl font-bold text-white">${info.price}</span>
                            <span className="text-[10px] text-slate-500">/mo</span>
                          </div>
                          <ul className="space-y-1.5 mb-4">
                            {info.highlights.slice(0, 4).map((h) => (
                              <li key={h} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {h}
                              </li>
                            ))}
                          </ul>
                          {isActive ? (
                            <div className="w-full py-2 text-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-lg">
                              Active
                            </div>
                          ) : (
                            <button
                              onClick={() => void startCheckout(tier)}
                              disabled={checkingPlan}
                              className="w-full py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Start Free Trial
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Continue free option */}
                  {planTier === 'FREE' && !checkingPlan && (
                    <p className="text-center text-[11px] text-slate-600 mt-4">
                      Or <button onClick={next} className="text-violet-400 hover:text-violet-300 underline">continue with the Free plan</button> — you can upgrade anytime from Settings.
                    </p>
                  )}

                  {/* Compare link */}
                  <div className="text-center mt-3">
                    <Link href="/billing/compare" onClick={onClose} className="text-[10px] text-slate-600 hover:text-slate-400 underline">
                      Compare all plans & features
                    </Link>
                  </div>
                </div>
              )}

              {/* ── Step 2: Business Hours ── */}
              {step === 2 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Business Hours</h2>
                  <p className="text-sm text-slate-500 mb-4">Your AI agents use these to know when you&apos;re open.</p>
                  <div className="space-y-1.5">
                    {DAYS.map((day) => {
                      const d = day.toLowerCase();
                      const h = hours[d]!;
                      return (
                        <div key={day} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                          h.closed
                            ? 'bg-white/[0.02] border-white/[0.04]'
                            : 'bg-white/[0.04] border-white/[0.08]'
                        }`}>
                          <span className="text-sm font-medium text-slate-300 w-24">{day}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!h.closed}
                              onChange={() => setHours({ ...hours, [d]: { ...h, closed: !h.closed } })}
                              className="w-4 h-4 rounded border-slate-600 bg-white/[0.06] text-violet-500 focus:ring-violet-500/30"
                            />
                            <span className={`text-xs ${h.closed ? 'text-slate-600' : 'text-slate-400'}`}>
                              {h.closed ? 'Closed' : 'Open'}
                            </span>
                          </label>
                          {!h.closed && (
                            <div className="flex items-center gap-2 ml-auto">
                              <input
                                type="time"
                                value={h.open}
                                onChange={(e) => setHours({ ...hours, [d]: { ...h, open: e.target.value } })}
                                className="px-2 py-1 bg-white/[0.06] border border-white/[0.08] rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                              />
                              <span className="text-xs text-slate-600">to</span>
                              <input
                                type="time"
                                value={h.close}
                                onChange={(e) => setHours({ ...hours, [d]: { ...h, close: e.target.value } })}
                                className="px-2 py-1 bg-white/[0.06] border border-white/[0.08] rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 3: Quick Setup ── */}
              {step === 3 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Quick Setup</h2>
                  <p className="text-sm text-slate-500 mb-5">
                    Tell me what you want and I&apos;ll set up your website, chatbot, and phone agent all at once.
                  </p>

                  {setupStatus === 'idle' && (
                    <div className="space-y-5">
                      {/* Dream website prompt */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Describe your dream setup
                        </label>
                        <textarea
                          value={dreamPrompt}
                          onChange={(e) => setDreamPrompt(e.target.value)}
                          placeholder={`A sleek, modern website for ${business.name} with online ordering, a reservation system, and a friendly AI chatbot that knows our full menu...`}
                          rows={4}
                          className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none leading-relaxed"
                        />
                        <p className="text-[10px] text-slate-600 mt-1.5">
                          Or leave blank for a great default setup. You can customize everything later.
                        </p>
                      </div>

                      {/* What will be set up */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">What we&apos;ll set up</p>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { label: 'AI Website', desc: canGenerateWebsite ? 'Generated from your description' : 'Requires paid plan', icon: <GlobeIcon />, active: canGenerateWebsite, color: 'from-violet-500/20 to-purple-500/20' },
                            { label: 'AI Chatbot', desc: 'Answers questions on your website & social', icon: <ChatIcon />, active: true, color: 'from-sky-500/20 to-blue-500/20' },
                            { label: 'AI Phone Agent', desc: canProvisionVoice ? 'Takes calls, orders & reservations' : 'Requires paid plan', icon: <PhoneIcon />, active: canProvisionVoice, color: 'from-amber-500/20 to-orange-500/20' },
                          ].map((item) => (
                            <div key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                              item.active
                                ? 'bg-white/[0.04] border-white/[0.08]'
                                : 'bg-white/[0.02] border-white/[0.04] opacity-50'
                            }`}>
                              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white`}>
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{item.label}</p>
                                <p className="text-[10px] text-slate-500">{item.desc}</p>
                              </div>
                              {item.active ? (
                                <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                                  <CheckIcon />
                                </div>
                              ) : (
                                <Link href="/billing" onClick={onClose} className="text-[10px] text-violet-400 hover:text-violet-300 underline flex-shrink-0">
                                  Upgrade
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Launch button */}
                      <div className="text-center pt-2">
                        <button
                          onClick={() => void runQuickSetup()}
                          className="px-10 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-600/25"
                        >
                          Set It All Up
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Running state */}
                  {setupStatus === 'running' && (
                    <div className="space-y-3 py-2">
                      <SetupItem label="AI Website" status={setupProgress.website} />
                      <SetupItem label="AI Chatbot" status={setupProgress.chatbot} />
                      <SetupItem label="AI Phone Agent" status={setupProgress.voice} />
                      <p className="text-[10px] text-slate-600 text-center pt-2">
                        This may take up to a minute. You can continue to the next step while it finishes.
                      </p>
                    </div>
                  )}

                  {/* Done state */}
                  {setupStatus === 'done' && (
                    <div className="space-y-3 py-2">
                      <SetupItem label="AI Website" status={setupProgress.website} />
                      <SetupItem label="AI Chatbot" status={setupProgress.chatbot} />
                      <SetupItem label="AI Phone Agent" status={setupProgress.voice} />
                      <div className="text-center pt-3">
                        <p className="text-sm text-emerald-400 font-semibold">Setup complete!</p>
                        <p className="text-[10px] text-slate-500 mt-1">Customize everything from your dashboard. Click Continue to finish.</p>
                      </div>
                    </div>
                  )}

                  {setupStatus === 'error' && (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-400 mb-2">Something went wrong during setup.</p>
                      <button onClick={() => setSetupStatus('idle')} className="text-xs text-violet-400 hover:text-violet-300 underline">
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Launch ── */}
              {step === 4 && (
                <div className="text-center py-4">
                  <EmbedoCubeMascot size={72} mood="excited" className="mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">You&apos;re Ready to Launch!</h2>
                  <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                    Your AI-powered business tools are configured. Here are your next steps:
                  </p>
                  <div className="space-y-2 max-w-md mx-auto text-left">
                    {[
                      { href: '/website', label: 'Customize your website', desc: 'Edit content, add images, connect domain', icon: <GlobeIcon />, done: setupProgress.website === 'done' },
                      { href: '/voice-agent', label: 'Fine-tune Phone Agent', desc: 'Adjust voice, personality, and responses', icon: <PhoneIcon />, done: setupProgress.voice === 'done' },
                      { href: '/chatbot', label: 'Configure Chat Widget', desc: 'Customize colors, embed on your site', icon: <ChatIcon />, done: setupProgress.chatbot === 'done' },
                      { href: '/tools', label: 'Configure Tool Library', desc: 'Set up menus, waitlist, gift cards & more', icon: <ToolIcon />, done: false },
                      { href: '/customers', label: 'Add your first contact', desc: 'Start building your CRM', icon: <UserIcon />, done: business.counts.contacts > 0 },
                    ].map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          action.done
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-white/[0.03] border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          action.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.06] text-slate-400'
                        }`}>
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${action.done ? 'text-emerald-400' : 'text-white'}`}>{action.label}</p>
                          <p className="text-[10px] text-slate-500">{action.desc}</p>
                        </div>
                        {action.done ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">Done</span>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-600">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Website still building notice */}
                  {setupProgress.website === 'running' && (
                    <div className="mt-4 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center gap-3 max-w-md mx-auto">
                      <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <p className="text-xs text-violet-400">Website still generating in the background...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <div>
              {step === 0 ? (
                <button onClick={onClose} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Skip setup
                </button>
              ) : (
                <button onClick={back} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                planTier === 'FREE' ? 'bg-slate-500/15 text-slate-400' :
                planTier === 'SOLO' ? 'bg-violet-500/15 text-violet-400' :
                'bg-emerald-500/15 text-emerald-400'
              }`}>
                {planTier} plan
              </span>
              <span className="text-[10px] text-slate-600">Step {step + 1} of {STEPS.length}</span>
              <button
                onClick={next}
                disabled={saving}
                className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-violet-600/20"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {step === STEPS.length - 1 ? (saving ? 'Finishing...' : 'Go to Dashboard') : 'Continue'}
                {step < STEPS.length - 1 && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Setup progress item ──
function SetupItem({ label, status }: { label: string; status: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
      status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20' :
      status === 'running' ? 'bg-violet-500/5 border-violet-500/20' :
      status === 'error' ? 'bg-red-500/5 border-red-500/20' :
      'bg-white/[0.02] border-white/[0.06]'
    }`}>
      {status === 'running' && (
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {status === 'done' && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 flex-shrink-0">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {status === 'error' && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400 flex-shrink-0">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      {status === 'skipped' && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-500 flex-shrink-0">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
        </svg>
      )}
      {status === 'pending' && (
        <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex-shrink-0" />
      )}
      <span className={`text-sm font-medium ${
        status === 'done' ? 'text-emerald-400' :
        status === 'running' ? 'text-violet-400' :
        status === 'error' ? 'text-red-400' :
        'text-slate-400'
      }`}>
        {label}
        {status === 'running' && <span className="text-[10px] ml-1.5 font-normal">Setting up...</span>}
        {status === 'done' && <span className="text-[10px] ml-1.5 font-normal">Ready!</span>}
        {status === 'error' && <span className="text-[10px] ml-1.5 font-normal">Failed — set up later from dashboard</span>}
        {status === 'skipped' && <span className="text-[10px] ml-1.5 font-normal">Requires paid plan</span>}
      </span>
    </div>
  );
}

// ── Confetti overlay ──
function ConfettiOverlay() {
  const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}px`,
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            backgroundColor: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${Math.random() * 1}s`,
            animationDuration: `${1 + Math.random() * 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── SVG Icons ──
function PhoneIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>;
}
function ChatIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>;
}
function GlobeIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" /></svg>;
}
function ToolIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>;
}
function RocketIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 9.132l1.254-.716a1 1 0 11.992 1.736L11 10.868V12a1 1 0 11-2 0v-1.132l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.132l1.254.716a1 1 0 11-.992 1.736l-1.734-.992A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.528.882l-1.734.992a1 1 0 11-.992-1.736L16 13.132V12a1 1 0 011-1zm-7.253 3.293a1 1 0 01.992 0l1.734.992a1 1 0 11-.992 1.736L10 16.152l-1.481.87a1 1 0 11-.992-1.736l1.734-.992z" clipRule="evenodd" /></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
}
