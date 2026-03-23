'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useBusiness } from '../auth/business-provider';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
}

const TYPE_ICON: Record<string, { icon: string; bg: string; text: string }> = {
  CALL:        { icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400' },
  CHAT:        { icon: 'M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z', bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-600 dark:text-sky-400' },
  QR_SCAN:     { icon: 'M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5z', bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-400' },
  SURVEY:      { icon: 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
  APPOINTMENT: { icon: 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z', bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-600 dark:text-indigo-400' },
  LEAD:        { icon: 'M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z', bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-600 dark:text-rose-400' },
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'CALL', label: 'Calls' },
  { key: 'CHAT', label: 'Chats' },
  { key: 'QR_SCAN', label: 'QR Scans' },
  { key: 'SURVEY', label: 'Surveys' },
  { key: 'APPOINTMENT', label: 'Bookings' },
];

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null } | null): string {
  if (!c) return 'Unknown';
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (c.email ?? 'Unknown');
}

// Tiny chime using Web Audio API
function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not available
  }
}

const STORAGE_KEY = 'embedo_notif_read';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveReadIds(ids: Set<string>) {
  try {
    // Keep only the last 200 IDs to prevent localStorage bloat
    const arr = [...ids].slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

export function NotificationsBell() {
  const { business } = useBusiness();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('all');
  const prevCountRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Load read IDs from localStorage
  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_BASE}/businesses/${business.id}/dashboard`);
      if (!res.ok) return;
      const data = await res.json() as { recentActivities?: NotifItem[]; recentSurveyResponses?: Array<{ id: string; createdAt: string; survey: { title: string }; contact: NotifItem['contact'] }>; recentQrScans?: Array<{ id: string; createdAt: string; qrCode: { label: string | null; purpose: string }; contact: NotifItem['contact'] }> };

      const activities: NotifItem[] = [...(data.recentActivities ?? [])];

      // Merge survey responses
      for (const sr of data.recentSurveyResponses ?? []) {
        activities.push({
          id: `survey-${sr.id}`,
          type: 'SURVEY',
          title: `Survey response: ${sr.survey.title}`,
          description: null,
          createdAt: sr.createdAt,
          contact: sr.contact,
        });
      }

      // Merge QR scans
      for (const qr of data.recentQrScans ?? []) {
        activities.push({
          id: `qr-${qr.id}`,
          type: 'QR_SCAN',
          title: `QR scan: ${qr.qrCode.label ?? qr.qrCode.purpose}`,
          description: null,
          createdAt: qr.createdAt,
          contact: qr.contact,
        });
      }

      // Sort by date descending
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Chime if new items appeared
      const currentCount = activities.length;
      if (prevCountRef.current > 0 && currentCount > prevCountRef.current) {
        playChime();
      }
      prevCountRef.current = currentCount;

      setItems(activities);
    } catch {
      // non-critical
    }
  }, [business?.id]);

  // Poll every 30 seconds
  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!open) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      if (bellRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;
  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);

  const markAllRead = () => {
    const newRead = new Set(readIds);
    for (const item of items) newRead.add(item.id);
    setReadIds(newRead);
    saveReadIds(newRead);
  };

  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    const newRead = new Set(readIds);
    newRead.add(id);
    setReadIds(newRead);
    saveReadIds(newRead);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[520px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-fade-up"
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="px-3 py-2 flex gap-1 overflow-x-auto border-b border-slate-100 dark:border-slate-700">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
              </div>
            ) : (
              filtered.slice(0, 50).map((item) => {
                const meta = TYPE_ICON[item.type] ?? TYPE_ICON['CALL'];
                const isUnread = !readIds.has(item.id);
                const linkHref = item.contact?.id ? `/customers/${item.contact.id}` : '/';

                return (
                  <Link
                    key={item.id}
                    href={linkHref}
                    onClick={() => { markRead(item.id); setOpen(false); }}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      isUnread ? 'bg-violet-50/40 dark:bg-violet-900/10' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.text}`}>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d={meta.icon} clipRule="evenodd" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.contact && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{contactName(item.contact)}</span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatRelative(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-2" />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 text-center">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-colors"
              >
                View all activity on dashboard
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
