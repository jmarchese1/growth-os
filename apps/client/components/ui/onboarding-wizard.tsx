'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { EmbedoCubeMascot } from './embedo-cube-mascot';
import { PLAN_LIMITS } from '../../app/(dashboard)/billing/billing-data';
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

const STEPS = ['Welcome', 'Hours', 'Tools', 'Website', 'AI Agents', 'Launch'] as const;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

// Color scheme options for website
const COLOR_SCHEMES = [
  { id: 'midnight', label: 'Midnight', colors: ['#0f172a', '#6366f1', '#818cf8'] },
  { id: 'warm', label: 'Warm', colors: ['#451a03', '#f59e0b', '#fbbf24'] },
  { id: 'forest', label: 'Forest', colors: ['#052e16', '#22c55e', '#4ade80'] },
  { id: 'ocean', label: 'Ocean', colors: ['#0c4a6e', '#0ea5e9', '#38bdf8'] },
  { id: 'rose', label: 'Rose', colors: ['#4c0519', '#f43f5e', '#fb7185'] },
  { id: 'ivory', label: 'Ivory', colors: ['#faf5ff', '#a78bfa', '#c4b5fd'] },
  { id: 'slate', label: 'Slate', colors: ['#1e293b', '#64748b', '#94a3b8'] },
  { id: 'crimson', label: 'Crimson', colors: ['#450a0a', '#dc2626', '#ef4444'] },
  { id: 'navy', label: 'Navy', colors: ['#172554', '#3b82f6', '#60a5fa'] },
  { id: 'sage', label: 'Sage', colors: ['#1a2e05', '#84cc16', '#a3e635'] },
] as const;

// Mascot speech bubbles per step
const MASCOT_LINES: Record<number, string> = {
  0: "Hey there! I'm Cubey, your setup buddy. Let's get you up and running!",
  1: "When are you open? Your AI agents will use this to know when to take calls.",
  2: "Ooh, so many tools to pick from! Don't worry, you can change these anytime.",
  3: "Tell me about your business and I'll build you a gorgeous website!",
  4: "I love this part! Your AI agents will handle calls and chats 24/7.",
  5: "Amazing! You're all set. Your AI-powered business is live!",
};

