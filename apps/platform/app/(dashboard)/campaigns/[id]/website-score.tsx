'use client';

import { useState } from 'react';

interface Props {
  /** Pre-computed score from database (0-10) */
  score: number | null;
  /** Detailed scorecard breakdown */
  scorecard?: Record<string, number | string> | null;
  /** Which method was used */
  scoringMethod?: string | null;
  /** Whether a chatbot was detected */
  hasChatbot?: boolean | null;
  /** Chatbot provider name */
  chatbotProvider?: string | null;
  /** Fallback: URL to score on-demand if no stored score */
  url?: string;
}

export function WebsiteScore({ score, scorecard, scoringMethod, hasChatbot, chatbotProvider, url }: Props) {
  const [expanded, setExpanded] = useState(false);

  // No stored score and no URL to check
  if (score == null && !url) {
    return <span className="text-[10px] text-slate-700">—</span>;
  }

  // No stored score yet — show pending
  if (score == null) {
    return <span className="text-[10px] text-slate-600">Pending</span>;
  }

  const scoreColor =
    score >= 7 ? 'text-emerald-400' :
    score >= 4 ? 'text-amber-400' :
    'text-red-400';

  const isAI = scoringMethod === 'ai-vision';

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => scorecard && setExpanded(!expanded)}
          className={`text-xs font-bold tabular-nums ${scoreColor} ${scorecard ? 'hover:underline cursor-pointer' : ''}`}
        >
          {score.toFixed(1)}
        </button>
        {isAI && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/15 text-violet-400 font-semibold uppercase">AI</span>
        )}
      </div>
      {hasChatbot ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium w-fit">
          {chatbotProvider === 'unknown' ? 'Chat' : chatbotProvider}
        </span>
      ) : (
        <span className="text-[9px] text-slate-600">No chatbot</span>
      )}

      {expanded && scorecard && (
        <div className="mt-1.5 p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg space-y-1.5">
          {['design', 'layout', 'branding', 'mobile', 'content'].map((key) => {
            const value = scorecard[key];
            if (typeof value !== 'number') return null;
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[9px] text-slate-500 capitalize">{key}</span>
                <span className={`text-[10px] font-bold tabular-nums ${value >= 7 ? 'text-emerald-400' : value >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                  {value.toFixed(1)}
                </span>
              </div>
            );
          })}
          {typeof scorecard['summary'] === 'string' && (
            <p className="text-[9px] text-slate-500 pt-1 border-t border-white/[0.06] leading-relaxed">
              {scorecard['summary']}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
