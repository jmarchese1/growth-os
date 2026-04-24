'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Bell, X, MessageSquare, Calendar, Eye, AlertTriangle, FileBarChart2 } from 'lucide-react';

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
  campaigns: Array<{ name: string; sent: number; opens: number; replies: number }>;
  aiSummary: string | null;
}

const typeIcon = {
  reply: MessageSquare,
  bounce: AlertTriangle,
  meeting_booked: Calendar,
  open: Eye,
  daily_report: FileBarChart2,
};

const typeColor = {
  reply: 'text-signal',
  bounce: 'text-ember',
  meeting_booked: 'text-signal',
  open: 'text-[#63b7ff]',
  daily_report: 'text-amber',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'notifications' | 'report'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

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

  useEffect(() => {
    let cancelled = false;
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`/api/notifications`);
        if (res.ok && !cancelled) setNotifications(await res.json());
      } catch { /* silent */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const fetchReport = useCallback(async () => {
    if (report?.generatedAt) {
      const reportDate = new Date(report.generatedAt).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      if (reportDate === today) return;
    }
    try {
      const res = await fetch(`/api/daily-report`);
      if (res.ok) {
        const data = await res.json();
        if (data) setReport(data);
      }
    } catch { /* ignore */ }
  }, [report?.generatedAt]);

  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        bellRef.current && !bellRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (tab === 'report' && open) fetchReport();
  }, [tab, open, fetchReport]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const panel = open ? createPortal(
    <div
      ref={panelRef}
      className="fixed w-[400px] max-h-[540px] panel-2 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      style={{ top: panelPos.top, right: panelPos.right, zIndex: 9999 }}
    >
      {/* Tabs */}
      <div className="flex hairline-b shrink-0">
        <button
          onClick={() => setTab('notifications')}
          className={`flex-1 py-3 font-mono text-[10px] tracking-mega uppercase transition-colors relative ${
            tab === 'notifications' ? 'text-signal' : 'text-paper-3 hover:text-paper'
          }`}
        >
          Activity {unreadCount > 0 && <span className="ml-1 text-signal nums">[{unreadCount}]</span>}
          {tab === 'notifications' && <span className="absolute left-0 right-0 -bottom-px h-px bg-signal" />}
        </button>
        <button
          onClick={() => setTab('report')}
          className={`flex-1 py-3 font-mono text-[10px] tracking-mega uppercase transition-colors relative ${
            tab === 'report' ? 'text-signal' : 'text-paper-3 hover:text-paper'
          }`}
        >
          Daily report
          {tab === 'report' && <span className="absolute left-0 right-0 -bottom-px h-px bg-signal" />}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 text-paper-4 hover:text-paper transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'notifications' ? (
          <>
            {notifications.length === 0 ? (
              <p className="p-12 text-center font-display italic text-paper-3 text-lg font-light">
                No activity yet.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {notifications.map((n) => {
                  const Icon = typeIcon[n.type] ?? Bell;
                  const color = typeColor[n.type] ?? 'text-paper-3';
                  const isUnread = !readIds.has(n.id);
                  return (
                    <Link
                      key={n.id}
                      href={n.campaignId ? `/campaigns/${n.campaignId}` : '/emails'}
                      className="flex items-start gap-3 p-4 hover:bg-ink-2 transition-colors group"
                    >
                      <div className="shrink-0 pt-0.5">
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-ui text-sm text-paper leading-tight">{n.title}</p>
                          {isUnread && <span className="w-1.5 h-1.5 bg-signal shrink-0 mt-1" />}
                        </div>
                        <p className="font-ui text-[12px] text-paper-3 mt-0.5 leading-snug">{n.description}</p>
                        <p className="font-mono text-[9px] tracking-mega uppercase text-paper-4 mt-1">
                          {timeAgo(n.createdAt)} ago
                          {n.prospectName && <span className="text-paper-4"> · {n.prospectName}</span>}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="p-5">
            {report ? (
              <div className="space-y-5">
                <div>
                  <p className="font-mono text-[10px] tracking-mega uppercase text-paper-4">
                    {report.period} · Generated {new Date(report.generatedAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-0 hairline border">
                  <StatCell label="Sent" value={report.stats.emailsSent} />
                  <StatCell label="Opens" value={report.stats.opens} />
                  <StatCell label="Replies" value={report.stats.replies} accent />
                </div>
                <div className="grid grid-cols-3 gap-0 hairline border">
                  <StatCell label="Booked" value={report.stats.meetingsBooked} accent />
                  <StatCell label="Bounces" value={report.stats.bounces} />
                  <StatCell label="Discovered" value={report.stats.prospectsDiscovered} />
                </div>
                {report.aiSummary && (
                  <div className="panel p-4">
                    <span className="label-sm block mb-2">Summary</span>
                    <p className="font-display italic text-paper-2 text-sm leading-relaxed">
                      "{report.aiSummary}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="p-8 text-center font-mono text-[10px] tracking-mega uppercase text-paper-4">
                Loading today's report…
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {tab === 'notifications' && unreadCount > 0 && (
        <div className="hairline-t shrink-0">
          <button
            onClick={markAllRead}
            className="w-full py-3 font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors"
          >
            Mark all read
          </button>
        </div>
      )}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 hairline flex items-center justify-center text-paper-3 hover:text-paper hover:border-paper-3 transition-colors"
        title="Notifications"
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 bg-signal text-ink-0 font-mono text-[9px] tracking-tight nums font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}

function StatCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="px-3 py-3 hairline-r last:border-r-0">
      <p className="label-sm">{label}</p>
      <p className={`font-display italic font-light text-xl nums leading-none mt-1 ${accent ? 'text-signal' : 'text-paper'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
