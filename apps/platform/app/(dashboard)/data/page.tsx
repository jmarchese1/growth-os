"use client";

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Mail, Eye, MessageSquare, AlertTriangle, X } from 'lucide-react';
import { SectionHeader } from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface Message {
  id: string;
  subject: string | null;
  body: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'OPENED' | 'REPLIED' | 'BOUNCED' | 'FAILED';
  stepNumber: number | null;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  replyBody: string | null;
  replyCategory: string | null;
  createdAt: string;
  prospect: {
    id: string;
    name: string;
    email: string | null;
    contactFirstName: string | null;
    status: string;
    campaign: {
      id: string;
      name: string;
      targetCity: string;
      targetIndustry: string;
    } | null;
  };
  sendingDomain: { domain: string } | null;
}

interface Stats {
  total: number;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Sent', value: 'SENT,DELIVERED' },
  { label: 'Opened', value: 'OPENED' },
  { label: 'Replied', value: 'REPLIED' },
  { label: 'Bounced', value: 'BOUNCED,FAILED' },
];

function formatDate(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusBadge(m: Message): { label: string; cls: string } {
  if (m.repliedAt || m.status === 'REPLIED') return { label: 'Replied', cls: 'bg-signal/10 text-signal' };
  if (m.openedAt || m.status === 'OPENED') return { label: 'Opened', cls: 'bg-[#5ac8fa]/10 text-[#5ac8fa]' };
  if (m.status === 'BOUNCED') return { label: 'Bounced', cls: 'bg-ember/10 text-ember' };
  if (m.status === 'FAILED') return { label: 'Failed', cls: 'bg-ember/10 text-ember' };
  if (m.status === 'SENT' || m.status === 'DELIVERED') return { label: 'Sent', cls: 'bg-ink-2 text-paper-2' };
  return { label: m.status.charAt(0) + m.status.slice(1).toLowerCase(), cls: 'bg-ink-2 text-paper-3' };
}

export default function DataPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');
  const campaignId = searchParams.get('campaignId');

  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Message | null>(null);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = new URLSearchParams();
      // Show every email created today (ET) onward, regardless of whether the
      // campaign is explicitly linked to an agent. Tomorrow's run, manual
      // trigger, agent-spawned campaigns — all show up. Historical emails
      // pre-today are excluded.
      const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const startOfTodayET = new Date(`${todayET}T04:00:00.000Z`); // 00:00 ET ≈ 04:00 UTC (close enough for filter)
      baseParams.set('since', startOfTodayET.toISOString());
      if (agentId) baseParams.set('agentId', agentId);
      if (campaignId) baseParams.set('campaignId', campaignId);

      const params = new URLSearchParams(baseParams);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filter) params.set('status', filter);
      if (search.trim()) params.set('search', search.trim());

      const statsParams = new URLSearchParams(baseParams);

      const [mRes, sRes] = await Promise.all([
        fetch(`${PROSPECTOR_URL}/messages?${params}`),
        fetch(`${PROSPECTOR_URL}/messages/stats?${statsParams}`),
      ]);
      if (mRes.ok) {
        const data = await mRes.json();
        setMessages(data.items ?? []);
        setTotal(data.total ?? 0);
      }
      if (sRes.ok) setStats(await sRes.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [filter, search, page, agentId, campaignId]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pt-10 pb-24 px-10 max-w-[1500px] mx-auto space-y-10">
      {/* Header */}
      <section className="pb-8 hairline-b">
        <p className="text-[12px] text-paper-3 mb-2">Today, ET</p>
        <h1 className="text-paper text-[36px] font-semibold leading-tight tracking-tight">
          Data
        </h1>
        <p className="text-paper-2 text-[14px] mt-3 max-w-xl leading-relaxed">
          Every email sent by your agents today — recipient, contents, status, opens, replies.
          Click any row to inspect the full message.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-5 gap-0 panel overflow-hidden">
        <StatCell label="Total" value={stats?.total ?? 0} icon={Mail} />
        <StatCell label="Sent" value={stats?.sent ?? 0} icon={Mail} />
        <StatCell label="Opened" value={stats?.opened ?? 0} icon={Eye} accent="sky" />
        <StatCell label="Replied" value={stats?.replied ?? 0} icon={MessageSquare} accent="signal" />
        <StatCell label="Bounced" value={stats?.bounced ?? 0} icon={AlertTriangle} accent="ember" />
      </section>

      {/* Filters */}
      <section className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                filter === f.value
                  ? 'border-signal bg-signal/10 text-signal'
                  : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-md ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-paper-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }}
            placeholder="Search by subject, business, or email…"
            className="input w-full pl-9"
          />
        </div>
      </section>

      {/* Spreadsheet — Google-Sheets-style grid */}
      <section>
        <SectionHeader
          title="All emails"
          subtitle={loading ? 'Loading…' : `Showing ${messages.length} of ${total.toLocaleString()}`}
        />
        <div className="mt-4 panel overflow-hidden p-0">
          {messages.length === 0 ? (
            <div className="p-16 text-center">
              <Mail className="w-7 h-7 text-paper-4 mx-auto mb-4" />
              <p className="text-paper text-[16px] font-medium">No emails sent today yet</p>
              <p className="text-[13px] text-paper-3 mt-1.5">
                Once an agent sends, every message will show up here.
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full border-collapse text-[13px]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col style={{ width: 220 }} />
                  <col style={{ width: 220 }} />
                  <col style={{ width: 320 }} />
                  <col style={{ width: 200 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 110 }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <Hd className="text-center bg-ink-2 sticky left-0 z-20"> </Hd>
                    <Hd>Business</Hd>
                    <Hd>Email</Hd>
                    <Hd>Subject</Hd>
                    <Hd>Campaign</Hd>
                    <Hd>Sent (ET)</Hd>
                    <Hd>Status</Hd>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m, idx) => {
                    const badge = statusBadge(m);
                    const rowNum = (page - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelected(m)}
                        className="hover:bg-signal/5 transition-colors cursor-pointer"
                      >
                        <Cell className="text-center text-[11px] text-paper-3 nums bg-ink-1 sticky left-0 z-10 font-medium">
                          {rowNum}
                        </Cell>
                        <Cell>
                          <span className="text-paper font-medium truncate block">{m.prospect.name}</span>
                        </Cell>
                        <Cell>
                          <span className="text-paper-2 truncate block font-mono text-[12px]">{m.prospect.email ?? '—'}</span>
                        </Cell>
                        <Cell>
                          <div className="truncate">
                            <span className="text-paper-2 truncate">{m.subject ?? '—'}</span>
                            {m.stepNumber && m.stepNumber > 1 && (
                              <span className="ml-2 text-[11px] text-paper-3">· Follow-up {m.stepNumber}</span>
                            )}
                          </div>
                        </Cell>
                        <Cell>
                          {m.prospect.campaign ? (
                            <Link
                              href={`/campaigns/${m.prospect.campaign.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-paper-2 hover:text-signal font-medium truncate block"
                            >
                              {m.prospect.campaign.name}
                            </Link>
                          ) : (
                            <span className="text-paper-3">—</span>
                          )}
                        </Cell>
                        <Cell>
                          <span className="text-paper-2 text-[12px] nums whitespace-nowrap">{formatDate(m.sentAt ?? m.createdAt)}</span>
                        </Cell>
                        <Cell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </Cell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-paper-3">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Detail drawer */}
      {selected && <MessageDetail message={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Hd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-[11px] font-semibold text-paper-2 bg-ink-2 border-r border-b border-rule last:border-r-0 ${className}`}
    >
      {children}
    </th>
  );
}

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={`px-3 py-2 border-r border-b border-rule last:border-r-0 align-middle overflow-hidden whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  );
}

function StatCell({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'signal' | 'sky' | 'ember';
}) {
  const color =
    accent === 'signal' ? 'text-signal' :
    accent === 'sky' ? 'text-[#5ac8fa]' :
    accent === 'ember' ? 'text-ember' :
    'text-paper-3';

  return (
    <div className="px-5 py-5 border-r border-rule last:border-r-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[12px] text-paper-3">{label}</span>
      </div>
      <p className="text-paper text-[28px] font-semibold leading-none nums tracking-tight">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

/**
 * Convert stored HTML email body into clean paragraph strings.
 * - splits on </p> / <br><br>
 * - strips remaining tags
 * - decodes &nbsp; / &amp; / &#39;
 * - drops the legacy "Not interested? Unsubscribe" footer line
 * - inserts space after "Best," when run-together with the name
 */
function bodyToParagraphs(html: string): string[] {
  const blocked = /not\s+interested\?\s*unsubscribe/i;
  const cleaned = html
    .replace(/<br\s*\/?>(\s*<br\s*\/?>)+/gi, '</p><p>')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>(?!\s*<\/?br)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/Best,\s*([A-Z])/g, 'Best,\n$1');  // split "Best,Jason" into two lines

  return cleaned
    .split(/\n{2,}|\n(?=Hey |Best,|Hi )/)
    .map((p) =>
      p
        .split('\n')
        .map((line) => line.replace(/^\s+|\s+$/g, ''))
        .filter((line) => line.length > 0)
        .join('\n'),
    )
    .filter((p) => p.length > 0 && !blocked.test(p));
}

function MessageDetail({ message, onClose }: { message: Message; onClose: () => void }) {
  const badge = statusBadge(message);
  const paragraphs = bodyToParagraphs(message.body);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-paper/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative panel rounded-apple-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-rule sticky top-0 bg-ink-0 z-10">
          <div className="min-w-0">
            <p className="text-paper text-[16px] font-semibold tracking-tight truncate">
              {message.prospect.name}
            </p>
            <p className="text-[12px] text-paper-3 truncate">{message.prospect.email ?? '—'}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            <button onClick={onClose} className="text-paper-3 hover:text-paper transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-6 space-y-5">
          <Row label="Subject" value={message.subject ?? '—'} />
          {message.prospect.campaign && (
            <Row
              label="Campaign"
              value={`${message.prospect.campaign.name} · ${message.prospect.campaign.targetCity}`}
            />
          )}
          <Row label="Sent" value={formatDate(message.sentAt ?? message.createdAt)} />
          {message.openedAt && <Row label="Opened" value={formatDate(message.openedAt)} accent="sky" />}
          {message.repliedAt && <Row label="Replied" value={formatDate(message.repliedAt)} accent="signal" />}
          {message.sendingDomain && <Row label="Sent from" value={message.sendingDomain.domain} />}
          {message.stepNumber && message.stepNumber > 1 && (
            <Row label="Step" value={`Follow-up ${message.stepNumber}`} />
          )}

          <div>
            <p className="text-[12px] text-paper-3 mb-2">Email body</p>
            <div className="rounded-apple bg-ink-2 p-5 text-[14px] text-paper leading-[1.65] space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          </div>

          {message.replyBody && (
            <div>
              <p className="text-[12px] text-paper-3 mb-2">
                Reply{message.replyCategory ? ` · ${message.replyCategory}` : ''}
              </p>
              <div className="rounded-apple bg-signal/5 border border-signal/30 p-5 text-[14px] text-paper leading-[1.65] whitespace-pre-wrap">
                {message.replyBody}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: 'signal' | 'sky';
}) {
  const color = accent === 'signal' ? 'text-signal' : accent === 'sky' ? 'text-[#5ac8fa]' : 'text-paper';
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3 last:border-0 last:pb-0">
      <span className="text-[12px] text-paper-3">{label}</span>
      <span className={`text-[13px] font-medium ${color}`}>{value}</span>
    </div>
  );
}
