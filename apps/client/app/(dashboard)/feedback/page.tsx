'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';
import { KpiCard } from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const RATING_BADGES: Record<string, string> = {
  EXCELLENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  GOOD: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  OKAY: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  POOR: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  TERRIBLE: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

const RATING_STARS: Record<string, string> = { TERRIBLE: '1', POOR: '2', OKAY: '3', GOOD: '4', EXCELLENT: '5' };

interface FeedbackEntry {
  id: string;
  customerName?: string;
  customerPhone?: string;
  triggerType?: string;
  rating?: string;
  comment?: string;
  responded: boolean;
  responseText?: string;
  createdAt: string;
}

interface Stats { total: number; avgRating: number; unanswered: number; byRating: Record<string, number>; }

interface ReviewSettings {
  enabled: boolean;
  googleReviewUrl: string;
  goodThreshold: 'GOOD' | 'EXCELLENT';
  autoSendDelay: number;
  goodMessage: string;
  badMessage: string;
}

interface ReviewStats {
  reviewRequestsSent: number;
  badFeedbackAlerts: number;
  period: string;
}

export default function FeedbackPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toolEnabled, setToolEnabled] = useState<boolean | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [reviewSettings, setReviewSettings] = useState<ReviewSettings | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewDraft, setReviewDraft] = useState<Partial<ReviewSettings>>({});
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) setEntries(json.entries);
    } finally { setLoading(false); }
  }, [business?.id]);

  const fetchStats = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/feedback/stats/${business.id}`);
      const json = await res.json();
      if (json.success) setStats(json.stats);
    } catch { /* ignore */ }
  }, [business?.id]);

  const fetchReviewSettings = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/businesses/${business.id}/review-settings`);
      const json = await res.json();
      if (json.success) {
        setReviewSettings(json.settings);
        setReviewDraft(json.settings);
      }
    } catch { /* ignore */ }
  }, [business?.id]);

  const fetchReviewStats = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/businesses/${business.id}/review-solicitation/stats`);
      const json = await res.json();
      if (json.success) setReviewStats(json.stats);
    } catch { /* ignore */ }
  }, [business?.id]);

  const saveReviewSettings = async () => {
    if (!business?.id) return;
    setReviewSaving(true);
    try {
      const res = await fetch(`${API_URL}/businesses/${business.id}/review-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewDraft),
      });
      const json = await res.json();
      if (json.success) {
        setReviewSettings(json.settings);
        setReviewDraft(json.settings);
      }
    } finally { setReviewSaving(false); }
  };

  const checkTool = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/business-tools?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) {
        const tool = json.tools.find((t: { type: string }) => t.type === 'FEEDBACK_COLLECTION');
        setToolEnabled(tool?.enabled ?? false);
      }
    } catch { setToolEnabled(false); }
  }, [business?.id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { checkTool(); }, [checkTool]);
  useEffect(() => { fetchReviewSettings(); }, [fetchReviewSettings]);
  useEffect(() => { fetchReviewStats(); }, [fetchReviewStats]);

  const respond = async (id: string) => {
    if (!responseText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/feedback/${id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText }),
      });
      const json = await res.json();
      if (json.success) { setRespondingTo(null); setResponseText(''); fetchEntries(); fetchStats(); }
    } catch { /* ignore */ }
  };

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  if (toolEnabled === false) return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8"><h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Feedback</h1></div>
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Feedback Collection Not Enabled</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enable Feedback Collection from the Capabilities tab in your Chat Widget or Phone Agent settings.</p>
        <a href="/chatbot" className="inline-flex px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Go to Chat Widget</a>
      </div>
    </div>
  );

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Customer Feedback</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track customer satisfaction and respond to feedback</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Avg Rating" value={stats.avgRating > 0 ? `${stats.avgRating}/5` : '—'} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} />
          <KpiCard label="Total (30d)" value={stats.total} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Needs Response" value={stats.unanswered} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Excellent" value={stats.byRating['EXCELLENT'] ?? 0} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>} />
        </div>
      )}

      {/* ── Review Solicitation Settings ──────────────────────────────── */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl mb-8">
        <button
          onClick={() => setReviewExpanded(!reviewExpanded)}
          className="w-full flex items-center justify-between p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-600 dark:text-violet-400">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Automated Review Solicitation</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {reviewSettings?.enabled ? 'Enabled' : 'Disabled'}
                {reviewStats ? ` — ${reviewStats.reviewRequestsSent} review requests sent this month` : ''}
              </p>
            </div>
          </div>
          <svg viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 text-slate-400 transition-transform ${reviewExpanded ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {reviewExpanded && reviewSettings && (
          <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/[0.06] pt-5 space-y-5">
            {/* Stats row */}
            {reviewStats && (
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{reviewStats.reviewRequestsSent}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400/70">Review requests sent (30d)</p>
                </div>
                <div className="flex-1 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-rose-700 dark:text-rose-400">{reviewStats.badFeedbackAlerts}</p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400/70">Bad feedback alerts (30d)</p>
                </div>
              </div>
            )}

            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Enable auto review solicitation</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Automatically send Google Review links to happy customers</p>
              </div>
              <button
                onClick={() => setReviewDraft(d => ({ ...d, enabled: !d.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reviewDraft.enabled ? 'bg-violet-600' : 'bg-slate-200 dark:bg-white/10'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reviewDraft.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Google Review URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Google Review URL</label>
              <input
                type="url"
                value={reviewDraft.googleReviewUrl ?? ''}
                onChange={e => setReviewDraft(d => ({ ...d, googleReviewUrl: e.target.value }))}
                placeholder="https://g.page/r/..."
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {/* Threshold selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Send review request when rating is</label>
              <select
                value={reviewDraft.goodThreshold ?? 'GOOD'}
                onChange={e => setReviewDraft(d => ({ ...d, goodThreshold: e.target.value as 'GOOD' | 'EXCELLENT' }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white"
              >
                <option value="GOOD">GOOD or higher (4-5 stars)</option>
                <option value="EXCELLENT">EXCELLENT only (5 stars)</option>
              </select>
            </div>

            {/* Message templates */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Good feedback message template
                <span className="font-normal text-slate-400 ml-1">({'Use {reviewUrl} and {businessName} as placeholders'})</span>
              </label>
              <textarea
                value={reviewDraft.goodMessage ?? ''}
                onChange={e => setReviewDraft(d => ({ ...d, goodMessage: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Bad feedback message template
                <span className="font-normal text-slate-400 ml-1">({'Use {businessName} as placeholder'})</span>
              </label>
              <textarea
                value={reviewDraft.badMessage ?? ''}
                onChange={e => setReviewDraft(d => ({ ...d, badMessage: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={saveReviewSettings}
                disabled={reviewSaving}
                className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {reviewSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl px-5 py-12 text-center text-sm text-slate-400">No feedback yet.</div>
        ) : entries.map(entry => (
          <div key={entry.id} className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.customerName ?? 'Anonymous'}</p>
                <p className="text-[11px] text-slate-400">{new Date(entry.createdAt).toLocaleDateString()} {entry.triggerType ? `(after ${entry.triggerType})` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {entry.rating && (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${RATING_BADGES[entry.rating] ?? ''}`}>
                    {RATING_STARS[entry.rating]} star{entry.rating !== 'TERRIBLE' ? 's' : ''}  — {entry.rating.toLowerCase()}
                  </span>
                )}
                {entry.responded && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">responded</span>}
              </div>
            </div>

            {entry.comment && <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{entry.comment}</p>}

            {entry.responseText && (
              <div className="bg-slate-50 dark:bg-white/[0.04] rounded-lg p-3 mb-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Response</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{entry.responseText}</p>
              </div>
            )}

            {!entry.responded && entry.comment && (
              respondingTo === entry.id ? (
                <div className="flex gap-2">
                  <input value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Type your response..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                  <button onClick={() => respond(entry.id)} className="px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Send</button>
                  <button onClick={() => { setRespondingTo(null); setResponseText(''); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setRespondingTo(entry.id)} className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:text-violet-700 dark:hover:text-violet-300 transition-colors">Respond</button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
