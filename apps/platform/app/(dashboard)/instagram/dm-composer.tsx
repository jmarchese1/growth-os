'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  instagramDmEnabled: boolean;
  instagramDmBody: string | null;
  _count: { prospects: number };
}

interface PreviewProspect {
  id: string;
  name: string;
  shortName: string | null;
  instagramHandle: string | null;
  instagramFollowers: number | null;
  businessType: string | null;
  isChain: boolean | null;
  email: string | null;
}

const TEMPLATE_VARS = [
  { key: '{{firstName}}', label: 'First Name' },
  { key: '{{shortName}}', label: 'Short Name' },
  { key: '{{type}}', label: 'Type' },
  { key: '{{company}}', label: 'Company' },
  { key: '{{city}}', label: 'City' },
];

const DEFAULT_DM = `Hey {{firstName}}, I saw {{shortName}} on Instagram and really love what you all are doing. I built a tool that handles phone calls and website chats for {{type}}s automatically when the team is busy. Would you be open to a quick demo? No pressure at all.`;

const PREVIEW_VARS: Record<string, string> = {
  '{{firstName}}': 'Michael',
  '{{shortName}}': 'Golden Dragon',
  '{{type}}': 'Chinese restaurant',
  '{{company}}': 'Golden Dragon Kitchen',
  '{{city}}': 'New York',
};

function formatFollowers(n: number | null): string {
  if (!n || n === 0) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function DmComposer({ prospectorUrl, campaigns }: { prospectorUrl: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [dmBody, setDmBody] = useState(DEFAULT_DM);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrapingFollowers, setScrapingFollowers] = useState(false);
  const [result, setResult] = useState<{ queued?: number; error?: string } | null>(null);

  // Queue preview
  const [preview, setPreview] = useState<PreviewProspect[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  function onCampaignChange(id: string) {
    setSelectedCampaignId(id);
    setResult(null);
    setExcluded(new Set());
    const campaign = campaigns.find(c => c.id === id);
    if (campaign?.instagramDmBody) {
      setDmBody(campaign.instagramDmBody);
    }
    // Load preview
    if (id) {
      setPreviewLoading(true);
      fetch(`${prospectorUrl}/instagram/dm/preview?campaignId=${id}`)
        .then(r => r.json())
        .then((data: { items: PreviewProspect[] }) => setPreview(data.items))
        .catch(() => setPreview([]))
        .finally(() => setPreviewLoading(false));
    } else {
      setPreview([]);
    }
  }

  async function scrapeFollowers() {
    if (!selectedCampaignId) return;
    setScrapingFollowers(true);
    try {
      await fetch(`${prospectorUrl}/instagram/scrape-followers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaignId }),
      });
      // Refresh preview after a delay
      setTimeout(() => {
        onCampaignChange(selectedCampaignId);
        setScrapingFollowers(false);
      }, 5000);
    } catch {
      setScrapingFollowers(false);
    }
  }

  async function saveTemplate() {
    if (!selectedCampaignId) return;
    setSaving(true);
    try {
      await fetch(`${prospectorUrl}/campaigns/${selectedCampaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramDmBody: dmBody, instagramDmEnabled: true }),
      });
      router.refresh();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function sendToCampaign() {
    if (!selectedCampaignId) return;
    setSending(true);
    setResult(null);
    try {
      // Save template first
      await fetch(`${prospectorUrl}/campaigns/${selectedCampaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramDmBody: dmBody, instagramDmEnabled: true }),
      });

      // Queue DMs (excluding removed prospects)
      const res = await fetch(`${prospectorUrl}/instagram/dm/send-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaignId, excludeIds: [...excluded] }),
      });
      const data = await res.json() as { queued?: number; error?: string };
      setResult(data);
      router.refresh();
    } catch {
      setResult({ error: 'Network error' });
    } finally {
      setSending(false);
    }
  }

  function toggleExclude(id: string) {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function insertVar(varKey: string) {
    setDmBody(prev => prev + varKey);
  }

  const eligibleCount = preview.filter(p => !excluded.has(p.id)).length;
  const previewText = Object.entries(PREVIEW_VARS).reduce((s, [k, v]) => s.replaceAll(k, v), dmBody);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-white">Compose DM</h2>

      {/* Campaign picker */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Campaign</label>
        <select
          value={selectedCampaignId}
          onChange={(e) => onCampaignChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#12101f] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none"
        >
          <option value="">Select a campaign...</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id} className="bg-[#12101f]">
              {c.name} — {c.targetCity} ({c._count.prospects} prospects)
            </option>
          ))}
        </select>
      </div>

      {selectedCampaignId && (
        <>
          {/* Variable pills */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">DM Template</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TEMPLATE_VARS.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.key)}
                  className="px-2 py-1 text-[10px] font-semibold rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-300 hover:bg-pink-500/20 transition-colors"
                >
                  {v.label}
                </button>
              ))}
            </div>
            <textarea
              value={dmBody}
              onChange={(e) => setDmBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y leading-relaxed"
            />
          </div>

          {/* Preview bubble */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Preview</label>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0" />
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2">
                  <p className="text-xs text-white leading-relaxed">{previewText}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Queue Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Queue Preview — {eligibleCount} prospects will be DM&apos;d
              </label>
              <button
                onClick={scrapeFollowers}
                disabled={scrapingFollowers}
                className="text-[10px] px-2 py-1 rounded bg-pink-500/10 border border-pink-500/20 text-pink-300 hover:bg-pink-500/20 transition-colors disabled:opacity-50"
              >
                {scrapingFollowers ? 'Scraping...' : 'Scrape Followers'}
              </button>
            </div>

            {previewLoading ? (
              <p className="text-xs text-slate-600 py-4 text-center">Loading preview...</p>
            ) : preview.length === 0 ? (
              <p className="text-xs text-slate-600 py-4 text-center">No eligible prospects with Instagram handles</p>
            ) : (
              <div className="max-h-[250px] overflow-y-auto border border-white/5 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5">
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase">Business</th>
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase">Handle</th>
                      <th className="text-right px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase">Followers</th>
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase">Type</th>
                      <th className="text-center px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase">Send</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {preview.map(p => {
                      const isExcluded = excluded.has(p.id);
                      return (
                        <tr key={p.id} className={isExcluded ? 'opacity-30' : 'hover:bg-white/[0.02]'}>
                          <td className="px-3 py-1.5 text-slate-300">{p.shortName ?? p.name}</td>
                          <td className="px-3 py-1.5">
                            <a href={`https://instagram.com/${p.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300">
                              @{p.instagramHandle}
                            </a>
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-400">{formatFollowers(p.instagramFollowers)}</td>
                          <td className="px-3 py-1.5 text-slate-500">{p.businessType ?? '—'}</td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              onClick={() => toggleExclude(p.id)}
                              className={`w-5 h-5 rounded border transition-colors ${
                                isExcluded
                                  ? 'border-slate-700 bg-transparent'
                                  : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {!isExcluded && <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mx-auto"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {result && (
            <div className={`text-xs px-3 py-2 rounded-lg ${result.error ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {result.error ?? `${result.queued} DMs queued for delivery`}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="px-4 py-2 bg-white/5 text-slate-300 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
            <button
              onClick={sendToCampaign}
              disabled={sending || !dmBody || eligibleCount === 0}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? 'Queuing...' : `Send ${eligibleCount} DMs`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
