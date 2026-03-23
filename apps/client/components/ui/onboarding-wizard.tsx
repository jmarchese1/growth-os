'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

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

const STEPS = ['Welcome', 'Business Hours', 'Your Tools', 'Quick Start'] as const;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function OnboardingWizard({ business, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Hours state
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

  // Tools state
  const [selectedTools, setSelectedTools] = useState<Set<string>>(() => {
    const tools = new Set<string>();
    if (business.elevenLabsAgentId) tools.add('voice');
    if ((business.settings as Record<string, unknown> | null)?.['chatbotEnabled']) tools.add('chatbot');
    tools.add('website');
    tools.add('qrcodes');
    return tools;
  });

  function toggleTool(tool: string) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  }

  async function saveHours() {
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
      onComplete();
    } catch {
      // silently continue
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

  if (typeof document === 'undefined') return null;

  const tools = [
    { id: 'voice', name: 'AI Phone Agent', desc: 'Answer calls, take reservations, capture leads', icon: '📞', color: 'from-amber-400 to-orange-500' },
    { id: 'chatbot', name: 'AI Chat Widget', desc: 'Website chat, Instagram & Facebook DMs', icon: '💬', color: 'from-sky-400 to-blue-500' },
    { id: 'website', name: 'Business Website', desc: 'AI-generated website deployed instantly', icon: '🌐', color: 'from-violet-400 to-purple-500' },
    { id: 'qrcodes', name: 'QR Codes & Surveys', desc: 'Spin wheels, discounts, feedback collection', icon: '📱', color: 'from-emerald-400 to-teal-500' },
    { id: 'social', name: 'Social Media', desc: 'AI content generation & scheduling', icon: '📣', color: 'from-pink-400 to-rose-500' },
    { id: 'campaigns', name: 'Email Campaigns', desc: 'Send styled emails & sequences', icon: '✉️', color: 'from-indigo-400 to-blue-600' },
  ];

  const quickStartActions = [
    { href: '/website', label: 'Generate your website', desc: 'AI builds a custom site in seconds', icon: '🌐', done: business.counts.contacts > 0 },
    { href: '/voice-agent', label: 'Set up Phone Agent', desc: 'Start answering calls with AI', icon: '📞', done: !!business.elevenLabsAgentId },
    { href: '/chatbot', label: 'Configure Chat Widget', desc: 'Add AI chat to your website', icon: '💬', done: !!(business.settings as Record<string, unknown> | null)?.['chatbotEnabled'] },
    { href: '/surveys', label: 'Create a QR Code', desc: 'Spin wheel, discount, or survey', icon: '📱', done: false },
    { href: '/customers', label: 'Add your first contact', desc: 'Start building your CRM', icon: '👤', done: business.counts.contacts > 0 },
    { href: '/campaigns', label: 'Send an email campaign', desc: 'Reach customers with styled emails', icon: '✉️', done: false },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-up">
        {/* Progress bar */}
        <div className="px-8 pt-6 pb-0">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-violet-600 text-white ring-4 ring-violet-100' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`hidden sm:block w-16 h-0.5 ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-[10px] font-medium ${i === step ? 'text-violet-600' : 'text-slate-400'}`}>{s}</span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-200">
                <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-white" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Embedo, {business.name}!</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                Let&apos;s get your AI-powered business tools set up in under 2 minutes.
                We&apos;ll configure your hours, pick your tools, and show you how to get started.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { emoji: '🤖', label: 'AI-Powered', desc: 'Every tool uses AI' },
                  { emoji: '⚡', label: 'Instant Setup', desc: 'Live in minutes' },
                  { emoji: '📈', label: 'Growth', desc: 'More customers, less work' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-2xl p-4">
                    <div className="text-2xl mb-2">{item.emoji}</div>
                    <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Business Hours */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Business Hours</h2>
              <p className="text-sm text-slate-500 mb-5">Your AI phone agent and chatbot will use these to know when you&apos;re open.</p>
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const d = day.toLowerCase();
                  const h = hours[d]!;
                  return (
                    <div key={day} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${h.closed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                      <span className="text-sm font-medium text-slate-700 w-24">{day}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!h.closed}
                          onChange={() => setHours({ ...hours, [d]: { ...h, closed: !h.closed } })}
                          className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-xs text-slate-500">{h.closed ? 'Closed' : 'Open'}</span>
                      </label>
                      {!h.closed && (
                        <div className="flex items-center gap-2 ml-auto">
                          <input type="time" value={h.open} onChange={(e) => setHours({ ...hours, [d]: { ...h, open: e.target.value } })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
                          <span className="text-xs text-slate-400">to</span>
                          <input type="time" value={h.close} onChange={(e) => setHours({ ...hours, [d]: { ...h, close: e.target.value } })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Choose Tools */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Choose Your Tools</h2>
              <p className="text-sm text-slate-500 mb-5">Select what you want to use. You can always change this later.</p>
              <div className="grid grid-cols-2 gap-3">
                {tools.map((tool) => {
                  const selected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        selected
                          ? 'border-violet-400 bg-violet-50/50 ring-1 ring-violet-200'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-lg shadow-sm`}>
                          {tool.icon}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ml-auto ${
                          selected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                        }`}>
                          {selected && <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{tool.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{tool.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Quick Start */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">You&apos;re All Set!</h2>
              <p className="text-sm text-slate-500 mb-5">Here are the best next steps to get your business running with AI.</p>
              <div className="space-y-2">
                {quickStartActions.filter((a) => selectedTools.has(a.href.replace('/', '').replace('-', '')) || a.href === '/customers' || a.href === '/campaigns').map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={onClose}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm ${
                      action.done
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-violet-200 hover:bg-violet-50/30'
                    }`}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${action.done ? 'text-emerald-700' : 'text-slate-800'}`}>{action.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{action.desc}</p>
                    </div>
                    {action.done ? (
                      <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-semibold">Done</span>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {step === 0 ? (
              <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Skip setup</button>
            ) : (
              <button onClick={back} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Back
              </button>
            )}
          </div>
          <button
            onClick={next}
            disabled={saving}
            className="px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-violet-200"
          >
            {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {step === STEPS.length - 1 ? (saving ? 'Finishing...' : 'Go to Dashboard') : 'Continue'}
            {step < STEPS.length - 1 && (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
