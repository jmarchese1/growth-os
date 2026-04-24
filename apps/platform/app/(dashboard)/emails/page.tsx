import Link from 'next/link';
import { ArrowUpRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { SearchInput } from './search-input';
import { SectionHeader, HeroMetric, MetricBlock } from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface Campaign { id: string; name: string; targetCity: string; targetIndustry: string; }
interface Message {
  id: string; status: string; stepNumber: number | null; subject: string | null;
  sentAt: string | null; openedAt: string | null; repliedAt: string | null;
  replyBody: string | null; replyCategory: string | null;
}
interface EmailProspect {
  id: string; name: string; email: string | null; phone: string | null; website: string | null;
  status: string; contactFirstName: string | null; contactLastName: string | null;
  contactTitle: string | null; nextFollowUpAt: string | null; createdAt: string;
  updatedAt: string; campaign: Campaign; messages: Message[];
}
interface EmailStats {
  totalContacted: number; totalMessages: number; sent: number; opened: number; openRate: number;
  replied: number; meetingBooked: number; replyRate: number; bounced: number; bounceRate: number;
}

async function getEmailStats(): Promise<EmailStats> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/emails/stats`, { next: { revalidate: 30 } });
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
      qs.set('status', params.status ?? 'CONTACTED,OPENED,REPLIED,MEETING_BOOKED,CONVERTED,BOUNCED,UNSUBSCRIBED');
    } else if (params.tab === 'leads') {
      qs.set('status', 'REPLIED,MEETING_BOOKED,CONVERTED');
    } else {
      if (params.status) qs.set('status', params.status);
    }
    const res = await fetch(`${PROSPECTOR_URL}/emails/all?${qs}`, { next: { revalidate: 30 } });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
}

const statusDot: Record<string, string> = {
  NEW:            'bg-paper-4',
  ENRICHED:       'bg-[#63b7ff]',
  CONTACTED:      'bg-amber',
  OPENED:         'bg-amber',
  REPLIED:        'bg-signal',
  MEETING_BOOKED: 'bg-signal',
  CONVERTED:      'bg-signal',
  BOUNCED:        'bg-ember',
  DEAD:           'bg-paper-4',
  UNSUBSCRIBED:   'bg-ember',
};

const statusLabel: Record<string, string> = {
  NEW: 'NEW', ENRICHED: 'ENRICHED', CONTACTED: 'EMAILED', OPENED: 'OPENED',
  REPLIED: 'REPLIED', MEETING_BOOKED: 'BOOKED', CONVERTED: 'CONVERTED',
  BOUNCED: 'BOUNCED', DEAD: 'DEAD', UNSUBSCRIBED: 'UNSUB',
};

const sentimentColor: Record<string, string> = {
  POSITIVE: 'text-signal', NEUTRAL: 'text-paper-3', NEGATIVE: 'text-ember',
  OOO: 'text-amber', UNSUBSCRIBE: 'text-ember',
};

export default async function EmailsPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; search?: string; status?: string; page?: string }>;
}) {
  const { tab = 'all', search = '', status, page = '1' } = await searchParams;

  const [stats, { items, total }] = await Promise.all([
    getEmailStats(),
    getEmails({ tab, search, status, page }),
  ]);

  const tabs = [
    { key: 'all',       label: 'All',       count: stats.totalContacted },
    { key: 'prospects', label: 'Prospects', count: stats.sent },
    { key: 'leads',     label: 'Leads',     count: stats.replied + stats.meetingBooked },
  ];

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1800px] mx-auto space-y-12">
      {/* Masthead */}
      <section className="pb-8 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 09 · Inbox
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {stats.totalContacted.toLocaleString()} contacted
          </span>
        </div>
        <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[60px] lg:text-[72px]">
          Every conversation.
        </h1>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          One inbox across every campaign. Search, filter by status, track sentiment, compose replies.
        </p>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4">
          <HeroMetric label="Reply rate" value={stats.replyRate.toString()} unit="%" caption={`${stats.replied} on ${stats.totalMessages.toLocaleString()} sent`} size="md" />
        </div>
        <div className="col-span-12 lg:col-span-8 panel">
          <div className="grid grid-cols-5">
            <MetricBlock label="Sent" value={stats.totalMessages.toLocaleString()} />
            <MetricBlock label="Opens" value={stats.opened.toLocaleString()} delta={`${stats.openRate}%`} trend={stats.openRate > 15 ? 'up' : 'flat'} />
            <MetricBlock label="Replies" value={stats.replied} trend={stats.replied > 0 ? 'up' : 'flat'} />
            <MetricBlock label="Booked" value={stats.meetingBooked} trend={stats.meetingBooked > 0 ? 'up' : 'flat'} />
            <MetricBlock label="Bounce" value={`${stats.bounceRate}%`} trend={stats.bounceRate > 5 ? 'down' : 'flat'} />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader numeral="1" title="The inbox" subtitle={`${total.toLocaleString()} contacts, filtered by tab`} />

        {/* Tabs + Search */}
        <div className="mt-6 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex">
            {tabs.map((t) => {
              const isActive = t.key === tab;
              const href = t.key === 'all'
                ? `/emails${search ? `?search=${encodeURIComponent(search)}` : ''}`
                : `/emails?tab=${t.key}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={`px-5 py-2.5 font-mono text-[10px] tracking-mega uppercase transition-colors relative ${
                    isActive ? 'text-signal' : 'text-paper-3 hover:text-paper'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="ml-2 text-paper-4 nums">{t.count}</span>
                  {isActive && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-signal" />}
                </Link>
              );
            })}
          </div>
          <div className="flex-1 max-w-md ml-auto">
            <SearchInput defaultValue={search} />
          </div>
        </div>

        {/* Status filter pills */}
        {tab === 'all' && (
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { label: 'All', value: undefined },
              { label: 'Emailed', value: 'CONTACTED' },
              { label: 'Opened', value: 'OPENED' },
              { label: 'Replied', value: 'REPLIED' },
              { label: 'Booked', value: 'MEETING_BOOKED' },
              { label: 'Converted', value: 'CONVERTED' },
              { label: 'Bounced', value: 'BOUNCED' },
            ].map((f) => {
              const isActive = f.value === undefined ? !status : status === f.value;
              const href = f.value
                ? `/emails?tab=all${search ? `&search=${encodeURIComponent(search)}` : ''}&status=${f.value}`
                : `/emails${search ? `?search=${encodeURIComponent(search)}` : ''}`;
              return (
                <Link
                  key={f.label}
                  href={href}
                  className={`px-3 py-1.5 font-mono text-[10px] tracking-micro uppercase hairline transition-colors ${
                    isActive
                      ? 'border-signal bg-signal-soft text-signal'
                      : 'border-rule text-paper-3 hover:text-paper'
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '1400px' }}>
              <thead>
                <tr className="hairline-b">
                  <Th sticky>Business</Th>
                  <Th>Contact</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Campaign</Th>
                  <Th align="right">Sent</Th>
                  <Th>Last sent</Th>
                  <Th>Replied</Th>
                  <Th>Sentiment</Th>
                  <Th>Pending</Th>
                  <Th sticky="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <p className="font-display italic text-paper-3 text-xl font-light">
                        {search ? `No results for "${search}"` : 'Nothing yet.'}
                      </p>
                      <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4 mt-2">
                        Run a campaign to start the conversation.
                      </p>
                    </td>
                  </tr>
                )}
                {items.map((p) => {
                  const lastMsg = p.messages[0];
                  const sentCount = p.messages.filter((m) => m.sentAt).length;
                  const replyMsg = p.messages.find((m) => m.replyBody);
                  const hasPending = !!p.nextFollowUpAt;
                  const isBooked = p.status === 'MEETING_BOOKED';

                  return (
                    <tr key={p.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors group">
                      <td className="px-4 py-3.5 min-w-[220px] max-w-[260px] sticky left-0 bg-ink-1 group-hover:bg-ink-2 z-10 transition-colors">
                        <Link href={`/emails/${p.id}`} className="font-display italic text-paper text-base font-light hover:text-signal transition-colors block leading-tight truncate">
                          {p.name}
                        </Link>
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-paper-4 hover:text-paper-2 truncate block transition-colors">
                            {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </a>
                        )}
                        {isBooked && (
                          <span className="inline-flex items-center gap-1 mt-1 font-mono text-[9px] tracking-mega uppercase text-signal">
                            <CalendarIcon className="w-2.5 h-2.5" />
                            Cal booking
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[140px]">
                        {p.contactFirstName ? (
                          <div>
                            <p className="font-ui text-xs text-paper">{p.contactFirstName} {p.contactLastName ?? ''}</p>
                            {p.contactTitle && <p className="font-mono text-[10px] text-paper-4 truncate">{p.contactTitle}</p>}
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-paper-4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[190px]">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="font-mono text-[11px] text-paper-2 hover:text-signal transition-colors truncate block">
                            {p.email}
                          </a>
                        ) : (
                          <span className="font-mono text-[10px] text-paper-4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[110px]">
                        <span className="inline-flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 shrink-0 ${statusDot[p.status] ?? 'bg-paper-4'}`} />
                          <span className="font-mono text-[10px] tracking-mega uppercase text-paper-2">
                            {statusLabel[p.status] ?? p.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 min-w-[150px]">
                        <Link href={`/campaigns/${p.campaign.id}`} className="font-ui text-xs text-paper hover:text-signal transition-colors">
                          {p.campaign.name}
                        </Link>
                        <p className="font-mono text-[10px] text-paper-4 uppercase mt-0.5">{p.campaign.targetCity}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm text-paper nums">{sentCount}</td>
                      <td className="px-4 py-3.5 min-w-[140px] font-mono text-[11px] text-paper-3">{fmt(lastMsg?.sentAt)}</td>
                      <td className="px-4 py-3.5 min-w-[180px] max-w-[220px]">
                        {replyMsg?.replyBody ? (
                          <p className="font-display italic text-paper-2 text-[12px] truncate leading-snug" title={replyMsg.replyBody}>
                            "{replyMsg.replyBody.slice(0, 55)}{replyMsg.replyBody.length > 55 ? '…' : ''}"
                          </p>
                        ) : (
                          <span className="font-mono text-[10px] text-paper-4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[90px]">
                        {replyMsg?.replyCategory ? (
                          <span className={`font-mono text-[10px] tracking-micro uppercase ${sentimentColor[replyMsg.replyCategory] ?? 'text-paper-3'}`}>
                            {replyMsg.replyCategory}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-paper-4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[100px]">
                        {hasPending ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-mega uppercase text-amber">
                            <Clock className="w-3 h-3" />
                            Queued
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-paper-4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[100px] sticky right-0 bg-ink-1 group-hover:bg-ink-2 z-10 transition-colors">
                        <Link
                          href={`/emails/${p.id}`}
                          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-paper-3 group-hover:text-signal transition-colors"
                        >
                          <span>Open</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="hairline-t px-5 py-3 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-micro uppercase text-paper-4">
              {total.toLocaleString()} records{search ? ` matching "${search}"` : ''}
            </span>
            {total > 50 && (
              <div className="flex items-center gap-4">
                {parseInt(page) > 1 && (
                  <Link
                    href={`/emails?tab=${tab}${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}&page=${parseInt(page) - 1}`}
                    className="font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors"
                  >
                    ← Prev
                  </Link>
                )}
                <span className="font-mono text-[10px] tracking-mega uppercase text-paper-4">Page {page}</span>
                {total > parseInt(page) * 50 && (
                  <Link
                    href={`/emails?tab=${tab}${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}&page=${parseInt(page) + 1}`}
                    className="font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Th({
  children,
  align = 'left',
  sticky,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  sticky?: boolean | 'right';
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[9px] tracking-mega uppercase text-paper-4 font-medium whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${sticky === true ? 'sticky left-0 bg-ink-1 z-20' : ''} ${sticky === 'right' ? 'sticky right-0 bg-ink-1 z-20' : ''}`}
    >
      {children}
    </th>
  );
}
