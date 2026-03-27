'use client';

import { useState, useEffect } from 'react';

interface SiteCheckResult {
  score: number;
  hasChatbot: boolean;
  chatbotProvider: string | null;
  error?: string;
}

// In-memory cache to avoid re-fetching the same site repeatedly
const cache = new Map<string, SiteCheckResult>();

export function WebsiteScore({ url }: { url: string }) {
  const [result, setResult] = useState<SiteCheckResult | null>(cache.get(url) ?? null);
  const [loading, setLoading] = useState(!cache.has(url));

  useEffect(() => {
    if (cache.has(url)) { setResult(cache.get(url)!); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/site-check?url=${encodeURIComponent(url)}`);
        if (res.ok && !cancelled) {
          const data = await res.json() as SiteCheckResult;
          cache.set(url, data);
          setResult(data);
        }
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return <span className="text-[10px] text-slate-600 animate-pulse">checking...</span>;
  }

  if (!result || result.error) {
    return <span className="text-[10px] text-slate-600">—</span>;
  }

  const scoreColor =
    result.score >= 7 ? 'text-emerald-400' :
    result.score >= 4 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xs font-bold tabular-nums ${scoreColor}`}>{result.score.toFixed(1)}</span>
      {result.hasChatbot ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium w-fit">
          {result.chatbotProvider === 'unknown' ? 'Chat' : result.chatbotProvider}
        </span>
      ) : (
        <span className="text-[9px] text-slate-600">No chatbot</span>
      )}
    </div>
  );
}
