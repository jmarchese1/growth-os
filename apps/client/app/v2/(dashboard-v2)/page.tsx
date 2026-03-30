'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useBusiness } from '../../../components/auth/business-provider';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const AreaChart = dynamic(() => import('recharts').then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });

interface Activity {
  id: string; type: string; title: string; description: string | null; createdAt: string;
  contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
}
interface Appointment { id: string; title: string | null; startTime: string; status: string; contactId: string | null; }
interface SurveyResponse { id: string; createdAt: string; survey: { title: string }; contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null; }
interface QrScan { id: string; createdAt: string; qrCode: { label: string | null; purpose: string }; contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null; }
interface DashboardData { newContactsThisWeek: number; newContactsThisMonth: number; contactsByStatus: { leads: number; prospects: number; customers: number }; upcomingAppointments: Appointment[]; recentActivities: Activity[]; recentSurveyResponses: SurveyResponse[]; recentQrScans: QrScan[]; }
interface TrendPoint { date: string; count: number; }
interface TrendsData { contacts: TrendPoint[]; calls: TrendPoint[]; chats: TrendPoint[]; appointments: TrendPoint[]; qrScans: TrendPoint[]; }

const TREND_METRICS = [
  { key: 'contacts', label: 'Contacts', color: '#7c3aed' },
  { key: 'calls', label: 'Calls', color: '#f59e0b' },
  { key: 'chats', label: 'Chats', color: '#0ea5e9' },
  { key: 'qrScans', label: 'QR Scans', color: '#10b981' },
] as const;

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null } | null): string {
  if (!c) return 'Unknown';
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (c.email ?? 'Unknown');
}

/* ── Small reusable pieces ──────────────────────────────── */

function StatCard({ label, value, icon, trend, color }: {
  label: string; value: number | string; icon: React.ReactNode; trend?: string; color: string;
}) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  };
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-5 transition-all duration-300 hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-slate-300 dark:hover:border-white/[0.10]">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color] ?? colors.violet}`}>
          {icon}
        </div>
        {trend && <span className="text-[11px] font-medium text-emerald-500">{trend}</span>}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h2>
      {action}
    </div>
  );
}

