'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';
import { KpiCard } from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  NO_SHOW: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
  COMPLETED: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
};

const SOURCE_BADGES: Record<string, string> = {
  VOICE_AGENT: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  CHATBOT: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  WEBSITE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  MANUAL: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
};

const SOURCE_LABELS: Record<string, string> = {
  VOICE_AGENT: 'Phone',
  CHATBOT: 'Chat',
  WEBSITE: 'Web',
  MANUAL: 'Manual',
};

interface Reservation {
  id: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  partySize: number;
  date: string;
  time: string;
  timezone?: string;
  specialRequests?: string;
  status: string;
  source: string;
  openTableConfirmation?: string;
  createdAt: string;
}

export default function ReservationsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      const res = await fetch(`${API_URL}/reservations/${business.id}?${params}`);
      if (!res.ok) throw new Error('Failed to load reservations');
      const json = await res.json();
      if (json.success) setReservations(json.reservations);
    } catch {
      setError('Could not load reservations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [business?.id, statusFilter, dateFilter]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        if (selectedRes?.id === id) setSelectedRes({ ...selectedRes, status });
      }
    } catch { /* ignore */ }
  };

  if (bizLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  if (!business) return null;

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        {error}
        <button onClick={() => fetchReservations()} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
      </div>
    </div>
  );

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todayReservations = reservations.filter(r => r.date.startsWith(today!));
  const upcoming = reservations.filter(r => r.status === 'CONFIRMED' || r.status === 'PENDING');
  const totalGuests = upcoming.reduce((sum, r) => sum + r.partySize, 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h ?? '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Reservations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage reservations from phone, chat, and walk-ins</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Today" value={todayReservations.length} color="violet" icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
        } />
        <KpiCard label="Upcoming" value={upcoming.length} color="sky" icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
        } />
        <KpiCard label="Expected Guests" value={totalGuests} color="emerald" icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>
        } />
        <KpiCard label="No-Shows" value={reservations.filter(r => r.status === 'NO_SHOW').length} color="rose" icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        } />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === s
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]'
            }`}>
            {s ? s.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : 'All'}
          </button>
        ))}
        <div className="ml-auto">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-600 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="ml-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Reservations</h2>
          <span className="text-xs text-slate-400">{reservations.length} reservation{reservations.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="px-5 py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">No reservations yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Guest</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Party</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Source</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {reservations.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedRes(r)}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.guestName}</p>
                    {r.guestPhone && <p className="text-[11px] text-slate-400">{r.guestPhone}</p>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{r.partySize}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(r.date)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-slate-900 dark:text-white">{formatTime(r.time)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${SOURCE_BADGES[r.source] ?? ''}`}>
                      {SOURCE_LABELS[r.source] ?? r.source}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[r.status] ?? ''}`}>
                      {r.status.toLowerCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      {r.status === 'PENDING' && (
                        <button onClick={() => updateStatus(r.id, 'CONFIRMED')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">
                          Confirm
                        </button>
                      )}
                      {r.status === 'CONFIRMED' && (
                        <button onClick={() => updateStatus(r.id, 'COMPLETED')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">
                          Seated
                        </button>
                      )}
                      {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                        <>
                          <button onClick={() => updateStatus(r.id, 'NO_SHOW')}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1] transition-colors">
                            No-show
                          </button>
                          <button onClick={() => updateStatus(r.id, 'CANCELLED')}
                            className="px-2.5 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 rounded-md hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors">
                            Cancel
                          </button>
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

      {/* Reservation Detail Drawer */}
      {selectedRes && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRes(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f0d1a] border-l border-slate-200 dark:border-white/[0.08] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reservation Details</h2>
                <button onClick={() => setSelectedRes(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>

              {/* Guest */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Guest</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRes.guestName}</p>
                {selectedRes.guestPhone && <p className="text-sm text-slate-500 dark:text-slate-400">{selectedRes.guestPhone}</p>}
                {selectedRes.guestEmail && <p className="text-sm text-slate-500 dark:text-slate-400">{selectedRes.guestEmail}</p>}
              </div>

              {/* Reservation Info */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(selectedRes.date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{formatTime(selectedRes.time)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Party Size</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRes.partySize} guest{selectedRes.partySize !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Source</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${SOURCE_BADGES[selectedRes.source] ?? ''}`}>
                    {SOURCE_LABELS[selectedRes.source] ?? selectedRes.source}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[selectedRes.status]}`}>
                  {selectedRes.status.toLowerCase().replace('_', ' ')}
                </span>
              </div>

              {/* Special Requests */}
              {selectedRes.specialRequests && (
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Special Requests</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">{selectedRes.specialRequests}</p>
                </div>
              )}

              {/* OpenTable */}
              {selectedRes.openTableConfirmation && (
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">OpenTable</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Confirmation: {selectedRes.openTableConfirmation}</p>
                </div>
              )}

              {/* Booked */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Booked</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(selectedRes.createdAt).toLocaleString()}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {selectedRes.status === 'PENDING' && (
                  <button onClick={() => updateStatus(selectedRes.id, 'CONFIRMED')}
                    className="flex-1 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
                    Confirm
                  </button>
                )}
                {selectedRes.status === 'CONFIRMED' && (
                  <button onClick={() => updateStatus(selectedRes.id, 'COMPLETED')}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                    Mark Seated
                  </button>
                )}
                {(selectedRes.status === 'PENDING' || selectedRes.status === 'CONFIRMED') && (
                  <>
                    <button onClick={() => updateStatus(selectedRes.id, 'NO_SHOW')}
                      className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1] transition-colors">
                      No-show
                    </button>
                    <button onClick={() => updateStatus(selectedRes.id, 'CANCELLED')}
                      className="px-4 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
