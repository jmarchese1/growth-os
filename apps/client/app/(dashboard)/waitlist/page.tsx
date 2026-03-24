'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';
import { KpiCard } from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const STATUS_BADGES: Record<string, string> = {
  WAITING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  NOTIFIED: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  SEATED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  NO_SHOW: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  CANCELLED: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
};

interface WaitlistEntry {
  id: string;
  guestName: string;
  guestPhone?: string;
  partySize: number;
  position: number;
  estimatedWait?: number;
  notes?: string;
  status: string;
  source: string;
  notifiedAt?: string;
  seatedAt?: string;
  createdAt: string;
}

interface Stats {
  currentWaiting: number;
  todayTotal: number;
  todaySeated: number;
  todayNoShow: number;
}

export default function WaitlistPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ guestName: '', guestPhone: '', partySize: '2', notes: '' });
  const [toolEnabled, setToolEnabled] = useState<boolean | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/waitlist?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) setEntries(json.entries);
    } finally { setLoading(false); }
  }, [business?.id]);

  const fetchStats = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/waitlist/stats/${business.id}`);
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
        const tool = json.tools.find((t: { type: string }) => t.type === 'WAITLIST');
        setToolEnabled(tool?.enabled ?? false);
      }
    } catch { setToolEnabled(false); }
  }, [business?.id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { checkTool(); }, [checkTool]);

  const addEntry = async () => {
    if (!business?.id || !form.guestName) return;
    try {
      const res = await fetch(`${API_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          guestName: form.guestName,
          guestPhone: form.guestPhone || undefined,
          partySize: parseInt(form.partySize) || 2,
          notes: form.notes || undefined,
          source: 'MANUAL',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setForm({ guestName: '', guestPhone: '', partySize: '2', notes: '' });
        setShowAdd(false);
        fetchEntries();
        fetchStats();
      }
    } catch { /* ignore */ }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/waitlist/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) { fetchEntries(); fetchStats(); }
    } catch { /* ignore */ }
  };

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  if (toolEnabled === false) return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8"><h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Waitlist</h1></div>
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Waitlist Not Enabled</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enable the Waitlist Manager from the Capabilities tab in your Chat Widget or Phone Agent settings.</p>
        <a href="/chatbot" className="inline-flex px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Go to Chat Widget</a>
      </div>
    </div>
  );

  const waitingEntries = entries.filter(e => e.status === 'WAITING');

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Waitlist</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your restaurant waitlist in real-time</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
          + Add to Waitlist
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Currently Waiting" value={stats.currentWaiting} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Total Today" value={stats.todayTotal} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Seated Today" value={stats.todaySeated} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} />
          <KpiCard label="No-Shows" value={stats.todayNoShow} color="rose" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>} />
        </div>
      )}

      {showAdd && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Add to Waitlist</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <input placeholder="Guest name *" value={form.guestName} onChange={e => setForm(p => ({ ...p, guestName: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input placeholder="Phone" value={form.guestPhone} onChange={e => setForm(p => ({ ...p, guestPhone: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input type="number" min="1" placeholder="Party size" value={form.partySize} onChange={e => setForm(p => ({ ...p, partySize: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
          </div>
          <button onClick={addEntry} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Add Guest</button>
        </div>
      )}

      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Current Queue</h2>
          <span className="text-xs text-slate-400">{waitingEntries.length} waiting</span>
        </div>

        {loading ? (
          <div className="px-5 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">No one on the waitlist.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">#</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Guest</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Party</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Est. Wait</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Added</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-slate-900 dark:text-white">{entry.position}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.guestName}</p>
                    {entry.guestPhone && <p className="text-[11px] text-slate-400">{entry.guestPhone}</p>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{entry.partySize}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{entry.estimatedWait ? `~${entry.estimatedWait}m` : '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-[150px] truncate">{entry.notes ?? '—'}</td>
                  <td className="px-5 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[entry.status] ?? ''}`}>{entry.status.toLowerCase().replace('_', ' ')}</span></td>
                  <td className="px-5 py-3 text-[11px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      {entry.status === 'WAITING' && (
                        <button onClick={() => updateStatus(entry.id, 'NOTIFIED')} className="px-2.5 py-1 text-[11px] font-medium bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors">Table Ready</button>
                      )}
                      {entry.status === 'NOTIFIED' && (
                        <button onClick={() => updateStatus(entry.id, 'SEATED')} className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">Seat</button>
                      )}
                      {(entry.status === 'WAITING' || entry.status === 'NOTIFIED') && (
                        <>
                          <button onClick={() => updateStatus(entry.id, 'NO_SHOW')} className="px-2.5 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 rounded-md hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">No Show</button>
                          <button onClick={() => updateStatus(entry.id, 'CANCELLED')} className="px-2.5 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-white/[0.06] dark:text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors">Remove</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
