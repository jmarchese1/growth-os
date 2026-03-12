import Link from 'next/link';
import { SearchInput } from './search-input';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  targetIndustry: string;
}

interface Message {
  id: string;
  status: string;
  stepNumber: number | null;
  subject: string | null;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  replyBody: string | null;
  replyCategory: string | null;
}

interface EmailProspect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactTitle: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: Campaign;
  messages: Message[];
}

interface EmailStats {
  totalContacted: number;
  totalMessages: number;
  sent: number;
  opened: number;
  openRate: number;
  replied: number;
  meetingBooked: number;
  replyRate: number;
  bounced: number;
  bounceRate: number;
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function getEmailStats(): Promise<EmailStats> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/emails/stats`, { cache: 'no-store' });
    if (!res.ok) return { totalContacted: 0, totalMessages: 0, sent: 0, opened: 0, openRate: 0, replied: 0, meetingBooked: 0, replyRate: 0, bounced: 0, bounceRate: 0 };
    return res.json();
  } catch {
    return { totalContacted: 0, totalMessages: 0, sent: 0, opened: 0, openRate: 0, replied: 0, meetingBooked: 0, replyRate: 0, bounced: 0, bounceRate: 0 };
  }
}

async function getEmails(params: { tab: string; search?: string; status?: string; page?: string }): Promise<{ items: EmailProspect[]; total: number }> {
  try {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', params.page);
    qs.set('pageSize', '50');

    if (params.tab === 'prospects') {
      // All emailed prospects (any status with messages)
      qs.set('status', params.status ?? 'CONTACTED,OPENED,REPLIED,MEETING_BOOKED,CONVERTED,BOUNCED,UNSUBSCRIBED');
    } else if (params.tab === 'leads') {
      qs.set('status', 'REPLIED,MEETING_BOOKED,CONVERTED');
    } else {
      // "all" tab — everything with messages
      if (params.status) qs.set('status', params.status);
    }

    const res = await fetch(`${PROSPECTOR_URL}/emails/all?${qs}`, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

type ProspectStatus = 'NEW' | 'ENRICHED' | 'CONTACTED' | 'OPENED' | 'REPLIED' | 'MEETING_BOOKED' | 'CONVERTED' | 'BOUNCED' | 'DEAD' | 'UNSUBSCRIBED';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string; bg: string; text: string }> = {
    NEW:            { dot: 'bg-slate-500',   label: 'New',             bg: 'bg-slate-500/10',   text: 'text-slate-400' },
    ENRICHED:       { dot: 'bg-blue-400',    label: 'Has Email',       bg: 'bg-blue-500/10',    text: 'text-blue-400' },
    CONTACTED:      { dot: 'bg-violet-400',  label: 'Emailed',         bg: 'bg-violet-500/10',  text: 'text-violet-400' },
    OPENED:         { dot: 'bg-amber-400',   label: 'Opened',          bg: 'bg-amber-500/10',   text: 'text-amber-400' },
    REPLIED:        { dot: 'bg-emerald-400', label: 'Replied',         bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    MEETING_BOOKED: { dot: 'bg-cyan-400',    label: 'Meeting Booked',  bg: 'bg-cyan-500/10',    text: 'text-cyan-400' },
    CONVERTED:      { dot: 'bg-green-400',   label: 'Converted',       bg: 'bg-green-500/10',   text: 'text-green-400' },
    BOUNCED:        { dot: 'bg-red-400',     label: 'Bounced',         bg: 'bg-red-500/10',     text: 'text-red-400' },
    DEAD:           { dot: 'bg-slate-600',   label: 'Dead',            bg: 'bg-slate-600/10',   text: 'text-slate-500' },
    UNSUBSCRIBED:   { dot: 'bg-orange-400',  label: 'Unsub',           bg: 'bg-orange-500/10',  text: 'text-orange-400' },
  };
  const cfg = map[status] ?? { dot: 'bg-slate-500', label: status, bg: 'bg-slate-500/10', text: 'text-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

function SentimentBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-xs text-slate-700">--</span>;
  const map: Record<string, { label: string; color: string }> = {
    POSITIVE: { label: 'Positive', color: 'text-emerald-400' },
    NEUTRAL:  { label: 'Neutral',  color: 'text-slate-400' },
    NEGATIVE: { label: 'Negative', color: 'text-red-400' },
    OOO:      { label: 'OOO',      color: 'text-amber-400' },
    UNSUBSCRIBE: { label: 'Unsub', color: 'text-orange-400' },
  };
  const cfg = map[category] ?? { label: category, color: 'text-slate-400' };
  return <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EmailsPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; search?: string; status?: string; page?: string }>;
}) {
  const { tab = 'all', search = '', status, page = '1' } = await searchParams;

  const [stats, { items, total }] = await Promise.all([
    getEmailStats(),
    getEmails({ tab, search, status, page }),
  ]);

  const tabs = [
    { key: 'all',       label: 'All Contacts',  count: stats.totalContacted },
    { key: 'prospects', label: 'Prospects',      count: stats.sent },
    { key: 'leads',     label: 'Leads',          count: stats.replied + stats.meetingBooked },
  ];

  return (
    <div className="relative p-8 animate-fade-up min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 right-[5%] w-[440px] h-[440px] opacity-[0.06]">
          <div className="absolute inset-0 rounded-full border border-violet-400 animate-orbital-slow" />
          <div className="absolute inset-[70px] rounded-full border border-indigo-400 animate-orbital-reverse" />
        </div>
        <div className="absolute top-10 right-16 w-64 h-64 rounded-full bg-violet-600/8 blur-[90px] animate-float-orb" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/" className="hover:text-violet-400 transition-colors flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
              Overview
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">Emails</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Email Manager</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Every business you&apos;ve contacted — track, search, and compose emails from one place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Contacted',      value: stats.totalContacted, color: 'text-slate-200', border: 'border-white/10' },
            { label: 'Emails Sent',    value: stats.totalMessages,  color: 'text-violet-400', border: 'border-violet-500/20' },
            { label: 'Open Rate',      value: `${stats.openRate}%`, color: 'text-amber-400',  border: 'border-amber-500/20' },
            { label: 'Replied',        value: stats.replied,        color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Meetings',       value: stats.meetingBooked,  color: 'text-cyan-400',   border: 'border-cyan-500/20' },
            { label: 'Bounce Rate',    value: `${stats.bounceRate}%`, color: 'text-red-400',  border: 'border-red-500/20' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-white/5 backdrop-blur-sm rounded-xl border ${stat.border} p-4`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 w-fit border border-white/10">
            {tabs.map((t) => {
              const isActive = t.key === tab;
              const href = t.key === 'all'
                ? `/emails${search ? `?search=${encodeURIComponent(search)}` : ''}`
                : `/emails?tab=${t.key}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-600/30 text-white border border-violet-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-violet-400' : 'text-slate-600'}`}>
                    {t.count}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="flex-1 max-w-md">
            <SearchInput defaultValue={search} />
          </div>
        </div>

        {/* Status filter pills (all tab only) */}
        {tab === 'all' && (
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All', value: undefined },
              { label: 'Emailed',        value: 'CONTACTED' },
              { label: 'Opened',         value: 'OPENED' },
              { label: 'Replied',        value: 'REPLIED' },
              { label: 'Meeting Booked', value: 'MEETING_BOOKED' },
              { label: 'Converted',      value: 'CONVERTED' },
              { label: 'Bounced',        value: 'BOUNCED' },
            ].map((f) => {
              const isActive = f.value === undefined ? !status : status === f.value;
              const href = f.value
                ? `/emails?tab=all${search ? `&search=${encodeURIComponent(search)}` : ''}&status=${f.value}`
                : `/emails${search ? `?search=${encodeURIComponent(search)}` : ''}`;
              return (
                <Link
                  key={f.label}
                  href={href}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
                      : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
          <div className="overflow-x-auto [transform:rotateX(180deg)]">
          <div className="[transform:rotateX(180deg)]">
          <table className="text-sm" style={{ minWidth: '1400px', width: '100%' }}>
            <thead>
              <tr className="bg-white/[0.07] border-b-2 border-slate-700/40">
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-[#17132b] z-10">Business</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Email</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Campaign</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Emails Sent</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Last Sent</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Replied</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Sentiment</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Pending</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap sticky right-0 bg-[#17132b] z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-slate-600 text-sm">
                    {search
                      ? `No results for "${search}"`
                      : 'No emails sent yet. Run a campaign to start outreach.'}
                  </td>
                </tr>
              )}
              {items.map((p) => {
                const lastMsg = p.messages[0];
                const sentCount = p.messages.filter((m) => m.sentAt).length;
                const replyMsg = p.messages.find((m) => m.replyBody);
                const hasPending = !!p.nextFollowUpAt;
                const isMeetingBooked = p.status === 'MEETING_BOOKED';

                return (
                  <tr key={p.id} className="hover:bg-violet-950/20 transition-colors group">
                    {/* Business — sticky left */}
                    <td className="px-4 py-3 min-w-[200px] max-w-[240px] sticky left-0 bg-[#0c0a18] group-hover:bg-[#0e0c1e] z-10 transition-colors">
                      <Link href={`/emails/${p.id}`} className="font-semibold text-white hover:text-violet-300 transition-colors truncate block text-sm">
                        {p.name}
                      </Link>
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-400/60 hover:text-violet-300 truncate block transition-colors">
                          {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      )}
                      {isMeetingBooked && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                          Cal Booking
                        </span>
                      )}
                    </td>

                    {/* Contact Name */}
                    <td className="px-4 py-3 min-w-[140px]">
                      {p.contactFirstName ? (
                        <div>
                          <span className="text-xs text-slate-300">{p.contactFirstName} {p.contactLastName ?? ''}</span>
                          {p.contactTitle && <p className="text-[10px] text-slate-600 truncate">{p.contactTitle}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-700">--</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 min-w-[190px]">
                      {p.email ? (
                        <a href={`mailto:${p.email}`} className="font-mono text-xs text-slate-300 hover:text-violet-400 transition-colors truncate block">
                          {p.email}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-700">--</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 min-w-[130px]">
                      <StatusBadge status={p.status} />
                    </td>

                    {/* Campaign */}
                    <td className="px-4 py-3 min-w-[150px]">
                      <Link href={`/campaigns/${p.campaign.id}`} className="text-xs text-slate-400 hover:text-violet-400 transition-colors">
                        {p.campaign.name}
                      </Link>
                      <p className="text-[10px] text-slate-600">{p.campaign.targetCity}</p>
                    </td>

                    {/* Emails Sent */}
                    <td className="px-4 py-3 min-w-[90px] text-center">
                      <span className="text-sm font-semibold text-slate-300">{sentCount}</span>
                    </td>

                    {/* Last Sent */}
                    <td className="px-4 py-3 min-w-[130px] whitespace-nowrap">
                      <span className="text-xs text-slate-400">{fmt(lastMsg?.sentAt)}</span>
                    </td>

                    {/* Replied */}
                    <td className="px-4 py-3 min-w-[180px] max-w-[220px]">
                      {replyMsg?.replyBody ? (
                        <p className="text-xs text-emerald-400 italic truncate" title={replyMsg.replyBody}>
                          &ldquo;{replyMsg.replyBody.slice(0, 50)}{replyMsg.replyBody.length > 50 ? '...' : ''}&rdquo;
                        </p>
                      ) : (
                        <span className="text-xs text-slate-700">--</span>
                      )}
                    </td>

                    {/* Sentiment */}
                    <td className="px-4 py-3 min-w-[80px]">
                      <SentimentBadge category={replyMsg?.replyCategory ?? null} />
                    </td>

                    {/* Pending sequence */}
                    <td className="px-4 py-3 min-w-[100px]">
                      {hasPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Queued
                        </span>
                      ) : (
                        <span className="text-xs text-slate-700">--</span>
                      )}
                    </td>

                    {/* Actions — sticky right */}
                    <td className="px-4 py-3 min-w-[120px] sticky right-0 bg-[#0c0a18] group-hover:bg-[#0e0c1e] z-10 transition-colors">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/emails/${p.id}`}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 hover:text-white transition-colors whitespace-nowrap"
                        >
                          View & Send
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </div>

          {/* Footer / Pagination */}
          <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
            <p className="text-xs text-slate-600">
              {total} contact{total !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}
            </p>
            {total > 50 && (
              <div className="flex items-center gap-2">
                {parseInt(page) > 1 && (
                  <Link
                    href={`/emails?tab=${tab}${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}&page=${parseInt(page) - 1}`}
                    className="text-xs text-violet-400 hover:underline"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-xs text-slate-500">Page {page}</span>
                {total > parseInt(page) * 50 && (
                  <Link
                    href={`/emails?tab=${tab}${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}&page=${parseInt(page) + 1}`}
                    className="text-xs text-violet-400 hover:underline"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
