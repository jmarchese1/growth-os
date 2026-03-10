'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  campaignId: string;
  prospectorUrl: string;
  newCount: number; // prospects with no email
}

export function EnrichHunterButton({ campaignId, prospectorUrl, newCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ enriched: number; checked: number } | null>(null);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/enrich-hunter`, { method: 'POST' });
      const data = (await res.json()) as { enriched?: number; checked?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Enrichment failed');
        return;
      }
      setResult({ enriched: data.enriched ?? 0, checked: data.checked ?? 0 });
      router.refresh();
    } catch {
      setError('Network error — is the prospector running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={loading || newCount === 0}
        title={newCount === 0 ? 'No prospects without emails' : `Find emails for ${newCount} prospects via Hunter.io`}
        className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-xs font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        {loading ? (
          <>
            <span className="w-3 h-3 rounded-full border border-slate-500 border-t-white animate-spin" />
            Enriching…
          </>
        ) : (
          <>
            Hunter.io
            {newCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded text-[10px]">
                {newCount}
              </span>
            )}
          </>
        )}
      </button>
      {result && (
        <span className="text-xs text-emerald-400">
          Found {result.enriched}/{result.checked} emails
        </span>
      )}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
