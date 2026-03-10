'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type State = 'idle' | 'running' | 'error';

interface Props {
  campaignId: string;
  prospectorUrl: string;
  initialTotal?: number;
}

export function RunCampaignButton({ campaignId, prospectorUrl, initialTotal = 0 }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [liveTotal, setLiveTotal] = useState(initialTotal);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/stats`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { total: number };
          setLiveTotal(data.total);
        }
      } catch { /* silent */ }
    }, 4000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  async function run() {
    setState('running');
    setError('');
    startPolling();

    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/run`, { method: 'POST' });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        stopPolling();
        setState('error');
        setError(data.error ?? 'Failed to start campaign');
        return;
      }

      // Scraping is async — keep polling for 90s then do a full page refresh
      setTimeout(() => {
        stopPolling();
        setState('idle');
        router.refresh();
      }, 90_000);
    } catch {
      stopPolling();
      setState('error');
      setError('Network error — is the prospector service running?');
    }
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-xs">
          {error}
        </p>
        <button
          onClick={() => setState('idle')}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors w-fit"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (state === 'running') {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
          <div className="h-full w-1/2 bg-violet-500 rounded-full animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-semibold text-violet-300">
            Scraping{liveTotal > 0 ? ` · ${liveTotal} found` : '…'}
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">
            Geoapify → enrich emails → queue outreach
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={run}
      className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium"
    >
      Run
    </button>
  );
}
