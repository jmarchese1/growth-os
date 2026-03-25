'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  campaignId: string;
  prospectorUrl: string;
  enrichedCount: number;
}

export function SendCampaignButton({ campaignId, prospectorUrl, enrichedCount }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (enrichedCount === 0) return null;

  async function send() {
    if (!confirm(`Send outreach emails to ${enrichedCount} enriched prospects?`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/send`, { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; queued?: number; error?: string };
      if (res.ok) {
        setResult({ ok: true, message: `${data.queued} emails queued` });
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error ?? 'Failed to send' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <span className={`text-xs px-3 py-1.5 rounded-lg ${result.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
        {result.message}
      </span>
    );
  }

  return (
    <button
      onClick={send}
      disabled={sending}
      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors font-medium disabled:opacity-50"
    >
      {sending ? 'Sending...' : `Send (${enrichedCount})`}
    </button>
  );
}
