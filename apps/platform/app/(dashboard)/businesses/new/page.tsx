'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const BUSINESS_TYPES = ['RESTAURANT', 'SALON', 'RETAIL', 'FITNESS', 'MEDICAL', 'OTHER'] as const;

const US_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const PRODUCTS = [
  { id: 'voice-agent', label: 'AI Voice Agent', description: 'Inbound call handling, reservations, lead capture via ElevenLabs + Twilio' },
  { id: 'chatbot-agent', label: 'AI Chatbot', description: 'Website widget + Instagram/Facebook DMs with lead capture' },
  { id: 'website-gen', label: 'AI Website', description: 'Auto-generated business website deployed to Vercel' },
  { id: 'social-media', label: 'Social Media Automation', description: 'Content generation, scheduling, comment monitoring, auto-DM' },
  { id: 'lead-engine', label: 'Lead Engine', description: 'Lead normalization, dedup, SMS/email nurture sequences' },
  { id: 'survey-engine', label: 'Survey Engine', description: 'Automated surveys via SMS/email with response tracking' },
  { id: 'proposal-engine', label: 'Proposal Generator', description: 'AI proposals with PDF export and shareable links' },
] as const;

export default function NewBusinessPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  function toggleModule(id: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedModules(new Set(PRODUCTS.map((p) => p.id)));
  }

  function clearAll() {
    setSelectedModules(new Set());
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const get = (key: string) => (form.get(key) as string)?.trim() || undefined;

    const body: Record<string, unknown> = {
      name: get('name'),
      type: get('type') || 'RESTAURANT',
      phone: get('phone'),
      email: get('email'),
      website: get('website'),
      timezone: get('timezone'),
    };

    const street = get('street');
    const city = get('city');
    const state = get('state');
    const zip = get('zip');
    if (street && city && state && zip) {
      body.address = { street, city, state, zip, country: 'US' };
    }

    // Store selected products in settings with correct boolean format
    const notes = get('notes');
    body.settings = {
      voiceAgent: selectedModules.has('voice-agent'),
      chatbotAgent: selectedModules.has('chatbot-agent'),
      websiteGen: selectedModules.has('website-gen'),
      socialMedia: selectedModules.has('social-media'),
      leadEngine: selectedModules.has('lead-engine'),
      surveyEngine: selectedModules.has('survey-engine'),
      proposalEngine: selectedModules.has('proposal-engine'),
      ...(notes ? { notes } : {}),
    };

    // Remove undefined values
    for (const key of Object.keys(body)) {
      if (body[key] === undefined) delete body[key];
    }

    try {
      const res = await fetch(`${API_URL}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      router.push('/businesses');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors';

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-fade-up">
      <div>
        <a href="/businesses" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to Businesses
        </a>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-4">Onboard New Business</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Register a new business and select the products to build for them.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
            Business Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Mario's Pizzeria"
            className={inputClass}
          />
        </div>

        {/* Type + Timezone row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-1.5">
              Business Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue="RESTAURANT"
              className={inputClass}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t} className="bg-slate-900">
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-slate-300 mb-1.5">
              Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              defaultValue="America/New_York"
              className={inputClass}
            >
              {US_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-slate-900">
                  {tz.replace('America/', '').replace('Pacific/', '').replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1.5">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="owner@business.com"
              className={inputClass}
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-slate-300 mb-1.5">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://www.example.com"
            className={inputClass}
          />
        </div>

        {/* Address */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-300">Address (optional)</legend>
          <input
            name="street"
            type="text"
            placeholder="Street address"
            className={inputClass}
          />
          <div className="grid grid-cols-3 gap-3">
            <input name="city" type="text" placeholder="City" className={inputClass} />
            <input name="state" type="text" placeholder="State" className={inputClass} />
            <input name="zip" type="text" placeholder="ZIP" className={inputClass} />
          </div>
        </fieldset>

        {/* ── Products / Modules ─────────────────────────────────────────── */}
        <fieldset className="space-y-3">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium text-slate-300">Products to Deploy</legend>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={selectAll} className="text-violet-400 hover:text-violet-300 transition-colors">
                Select all
              </button>
              <button type="button" onClick={clearAll} className="text-slate-500 hover:text-slate-400 transition-colors">
                Clear
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            {PRODUCTS.map((product) => {
              const checked = selectedModules.has(product.id);
              return (
                <label
                  key={product.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-violet-500/10 border-violet-500/30'
                      : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(product.id)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50 focus:ring-offset-0"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-white">{product.label}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{product.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            {selectedModules.size} of {PRODUCTS.length} products selected
          </p>
        </fieldset>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1.5">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Any additional context about this business, special requirements, pricing agreements, etc."
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Onboarding...' : 'Onboard Business'}
          </button>
          <a href="/businesses" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
