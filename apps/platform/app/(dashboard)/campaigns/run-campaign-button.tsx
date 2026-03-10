'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RunCampaignButton({ campaignId, prospectorUrl }: { campaignId: string; prospectorUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');

  async function run() {
    setState('running');
    try {
      await fetch(`${prospectorUrl}/campaigns/${campaignId}/run`, { method: 'POST' });
      setState('done');
      setTimeout(() => {
        setState('idle');
        router.refresh();
      }, 3000);
    } catch {
      setState('idle');
    }
  }

  return (
    <button
      onClick={run}
      disabled={state !== 'idle'}
      className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-50 font-medium"
    >
      {state === 'running' ? 'Running…' : state === 'done' ? 'Started!' : 'Run'}
    </button>
  );
}
