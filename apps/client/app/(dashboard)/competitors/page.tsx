'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const SENTIMENT_BADGES: Record<string, string> = {
  POSITIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  NEUTRAL: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
  NEGATIVE: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

interface Highlight {
  type: string;
  detail: string;
}

interface CompetitorReport {
  id: string;
  reportDate: string;
  summary: string;
  highlights: Highlight[];
  sentiment: string | null;
}

interface Competitor {
  id: string;
  name: string;
  googleMapsUrl: string | null;
  yelpUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  notes: string | null;
  createdAt: string;
  reports: CompetitorReport[];
}

export default function CompetitorsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, CompetitorReport[]>>({});

  // Add form state
  const [form, setForm] = useState({
    name: '',
    websiteUrl: '',
    googleMapsUrl: '',
    yelpUrl: '',
    instagramUrl: '',
    notes: '',
  });

  const fetchCompetitors = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/businesses/${business.id}/competitors`);
      const json = await res.json();
      if (json.success) setCompetitors(json.competitors);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [business?.id]);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const addCompetitor = async () => {
    if (!business?.id || !form.name.trim()) return;
    try {
      const res = await fetch(`${API_URL}/businesses/${business.id}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setCompetitors((prev) => [{ ...json.competitor, reports: [] }, ...prev]);
        setForm({ name: '', websiteUrl: '', googleMapsUrl: '', yelpUrl: '', instagramUrl: '', notes: '' });
        setShowAdd(false);
      }
    } catch { /* ignore */ }
  };

  const deleteCompetitor = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/competitors/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setCompetitors((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ }
  };

  const analyzeCompetitor = async (id: string) => {
    setAnalyzing(id);
    try {
      const res = await fetch(`${API_URL}/competitors/${id}/analyze`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        // Refresh the competitor list to get updated reports
        await fetchCompetitors();
      }
    } catch { /* ignore */ }
    finally { setAnalyzing(null); }
  };

  const loadReports = async (competitorId: string) => {
    if (expandedReports === competitorId) {
      setExpandedReports(null);
      return;
    }
    setExpandedReports(competitorId);
    if (reports[competitorId]) return;
    try {
      const res = await fetch(`${API_URL}/competitors/${competitorId}/reports`);
      const json = await res.json();
      if (json.success) setReports((prev) => ({ ...prev, [competitorId]: json.reports }));
    } catch { /* ignore */ }
  };

  if (bizLoading) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Competitor Monitor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track and analyze your competitors with AI-powered insights
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          {showAdd ? 'Cancel' : 'Add Competitor'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Competitor name"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
              <input
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Google Maps URL</label>
              <input
                value={form.googleMapsUrl}
                onChange={(e) => setForm((f) => ({ ...f, googleMapsUrl: e.target.value }))}
                placeholder="https://maps.google.com/..."
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Yelp URL</label>
              <input
                value={form.yelpUrl}
                onChange={(e) => setForm((f) => ({ ...f, yelpUrl: e.target.value }))}
                placeholder="https://yelp.com/biz/..."
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instagram URL</label>
              <input
                value={form.instagramUrl}
                onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                placeholder="https://instagram.com/..."
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={addCompetitor}
              disabled={!form.name.trim()}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              Add Competitor
            </button>
          </div>
        </div>
      )}

      {/* Competitors list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : competitors.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-violet-600 dark:text-violet-400">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">No competitors tracked yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add your competitors to start monitoring them with AI analysis</p>
        </div>
      ) : (
        <div className="space-y-4">
          {competitors.map((comp) => {
            const latestReport = comp.reports?.[0];
            return (
              <div key={comp.id} className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{comp.name}</h3>
                        {latestReport?.sentiment && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SENTIMENT_BADGES[latestReport.sentiment] ?? SENTIMENT_BADGES['NEUTRAL']}`}>
                            {latestReport.sentiment}
                          </span>
                        )}
                      </div>
                      {/* Links row */}
                      <div className="flex gap-3 mt-2 flex-wrap">
                        {comp.websiteUrl && (
                          <a href={comp.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline">Website</a>
                        )}
                        {comp.googleMapsUrl && (
                          <a href={comp.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline">Google Maps</a>
                        )}
                        {comp.yelpUrl && (
                          <a href={comp.yelpUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline">Yelp</a>
                        )}
                        {comp.instagramUrl && (
                          <a href={comp.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline">Instagram</a>
                        )}
                      </div>
                      {comp.notes && <p className="text-[11px] text-slate-400 mt-1">{comp.notes}</p>}

                      {/* Latest report summary */}
                      {latestReport && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                          {latestReport.summary}
                        </p>
                      )}

                      {/* Highlights */}
                      {latestReport?.highlights && latestReport.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(latestReport.highlights as Highlight[]).map((h, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-md text-[11px] text-slate-600 dark:text-slate-300">
                              <span className="font-medium text-slate-500 dark:text-slate-400 mr-1">{h.type.replace(/_/g, ' ')}:</span>
                              {h.detail}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => analyzeCompetitor(comp.id)}
                        disabled={analyzing === comp.id}
                        className="px-3 py-1.5 text-[11px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/25 transition-colors disabled:opacity-50"
                      >
                        {analyzing === comp.id ? 'Analyzing...' : 'Analyze'}
                      </button>
                      <button
                        onClick={() => loadReports(comp.id)}
                        className="px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        History
                      </button>
                      <button
                        onClick={() => deleteCompetitor(comp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        title="Delete competitor"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Last analyzed timestamp */}
                  {latestReport && (
                    <p className="text-[10px] text-slate-400 mt-3">
                      Last analyzed: {new Date(latestReport.reportDate).toLocaleDateString()} at {new Date(latestReport.reportDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Report history */}
                {expandedReports === comp.id && reports[comp.id] && (
                  <div className="border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-5 py-4">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Analysis History</p>
                    {reports[comp.id].length === 0 ? (
                      <p className="text-sm text-slate-400">No reports yet. Click &quot;Analyze&quot; to generate one.</p>
                    ) : (
                      <div className="space-y-3">
                        {reports[comp.id].map((r) => (
                          <div key={r.id} className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {new Date(r.reportDate).toLocaleDateString()}
                              </span>
                              {r.sentiment && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${SENTIMENT_BADGES[r.sentiment] ?? SENTIMENT_BADGES['NEUTRAL']}`}>
                                  {r.sentiment}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{r.summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
