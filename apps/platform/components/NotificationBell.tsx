'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// Proxied through Next.js API routes (see app/api/notifications + app/api/daily-report)

interface Notification {
  id: string;
  type: 'reply' | 'bounce' | 'meeting_booked' | 'open' | 'daily_report';
  title: string;
  description: string;
  prospectName?: string;
  campaignId?: string;
  createdAt: string;
}

interface DailyReport {
  generatedAt: string;
  period: string;
  stats: {
    prospectsDiscovered: number;
    emailsSent: number;
    opens: number;
    replies: number;
    bounces: number;
    meetingsBooked: number;
  };
  campaigns: Array<{
    name: string;
    sent: number;
    opens: number;
    replies: number;
  }>;
  aiSummary: string | null;
}

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  reply: { icon: '💬', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  bounce: { icon: '⚠', color: 'text-red-400', bg: 'bg-red-500/10' },
  meeting_booked: { icon: '📅', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  open: { icon: '👁', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  daily_report: { icon: '📊', color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'notifications' | 'report'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Load read IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('embedo-notif-read');
      if (stored) setReadIds(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    try { localStorage.setItem('embedo-notif-read', JSON.stringify([...allIds])); } catch { /* ignore */ }
  }, [notifications]);

  // Fetch notifications
  useEffect(() => {
    let cancelled = false;
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`/api/notifications`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch { /* service not running */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Fetch daily report when tab is opened
  const fetchReport = useCallback(async () => {
    if (loadingReport) return;
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/daily-report`);
      if (res.ok) {
        const data = await res.json();
        if (data) setReport(data);
      }
    } catch { /* ignore */ }
    setLoadingReport(false);
  }, [loadingReport]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open && tab === 'report') fetchReport(); }}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white min-w-[18px] px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] max-h-[520px] bg-[#151229] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 z-[100] overflow-hidden animate-fade-up">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onMouseDown={(e) => { e.stopPropagation(); }}
              onClick={() => setTab('notifications')}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                tab === 'notifications' ? 'text-white border-b-2 border-violet-500' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Notifications {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px]">{unreadCount}</span>}
            </button>
            <button
              onMouseDown={(e) => { e.stopPropagation(); }}
              onClick={() => { setTab('report'); fetchReport(); }}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                tab === 'report' ? 'text-white border-b-2 border-violet-500' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Daily Report
            </button>
          </div>

          {/* Notifications tab */}
          {tab === 'notifications' && (
            <div className="overflow-y-auto max-h-[440px]">
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="px-4 py-2 border-b border-white/[0.04]">
                  <button onClick={markAllRead} className="text-[10px] text-violet-400 hover:text-violet-300 font-medium">
                    Mark all as read
                  </button>
                </div>
              )}
              {notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-slate-600">No notifications yet</p>
                  <p className="text-xs text-slate-700 mt-1">Replies, opens, and bookings will appear here</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const conf = typeConfig[n.type] ?? typeConfig['open']!;
                  const isRead = readIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                        !isRead ? 'bg-violet-500/[0.03]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex-shrink-0 w-8 h-8 rounded-lg ${conf.bg} flex items-center justify-center text-sm`}>
                          {conf.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isRead ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{n.description}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {n.campaignId && (
                          <Link
                            href={`/campaigns/${n.campaignId}`}
                            className="flex-shrink-0 text-[10px] text-violet-400 hover:text-violet-300"
                            onClick={() => setOpen(false)}
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Daily Report tab */}
          {tab === 'report' && (
            <div className="overflow-y-auto max-h-[440px] p-4 space-y-4">
              {loadingReport ? (
                <div className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 mt-3">Generating report...</p>
                </div>
              ) : !report ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-600">No report available</p>
                  <p className="text-xs text-slate-700 mt-1">Start the prospector service to generate reports</p>
                </div>
              ) : (
                <>
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Sent', value: report.stats.emailsSent, color: 'text-white' },
                      { label: 'Opens', value: report.stats.opens, color: 'text-blue-400' },
                      { label: 'Replies', value: report.stats.replies, color: 'text-emerald-400' },
                      { label: 'Bounces', value: report.stats.bounces, color: report.stats.bounces > 0 ? 'text-red-400' : 'text-slate-400' },
                      { label: 'Meetings', value: report.stats.meetingsBooked, color: 'text-violet-400' },
                      { label: 'Discovered', value: report.stats.prospectsDiscovered, color: 'text-slate-300' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/[0.04] rounded-lg p-2.5 text-center">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* AI Summary */}
                  {report.aiSummary && (
                    <div className="bg-gradient-to-br from-violet-500/[0.08] to-indigo-500/[0.04] rounded-xl border border-violet-500/10 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-violet-400">AI Insights</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/20 text-violet-300 font-medium">Claude</span>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                        {report.aiSummary}
                      </div>
                    </div>
                  )}

                  {/* Per-campaign breakdown */}
                  {report.campaigns.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2">Campaign Activity (24h)</p>
                      <div className="space-y-1.5">
                        {report.campaigns.map((c) => (
                          <div key={c.name} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-300 truncate flex-1">{c.name}</span>
                            <div className="flex items-center gap-3 text-[10px] flex-shrink-0">
                              <span className="text-slate-500">{c.sent} sent</span>
                              <span className="text-blue-400">{c.opens} opens</span>
                              <span className="text-emerald-400">{c.replies} replies</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-700 text-center">
                    Generated {new Date(report.generatedAt).toLocaleString()}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
