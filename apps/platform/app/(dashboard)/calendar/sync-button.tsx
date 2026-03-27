'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CalSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch('/api/cal-sync', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setResult(data.error);
      } else {
        setResult(`Synced ${data.total} bookings (${data.created} new, ${data.updated} updated)`);
        router.refresh();
      }
    } catch {
      setResult('API gateway not reachable — start services with pnpm dev');
    }
    setSyncing(false);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-500/20 text-sm font-medium text-violet-300 hover:bg-violet-600/30 hover:border-violet-500/30 transition-colors disabled:opacity-50"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}>
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        {syncing ? 'Syncing...' : 'Sync Cal.com'}
      </button>
      {result && (
        <span className={`text-xs ${result.includes('Synced') ? 'text-emerald-400' : result.includes('API gateway') ? 'text-yellow-400' : 'text-red-400'}`}>
          {result}
        </span>
      )}
    </div>
  );
}
