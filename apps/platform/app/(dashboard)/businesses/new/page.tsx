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

export default function NewBusinessPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-fade-up">
      <div>
        <a href="/businesses" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          ← Back to Businesses
        </a>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-4">Onboard New Business</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Register a new business to deploy its AI automation layer.
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* Address */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-300">Address (optional)</legend>
          <input
            name="street"
            type="text"
            placeholder="Street address"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              name="city"
              type="text"
              placeholder="City"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
            />
            <input
              name="state"
              type="text"
              placeholder="State"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
            />
            <input
              name="zip"
              type="text"
              placeholder="ZIP"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
            />
          </div>
        </fieldset>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Onboarding…' : 'Onboard Business'}
          </button>
          <a href="/businesses" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
