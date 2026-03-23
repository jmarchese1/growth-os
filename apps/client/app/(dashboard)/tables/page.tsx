'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';
import { KpiCard } from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  OCCUPIED: 'border-rose-400 bg-rose-50 dark:bg-rose-500/10',
  RESERVED: 'border-violet-400 bg-violet-50 dark:bg-violet-500/10',
  CLEANING: 'border-amber-400 bg-amber-50 dark:bg-amber-500/10',
};

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-rose-500',
  RESERVED: 'bg-violet-500',
  CLEANING: 'bg-amber-500',
};

interface Table {
  id: string;
  tableNumber: string;
  tableCapacity?: number;
  status: string;
  partySize?: number;
  guestName?: string;
  seatedAt?: string;
  estimatedDone?: string;
}

interface Stats { totalTables: number; occupied: number; available: number; totalCapacity: number; seatedGuests: number; avgMinutesLeft: number; }

export default function TablesPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [tables, setTables] = useState<Table[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toolEnabled, setToolEnabled] = useState<boolean | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tableNumber: '', tableCapacity: '4' });
  const [seatForm, setSeatForm] = useState<{ tableId: string; partySize: string; guestName: string; estimatedMinutes: string } | null>(null);

  const fetchTables = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tables?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) setTables(json.tables);
    } finally { setLoading(false); }
  }, [business?.id]);

  const fetchStats = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/tables/stats/${business.id}`);
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
        const tool = json.tools.find((t: { type: string }) => t.type === 'TABLE_TURNOVER');
        setToolEnabled(tool?.enabled ?? false);
      }
    } catch { setToolEnabled(false); }
  }, [business?.id]);

  useEffect(() => { fetchTables(); }, [fetchTables]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { checkTool(); }, [checkTool]);

  const addTable = async () => {
    if (!business?.id || !form.tableNumber) return;
    try {
      const res = await fetch(`${API_URL}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, tableNumber: form.tableNumber, tableCapacity: parseInt(form.tableCapacity) || 4 }),
      });
      const json = await res.json();
      if (json.success) { setForm({ tableNumber: '', tableCapacity: '4' }); setShowAdd(false); fetchTables(); fetchStats(); }
    } catch { /* ignore */ }
  };

  const seatTable = async () => {
    if (!seatForm) return;
    try {
      const res = await fetch(`${API_URL}/tables/${seatForm.tableId}/seat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partySize: parseInt(seatForm.partySize) || 2, guestName: seatForm.guestName || undefined, estimatedMinutes: parseInt(seatForm.estimatedMinutes) || 60 }),
      });
      const json = await res.json();
      if (json.success) { setSeatForm(null); fetchTables(); fetchStats(); }
    } catch { /* ignore */ }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/tables/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) { fetchTables(); fetchStats(); }
    } catch { /* ignore */ }
  };

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  if (toolEnabled === false) return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8"><h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tables</h1></div>
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Table Tracking Not Enabled</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enable Table Turnover Tracker from the Tool Library.</p>
        <a href="/tools" className="inline-flex px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Go to Tool Library</a>
      </div>
    </div>
  );

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Table Map</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track table occupancy and turnover in real-time</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">+ Add Table</button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Occupancy" value={stats.totalTables > 0 ? `${Math.round((stats.occupied / stats.totalTables) * 100)}%` : '0%'} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Available" value={stats.available} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Seated Guests" value={stats.seatedGuests} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
          <KpiCard label="Avg Time Left" value={stats.avgMinutesLeft > 0 ? `${stats.avgMinutesLeft}m` : '—'} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
        </div>
      )}

      {showAdd && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Add Table</h3>
          <div className="flex gap-3">
            <input placeholder="Table number (e.g. 1, Patio-3)" value={form.tableNumber} onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))} className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input type="number" min="1" placeholder="Seats" value={form.tableCapacity} onChange={e => setForm(p => ({ ...p, tableCapacity: e.target.value }))} className="w-20 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <button onClick={addTable} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Add</button>
          </div>
        </div>
      )}

      {/* Seat Form Modal */}
      {seatForm && (
        <div className="bg-white dark:bg-white/[0.04] border border-violet-200 dark:border-violet-500/30 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Seat Party</h3>
          <div className="flex gap-3">
            <input placeholder="Guest name" value={seatForm.guestName} onChange={e => setSeatForm(p => p ? { ...p, guestName: e.target.value } : p)} className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input type="number" min="1" placeholder="Party size" value={seatForm.partySize} onChange={e => setSeatForm(p => p ? { ...p, partySize: e.target.value } : p)} className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input type="number" min="15" placeholder="Est. minutes" value={seatForm.estimatedMinutes} onChange={e => setSeatForm(p => p ? { ...p, estimatedMinutes: e.target.value } : p)} className="w-28 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <button onClick={seatTable} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Seat</button>
            <button onClick={() => setSeatForm(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Table Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
      ) : tables.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl px-5 py-12 text-center text-sm text-slate-400">No tables set up yet. Add your first table above.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map(table => {
            const now = new Date();
            const minutesLeft = table.estimatedDone ? Math.max(0, Math.round((new Date(table.estimatedDone).getTime() - now.getTime()) / 60000)) : null;
            const minutesSeated = table.seatedAt ? Math.round((now.getTime() - new Date(table.seatedAt).getTime()) / 60000) : null;

            return (
              <div key={table.id} className={`border-2 rounded-xl p-4 transition-colors ${STATUS_COLORS[table.status] ?? 'border-slate-200 bg-white dark:bg-white/[0.04]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">#{table.tableNumber}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[table.status]}`} />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">{table.status.toLowerCase()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{table.tableCapacity ?? '?'} seats</p>

                {table.status === 'OCCUPIED' && (
                  <div className="mb-3 space-y-1">
                    {table.guestName && <p className="text-sm font-medium text-slate-900 dark:text-white">{table.guestName}</p>}
                    <p className="text-xs text-slate-500">{table.partySize} guests {minutesSeated !== null ? `(${minutesSeated}m ago)` : ''}</p>
                    {minutesLeft !== null && <p className="text-xs font-medium text-amber-600 dark:text-amber-400">~{minutesLeft}m remaining</p>}
                  </div>
                )}

                <div className="flex gap-1.5 flex-wrap">
                  {table.status === 'AVAILABLE' && (
                    <button onClick={() => setSeatForm({ tableId: table.id, partySize: '2', guestName: '', estimatedMinutes: '60' })} className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">Seat</button>
                  )}
                  {table.status === 'OCCUPIED' && (
                    <button onClick={() => updateStatus(table.id, 'CLEANING')} className="px-2.5 py-1 text-[11px] font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors">Clear</button>
                  )}
                  {table.status === 'CLEANING' && (
                    <button onClick={() => updateStatus(table.id, 'AVAILABLE')} className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">Ready</button>
                  )}
                  {table.status === 'RESERVED' && (
                    <button onClick={() => setSeatForm({ tableId: table.id, partySize: '2', guestName: '', estimatedMinutes: '60' })} className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">Seat</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
