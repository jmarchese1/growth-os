"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Mail, Eye, MessageSquare, AlertTriangle, X, Maximize2, Minimize2, ArrowUp, ArrowDown, Download } from 'lucide-react';

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

type DateRange = 'today' | 'yesterday' | '7d' | '30d' | 'all';

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Today',     value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7d',   value: '7d' },
  { label: 'Last 30d',  value: '30d' },
  { label: 'All time',  value: 'all' },
];

/** Returns ISO `since` and `until` for a preset, anchored to ET midnight. */
function rangeToISO(range: DateRange): { since?: string; until?: string } {
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const startOfToday = new Date(`${todayET}T04:00:00.000Z`); // ~00:00 ET
  const day = 24 * 60 * 60 * 1000;

  if (range === 'today') return { since: startOfToday.toISOString() };
  if (range === 'yesterday') {
    const yest = new Date(startOfToday.getTime() - day);
    return { since: yest.toISOString(), until: startOfToday.toISOString() };
  }
  if (range === '7d') return { since: new Date(startOfToday.getTime() - 7 * day).toISOString() };
  if (range === '30d') return { since: new Date(startOfToday.getTime() - 30 * day).toISOString() };
  return {}; // all
}

interface CampaignOption { id: string; name: string; }
interface AgentOption { id: string; name: string; }

