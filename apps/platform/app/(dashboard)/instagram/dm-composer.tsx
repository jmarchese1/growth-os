'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  instagramDmEnabled: boolean;
  instagramDmBody: string | null;
  _count: { prospects: number };
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

export function DmComposer({ prospectorUrl, campaigns }: { prospectorUrl: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [dmBody, setDmBody] = useState(DEFAULT_DM);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ queued?: number; error?: string } | null>(null);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Load existing DM template when campaign changes
  function onCampaignChange(id: string) {
    setSelectedCampaignId(id);
    setResult(null);
    const campaign = campaigns.find(c => c.id === id);
    if (campaign?.instagramDmBody) {
      setDmBody(campaign.instagramDmBody);
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

      // Queue DMs
      const res = await fetch(`${prospectorUrl}/instagram/dm/send-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaignId }),
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

  function insertVar(varKey: string) {
    setDmBody(prev => prev + varKey);
  }

  const preview = Object.entries(PREVIEW_VARS).reduce((s, [k, v]) => s.replaceAll(k, v), dmBody);

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
              rows={5}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y leading-relaxed"
            />
            <p className="text-[10px] text-slate-600 mt-1">Keep DMs short and personal. 1-3 sentences works best.</p>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Preview</label>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0" />
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-white leading-relaxed">{preview}</p>
                </div>
              </div>
            </div>
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
              disabled={sending || !dmBody}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? 'Queuing...' : 'Send DMs to Campaign'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