function SegmentedControl({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-0.5 bg-slate-100 dark:bg-white/[0.06] rounded-lg p-0.5">
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200 ${
            value === o.key ? 'bg-white dark:bg-white/[0.10] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const ACTIVITY_COLORS: Record<string, string> = {
  CALL: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  CHAT: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  QR_SCAN: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  SURVEY: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  APPOINTMENT: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  CALL: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>,
  CHAT: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>,
  QR_SCAN: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5z" clipRule="evenodd" /></svg>,
  SURVEY: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>,
  APPOINTMENT: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
};

/* ── Page ────────────────────────────────────────────────── */

export default function DashboardV2Overview() {
  const { business, loading: businessLoading } = useBusiness();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [trendMetric, setTrendMetric] = useState<string>('contacts');
  const [trendRange, setTrendRange] = useState<number>(30);

  const counts = business?.counts ?? { contacts: 0, callLogs: 0, chatSessions: 0, appointments: 0, leads: 0 };

  const fetchDashboard = useCallback(async () => {
    if (!business?.id) { setDashLoading(false); return; }
    try {
      const [dashRes, trendRes] = await Promise.all([
        fetch(`${API_BASE}/businesses/${business.id}/dashboard`),
        fetch(`${API_BASE}/businesses/${business.id}/trends?days=${trendRange}`),
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json() as DashboardData);
      if (trendRes.ok) {
        const trendData = await trendRes.json() as { success: boolean; trends: TrendsData };
        if (trendData.success) setTrends(trendData.trends);
      }
    } catch { /* non-critical */ } finally { setDashLoading(false); }
  }, [business?.id, trendRange]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const loading = businessLoading || dashLoading;
  const activeTrend = TREND_METRICS.find((m) => m.key === trendMetric) ?? TREND_METRICS[0];
  const chartData = (trends?.[trendMetric as keyof TrendsData] ?? []).map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: p.count,
  }));

  // Activity feed
  const activityFeed: Array<{ key: string; time: string; label: string; sub: string; type: string; href?: string }> = [];
  if (dashboard) {
    for (const a of dashboard.recentActivities) {
      activityFeed.push({ key: `act-${a.id}`, time: a.createdAt, label: a.title ?? a.description ?? a.type, sub: contactName(a.contact), type: a.type, href: a.contact ? `/v2/customers/${a.contact.id}` : undefined });
    }
    for (const s of dashboard.recentSurveyResponses) {
      activityFeed.push({ key: `survey-${s.id}`, time: s.createdAt, label: `Completed "${s.survey.title}"`, sub: contactName(s.contact), type: 'SURVEY', href: s.contact ? `/v2/customers/${s.contact.id}` : undefined });
    }
    for (const q of dashboard.recentQrScans) {
      activityFeed.push({ key: `qr-${q.id}`, time: q.createdAt, label: `Scanned QR — ${q.qrCode.label ?? q.qrCode.purpose}`, sub: contactName(q.contact), type: 'QR_SCAN', href: q.contact ? `/v2/customers/${q.contact.id}` : undefined });
    }
    activityFeed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  // Pipeline
  const leads = dashboard?.contactsByStatus.leads ?? 0;
  const prospects = dashboard?.contactsByStatus.prospects ?? 0;
  const customers = dashboard?.contactsByStatus.customers ?? 0;
  const pipelineTotal = leads + prospects + customers || 1;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {business ? `Welcome back` : 'Dashboard'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Here&apos;s what&apos;s happening with {business?.name ?? 'your business'} today.
            </p>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Contacts" value={counts.contacts} color="violet"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
            <StatCard label="New This Week" value={dashboard?.newContactsThisWeek ?? 0} color="emerald" trend={dashboard?.newContactsThisWeek ? `+${dashboard.newContactsThisWeek}` : undefined}
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>} />
            <StatCard label="Calls This Month" value={counts.callLogs} color="amber"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
            <StatCard label="Chat Sessions" value={counts.chatSessions} color="sky"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Trends</h2>
                <SegmentedControl options={[{ key: '7', label: '7d' }, { key: '30', label: '30d' }, { key: '90', label: '90d' }]} value={String(trendRange)} onChange={(v) => setTrendRange(Number(v))} />
              </div>
              <SegmentedControl options={TREND_METRICS.map((m) => ({ key: m.key, label: m.label }))} value={trendMetric} onChange={setTrendMetric} />
            </div>
            <div className="h-56 px-2 pb-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="v2TrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeTrend.color} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={activeTrend.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} labelStyle={{ fontWeight: 600, color: '#1e293b' }} />
                    <Area type="monotone" dataKey="value" stroke={activeTrend.color} strokeWidth={2} fill="url(#v2TrendGrad)" name={activeTrend.label} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Activity will show here as your business grows
                </div>
              )}
            </div>
          </Card>

          {/* Pipeline + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader title="Contact Pipeline" />
              <div className="p-5 space-y-4">
                {[
                  { label: 'Leads', value: leads, color: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
                  { label: 'Prospects', value: prospects, color: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
                  { label: 'Customers', value: customers, color: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{s.label}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>{s.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(2, Math.round((s.value / pipelineTotal) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Quick Actions" />
              <div className="p-4 space-y-1.5">
                {[
                  { href: '/v2/campaigns', label: 'New Campaign', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>, color: 'violet' },
                  { href: '/v2/customers', label: 'View Contacts', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" /></svg>, color: 'emerald' },
                  { href: '/v2/surveys', label: 'Send Survey', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>, color: 'sky' },
                  { href: '/v2/website', label: 'Edit Website', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" /></svg>, color: 'amber' },
                ].map((a) => (
                  <Link key={a.href} href={a.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-200 group">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {a.icon}
                    </span>
                    <span className="font-medium">{a.label}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 ml-auto text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Activity + Appointments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 overflow-hidden">
              <CardHeader title="Recent Activity" action={<Link href="/v2/customers" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">View all</Link>} />
              <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                {activityFeed.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-slate-400">Activity will appear here as customers interact with your business.</p>
                ) : (
                  activityFeed.slice(0, 12).map((item) => {
                    const icon = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS['CHAT'];
                    const color = ACTIVITY_COLORS[item.type] ?? 'bg-slate-100 text-slate-500';
                    const Inner = (
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors duration-200">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{item.label}</p>
                          <p className="text-[11px] text-slate-400">{item.sub}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 flex-shrink-0">{formatRelative(item.time)}</span>
                      </div>
                    );
                    return item.href ? <Link key={item.key} href={item.href}>{Inner}</Link> : <div key={item.key}>{Inner}</div>;
                  })
                )}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader title="Upcoming" />
                <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                  {!dashboard || dashboard.upcomingAppointments.length === 0 ? (
                    <p className="px-5 py-8 text-center text-xs text-slate-400">No upcoming appointments</p>
                  ) : (
                    dashboard.upcomingAppointments.slice(0, 5).map((appt) => (
                      <div key={appt.id} className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-white truncate">{appt.title ?? 'Appointment'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{new Date(appt.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                        <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                          appt.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' :
                          appt.status === 'PENDING' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' :
                          'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400'
                        }`}>{appt.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="This Month" />
                <div className="p-5 space-y-3">
                  {[
                    { label: 'New contacts', value: dashboard?.newContactsThisMonth ?? 0 },
                    { label: 'Phone calls', value: counts.callLogs },
                    { label: 'Chat sessions', value: counts.chatSessions },
                    { label: 'Appointments', value: counts.appointments },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-white tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