type SortBy = 'createdAt' | 'sentAt' | 'openedAt' | 'repliedAt';
type SortDir = 'asc' | 'desc';

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
  const [fullscreen, setFullscreen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [campaignFilter, setCampaignFilter] = useState<string>(campaignId ?? '');
  const [agentFilter, setAgentFilter] = useState<string>(agentId ?? '');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const pageSize = 50;

  // Build the shared param set used by both /messages and /messages/stats + CSV export.
  const buildParams = useCallback((): URLSearchParams => {
    const p = new URLSearchParams();
    const { since, until } = rangeToISO(dateRange);
    if (since) p.set('since', since);
    if (until) p.set('until', until);
    if (agentFilter) p.set('agentId', agentFilter);
    if (campaignFilter) p.set('campaignId', campaignFilter);
    if (filter) p.set('status', filter);
    if (search.trim()) p.set('search', search.trim());
    return p;
  }, [dateRange, agentFilter, campaignFilter, filter, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = buildParams();

      const params = new URLSearchParams(baseParams);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);

      const [mRes, sRes] = await Promise.all([
        fetch(`${PROSPECTOR_URL}/messages?${params}`),
        fetch(`${PROSPECTOR_URL}/messages/stats?${baseParams}`),
      ]);
      if (mRes.ok) {
        const data = await mRes.json();
        setMessages(data.items ?? []);
        setTotal(data.total ?? 0);
      }
      if (sRes.ok) setStats(await sRes.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [buildParams, page, sortBy, sortDir]);

  // Load campaigns + agents lookups for the dropdowns (once)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${PROSPECTOR_URL}/campaigns`).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`${PROSPECTOR_URL}/agents`).then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([camps, ags]) => {
      if (cancelled) return;
      setCampaigns((Array.isArray(camps) ? camps : []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      setAgents((Array.isArray(ags) ? ags : []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
    });
    return () => { cancelled = true; };
  }, []);

  // Toggle sort: clicking the active column flips direction; clicking a new column resets to desc
  const toggleSort = useCallback((col: SortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  }, [sortBy]);

  // CSV export — fetches up to 1000 matching rows in current filter context
  const exportCsv = useCallback(async () => {
    const params = buildParams();
    params.set('page', '1');
    params.set('pageSize', '1000');
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
    const res = await fetch(`${PROSPECTOR_URL}/messages?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    const rows: Message[] = data.items ?? [];

    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    };
    const header = ['#', 'Business', 'Email', 'Subject', 'Campaign', 'Sent (ET)', 'Opened', 'Replied', 'Status'];
    const lines = [header.join(',')];
    rows.forEach((m, i) => {
      const badge = statusBadge(m).label;
      lines.push([
        i + 1,
        m.prospect.name,
        m.prospect.email ?? '',
        m.subject ?? '',
        m.prospect.campaign?.name ?? '',
        formatDate(m.sentAt ?? m.createdAt),
        m.openedAt ? formatDate(m.openedAt) : '',
        m.repliedAt ? formatDate(m.repliedAt) : '',
        badge,
      ].map(escape).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embedo-data-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [buildParams, sortBy, sortDir, dateRange]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [dateRange, agentFilter, campaignFilter, filter, search]);

  useEffect(() => { load(); }, [load]);

  // ESC exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tableContents = messages.length === 0 ? (
    <div className="p-16 text-center">
      <Mail className="w-7 h-7 text-paper-4 mx-auto mb-4" />
      <p className="text-paper text-[16px] font-medium">No emails sent today yet</p>
      <p className="text-[13px] text-paper-3 mt-1.5">
        Once an agent sends, every message will show up here.
      </p>
    </div>
  ) : (
    <div className={fullscreen ? 'overflow-auto flex-1 border border-rule rounded-apple' : 'overflow-auto max-h-[70vh]'}>
      <table className="w-full border-collapse text-[14px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 56 }} />
          <col style={{ width: 240 }} />
          <col style={{ width: 260 }} />
          <col style={{ width: 360 }} />
          <col style={{ width: 220 }} />
          <col style={{ width: 160 }} />
          <col style={{ width: 120 }} />
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            <Hd className="text-center bg-ink-2 sticky left-0 z-20"> </Hd>
            <Hd>Business</Hd>
            <Hd>Email</Hd>
            <Hd>Subject</Hd>
            <Hd>Campaign</Hd>
            <SortableHd label="Sent (ET)" col="sentAt" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
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
                <Cell className="text-center text-[12px] text-paper-3 nums bg-ink-1 sticky left-0 z-10 font-medium">
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
  );

  // Fullscreen view rendered via portal so it escapes the dashboard layout's
  // animate-fade-up transform context (which would otherwise constrain
  // `position: fixed` to that ancestor instead of the viewport).
  const fullscreenView = fullscreen && typeof window !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[100] bg-ink-0 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-paper text-[22px] font-semibold leading-tight tracking-tight">
            All emails
          </h2>
          <p className="mt-1 text-[13px] text-paper-3">
            {loading ? 'Loading…' : `Showing ${messages.length} of ${total.toLocaleString()}`}
          </p>
        </div>
        <button
          onClick={() => setFullscreen(false)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-rule text-[12px] font-medium text-paper-3 hover:text-paper hover:bg-ink-2 transition-colors"
          title="Exit fullscreen (Esc)"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Exit fullscreen</span>
        </button>
      </div>
      <FilterBar
        dateRange={dateRange} setDateRange={setDateRange}
        filter={filter} setFilter={setFilter}
        agentFilter={agentFilter} setAgentFilter={setAgentFilter}
        campaignFilter={campaignFilter} setCampaignFilter={setCampaignFilter}
        search={search} setSearch={setSearch}
        agents={agents} campaigns={campaigns}
        onExport={exportCsv}
      />
      {tableContents}
    </div>,
    document.body,
  ) : null;

  return (
    <div className="pt-10 pb-24 px-10 max-w-[1280px] mx-auto space-y-8">
      {/* Header */}
      <section className="pb-6 hairline-b">
        <h1 className="text-paper text-[40px] font-semibold leading-tight tracking-tight">
          Data
        </h1>
        <p className="text-paper-2 text-[15px] mt-3 max-w-2xl leading-relaxed">
          Every email your agents have sent — recipient, contents, status, opens, replies. Filter by date, agent, campaign, or status. Click any row for the full message, or export the current view as CSV.
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
      <FilterBar
        dateRange={dateRange} setDateRange={setDateRange}
        filter={filter} setFilter={setFilter}
        agentFilter={agentFilter} setAgentFilter={setAgentFilter}
        campaignFilter={campaignFilter} setCampaignFilter={setCampaignFilter}
        search={search} setSearch={setSearch}
        agents={agents} campaigns={campaigns}
        onExport={exportCsv}
      />

      {/* Spreadsheet — Google-Sheets-style grid */}
      <section>
        <div className="flex items-end justify-between pb-4">
          <div>
            <h2 className="text-paper text-[26px] font-semibold leading-tight tracking-tight">
              All emails
            </h2>
            <p className="mt-1.5 text-[14px] text-paper-3">
              {loading ? 'Loading…' : `Showing ${messages.length} of ${total.toLocaleString()}`}
            </p>
          </div>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-rule text-[13px] font-medium text-paper-2 hover:text-paper hover:bg-ink-2 transition-colors"
            title={fullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
        <div className="panel overflow-hidden p-0">
          {tableContents}
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

      {/* Fullscreen spreadsheet (rendered via portal) */}
      {fullscreenView}
    </div>
  );
}

function Hd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-paper-2 bg-ink-2 border-r border-b border-rule last:border-r-0 ${className}`}
    >
      {children}
    </th>
  );
}

function SortableHd({
  label, col, sortBy, sortDir, onClick, className = '',
}: {
  label: string;
  col: SortBy;
  sortBy: SortBy;
  sortDir: SortDir;
  onClick: (c: SortBy) => void;
  className?: string;
}) {
  const active = sortBy === col;
  return (
    <th
      onClick={() => onClick(col)}
      className={`px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide bg-ink-2 border-r border-b border-rule last:border-r-0 cursor-pointer select-none hover:bg-ink-3 transition-colors ${active ? 'text-signal' : 'text-paper-2'} ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (sortDir === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />)}
      </span>
    </th>
  );
}

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={`px-4 py-3 border-r border-b border-rule last:border-r-0 align-middle overflow-hidden whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  );
}

function FilterBar({
  dateRange, setDateRange,
  filter, setFilter,
  agentFilter, setAgentFilter,
  campaignFilter, setCampaignFilter,
  search, setSearch,
  agents, campaigns,
  onExport,
}: {
  dateRange: DateRange; setDateRange: (v: DateRange) => void;
  filter: string; setFilter: (v: string) => void;
  agentFilter: string; setAgentFilter: (v: string) => void;
  campaignFilter: string; setCampaignFilter: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  agents: AgentOption[]; campaigns: CampaignOption[];
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — date range + status pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[12px] uppercase tracking-wide text-paper-3 font-semibold">Date</span>
        <div className="flex items-center gap-1.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition-colors ${
                dateRange === r.value
                  ? 'border-signal bg-signal/10 text-signal'
                  : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="hidden md:block w-px h-6 bg-rule mx-1" />
        <span className="text-[12px] uppercase tracking-wide text-paper-3 font-semibold">Status</span>
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition-colors ${
                filter === f.value
                  ? 'border-signal bg-signal/10 text-signal'
                  : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2 — agent / campaign / search / export */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="input"
          style={{ fontSize: 14, paddingTop: 8, paddingBottom: 8 }}
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="input"
          style={{ fontSize: 14, paddingTop: 8, paddingBottom: 8 }}
        >
          <option value="">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex-1 max-w-md ml-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-paper-3 pointer-events-none z-10" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, business, or email…"
            className="input w-full"
            style={{ paddingLeft: '40px', fontSize: 14 }}
          />
        </div>

        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-rule text-[13px] font-medium text-paper-2 hover:text-paper hover:bg-ink-2 transition-colors"
          title="Export filtered rows to CSV"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
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
    <div className="px-6 py-6 border-r border-rule last:border-r-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[13px] text-paper-3 font-medium">{label}</span>
      </div>
      <p className={`text-[40px] font-semibold leading-none nums tracking-tight ${
        accent === 'signal' ? 'text-signal' :
        accent === 'sky' ? 'text-[#5ac8fa]' :
        accent === 'ember' ? 'text-ember' :
        'text-paper'
      }`}>
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
