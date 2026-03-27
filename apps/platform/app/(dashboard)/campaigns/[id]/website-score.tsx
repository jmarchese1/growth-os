'use client';

import { useState, useEffect } from 'react';

interface Scorecard {
  design: number;
  layout: number;
  branding: number;
  mobile: number;
  content: number;
  summary: string;
}

interface SiteCheckResult {
  score: number;
  scorecard?: Scorecard;
  scoringMethod?: 'ai-vision' | 'html-heuristic';
  hasChatbot: boolean;
  chatbotProvider: string | null;
  error?: string;
}

// In-memory cache to avoid re-fetching the same site
const cache = new Map<string, SiteCheckResult>();

export function WebsiteScore({ url }: { url: string }) {
  const [result, setResult] = useState<SiteCheckResult | null>(cache.get(url) ?? null);
  const [loading, setLoading] = useState(!cache.has(url));
  const [expanded, setExpanded] = useState(false);

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
    return <span className="text-[10px] text-slate-600 animate-pulse">scoring...</span>;
  }

  if (!result || result.error) {
    return <span className="text-[10px] text-slate-600">—</span>;
  }

  const scoreColor =
    result.score >= 7 ? 'text-emerald-400' :
    result.score >= 4 ? 'text-amber-400' :
    'text-red-400';

  const isAI = result.scoringMethod === 'ai-vision';

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => result.scorecard && setExpanded(!expanded)}
          className={`text-xs font-bold tabular-nums ${scoreColor} ${result.scorecard ? 'hover:underline cursor-pointer' : ''}`}
        >
          {result.score.toFixed(1)}
        </button>
        {isAI && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/15 text-violet-400 font-semibold uppercase">AI</span>
        )}
      </div>
      {result.hasChatbot ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium w-fit">
          {result.chatbotProvider === 'unknown' ? 'Chat' : result.chatbotProvider}
        </span>
      ) : (
        <span className="text-[9px] text-slate-600">No chatbot</span>
      )}

      {/* Expanded AI scorecard */}
      {expanded && result.scorecard && (
        <div className="mt-1.5 p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg space-y-1.5">
          {[
            { label: 'Design', value: result.scorecard.design },
            { label: 'Layout', value: result.scorecard.layout },
            { label: 'Branding', value: result.scorecard.branding },
            { label: 'Mobile', value: result.scorecard.mobile },
            { label: 'Content', value: result.scorecard.content },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500">{label}</span>
              <span className={`text-[10px] font-bold tabular-nums ${value >= 7 ? 'text-emerald-400' : value >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                {value.toFixed(1)}
              </span>
            </div>
          ))}
          {result.scorecard.summary && (
            <p className="text-[9px] text-slate-500 pt-1 border-t border-white/[0.06] leading-relaxed">
              {result.scorecard.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
