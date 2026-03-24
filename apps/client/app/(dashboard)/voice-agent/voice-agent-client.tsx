'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import KpiCard from '../../../components/ui/kpi-card';
import { EmbedoCubeMascot } from '../../../components/ui/embedo-cube-mascot';
import { PLAN_LIMITS } from '../billing/billing-data';
import type { TierKey } from '../billing/billing-data';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface VoiceStatus {
  businessId: string;
  businessName: string;
  agentId: string | null;
  twilioNumber: string | null;
  isProvisioned: boolean;
  hasAgent: boolean;
  hasNumber: boolean;
  settings: {
    hours: Record<string, { open: string; close: string }> | null;
    cuisine: string | null;
    maxPartySize: number | null;
    chatbotPersona: string | null;
  };
}

interface VoiceStats {
  totalCalls: number;
  avgDuration: number;
  leadsCapture: number;
  positiveRate: number;
  intentBreakdown: Record<string, number>;
  sentimentBreakdown: Record<string, number>;
}

interface CallLog {
  id: string;
  twilioCallSid: string;
  direction: string;
  duration: number | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  intent: string;
  leadCaptured: boolean;
  reservationMade: boolean;
  extractedData: Record<string, unknown> | null;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string; phone: string } | null;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  NEUTRAL: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
  NEGATIVE: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

const INTENT_COLORS: Record<string, string> = {
  RESERVATION: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  INQUIRY: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  COMPLAINT: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  GENERAL: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
  UNKNOWN: 'bg-slate-50 text-slate-400 dark:bg-white/[0.04] dark:text-slate-400',
};

