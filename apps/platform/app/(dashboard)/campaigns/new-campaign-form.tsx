'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_SUBJECT = `quick question for {{businessName}}`;

const DEFAULT_BODY = `<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px;">
  <p>Hey {{businessName}},</p>

  <p>
    Came across your place in {{city}} and wanted to reach out directly.
    I help restaurants stop losing customers to missed calls and slow follow-ups
    using a simple AI layer that runs in the background 24/7.
  </p>

  <p>
    Takes about a week to set up and most places recover a few lost reservations
    in the first week alone. Happy to show you exactly what it looks like for your spot.
  </p>

  <table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-right: 12px; vertical-align: middle; width: 56px;">
        <img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" />
      </td>
      <td style="vertical-align: middle;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p>
        <p style="margin: 2px 0 0; font-size: 13px; color: #666;">Data Scientist · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p>
      </td>
    </tr>
  </table>

  <p style="margin-top: 32px; font-size: 11px; color: #bbb;">
    Saw your restaurant in a local search. Not interested?
    <a href="mailto:{{replyEmail}}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a>
  </p>
</div>`;

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' },
];

interface AutocompleteResult {
  label: string;
  city: string;
  state: string;
  lon: number;
  lat: number;
}

export function NewCampaignForm({ prospectorUrl }: { prospectorUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPreviewHtml, setAiPreviewHtml] = useState('');
  const [aiPreviewing, setAiPreviewing] = useState(false);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);

  // Location
  const [selectedState, setSelectedState] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [cityCoords, setCityCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingCities, setFetchingCities] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    name: '',
    targetIndustry: 'RESTAURANT',
    maxProspects: '50',
    emailSubject: DEFAULT_SUBJECT,
    emailBodyHtml: DEFAULT_BODY,
  });

  useEffect(() => {
    fetch(`${prospectorUrl}/ai/status`)
      .then((r) => r.json())
      .then((d: { aiEnabled?: boolean }) => setAiEnabled(d.aiEnabled ?? false))
      .catch(() => setAiEnabled(false));
  }, [prospectorUrl]);

  const fetchSuggestions = useCallback(async (q: string, state: string) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setFetchingCities(true);
    try {
      const params = new URLSearchParams({ q });
      if (state) params.set('state', state);
      const res = await fetch(`${prospectorUrl}/geocode/autocomplete?${params}`);
      if (res.ok) {
        const data = (await res.json()) as AutocompleteResult[];
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch { /* silent */ } finally {
      setFetchingCities(false);
    }
  }, [prospectorUrl]);

  function onCityInputChange(value: string) {
    setCityInput(value);
    setCityCoords(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value, selectedState), 280);
  }

  function onStateChange(code: string) {
    setSelectedState(code);
    setCityCoords(null);
    if (cityInput.length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(cityInput, code), 280);
    }
  }

  function selectSuggestion(s: AutocompleteResult) {
    setCityInput(s.label);
    setCityCoords({ lat: s.lat, lon: s.lon });
    if (!selectedState && s.state) setSelectedState(s.state);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cityCoords) {
      setError('Please select a city from the dropdown to confirm the location.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        targetCity: cityInput,
        targetState: selectedState || undefined,
        targetCountry: 'US',
        targetLat: cityCoords.lat,
        targetLon: cityCoords.lon,
        maxProspects: form.maxProspects === 'unlimited' ? null : parseInt(form.maxProspects),
      };
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
      router.refresh();
      setOpen(false);
      setForm({ ...form, name: '', maxProspects: '50' });
      setCityInput('');
      setSelectedState('');
      setCityCoords(null);
    } catch {
      setError('Network error — is the prospector service running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleAiPreview() {
    setAiPreviewing(true);
    setAiPreviewOpen(true);
    setAiPreviewHtml('');
    try {
      const res = await fetch(`${prospectorUrl}/ai/preview-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || 'Acme Restaurant',
          city: cityInput || 'New York',
          website: 'acmerestaurant.com',
          googleRating: 4.3,
          googleReviewCount: 218,
        }),
      });
      const data = (await res.json()) as { html?: string; error?: string };
      if (!res.ok || !data.html) {
        setAiPreviewHtml(`<p style="color:red">Error: ${data.error ?? 'Generation failed'}</p>`);
        return;
      }
      setAiPreviewHtml(data.html);
    } catch {
      setAiPreviewHtml(`<p style="color:red">Network error</p>`);
    } finally {
      setAiPreviewing(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors";
  const selectCls = "w-full px-3 py-2.5 bg-[#12101f] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors appearance-none";
  const optionCls = "bg-[#12101f] text-white";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors"
      >
        + New Campaign
      </button>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* AI active banner */}
        {aiEnabled && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-violet-500/10 border border-violet-500/25 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
            <p className="text-xs text-violet-300">
              <span className="font-semibold">AI personalization active</span>
              {' '}— Claude will write a unique email for each prospect at send time using their business name, city, Google rating, and website. The template below is used as a fallback only.
            </p>
          </div>
        )}

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

        {/* Location — US State + City autocomplete */}
        <div>
          <label className={labelCls}>
            Target Location
            <span className="text-slate-600 normal-case font-normal tracking-normal ml-1">— United States</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <select
                value={selectedState}
                onChange={(e) => onStateChange(e.target.value)}
                className={selectCls}
              >
                <option value="" className={optionCls}>All states</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code} className={optionCls}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 relative">
              <input
                required
                value={cityInput}
                onChange={(e) => onCityInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={selectedState ? `City in ${selectedState}…` : 'Type a city name…'}
                className={inputCls + (cityCoords ? ' !border-emerald-500/50 !ring-1 !ring-emerald-500/30' : '')}
                autoComplete="off"
              />
              {cityCoords && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-medium">✓ confirmed</span>
              )}
              {fetchingCities && !cityCoords && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs animate-pulse">searching…</span>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1730] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-violet-600/20 hover:text-white transition-colors flex items-center gap-2.5"
                    >
                      <span className="text-[10px] font-semibold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">{s.state}</span>
                      {s.city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!cityCoords && cityInput.length > 1 && !fetchingCities && suggestions.length === 0 && (
            <p className="text-[10px] text-amber-500/70 mt-1.5">No cities found — try a different spelling or select a state first.</p>
          )}
          {!cityCoords && cityInput.length > 1 && suggestions.length > 0 && (
            <p className="text-[10px] text-slate-600 mt-1.5">Select a city from the list to confirm the location.</p>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Max Businesses to Contact
            <span className="text-slate-600 normal-case font-normal tracking-normal ml-1">— per run</span>
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

        <div>
          <label className={labelCls}>
            Email Subject <span className="text-slate-600 normal-case font-normal tracking-normal">— use &#123;&#123;businessName&#125;&#125;</span>
          </label>
          <input
            required
            value={form.emailSubject}
            onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + ' mb-0'}>
              {aiEnabled ? 'Fallback Email Body' : 'Email Body HTML'}
              {!aiEnabled && <span className="text-slate-600 normal-case font-normal tracking-normal ml-1">— &#123;&#123;businessName&#125;&#125;, &#123;&#123;city&#125;&#125;</span>}
            </label>
            {aiEnabled && (
              <button
                type="button"
                onClick={handleAiPreview}
                disabled={aiPreviewing}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/25 rounded-lg hover:bg-violet-500/20 transition-colors disabled:opacity-50"
              >
                <svg className={`w-3 h-3 ${aiPreviewing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={aiPreviewing ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                </svg>
                {aiPreviewing ? 'Generating…' : 'Preview AI Email'}
              </button>
            )}
          </div>
          <textarea
            required
            rows={aiEnabled ? 5 : 8}
            value={form.emailBodyHtml}
            onChange={(e) => setForm({ ...form, emailBodyHtml: e.target.value })}
            className={inputCls + ' font-mono resize-y' + (aiEnabled ? ' opacity-50' : '')}
            placeholder={aiEnabled ? 'Used as fallback if AI generation fails…' : ''}
          />
          {aiEnabled && (
            <p className="text-[10px] text-slate-600 mt-1">This template is only sent if Claude AI is unavailable.</p>
          )}
        </div>

        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2.5 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* AI Preview Modal */}
      {aiPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAiPreviewOpen(false)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">AI Email Preview</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sample: &ldquo;{form.name || 'Acme Restaurant'}&rdquo; · {cityInput || 'New York'} · ★ 4.3</p>
              </div>
              <button onClick={() => setAiPreviewOpen(false)} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
            </div>
            <div className="bg-white" style={{ minHeight: '300px' }}>
              {aiPreviewing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center text-slate-400 text-sm">Claude is writing a personalized email…</div>
                </div>
              ) : (
                <iframe
                  srcDoc={aiPreviewHtml}
                  className="w-full border-0"
                  style={{ height: '400px' }}
                  title="AI email preview"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
              <p className="text-[10px] text-slate-600">Each prospect gets a uniquely written version based on their actual data. This is just one example.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