export function OnboardingWizard({ business, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ── Subscription state ──
  const [planTier, setPlanTier] = useState<TierKey>('FREE');
  const [existingWebsiteCount, setExistingWebsiteCount] = useState(0);

  useEffect(() => {
    // Fetch subscription tier
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/billing/subscription?businessId=${business.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.subscription?.pricingTier) {
            setPlanTier(data.subscription.pricingTier as TierKey);
          }
        }
      } catch {
        // Default to FREE
      }
    })();
    // Fetch existing website count
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/businesses/${business.id}/websites`);
        if (res.ok) {
          const data = await res.json();
          setExistingWebsiteCount(Array.isArray(data.websites) ? data.websites.length : 0);
        }
      } catch {
        // Default to 0
      }
    })();
  }, [business.id]);

  const websiteLimit = PLAN_LIMITS[planTier].websites;
  const canGenerateWebsite = websiteLimit === Infinity || existingWebsiteCount < websiteLimit;
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

  // ── Tools state ──
  const [selectedTools, setSelectedTools] = useState<Set<string>>(() => {
    const tools = new Set<string>();
    if (business.elevenLabsAgentId) tools.add('voice');
    if ((business.settings as Record<string, unknown> | null)?.['chatbotEnabled']) tools.add('chatbot');
    tools.add('website');
    tools.add('qrcodes');
    return tools;
  });

  // ── Website config state ──
  const [websiteDescription, setWebsiteDescription] = useState('');
  const [websiteCuisine, setWebsiteCuisine] = useState(
    ((business.settings as Record<string, unknown> | null)?.['cuisine'] as string) ?? ''
  );
  const [websiteColorScheme, setWebsiteColorScheme] = useState('midnight');
  const [websiteStatus, setWebsiteStatus] = useState<'idle' | 'generating' | 'done' | 'error' | 'limit'>('idle');
  const [websiteError, setWebsiteError] = useState('');

  // ── AI Agent setup state ──
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'provisioning' | 'done' | 'error' | 'skipped'>(
    business.elevenLabsAgentId ? 'done' : 'idle'
  );
  const [chatbotStatus, setChatbotStatus] = useState<'idle' | 'enabling' | 'done' | 'error' | 'skipped'>(
    (business.settings as Record<string, unknown> | null)?.['chatbotEnabled'] ? 'done' : 'idle'
  );
  const [voiceAreaCode, setVoiceAreaCode] = useState('');
  const [voiceGreeting, setVoiceGreeting] = useState(
    `Hi, thanks for calling ${business.name}! How can I help you today?`
  );
  const [voicePersonality, setVoicePersonality] = useState('friendly');

  // ── Confetti ──
  const [showConfetti, setShowConfetti] = useState(false);

  function toggleTool(tool: string) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  }

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

  // ── Website generation (runs in background) ──
  async function generateWebsite() {
    if (!canGenerateWebsite) {
      setWebsiteStatus('limit');
      return;
    }
    setWebsiteStatus('generating');
    setWebsiteError('');

    // Save description + cuisine to business settings first
    try {
      await fetch(`${API_BASE}/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...((business.settings as Record<string, unknown>) ?? {}),
            cuisine: websiteCuisine || undefined,
            description: websiteDescription || undefined,
          },
        }),
      });
    } catch {
      // Non-critical — generation can still proceed
    }

    // Fire generation in background — don't await
    fetch(`${API_BASE}/websites/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id,
        description: websiteDescription || undefined,
        cuisine: websiteCuisine || undefined,
        colorScheme: websiteColorScheme,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to generate website');
      }
      setWebsiteStatus('done');
      setExistingWebsiteCount((prev) => prev + 1);
    }).catch((err) => {
      setWebsiteStatus('error');
      setWebsiteError(err instanceof Error ? err.message : 'Something went wrong');
    });

    // Auto-advance to next step after a short delay (generation continues in background)
    // Don't auto-advance — let user see the status and click Continue
  }

  // ── Voice agent provisioning ──
  async function provisionVoice() {
    if (!canProvisionVoice) return;
    setVoiceStatus('provisioning');
    try {
      // Save personality + greeting to settings first
      await fetch(`${API_BASE}/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...((business.settings as Record<string, unknown>) ?? {}),
            chatbotPersona: voicePersonality,
          },
        }),
      });

      const res = await fetch(`${API_BASE}/voice-agent/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          areaCode: voiceAreaCode || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to provision voice agent');
      }

      // Update first message if custom
      if (voiceGreeting) {
        await fetch(`${API_BASE}/voice-agent/prompt/${business.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: voiceGreeting }),
        }).catch(() => { /* non-critical */ });
      }

      setVoiceStatus('done');
    } catch {
      setVoiceStatus('error');
    }
  }

  // ── Chatbot enable ──
  async function enableChatbot() {
    setChatbotStatus('enabling');
    try {
      const res = await fetch(`${API_BASE}/chatbot/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) {
        throw new Error('Failed to enable chatbot');
      }
      setChatbotStatus('done');
    } catch {
      setChatbotStatus('error');
    }
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
            enabledTools: Array.from(selectedTools),
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
      void completeOnboarding();
    } else {
      if (step === 1) void saveHours();
      setStep(step + 1);
    }
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  if (!mounted || typeof document === 'undefined') return null;

  const tools = [
    { id: 'voice', name: 'AI Phone Agent', desc: 'Answer calls, take orders, capture leads 24/7', icon: <PhoneIcon />, color: 'from-amber-400 to-orange-500' },
    { id: 'chatbot', name: 'AI Chat Widget', desc: 'Website chat + Instagram & Facebook DMs', icon: <ChatIcon />, color: 'from-sky-400 to-blue-500' },
    { id: 'website', name: 'Business Website', desc: 'AI-generated website in 30 seconds', icon: <GlobeIcon />, color: 'from-violet-400 to-purple-500' },
    { id: 'qrcodes', name: 'QR Codes & Surveys', desc: 'Spin wheels, discounts, feedback', icon: <QrIcon />, color: 'from-emerald-400 to-teal-500' },
    { id: 'social', name: 'Social Media', desc: 'AI content generation & scheduling', icon: <SocialIcon />, color: 'from-pink-400 to-rose-500' },
    { id: 'campaigns', name: 'Email Campaigns', desc: 'Styled emails & automated sequences', icon: <MailIcon />, color: 'from-indigo-400 to-blue-600' },
  ];

  // Each step gets a distinct Cubey mood
  const mascotMood = (
    step === 0 ? 'waving' :     // Welcome — friendly wave
    step === 1 ? 'happy' :      // Hours — normal smile
    step === 2 ? 'excited' :    // Choose Tools — excited about possibilities
    step === 3 ? 'thinking' :   // Website — thoughtful while configuring
    step === 4 ? 'surprised' :  // AI Agents — surprised by the power
    'excited'                   // Launch — celebration!
  ) as 'happy' | 'thinking' | 'excited' | 'waving' | 'surprised';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0a18]/90 backdrop-blur-md p-4">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-violet-700/8 blur-[110px] animate-float-orb" />
        <div className="absolute top-2/3 -right-20 w-[420px] h-[420px] rounded-full bg-indigo-600/6 blur-[100px] animate-float-orb-b" />
      </div>

      {/* Confetti overlay */}
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
            <EmbedoCubeMascot size={56} mood={mascotMood} bounce={step !== 3 || websiteStatus !== 'generating'} />
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

              {/* ── Step 1: Business Hours ── */}
              {step === 1 && (
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

              {/* ── Step 2: Choose Tools ── */}
              {step === 2 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Choose Your Tools</h2>
                  <p className="text-sm text-slate-500 mb-4">Select what you want to use. Change anytime from the dashboard.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {tools.map((tool) => {
                      const selected = selectedTools.has(tool.id);
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => toggleTool(tool.id)}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            selected
                              ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/20'
                              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-sm`}>
                              {tool.icon}
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ml-auto ${
                              selected ? 'bg-violet-500 border-violet-500' : 'border-slate-600'
                            }`}>
                              {selected && <CheckIcon />}
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-white">{tool.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{tool.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 3: Website Configuration + Generation ── */}
              {step === 3 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Generate Your Website</h2>
                  <p className="text-sm text-slate-500 mb-4">
                    Fill in a few details and AI will build you a professional site in about 30 seconds.
                  </p>

                  {/* Plan limit check */}
                  {!canGenerateWebsite && websiteLimit === 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                      <p className="text-xs text-amber-400 font-medium mb-1">Website not available on Free plan</p>
                      <p className="text-[11px] text-slate-500">Upgrade to Solo or higher to generate a custom website.</p>
                      <Link href="/billing" onClick={onClose} className="text-[11px] text-violet-400 hover:text-violet-300 underline mt-1 inline-block">
                        View plans
                      </Link>
                    </div>
                  )}

                  {!canGenerateWebsite && websiteLimit > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                      <p className="text-xs text-amber-400 font-medium mb-1">Website limit reached ({existingWebsiteCount}/{websiteLimit})</p>
                      <p className="text-[11px] text-slate-500">Delete an existing website or upgrade your plan for more.</p>
                      <Link href="/billing" onClick={onClose} className="text-[11px] text-violet-400 hover:text-violet-300 underline mt-1 inline-block">
                        View plans
                      </Link>
                    </div>
                  )}

                  {/* Config fields — show when idle or generating */}
                  {(websiteStatus === 'idle' || websiteStatus === 'limit') && canGenerateWebsite && selectedTools.has('website') && (
                    <div className="space-y-4">
                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Describe your business</label>
                        <textarea
                          value={websiteDescription}
                          onChange={(e) => setWebsiteDescription(e.target.value)}
                          placeholder="A cozy Italian restaurant in downtown Manhattan known for handmade pasta and wood-fired pizza..."
                          rows={3}
                          className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                        />
                      </div>

                      {/* Cuisine / Business type */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Cuisine / Business Type</label>
                        <input
                          type="text"
                          value={websiteCuisine}
                          onChange={(e) => setWebsiteCuisine(e.target.value)}
                          placeholder="Italian, Sushi, Mexican, Cafe, Gym, Salon..."
                          className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                      </div>

                      {/* Color scheme picker */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Color Scheme</label>
                        <div className="grid grid-cols-5 gap-2">
                          {COLOR_SCHEMES.map((cs) => (
                            <button
                              key={cs.id}
                              type="button"
                              onClick={() => setWebsiteColorScheme(cs.id)}
                              className={`p-2 rounded-lg border-2 transition-all ${
                                websiteColorScheme === cs.id
                                  ? 'border-violet-500 ring-1 ring-violet-500/30'
                                  : 'border-white/[0.06] hover:border-white/[0.15]'
                              }`}
                            >
                              <div className="flex gap-0.5 mb-1.5 justify-center">
                                {cs.colors.map((c, i) => (
                                  <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                              <p className="text-[9px] text-slate-400 text-center">{cs.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Generate button */}
                      <div className="pt-2 text-center">
                        <button
                          onClick={generateWebsite}
                          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-600/20"
                        >
                          Generate My Website
                        </button>
                        <p className="text-[10px] text-slate-600 mt-2">You can edit everything after generation</p>
                      </div>
                    </div>
                  )}

                  {websiteStatus === 'idle' && !selectedTools.has('website') && (
                    <p className="text-xs text-slate-500 text-center py-4">You skipped the website tool. You can generate one later from the dashboard.</p>
                  )}

                  {websiteStatus === 'generating' && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto mb-4 relative">
                        <div className="absolute inset-0 rounded-full border-3 border-violet-500/20" />
                        <div className="absolute inset-0 rounded-full border-3 border-violet-500 border-t-transparent animate-spin" />
                      </div>
                      <p className="text-sm text-violet-400 font-medium">Generating your website...</p>
                      <p className="text-xs text-slate-500 mt-1">This takes 20-40 seconds. You can continue setup while it builds.</p>
                    </div>
                  )}

                  {websiteStatus === 'done' && (
                    <div className="text-center py-6">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-emerald-400" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm text-emerald-400 font-semibold">Website generated!</p>
                      <p className="text-xs text-slate-500 mt-1">Customize it anytime from the Website tab in your dashboard.</p>
                    </div>
                  )}

                  {websiteStatus === 'error' && (
                    <div className="text-center py-4">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-w-sm mx-auto mb-4">
                        <p className="text-xs text-red-400">{websiteError || 'Something went wrong'}</p>
                      </div>
                      <button onClick={() => setWebsiteStatus('idle')} className="text-xs text-violet-400 hover:text-violet-300 underline">
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: AI Agents ── */}
              {step === 4 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Set Up AI Agents</h2>
                  <p className="text-sm text-slate-500 mb-5">
                    Your AI phone agent and chatbot handle customer calls and messages automatically.
                  </p>

                  {/* Voice Agent */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                        <PhoneIcon />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">AI Phone Agent</p>
                        <p className="text-[11px] text-slate-500">Answers calls, takes orders, books reservations</p>
                      </div>
                      {voiceStatus === 'done' && <StatusBadge status="done" />}
                      {voiceStatus === 'skipped' && <StatusBadge status="skipped" />}
                    </div>

                    {!canProvisionVoice && voiceStatus === 'idle' && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-[11px] text-amber-400">Voice agent not available on Free plan.</p>
                        <Link href="/billing" onClick={onClose} className="text-[11px] text-violet-400 underline">Upgrade</Link>
                      </div>
                    )}

                    {voiceStatus === 'idle' && selectedTools.has('voice') && canProvisionVoice && (
                      <div className="space-y-3">
                        {/* Area code */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">Phone Area Code</label>
                          <input
                            type="text"
                            value={voiceAreaCode}
                            onChange={(e) => setVoiceAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            placeholder="Optional, e.g. 917 for New York"
                            maxLength={3}
                            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                          />
                        </div>

                        {/* Greeting */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">Phone Greeting</label>
                          <input
                            type="text"
                            value={voiceGreeting}
                            onChange={(e) => setVoiceGreeting(e.target.value)}
                            placeholder="Hi, thanks for calling! How can I help?"
                            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                          />
                        </div>

                        {/* Personality */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Agent Personality</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'friendly', label: 'Friendly', desc: 'Warm & casual' },
                              { id: 'professional', label: 'Professional', desc: 'Polished & formal' },
                              { id: 'energetic', label: 'Energetic', desc: 'Upbeat & lively' },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setVoicePersonality(p.id)}
                                className={`p-2.5 rounded-lg border-2 transition-all text-center ${
                                  voicePersonality === p.id
                                    ? 'border-violet-500/50 bg-violet-500/10'
                                    : 'border-white/[0.06] hover:border-white/[0.12]'
                                }`}
                              >
                                <p className="text-xs font-medium text-white">{p.label}</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={provisionVoice}
                            className="flex-1 py-2.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-500 transition-colors"
                          >
                            Set Up Phone Agent
                          </button>
                          <button
                            onClick={() => setVoiceStatus('skipped')}
                            className="px-3 py-2.5 text-xs text-slate-500 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.08] transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                    {voiceStatus === 'idle' && !selectedTools.has('voice') && canProvisionVoice && (
                      <p className="text-xs text-slate-600">Voice agent not selected in tools. You can enable it later.</p>
                    )}
                    {voiceStatus === 'provisioning' && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-violet-400">Provisioning phone number & AI agent...</span>
                      </div>
                    )}
                    {voiceStatus === 'error' && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-red-400 flex-1">Failed to provision. You can set it up later from the dashboard.</p>
                        <button onClick={provisionVoice} className="text-xs text-violet-400 underline">Retry</button>
                      </div>
                    )}
                  </div>

                  {/* Chatbot */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white">
                        <ChatIcon />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">AI Chat Widget</p>
                        <p className="text-[11px] text-slate-500">Website chat, Instagram & Facebook DMs</p>
                      </div>
                      {chatbotStatus === 'done' && <StatusBadge status="done" />}
                      {chatbotStatus === 'skipped' && <StatusBadge status="skipped" />}
                    </div>

                    {chatbotStatus === 'idle' && selectedTools.has('chatbot') && (
                      <div className="flex gap-2">
                        <button
                          onClick={enableChatbot}
                          className="flex-1 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-500 transition-colors"
                        >
                          Enable Chatbot
                        </button>
                        <button
                          onClick={() => setChatbotStatus('skipped')}
                          className="px-3 py-2 text-xs text-slate-500 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.08] transition-colors"
                        >
                          Skip
                        </button>
                      </div>
                    )}
                    {chatbotStatus === 'idle' && !selectedTools.has('chatbot') && (
                      <p className="text-xs text-slate-600">Chatbot not selected in tools. You can enable it later.</p>
                    )}
                    {chatbotStatus === 'enabling' && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-violet-400">Enabling chatbot...</span>
                      </div>
                    )}
                    {chatbotStatus === 'error' && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-red-400 flex-1">Failed to enable. You can set it up later from the dashboard.</p>
                        <button onClick={enableChatbot} className="text-xs text-violet-400 underline">Retry</button>
                      </div>
                    )}
                  </div>

                  {/* Website generation status (if still running from step 3) */}
                  {websiteStatus === 'generating' && (
                    <div className="mt-4 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <p className="text-xs text-violet-400">Website still generating in the background...</p>
                    </div>
                  )}
                  {websiteStatus === 'done' && step === 4 && (
                    <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400 flex-shrink-0"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      <p className="text-xs text-emerald-400">Website generated! View it from the Website tab.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 5: Launch ── */}
              {step === 5 && (
                <div className="text-center py-4">
                  <EmbedoCubeMascot size={72} mood="excited" className="mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">You&apos;re Ready to Launch!</h2>
                  <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                    Your AI-powered business tools are configured. Here are your next steps:
                  </p>
                  <div className="space-y-2 max-w-md mx-auto text-left">
                    {[
                      { href: '/website', label: 'Customize your website', desc: 'Edit content, add images, connect domain', icon: <GlobeIcon />, done: websiteStatus === 'done' },
                      { href: '/voice-agent', label: 'Fine-tune Phone Agent', desc: 'Adjust voice, personality, and responses', icon: <PhoneIcon />, done: voiceStatus === 'done' },
                      { href: '/chatbot', label: 'Configure Chat Widget', desc: 'Customize colors, embed on your site', icon: <ChatIcon />, done: chatbotStatus === 'done' },
                      { href: '/customers', label: 'Add your first contact', desc: 'Start building your CRM', icon: <UserIcon />, done: business.counts.contacts > 0 },
                      { href: '/campaigns', label: 'Send an email campaign', desc: 'Reach customers with styled emails', icon: <MailIcon />, done: false },
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
              {/* Plan badge */}
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

// ── Status badge ──
function StatusBadge({ status }: { status: 'done' | 'skipped' }) {
  if (status === 'done') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        Done
      </span>
    );
  }
  return <span className="px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 text-[10px] font-semibold">Skipped</span>;
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
function QrIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /><path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM13 13a1 1 0 011-1h3a1 1 0 110 2h-1v2a1 1 0 11-2 0v-2a1 1 0 01-1-1z" /></svg>;
}
function SocialIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>;
}
function MailIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>;
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
