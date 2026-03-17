'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import KpiCard from '../../components/ui/kpi-card';
import ModuleStatus from '../../components/ui/module-status';
import { useBusiness } from '../../components/auth/business-provider';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
}

interface Appointment {
  id: string;
  title: string | null;
  startTime: string;
  status: string;
  contactId: string | null;
}

interface SurveyResponse {
  id: string;
  createdAt: string;
  survey: { title: string };
  contact: { id: string; firstName: string | null; lastName: string | null } | null;
}

interface QrScan {
  id: string;
  createdAt: string;
  qrCode: { label: string | null; purpose: string };
  contact: { id: string; firstName: string | null; lastName: string | null } | null;
}

interface DashboardData {
  newContactsThisWeek: number;
  newContactsThisMonth: number;
  upcomingAppointments: Appointment[];
  recentActivities: Activity[];
  recentSurveyResponses: SurveyResponse[];
  recentQrScans: QrScan[];
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  CALL: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  ),
  CHAT: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
    </svg>
  ),
  QR_SCAN: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5z" clipRule="evenodd" />
    </svg>
  ),
  SURVEY: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
    </svg>
  ),
  APPOINTMENT: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

const ACTIVITY_COLORS: Record<string, string> = {
  CALL: 'bg-amber-100 text-amber-600',
  CHAT: 'bg-sky-100 text-sky-600',
  QR_SCAN: 'bg-violet-100 text-violet-600',
  SURVEY: 'bg-emerald-100 text-emerald-600',
  APPOINTMENT: 'bg-indigo-100 text-indigo-600',
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null } | null): string {
  if (!c) return 'Unknown';
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (c.email ?? 'Unknown');
}

export default function DashboardOverview() {
  const { business, loading: businessLoading } = useBusiness();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  const counts = business?.counts ?? { contacts: 0, callLogs: 0, chatSessions: 0, appointments: 0, leads: 0 };
  const settings = business?.settings as Record<string, unknown> | null;

  const fetchDashboard = useCallback(async () => {
    if (!business?.id) {
      setDashLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/businesses/${business.id}/dashboard`);
      if (res.ok) {
        setDashboard(await res.json() as DashboardData);
      }
    } catch {
      // silently fail — non-critical
    } finally {
      setDashLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const loading = businessLoading || dashLoading;

  // Merge all recent events into a single timeline
  const activityFeed: Array<{ key: string; time: string; label: string; sub: string; type: string; href?: string }> = [];

  if (dashboard) {
    for (const a of dashboard.recentActivities) {
      activityFeed.push({
        key: `act-${a.id}`,
        time: a.createdAt,
        label: a.title ?? a.description ?? a.type,
        sub: contactName(a.contact),
        type: a.type,
        href: a.contact ? `/customers/${a.contact.id}` : undefined,
      });
    }
    for (const s of dashboard.recentSurveyResponses) {
      activityFeed.push({
        key: `survey-${s.id}`,
        time: s.createdAt,
        label: `Completed "${s.survey.title}"`,
        sub: contactName(s.contact),
        type: 'SURVEY',
        href: s.contact ? `/customers/${s.contact.id}` : undefined,
      });
    }
    for (const q of dashboard.recentQrScans) {
      activityFeed.push({
        key: `qr-${q.id}`,
        time: q.createdAt,
        label: `Scanned QR — ${q.qrCode.label ?? q.qrCode.purpose}`,
        sub: contactName(q.contact),
        type: 'QR_SCAN',
        href: q.contact ? `/customers/${q.contact.id}` : undefined,
      });
    }
    activityFeed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {business ? `Overview for ${business.name}` : 'Overview of your Embedo AI services'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total Contacts" value={counts.contacts} color="violet"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
            <KpiCard label="New This Week" value={dashboard?.newContactsThisWeek ?? 0} color="emerald"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>} />
            <KpiCard label="Calls This Month" value={counts.callLogs} color="amber"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
            <KpiCard label="Chat Conversations" value={counts.chatSessions} color="sky"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Activity Feed */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Recent Activity</h2>
                <Link href="/customers" className="text-xs text-violet-600 hover:underline">View all contacts</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {activityFeed.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-400">
                    Activity will appear here as your customers interact with your business.
                  </p>
                ) : (
                  activityFeed.slice(0, 15).map((item) => {
                    const icon = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS['CHAT'];
                    const color = ACTIVITY_COLORS[item.type] ?? 'bg-slate-100 text-slate-500';
                    const Inner = (
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate">{item.label}</p>
                          <p className="text-[11px] text-slate-400">{item.sub}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 flex-shrink-0">{formatRelative(item.time)}</span>
                      </div>
                    );
                    return item.href ? (
                      <Link key={item.key} href={item.href}>{Inner}</Link>
                    ) : (
                      <div key={item.key}>{Inner}</div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-700">Upcoming Appointments</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {!dashboard || dashboard.upcomingAppointments.length === 0 ? (
                    <p className="px-5 py-6 text-center text-xs text-slate-400">No upcoming appointments</p>
                  ) : (
                    dashboard.upcomingAppointments.map((appt) => (
                      <div key={appt.id} className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-700 truncate">{appt.title ?? 'Appointment'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(appt.startTime)}</p>
                        <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${
                          appt.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' :
                          appt.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>{appt.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">This Month</h2>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">New contacts</span>
                    <span className="text-sm font-semibold text-slate-700">{dashboard?.newContactsThisMonth ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Phone calls</span>
                    <span className="text-sm font-semibold text-slate-700">{counts.callLogs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Chat sessions</span>
                    <span className="text-sm font-semibold text-slate-700">{counts.chatSessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Appointments</span>
                    <span className="text-sm font-semibold text-slate-700">{counts.appointments}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Modules */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Active Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ModuleStatus name="Voice Agent" active={!!business?.elevenLabsAgentId} description="AI receptionist for inbound calls"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Chatbot" active={!!settings?.['chatbotEnabled']} description="AI chat on website, IG & FB"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Lead Engine" active={counts.leads > 0} description="Lead capture, scoring & sequences"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
              <ModuleStatus name="Surveys" active={false} description="Customer satisfaction & feedback"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Social Media" active={!!(business?.instagramPageId || business?.facebookPageId)} description="Content generation & scheduling"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>} />
              <ModuleStatus name="Website" active={business?.status === 'ACTIVE'} description="Auto-generated business website"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Proposals" active={false} description="AI-generated business proposals"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Phone Number" active={!!business?.twilioPhoneNumber} description={business?.twilioPhoneNumber ?? 'Dedicated business phone line'}
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
            </div>
          </div>

          {!business && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Getting Started</h2>
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Your business profile is being set up. Refresh to see your dashboard.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
