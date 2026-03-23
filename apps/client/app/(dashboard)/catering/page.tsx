'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';
import { KpiCard } from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const STATUS_BADGES: Record<string, string> = {
  NEW: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  CONTACTED: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  QUOTED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  COMPLETED: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

interface CateringInquiry {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  eventDate?: string;
  eventTime?: string;
  eventType?: string;
  headcount: number;
  budget?: number;
  location?: string;
  dietaryNotes?: string;
  menuRequests?: string;
  notes?: string;
  quotedAmount?: number;
  quoteNotes?: string;
  status: string;
  source: string;
  createdAt: string;
}

interface Stats { total: number; active: number; confirmed: number; totalRevenue: number; }

export default function CateringPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [inquiries, setInquiries] = useState<CateringInquiry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CateringInquiry | null>(null);
  const [toolEnabled, setToolEnabled] = useState<boolean | null>(null);

  const fetchInquiries = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/catering?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) setInquiries(json.inquiries);
    } finally { setLoading(false); }
  }, [business?.id]);

  const fetchStats = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/catering/stats/${business.id}`);
      const json = await res.json();
      if (json.success) setStats(json.stats);
    } catch { /* ignore */ }
  }, [business?.id]);

  const checkTool = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/business-tools?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) {
        const tool = json.tools.find((t: { type: string }) => t.type === 'CATERING_REQUESTS');
        setToolEnabled(tool?.enabled ?? false);
      }
    } catch { setToolEnabled(false); }
  }, [business?.id]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { checkTool(); }, [checkTool]);

  const updateStatus = async (id: string, status: string, quotedAmount?: number) => {
    try {
      const res = await fetch(`${API_URL}/catering/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(quotedAmount !== undefined ? { quotedAmount } : {}) }),
      });
      const json = await res.json();
      if (json.success) { fetchInquiries(); fetchStats(); if (selected?.id === id) setSelected(null); }
    } catch { /* ignore */ }
  };

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  if (toolEnabled === false) return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8"><h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Catering</h1></div>
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Catering Not Enabled</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enable Catering Requests from the Tool Library.</p>
        <a href="/tools" className="inline-flex px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Go to Tool Library</a>
      </div>
    </div>
  );

  const nextStatus: Record<string, string> = { NEW: 'CONTACTED', CONTACTED: 'QUOTED', QUOTED: 'CONFIRMED', CONFIRMED: 'COMPLETED' };
  const nextLabel: Record<string, string> = { NEW: 'Mark Contacted', CONTACTED: 'Send Quote', QUOTED: 'Confirm', CONFIRMED: 'Complete' };

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Catering Requests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage catering inquiries from phone, chat, and website</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Active Inquiries" value={stats.active} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Total (30d)" value={stats.total} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Confirmed" value={stats.confirmed} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Revenue" value={`$${stats.totalRevenue.toFixed(0)}`} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>} />
        </div>
      )}

      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Inquiries</h2>
        </div>

        {loading ? (
          <div className="px-5 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
        ) : inquiries.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">No catering inquiries yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Event</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Headcount</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Budget</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {inquiries.map(inq => (
                <tr key={inq.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelected(inq)}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{inq.customerName}</p>
                    {inq.customerPhone && <p className="text-[11px] text-slate-400">{inq.customerPhone}</p>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{inq.eventType ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{inq.headcount}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{inq.budget ? `$${inq.budget}` : '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{inq.eventDate ? new Date(inq.eventDate).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[inq.status] ?? ''}`}>{inq.status.toLowerCase()}</span></td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      {nextStatus[inq.status] && (
                        <button onClick={() => updateStatus(inq.id, nextStatus[inq.status])} className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">{nextLabel[inq.status]}</button>
                      )}
                      {inq.status !== 'CANCELLED' && inq.status !== 'COMPLETED' && (
                        <button onClick={() => updateStatus(inq.id, 'CANCELLED')} className="px-2.5 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 rounded-md hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f0d1a] border-l border-slate-200 dark:border-white/[0.08] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Catering Details</h2>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
              {[
                ['Customer', selected.customerName],
                ['Phone', selected.customerPhone],
                ['Email', selected.customerEmail],
                ['Event Type', selected.eventType],
                ['Headcount', String(selected.headcount)],
                ['Budget', selected.budget ? `$${selected.budget}` : undefined],
                ['Event Date', selected.eventDate ? new Date(selected.eventDate).toLocaleDateString() : undefined],
                ['Location', selected.location],
                ['Dietary Notes', selected.dietaryNotes],
                ['Menu Requests', selected.menuRequests],
                ['Notes', selected.notes],
                ['Quoted Amount', selected.quotedAmount ? `$${selected.quotedAmount}` : undefined],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="mb-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
