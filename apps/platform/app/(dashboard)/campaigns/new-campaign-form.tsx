'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Apollo industry options — keyword tag + SIC codes for precise filtering.
const APOLLO_INDUSTRIES = [
  { id: 'restaurants', label: 'Restaurants', sic: ['5812'] },
  { id: 'food & beverages', label: 'Food & Beverages', sic: ['5812', '5461', '5441'] },
  { id: 'bars & nightlife', label: 'Bars & Nightlife', sic: ['5813'] },
  { id: 'hospitality', label: 'Hospitality', sic: ['7011', '7041'] },
  { id: 'health, wellness and fitness', label: 'Health & Fitness', sic: ['7991', '8049'] },
  { id: 'retail', label: 'Retail', sic: ['5411', '5999'] },
  { id: 'automotive', label: 'Automotive', sic: ['5511', '7538'] },
  { id: 'real estate', label: 'Real Estate', sic: ['6512', '6531'] },
  { id: 'construction', label: 'Construction', sic: ['1522', '1542'] },
  { id: 'medical practice', label: 'Medical & Dental', sic: ['8011', '8021'] },
  { id: 'beauty', label: 'Beauty & Spas', sic: ['7231', '7241'] },
  { id: 'education', label: 'Education', sic: ['8211', '8299'] },
  { id: 'entertainment', label: 'Entertainment', sic: ['7812', '7941'] },
  { id: 'consumer services', label: 'Consumer Services', sic: ['7299'] },
  { id: 'legal', label: 'Legal Services', sic: ['8111'] },
];

interface ResolvedLocation {
  city: string;
  state: string;
  lat: number;
  lon: number;
  bbox: { lon1: number; lat1: number; lon2: number; lat2: number };
}