/* ── Subscription Gate (explore but can't build) ────────────────── */
function SubscriptionGate({ feature, planTier }: { feature: string; planTier: TierKey }) {
  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{feature}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Explore how this tool works — upgrade to activate it</p>
      </div>

      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-10 text-center mb-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <EmbedoCubeMascot size={48} mood="surprised" bounce />
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-3">{planTier} Plan</p>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{feature} requires an upgrade</h2>
        <p className="text-violet-200 text-base max-w-lg mx-auto mb-8 leading-relaxed">
          The {feature} is available on Solo and higher plans. Upgrade to deploy your AI agent and start handling calls, chats, and more automatically.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 px-8 py-3 bg-white text-violet-700 font-semibold rounded-xl hover:bg-violet-50 transition-colors shadow-lg"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
          View Plans & Upgrade
        </Link>
      </div>

      {/* Preview cards showing what they get */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '24/7', label: 'Always On', desc: 'AI answers every call, day or night' },
          { icon: '#', label: 'Dedicated Number', desc: 'Local phone number for your business' },
          { icon: 'AI', label: 'Natural Voice', desc: 'Sounds like a real person, not a robot' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 text-center">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mx-auto mb-3 text-violet-600 dark:text-violet-400 text-sm font-bold">
              {item.icon}
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{item.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Provisioning Hero ──────────────────────────────────────────── */
function ProvisioningHero({ businessId, onProvisioned }: { businessId: string; onProvisioned: () => void }) {
  const [provisioning, setProvisioning] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('');

  async function handleProvision() {
    setProvisioning(true);
    setError('');
    setStep('Creating AI voice agent...');

    try {
      const res = await fetch(`${API_URL}/voice-agent/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, areaCode: areaCode || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Provisioning failed');
        setProvisioning(false);
        return;
      }

      setStep('Voice agent deployed!');
      setTimeout(onProvisioned, 1200);
    } catch {
      setError('Network error — please try again');
      setProvisioning(false);
    }
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Phone Agent</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">AI receptionist — handles calls, takes reservations, captures leads</p>
      </div>

      {/* Hero CTA */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-10 text-center mb-8 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </div>
        <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-3">AI Phone Agent</p>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Never miss a call again</h2>
        <p className="text-violet-200 text-base max-w-lg mx-auto mb-8 leading-relaxed">
          Deploy an AI receptionist that answers calls 24/7, takes reservations, answers questions about your business, and captures leads — all with a natural, friendly voice.
        </p>

        {!provisioning ? (
          <div className="max-w-sm mx-auto space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="Area code (optional)"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-violet-300/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                onClick={handleProvision}
                className="px-8 py-3 bg-white text-violet-700 font-semibold rounded-xl text-sm hover:bg-violet-50 transition-colors shadow-sm"
              >
                Deploy Agent
              </button>
            </div>
            {error && (
              <p className="text-sm text-rose-200 bg-rose-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-violet-100 text-sm font-medium">{step}</p>
          </div>
        )}
      </div>

      {/* What you get */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { title: 'AI Receptionist', desc: 'Natural-sounding voice agent answers every call with your business persona and knowledge' },
          { title: 'Reservation Handling', desc: 'Takes reservation details — name, party size, date, time — and confirms with callers' },
          { title: 'Lead Capture', desc: 'Extracts caller info and sends it to your CRM automatically — never lose a potential customer' },
        ].map(({ title, desc }) => (
          <div key={title} className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1.5">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Deploy', desc: 'Click "Deploy Agent" and we provision your AI voice agent and phone number' },
            { step: '2', title: 'Configure', desc: 'Set your business hours, cuisine type, and max party size for reservations' },
            { step: '3', title: 'Calls Route', desc: 'Incoming calls to your AI number are answered by your personalized voice agent' },
            { step: '4', title: 'Leads Flow', desc: 'Call transcripts, reservations, and captured leads appear in your dashboard' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 text-sm font-bold flex items-center justify-center mx-auto mb-2">{step}</div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_OPEN = '11:00';
const DEFAULT_CLOSE = '22:00';

type HoursMap = Record<string, { open: string; close: string } | null>;

function buildInitialHours(saved: Record<string, { open: string; close: string }> | null): HoursMap {
  const result: HoursMap = {};
  for (const day of DAYS) {
    result[day] = saved?.[day] ?? { open: DEFAULT_OPEN, close: DEFAULT_CLOSE };
  }
  return result;
}

/* ── Settings Panel ─────────────────────────────────────────────── */
function SettingsPanel({ businessId, settings, onSaved }: {
  businessId: string;
  settings: VoiceStatus['settings'];
  onSaved: () => void;
}) {
  const [persona, setPersona] = useState(settings.chatbotPersona ?? '');
  const [cuisine, setCuisine] = useState(settings.cuisine ?? '');
  const [maxParty, setMaxParty] = useState(settings.maxPartySize?.toString() ?? '');
  const [hours, setHours] = useState<HoursMap>(() => buildInitialHours(settings.hours));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setDayHours(day: string, field: 'open' | 'close', value: string) {
    setHours((prev) => ({ ...prev, [day]: { ...(prev[day] ?? { open: DEFAULT_OPEN, close: DEFAULT_CLOSE }), [field]: value } }));
  }

  function toggleClosed(day: string) {
    setHours((prev) => ({ ...prev, [day]: prev[day] === null ? { open: DEFAULT_OPEN, close: DEFAULT_CLOSE } : null }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Serialize hours — omit closed days (null entries)
      const hoursPayload: Record<string, { open: string; close: string }> = {};
      for (const [day, val] of Object.entries(hours)) {
        if (val !== null) hoursPayload[day] = val;
      }
      await fetch(`${API_URL}/voice-agent/settings/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotPersona: persona || undefined,
          cuisine: cuisine || undefined,
          maxPartySize: maxParty ? parseInt(maxParty) : undefined,
          hours: hoursPayload,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40';

  return (
    <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6 space-y-6">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Agent Settings</h3>

      {/* Basic settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Personality / Persona</label>
          <input
            type="text"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="friendly, warm, and professional"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cuisine Type</label>
          <input
            type="text"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Italian, Mexican, etc."
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Max Party Size</label>
          <input
            type="number"
            value={maxParty}
            onChange={(e) => setMaxParty(e.target.value)}
            placeholder="10"
            className={inputClass}
          />
        </div>
      </div>

      {/* Hours editor */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Business Hours</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {DAYS.map((day) => {
            const isClosed = hours[day] === null;
            return (
              <div key={day} className={`rounded-lg border p-3 transition-colors ${isClosed ? 'bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08]' : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{day}</span>
                  <button
                    type="button"
                    onClick={() => toggleClosed(day)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${isClosed ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/[0.12]' : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/25'}`}
                  >
                    {isClosed ? 'Closed' : 'Open'}
                  </button>
                </div>
                {!isClosed && (
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={hours[day]?.open ?? DEFAULT_OPEN}
                      onChange={(e) => setDayHours(day, 'open', e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-200 dark:border-white/[0.08] rounded text-xs text-slate-700 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-400">—</span>
                    <input
                      type="time"
                      value={hours[day]?.close ?? DEFAULT_CLOSE}
                      onChange={(e) => setDayHours(day, 'close', e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-200 dark:border-white/[0.08] rounded text-xs text-slate-700 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  </div>
                )}
                {isClosed && <p className="text-[10px] text-slate-400 dark:text-slate-400">Closed all day</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save & Update Agent'}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Settings saved — agent prompt updated</span>}
      </div>
    </div>
  );
}

/* ── Call Transcript Modal ──────────────────────────────────────── */
function TranscriptModal({ call, onClose }: { call: CallLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1730] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Call Transcript</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDate(call.createdAt)} &middot; {call.duration ? formatDuration(call.duration) : 'N/A'}
              {call.contact && ` — ${call.contact.firstName} ${call.contact.lastName}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Summary */}
          {call.summary && (
            <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded-lg">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-1">AI Summary</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{call.summary}</p>
            </div>
          )}

          {/* Extracted data */}
          {call.extractedData && Object.keys(call.extractedData).length > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Extracted Information</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(call.extractedData).map(([key, val]) => (
                  <p key={key} className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{key}:</span> {String(val)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          {call.transcript ? (
            <div className="space-y-2">
              {call.transcript.split('\n').map((line, i) => {
                const isAgent = line.startsWith('agent:') || line.startsWith('assistant:');
                const text = line.replace(/^(agent|assistant|user|human):?\s*/i, '');
                return (
                  <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      isAgent
                        ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200'
                        : 'bg-violet-600 text-white'
                    }`}>
                      {text}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-400 text-center py-8">No transcript available for this call</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Voice Browser ──────────────────────────────────────────────── */
interface Voice { id: string; name: string; category: string; accent: string; gender: string; age: string; useCase: string; description: string; previewUrl: string; }

function VoiceBrowser({ businessId, currentVoiceId }: { businessId: string; currentVoiceId?: string }) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(currentVoiceId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/voice-agent/voices?${search ? `search=${encodeURIComponent(search)}` : ''}`);
        const data = await res.json() as { success: boolean; voices: Voice[] };
        if (data.success) setVoices(data.voices);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [search]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, []);

  function playPreview(voice: Voice) {
    // If same voice is playing, pause it
    if (playingId === voice.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    // Stop any currently playing audio
    audioRef.current?.pause();
    audioRef.current = null;

    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    setPlayingId(voice.id);
    audio.onended = () => { setPlayingId(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingId(null); audioRef.current = null; };
    audio.play().catch(() => { setPlayingId(null); audioRef.current = null; });
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/voice-agent/voice/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: selectedId }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    setSaving(false);
  }

  const filtered = filter === 'all' ? voices : voices.filter(v => v.gender?.toLowerCase() === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search voices... (e.g. 'Sarah', 'British', 'warm')"
          style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <div className="flex gap-1">
          {['all', 'female', 'male'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-medium rounded-lg border ${filter === f ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400' : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400'}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
          {filtered.slice(0, 40).map(voice => (
            <div
              key={voice.id}
              onClick={() => setSelectedId(voice.id)}
              className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedId === voice.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 shadow-md' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/[0.12]'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${playingId === voice.id ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-500/15 hover:text-violet-600 dark:hover:text-violet-400'}`}
                >
                  {playingId === voice.id ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{voice.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400">{voice.gender}{voice.accent ? ` · ${voice.accent}` : ''}</p>
                </div>
              </div>
              {voice.useCase && <p className="text-[9px] text-slate-400 dark:text-slate-400 truncate">{voice.useCase}</p>}
              {selectedId === voice.id && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={!selectedId || saving} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {saved ? 'Voice Saved!' : saving ? 'Saving...' : 'Save Voice Selection'}
        </button>
      </div>
    </div>
  );
}

/* ── System Prompt Editor ──────────────────────────────────────── */
function PromptEditor({ businessId, settings }: { businessId: string; settings: VoiceStatus['settings'] & { customPrompt?: string; firstMessage?: string } }) {
  const [prompt, setPrompt] = useState((settings as Record<string, unknown>)['customPrompt'] as string ?? '');
  const [firstMsg, setFirstMsg] = useState((settings as Record<string, unknown>)['firstMessage'] as string ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const templates: Record<string, string> = {
    restaurant: `You are the AI receptionist for a restaurant. Be warm, helpful, and concise.\n\nYou can:\n1. Answer questions about hours, location, and menu\n2. Take reservation requests (collect: name, party size, date, time, phone)\n3. Handle dietary restriction questions\n4. Transfer to a human if needed\n\nKeep responses short — this is a phone call, not a text chat.`,
    gym: `You are the AI receptionist for a fitness center. Be energetic and motivating.\n\nYou can:\n1. Explain membership options and pricing\n2. Schedule tours and free trials\n3. Answer questions about classes and equipment\n4. Transfer to a trainer if needed`,
    salon: `You are the AI receptionist for a hair salon. Be friendly and professional.\n\nYou can:\n1. Book appointments (collect: name, service, preferred stylist, date/time, phone)\n2. Answer questions about services and pricing\n3. Handle cancellations and rescheduling\n4. Transfer to the front desk if needed`,
    general: `You are the AI receptionist. Be professional and helpful.\n\nYou can:\n1. Answer common questions about the business\n2. Take messages and collect caller information\n3. Schedule callbacks\n4. Transfer to a human if needed`,
  };

  async function handleSave() {
    if (!prompt.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/voice-agent/prompt/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, firstMessage: firstMsg || undefined }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Templates */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Quick Templates</label>
        <div className="flex gap-2">
          {Object.entries(templates).map(([key, val]) => (
            <button key={key} onClick={() => setPrompt(val)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:border-violet-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors capitalize">
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* First message */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">First Message (greeting when caller connects)</label>
        <input
          type="text"
          value={firstMsg}
          onChange={(e) => setFirstMsg(e.target.value)}
          placeholder="Thank you for calling! I'm your AI assistant. How can I help you today?"
          style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* System prompt */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">System Prompt (agent behavior & personality)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={12}
          style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white rounded-xl text-sm font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          placeholder="Describe how your AI receptionist should behave..."
        />
        <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">{prompt.length} characters</p>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={!prompt.trim() || saving} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {saved ? 'Prompt Saved!' : saving ? 'Saving...' : 'Save Prompt'}
        </button>
      </div>
    </div>
  );
}

/* ── Knowledge Base Manager ────────────────────────────────────── */
function KnowledgeBaseManager({ businessId, settings }: { businessId: string; settings: Record<string, unknown> }) {
  const [entries, setEntries] = useState<Array<{ id: string; name: string }>>((settings['knowledgeBase'] as Array<{ id: string; name: string }>) ?? []);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload() {
    if (!name.trim() || !content.trim()) return;
    setUploading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/voice-agent/knowledge/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content }),
      });
      const data = await res.json() as { success: boolean; id?: string; error?: string };
      if (!data.success) throw new Error(data.error ?? 'Upload failed');
      setEntries(prev => [...prev, { id: data.id ?? `kb_${Date.now()}`, name }]);
      setName('');
      setContent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
    setUploading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">Upload documents, menus, FAQs, and policies. The AI agent will use these to answer caller questions accurately.</p>

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Uploaded Documents</label>
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
              <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">{entry.name}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400 ml-auto"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            </div>
          ))}
        </div>
      )}

      {/* Upload new */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Add New Document</h4>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Document name (e.g. 'Full Menu', 'Parking Info', 'FAQ')"
          style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 mb-3"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="Paste the full text content here — menu items, FAQ answers, parking instructions, policies, etc."
          style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          className="w-full px-4 py-3 border border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none mb-3"
        />
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <button onClick={handleUpload} disabled={!name.trim() || !content.trim() || uploading} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {uploading ? 'Uploading...' : 'Upload to Knowledge Base'}
        </button>
      </div>
    </div>
  );
}

/* ── Test Call Widget ───────────────────────────────────────────── */
function TestCallWidget({ agentId }: { agentId: string }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load the ElevenLabs widget script
    if (typeof window !== 'undefined' && !document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) {
      const script = document.createElement('script');
      script.src = 'https://elevenlabs.io/convai-widget/index.js';
      script.async = true;
      script.onload = () => setLoaded(true);
      document.head.appendChild(script);
    } else {
      setLoaded(true);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Main call area */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 p-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-50%] right-[-20%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center text-center pt-4 pb-2">
          <h3 className="text-lg font-bold text-white mb-0.5">Test Your Agent</h3>
          <p className="text-sm text-violet-200 mb-0">Click &quot;Start a call&quot; to talk to your AI receptionist</p>

          {/* Widget — directly after text, no extra spacing */}
          {loaded ? (
            <div dangerouslySetInnerHTML={{
              __html: `<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`
            }} />
          ) : (
            <div className="w-6 h-6 border-2 border-violet-400 border-t-white rounded-full animate-spin mt-4" />
          )}
        </div>

        <style>{`
          elevenlabs-convai {
            position: relative !important;
            bottom: auto !important;
            right: auto !important;
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
          }
        `}</style>
      </div>
    </div>
  );
}

/* ── Conversation History ──────────────────────────────────────── */
interface Conversation {
  id: string;
  status: string;
  startTime: string;
  duration: number;
  messageCount: number;
  successful: string;
  summary: string;
}

interface ConversationDetail {
  id: string;
  duration: number;
  transcript: Array<{ role: string; message: string; time_in_call_secs: number }>;
  summary: string;
  successful: string;
  collectedData: Record<string, unknown>;
}

function ConversationHistory({ businessId }: { businessId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/voice-agent/conversations/${businessId}`);
        const data = await res.json() as { success: boolean; conversations: Conversation[] };
        if (data.success) setConversations(data.conversations);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [businessId]);

  async function loadDetail(conversationId: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/voice-agent/conversation/${conversationId}`);
      const data = await res.json() as { success: boolean; conversation: ConversationDetail };
      if (data.success) setSelected(data.conversation);
    } catch { /* silent */ }
    setLoadingDetail(false);
  }

  function formatDur(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400 dark:text-slate-400">No conversations yet. Make a test call to see them here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => void loadDetail(c.id)}
              className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl cursor-pointer hover:border-violet-200 dark:hover:border-violet-500/30 hover:shadow-md transition-all"
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.successful === 'success' ? 'bg-emerald-500' : c.successful === 'failure' ? 'bg-rose-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{c.summary || 'Conversation'}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">{new Date(c.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {formatDur(c.duration)} · {c.messageCount} messages</p>
              </div>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-300"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
            </div>
          ))}
        </div>
      )}

      {/* Conversation detail modal */}
      {(selected || loadingDetail) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => { setSelected(null); }}>
          <div onClick={(e) => e.stopPropagation()} className="relative bg-white dark:bg-[#1a1730] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-100 dark:bg-white/[0.06] rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
            </button>

            {loadingDetail && !selected ? (
              <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
            ) : selected ? (
              <>
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${selected.successful === 'success' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Conversation</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-400">{formatDur(selected.duration)}</span>
                  </div>
                  {selected.summary && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{selected.summary}</p>}
                </div>

                {Object.keys(selected.collectedData).length > 0 && (
                  <div className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Collected Data</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selected.collectedData).map(([key, val]) => (
                        <span key={key} className="px-2 py-1 bg-white dark:bg-white/[0.04] border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                          <span className="font-medium">{key}:</span> {String(typeof val === 'object' ? JSON.stringify(val) : val)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-6 py-4 space-y-3">
                  {selected.transcript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'agent'
                          ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 rounded-bl-sm'
                          : 'bg-violet-600 text-white rounded-br-sm'
                      }`}>
                        {msg.message}
                        <p className={`text-[9px] mt-1 ${msg.role === 'agent' ? 'text-slate-400' : 'text-violet-200'}`}>
                          {formatDur(Math.round(msg.time_in_call_secs))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Voice Agent Dashboard ─────────────────────────────────── */
export default function VoiceAgentClient({ businessId }: { businessId: string }) {
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'voice' | 'prompt' | 'knowledge' | 'test' | 'history'>('dashboard');
  const [planTier, setPlanTier] = useState<TierKey>('FREE');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/billing/subscription?businessId=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.subscription?.pricingTier) setPlanTier(data.subscription.pricingTier as TierKey);
        }
      } catch { /* default FREE */ }
    })();
  }, [businessId]);

  const canProvision = PLAN_LIMITS[planTier].voiceAgents > 0;

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, statsRes, callsRes] = await Promise.all([
        fetch(`${API_URL}/voice-agent/status/${businessId}`),
        fetch(`${API_URL}/voice-agent/stats/${businessId}`),
        fetch(`${API_URL}/voice-agent/calls/${businessId}`),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (callsRes.ok) {
        const data = await callsRes.json();
        setCalls(data.items);
        setTotalCalls(data.total);
      }
    } catch {
      // API may not be available in dev
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show provisioning hero if not set up
  if (!status?.isProvisioned) {
    return canProvision
      ? <ProvisioningHero businessId={businessId} onProvisioned={fetchAll} />
      : <SubscriptionGate feature="AI Phone Agent" planTier={planTier} />;
  }

  const s = stats ?? { totalCalls: 0, avgDuration: 0, leadsCapture: 0, positiveRate: 0, intentBreakdown: {}, sentimentBreakdown: {} };

  return (
    <div className="p-8 animate-fade-up">
      {/* Header with gradient accent */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
                <svg viewBox="0 0 20 20" fill="white" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Phone Agent</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI receptionist — configure, monitor, and manage calls</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
            </div>
            {status.twilioNumber && (
              <div className="px-4 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl">
                <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">{status.twilioNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation — Embedo violet theme */}
      <div className="flex gap-1.5 mb-8 bg-slate-100/80 dark:bg-white/[0.06] rounded-2xl p-1.5 w-fit">
        {([
          { id: 'dashboard' as const, label: 'Dashboard', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg> },
          { id: 'voice' as const, label: 'Voice', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg> },
          { id: 'prompt' as const, label: 'System Prompt', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg> },
          { id: 'knowledge' as const, label: 'Knowledge Base', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg> },
          { id: 'test' as const, label: 'Test Call', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> },
          { id: 'history' as const, label: 'History', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg> },
        ] as const).map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-white dark:bg-white/[0.08] text-violet-700 dark:text-violet-400 shadow-sm border border-violet-100 dark:border-violet-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
            >
              <span className={active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Voice Tab */}
      {activeTab === 'voice' && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Choose a Voice</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Select the voice your AI receptionist will use. Click play to preview.</p>
            </div>
          </div>
          <VoiceBrowser businessId={businessId} currentVoiceId={(status.settings as Record<string, unknown>)?.['voiceId'] as string | undefined} />
        </div>
      )}

      {/* Prompt Tab */}
      {activeTab === 'prompt' && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Prompt</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Define your AI receptionist&apos;s personality, capabilities, and behavior.</p>
            </div>
          </div>
          <PromptEditor businessId={businessId} settings={status.settings as VoiceStatus['settings'] & { customPrompt?: string; firstMessage?: string }} />
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Knowledge Base</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Upload your menu, FAQ, parking info, and policies so the AI can answer accurately.</p>
            </div>
          </div>
          <KnowledgeBaseManager businessId={businessId} settings={(status.settings as Record<string, unknown>) ?? {}} />
        </div>
      )}

      {/* Test Call Tab */}
      {activeTab === 'test' && status.agentId && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Test Call</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Talk to your AI agent directly from the browser.</p>
            </div>
          </div>
          <TestCallWidget agentId={status.agentId} />
        </div>
      )}

      {/* Conversation History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Conversation History</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">All conversations from ElevenLabs — transcripts, summaries, and collected data.</p>
            </div>
          </div>
          <ConversationHistory businessId={businessId} />
        </div>
      )}

      {activeTab !== 'dashboard' ? null : <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Calls" value={s.totalCalls} color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
        <KpiCard label="Avg Duration" value={formatDuration(s.avgDuration)} color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Leads Captured" value={s.leadsCapture} color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Positive Sentiment" value={`${s.positiveRate}%`} color="teal"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" /></svg>} />
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Intent breakdown */}
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-500/30 transition-all duration-300">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Intent Breakdown</h3>
          <div className="space-y-3">
            {['RESERVATION', 'INQUIRY', 'COMPLAINT', 'GENERAL'].map((intent) => {
              const count = s.intentBreakdown[intent] ?? 0;
              const pct = s.totalCalls > 0 ? Math.round((count / s.totalCalls) * 100) : 0;
              return (
                <div key={intent} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{intent.toLowerCase()}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-400 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-6 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all duration-300">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Sentiment Analysis</h3>
          <div className="space-y-3">
            {[
              { label: 'Positive', key: 'POSITIVE', color: 'bg-emerald-400' },
              { label: 'Neutral', key: 'NEUTRAL', color: 'bg-slate-400' },
              { label: 'Negative', key: 'NEGATIVE', color: 'bg-rose-400' },
            ].map(({ label, key, color }) => {
              const count = s.sentimentBreakdown[key] ?? 0;
              const pct = s.totalCalls > 0 ? Math.round((count / s.totalCalls) * 100) : 0;
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Call log table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Calls</h2>
          {totalCalls > 0 && <span className="text-xs text-slate-400 dark:text-slate-400">{totalCalls} total</span>}
        </div>
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Caller</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Intent</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Duration</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Sentiment</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Lead</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-400">
                    No calls recorded yet. Your voice agent will log calls here once it receives its first call.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="border-b border-slate-50 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(call.createdAt)}</td>
                    <td className="px-5 py-3 text-sm text-slate-800 dark:text-white font-medium">
                      {call.contact
                        ? `${call.contact.firstName} ${call.contact.lastName}`
                        : <span className="text-slate-400 dark:text-slate-400">Unknown</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${INTENT_COLORS[call.intent] ?? INTENT_COLORS['UNKNOWN']}`}>
                        {call.intent.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                      {call.duration != null ? formatDuration(call.duration) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {call.sentiment ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${SENTIMENT_COLORS[call.sentiment] ?? 'bg-slate-100 text-slate-500'}`}>
                          {call.sentiment.toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {call.leadCaptured && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          captured
                        </span>
                      )}
                      {call.reservationMade && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 ml-1">
                          reservation
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript modal */}
      {selectedCall && <TranscriptModal call={selectedCall} onClose={() => setSelectedCall(null)} />}
      </>}
    </div>
  );
}