export function NewCampaignForm({ prospectorUrl }: { prospectorUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Location — free text + AI resolution
  const [locationText, setLocationText] = useState('');
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [discoverySource, setDiscoverySource] = useState<'geoapify' | 'apollo'>('geoapify');
  const [apolloIndustries, setApolloIndustries] = useState<string[]>([]);
  const [apolloEmployeeRange, setApolloEmployeeRange] = useState('1-10');

  const [form, setForm] = useState({
    name: '',
    targetIndustry: 'RESTAURANT',
    maxProspects: '50',
  });

  async function resolveLocation() {
    if (!locationText.trim()) return;
    setResolving(true);
    setResolveError('');
    setResolvedLocation(null);
    try {
      const res = await fetch(`${prospectorUrl}/resolve-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: locationText.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setResolveError(data.error ?? 'Failed to resolve location');
        return;
      }
      const location = (await res.json()) as ResolvedLocation;
      setResolvedLocation(location);

      // Auto-fill campaign name if empty
      if (!form.name) {
        setForm(f => ({ ...f, name: `${location.city}, ${location.state} Restaurants` }));
      }
    } catch {
      setResolveError('Network error — is the prospector service running?');
    } finally {
      setResolving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedLocation) {
      setError('Please resolve a location first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        ...form,
        emailSubject: 'quick question about {{shortName}}',
        emailBodyHtml: `Hey {{firstName}},\n\nMy name is Jason. I am a data scientist and have been building a tool on the side that helps restaurants handle phone calls and website inquiries automatically when the team is too busy to pick up. Thought it might be useful for {{shortName}}.\n\nBasically when a customer calls and no one can answer, the system picks up, takes orders, books reservations, and answers questions about the menu. It sounds like a real person, not a robot. I also built a chatbot that does the same thing for people visiting your website.\n\nWould love to set one up for {{shortName}} for free if you are open to seeing how it works. No strings attached.\n\nBest,\nJason`,
        targetCity: `${resolvedLocation.city}, ${resolvedLocation.state}`,
        targetState: resolvedLocation.state,
        targetCountry: 'US',
        targetLat: resolvedLocation.lat,
        targetLon: resolvedLocation.lon,
        targetBboxLon1: resolvedLocation.bbox.lon1,
        targetBboxLat1: resolvedLocation.bbox.lat1,
        targetBboxLon2: resolvedLocation.bbox.lon2,
        targetBboxLat2: resolvedLocation.bbox.lat2,
        maxProspects: form.maxProspects === 'unlimited' ? null : parseInt(form.maxProspects),
        discoverySource,
      };
      if (discoverySource === 'apollo') {
        payload.apolloIndustries = apolloIndustries.length > 0 ? apolloIndustries : undefined;
        const sicCodes = apolloIndustries.flatMap(
          (id) => APOLLO_INDUSTRIES.find((ind) => ind.id === id)?.sic ?? []
        );
        if (sicCodes.length > 0) payload.apolloSicCodes = sicCodes;
        payload.apolloEmployeeRanges = [apolloEmployeeRange];
      }
      const res = await fetch(`${prospectorUrl}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to create campaign');
        return;
      }
      const campaign = (await res.json()) as { id: string };

      // Auto-run the campaign immediately after creation
      const runRes = await fetch(`${prospectorUrl}/campaigns/${campaign.id}/run`, { method: 'POST' });
      if (!runRes.ok) {
        const runData = (await runRes.json().catch(() => ({}))) as { error?: string };
        setError(runData.error ?? 'Campaign created but failed to start discovery');
        router.refresh();
        return;
      }

      router.refresh();
      setOpen(false);
      setForm({ name: '', targetIndustry: 'RESTAURANT', maxProspects: '50' });
      setLocationText('');
      setResolvedLocation(null);
    } catch {
      setError('Network error — is the prospector service running?');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-ink-2 border border-rule rounded-lg text-sm text-paper placeholder:text-paper-4 focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal transition-colors";
  const selectCls = "w-full px-3 py-2.5 bg-[#171717] border border-rule rounded-lg text-sm text-paper focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal transition-colors appearance-none";
  const optionCls = "bg-[#171717] text-paper";
  const labelCls = "block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-signal text-ink-0 text-paper text-sm font-semibold rounded-lg hover:bg-paper hover:text-ink-0 transition-colors"
      >
        + New Campaign
      </button>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Campaign Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="NYC Restaurants Q1"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Industry</label>
            <select
              value={form.targetIndustry}
              onChange={(e) => setForm({ ...form, targetIndustry: e.target.value })}
              className={selectCls}
            >
              <option value="RESTAURANT" className={optionCls}>Restaurant</option>
              <option value="SALON" className={optionCls}>Salon</option>
              <option value="RETAIL" className={optionCls}>Retail</option>
              <option value="FITNESS" className={optionCls}>Fitness</option>
              <option value="MEDICAL" className={optionCls}>Medical</option>
              <option value="OTHER" className={optionCls}>Other</option>
            </select>
          </div>
        </div>

        {/* Discovery Source Toggle */}
        <div>
          <label className={labelCls}>Discovery Source</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDiscoverySource('geoapify')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                discoverySource === 'geoapify'
                  ? 'bg-signal text-ink-0 text-paper'
                  : 'bg-ink-2 text-paper-3 border border-rule hover:border-rule-strong'
              }`}
            >
              Geoapify (Places)
            </button>
            <button
              type="button"
              onClick={() => setDiscoverySource('apollo')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                discoverySource === 'apollo'
                  ? 'bg-signal text-ink-0 text-paper'
                  : 'bg-ink-2 text-paper-3 border border-rule hover:border-rule-strong'
              }`}
            >
              Apollo (People)
            </button>
          </div>
          <p className="text-[10px] text-paper-4 mt-1.5">
            {discoverySource === 'geoapify'
              ? 'Finds businesses via Google Maps data. Best for discovering local restaurants by location.'
              : 'Finds businesses and their owners/managers via Apollo.io. Best for finding decision-makers with verified emails.'}
          </p>
        </div>

        {/* Apollo-specific options */}
        {discoverySource === 'apollo' && (
          <div className="space-y-4 p-4 bg-signal-soft border border-rule rounded-lg">
            <p className="text-xs font-semibold text-signal uppercase tracking-wide">Apollo Settings</p>

            <div>
              <label className={labelCls}>Industries</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                {APOLLO_INDUSTRIES.map((ind) => (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() =>
                      setApolloIndustries((prev) =>
                        prev.includes(ind.id) ? prev.filter((i) => i !== ind.id) : [...prev, ind.id]
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      apolloIndustries.includes(ind.id)
                        ? 'bg-signal text-ink-0 text-paper border-signal'
                        : 'bg-ink-2 text-paper-3 border-rule hover:border-rule-strong'
                    }`}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-paper-4 mt-1.5">Select one or more. These map directly to Apollo.io industry tags.</p>
            </div>

            <div>
              <label className={labelCls}>Employee Count</label>
              <select
                value={apolloEmployeeRange}
                onChange={(e) => setApolloEmployeeRange(e.target.value)}
                className={selectCls}
              >
                <option value="1-10" className={optionCls}>1-10 employees</option>
                <option value="11-50" className={optionCls}>11-50 employees</option>
                <option value="51-200" className={optionCls}>51-200 employees</option>
                <option value="201-500" className={optionCls}>201-500 employees</option>
                <option value="501-1000" className={optionCls}>501-1000 employees</option>
              </select>
            </div>
          </div>
        )}

        {/* Location — AI-powered free text */}
        <div>
          <label className={labelCls}>
            Target Location
            <span className="text-paper-4 normal-case font-normal tracking-normal ml-1">— type any location, AI will set the boundary</span>
          </label>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={locationText}
                onChange={(e) => {
                  setLocationText(e.target.value);
                  setResolvedLocation(null);
                  setResolveError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !resolvedLocation) {
                    e.preventDefault();
                    resolveLocation();
                  }
                }}
                placeholder="Staten Island, NY  /  Manhattan  /  Edison, NJ  /  Chicago, IL"
                className={inputCls + (resolvedLocation ? ' !border-emerald-500/50' : '')}
                autoComplete="off"
              />
              {resolvedLocation && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-medium flex items-center gap-1">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Resolved
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={resolveLocation}
              disabled={resolving || !locationText.trim() || !!resolvedLocation}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                resolvedLocation
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : resolving
                    ? 'bg-signal-soft text-signal border border-signal'
                    : 'bg-signal text-ink-0 text-paper hover:bg-paper hover:text-ink-0'
              } disabled:opacity-50`}
            >
              {resolving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Resolving...
                </span>
              ) : resolvedLocation ? (
                'Resolved'
              ) : (
                'Resolve'
              )}
            </button>
          </div>

          {resolveError && (
            <p className="text-red-400 text-xs mt-1.5">{resolveError}</p>
          )}

          {resolvedLocation && (
            <div className="mt-2 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-paper">{resolvedLocation.city}, {resolvedLocation.state}</p>
                  <p className="text-[10px] text-paper-4 mt-0.5 font-mono">
                    bbox: {resolvedLocation.bbox.lat1.toFixed(4)},{resolvedLocation.bbox.lon1.toFixed(4)} to {resolvedLocation.bbox.lat2.toFixed(4)},{resolvedLocation.bbox.lon2.toFixed(4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResolvedLocation(null);
                    setLocationText('');
                    inputRef.current?.focus();
                  }}
                  className="text-xs text-paper-4 hover:text-paper transition-colors px-2 py-1 rounded hover:bg-ink-2"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {!resolvedLocation && !resolveError && locationText.length > 0 && (
            <p className="text-[10px] text-paper-4 mt-1.5">Press Enter or click Resolve to set the search boundary via AI.</p>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Max Businesses to Contact
            <span className="text-paper-4 normal-case font-normal tracking-normal ml-1">— per run</span>
          </label>
          <select
            value={form.maxProspects}
            onChange={(e) => setForm({ ...form, maxProspects: e.target.value })}
            className={selectCls}
          >
            <option value="10" className={optionCls}>10 businesses</option>
            <option value="25" className={optionCls}>25 businesses</option>
            <option value="50" className={optionCls}>50 businesses</option>
            <option value="100" className={optionCls}>100 businesses</option>
            <option value="250" className={optionCls}>250 businesses</option>
            <option value="unlimited" className={optionCls}>Unlimited</option>
          </select>
        </div>

        <p className="text-[10px] text-paper-4 bg-ink-2 border border-rule rounded-lg px-3 py-2">
          Emails are configured after campaign creation using the sequence editor and email builder.
        </p>

        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !resolvedLocation}
            className="px-5 py-2.5 bg-signal text-ink-0 text-paper text-sm font-semibold rounded-lg hover:bg-paper hover:text-ink-0 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create & Run Campaign'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2.5 bg-ink-2 text-paper-3 text-sm font-medium rounded-lg hover:bg-ink-3 hover:text-paper transition-colors border border-rule"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
