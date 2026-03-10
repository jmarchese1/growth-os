import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SendButton } from './send-button';
import { ConvertButton } from './convert-button';
import { EditEmailButton } from './edit-email-button';
import { ManageSequenceButton } from './manage-sequence-button';
import { EnrichHunterButton } from './enrich-hunter-button';
import { FollowUpTimer } from './follow-up-timer';
import { EmailPreviewModal } from './email-preview-modal';

const PROSPECTOR_URL = process.env.PROSPECTOR_URL ?? 'http://localhost:3009';

type ProspectStatus = 'NEW' | 'ENRICHED' | 'CONTACTED' | 'OPENED' | 'REPLIED' | 'CONVERTED' | 'BOUNCED' | 'DEAD' | 'UNSUBSCRIBED';

interface Message {
  status: string;
  stepNumber: number | null;
  subject: string | null;
  body: string;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  replyBody: string | null;
}

interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: { formatted?: string; city?: string; state?: string } | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  emailSource: string | null;
  emailVerificationStatus: string | null;
  status: ProspectStatus;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface Stats {
  campaignId: string;
  total: number;
  byStatus: Record<string, number>;
  replies: number;
}

interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  subject?: string;
  bodyHtml?: string;
}

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  targetIndustry: string;
  emailSubject: string;
  emailBodyHtml: string;
  sequenceSteps: SequenceStep[] | null;
  active: boolean;
  createdAt: string;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusBadge({ status }: { status: ProspectStatus }) {
  const map: Record<ProspectStatus, { dot: string; label: string; bg: string; text: string }> = {
    NEW:          { dot: 'bg-slate-500', label: 'New',       bg: 'bg-slate-500/10', text: 'text-slate-400' },
    ENRICHED:     { dot: 'bg-blue-400',  label: 'Has Email', bg: 'bg-blue-500/10',  text: 'text-blue-400'  },
    CONTACTED:    { dot: 'bg-violet-400',label: 'Emailed',   bg: 'bg-violet-500/10',text: 'text-violet-400'},
    OPENED:       { dot: 'bg-amber-400', label: 'Opened',    bg: 'bg-amber-500/10', text: 'text-amber-400' },
    REPLIED:      { dot: 'bg-emerald-400',label: 'Replied',  bg: 'bg-emerald-500/10',text: 'text-emerald-400'},
    CONVERTED:    { dot: 'bg-green-400', label: 'Converted', bg: 'bg-green-500/10', text: 'text-green-400' },
    BOUNCED:      { dot: 'bg-red-400',   label: 'Bounced',   bg: 'bg-red-500/10',   text: 'text-red-400'  },
    DEAD:         { dot: 'bg-slate-600', label: 'Dead',      bg: 'bg-slate-600/10', text: 'text-slate-500' },
    UNSUBSCRIBED: { dot: 'bg-orange-400',label: 'Unsub',     bg: 'bg-orange-500/10',text: 'text-orange-400'},
  };
  const { dot, label, bg, text } = map[status] ?? { dot: 'bg-slate-500', label: status, bg: 'bg-slate-500/10', text: 'text-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
      {label}
    </span>
  );
}

export default async function CampaignDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { id } = await params;
  const { status: filterStatus, page = '1' } = await searchParams;

  const [campaignRes, statsRes, prospectsRes] = await Promise.all([
    fetch(`${PROSPECTOR_URL}/campaigns`, { cache: 'no-store' }),
    fetch(`${PROSPECTOR_URL}/campaigns/${id}/stats`, { cache: 'no-store' }),
    fetch(
      `${PROSPECTOR_URL}/campaigns/${id}/prospects?${filterStatus ? `status=${filterStatus}&` : ''}page=${page}&pageSize=50`,
      { cache: 'no-store' }
    ),
  ]);

  if (!statsRes.ok) notFound();

  const campaigns = (await campaignRes.json()) as Campaign[];
  const campaign = campaigns.find((c) => c.id === id);
  const stats = (await statsRes.json()) as Stats;
  const { items: prospects, total } = (await prospectsRes.json()) as { items: Prospect[]; total: number };

  const s = stats.byStatus;
  const newCount = s['NEW'] ?? 0;
  const hasEmail = (s['ENRICHED'] ?? 0) + (s['CONTACTED'] ?? 0) + (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const emailed  = (s['CONTACTED'] ?? 0) + (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const opened   = (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const replied  = (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const converted = s['CONVERTED'] ?? 0;
  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;

  // Tabs use cumulative counts (matching stat cards) and inclusive status filters
  const tabs: { label: string; value: string | undefined; count: number }[] = [
    { label: 'All',       value: undefined,                                           count: stats.total },
    { label: 'Has Email', value: 'ENRICHED,CONTACTED,OPENED,REPLIED,CONVERTED',      count: hasEmail },
    { label: 'Emailed',   value: 'CONTACTED,OPENED,REPLIED,CONVERTED',               count: emailed },
    { label: 'Opened',    value: 'OPENED,REPLIED,CONVERTED',                         count: opened },
    { label: 'Replied',   value: 'REPLIED,CONVERTED',                                count: replied },
    { label: 'Converted', value: 'CONVERTED',                                        count: converted },
  ];

  return (
    <div className="relative p-8 animate-fade-up min-h-screen">

      {/* ── Dynamic background layer ───────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">

        {/* Subtle orbital rings — top-right */}
        <div className="absolute -top-32 right-[5%] w-[440px] h-[440px] opacity-[0.06]">
          <div className="absolute inset-0 rounded-full border border-violet-400 animate-orbital-slow" />
          <div className="absolute inset-[70px] rounded-full border border-indigo-400 animate-orbital-reverse" />
          <div className="absolute inset-[140px] rounded-full border border-violet-300 animate-orbital-medium" />
        </div>

        {/* Ambient glow orbs — very subtle */}
        <div className="absolute top-10 right-16 w-64 h-64 rounded-full bg-violet-600/8 blur-[90px] animate-float-orb" />
        <div className="absolute bottom-20 right-0 w-48 h-48 rounded-full bg-indigo-600/6 blur-[70px] animate-float-orb-b" />
      </div>

      {/* ── Page content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/" className="hover:text-violet-400 transition-colors flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
              Overview
            </Link>
            <span className="text-slate-700">/</span>
            <Link href="/campaigns" className="hover:text-violet-400 transition-colors">Campaigns</Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">{campaign?.name ?? id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{campaign?.name ?? 'Campaign'}</h1>
          {campaign && (
            <p className="text-sm text-slate-400 mt-0.5">
              {campaign.targetCity} · {campaign.targetIndustry}
              {campaign.active
                ? <span className="ml-2 text-emerald-400 font-medium">● Active</span>
                : <span className="ml-2 text-slate-500">Inactive</span>}
            </p>
          )}
        </div>
        {campaign && (
          <div className="flex items-center gap-2">
            <ManageSequenceButton
              campaignId={id}
              currentSteps={campaign.sequenceSteps}
              prospectorUrl={PROSPECTOR_URL}
              contactedCount={emailed}
            />
            <EditEmailButton
              campaignId={id}
              currentSubject={campaign.emailSubject}
              currentBodyHtml={campaign.emailBodyHtml}
              prospectorUrl={PROSPECTOR_URL}
            />
          </div>
        )}
      </div>

      {/* Funnel stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Scraped', value: stats.total, pct: 100, color: 'text-slate-200', border: 'border-white/10' },
          { label: 'Has Email', value: hasEmail, pct: pct(hasEmail), color: 'text-blue-400', border: 'border-blue-500/20' },
          { label: 'Emailed', value: emailed, pct: pct(emailed), color: 'text-violet-400', border: 'border-violet-500/20' },
          { label: 'Opened', value: opened, pct: pct(opened), color: 'text-amber-400', border: 'border-amber-500/20' },
          { label: 'Replied', value: replied, pct: pct(replied), color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Converted', value: converted, pct: pct(converted), color: 'text-green-400', border: 'border-green-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white/5 backdrop-blur-sm rounded-xl border ${stat.border} p-4`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-slate-600 mt-1">{stat.pct}% of total</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 w-fit border border-white/10">
        {tabs.map((tab) => {
          const isActive = tab.value === undefined ? !filterStatus : filterStatus === tab.value;
          const href = tab.value
            ? `/campaigns/${id}?status=${encodeURIComponent(tab.value)}`
            : `/campaigns/${id}`;
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet-600/30 text-white border border-violet-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${isActive ? 'text-violet-400' : 'text-slate-600'}`}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Prospects table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
        {/* Scrollbar-on-top wrapper: rotateX flips the scrollbar to the top, inner div flips content back */}
        <div className="overflow-x-auto [transform:rotateX(180deg)]">
        <div className="[transform:rotateX(180deg)]">
        <table className="text-sm" style={{ minWidth: '1620px', width: '100%' }}>
          <thead>
            <tr className="bg-white/[0.07] border-b-2 border-slate-700/40">
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-[#17132b] z-10">Company</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Phone</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Email</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                First <span className="text-[9px] text-slate-600 font-normal">· Apollo</span>
              </th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                Last <span className="text-[9px] text-slate-600 font-normal">· Apollo</span>
              </th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Rating</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Sent</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Opened</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Reply</th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                Sequence <span className="text-[9px] text-slate-600 font-normal">· next follow-up</span>
              </th>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap sticky right-0 bg-[#17132b] z-10">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {prospects.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-16 text-center text-slate-600 text-sm">
                  No prospects found{filterStatus ? ` with status "${filterStatus}"` : ''}.
                </td>
              </tr>
            )}
            {prospects.map((p) => {
              const msg = p.messages[0];
              const cityState = [p.address?.city, p.address?.state].filter(Boolean).join(', ');
              return (
                <tr key={p.id} className="hover:bg-violet-950/20 transition-colors group">

                  {/* Company — sticky left */}
                  <td className="px-4 py-3 min-w-[180px] max-w-[220px] sticky left-0 bg-[#0c0a18] group-hover:bg-[#0e0c1e] z-10 transition-colors">
                    <Link href={`/campaigns/${id}/prospects/${p.id}`} className="font-semibold text-white hover:text-violet-300 transition-colors truncate block text-sm">
                      {p.name}
                    </Link>
                    {cityState && <p className="text-xs text-slate-500 truncate mt-0.5">{cityState}</p>}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:text-violet-300 hover:underline truncate block transition-colors">
                        {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 min-w-[130px] whitespace-nowrap">
                    {p.phone ? (
                      <a href={`tel:${p.phone}`} className="text-xs text-slate-300 hover:text-violet-400 transition-colors font-mono">
                        {p.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 min-w-[190px]">
                    {p.email ? (
                      <div className="space-y-1">
                        <a href={`mailto:${p.email}`} className="font-mono text-xs text-slate-300 hover:text-violet-400 transition-colors truncate block">
                          {p.email}
                        </a>
                        <div className="flex items-center gap-2">
                          {p.emailSource === 'apollo' && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-400/60">via Apollo</span>
                          )}
                          {p.emailVerificationStatus && (
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">
                              {p.emailVerificationStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">not found</span>
                    )}
                  </td>

                  {/* First Name — Apollo */}
                  <td className="px-4 py-3 min-w-[100px]">
                    <span className="text-xs text-slate-300">{p.contactFirstName ?? '—'}</span>
                  </td>

                  {/* Last Name — Apollo */}
                  <td className="px-4 py-3 min-w-[100px]">
                    <span className="text-xs text-slate-300">{p.contactLastName ?? '—'}</span>
                  </td>

                  {/* Google Rating */}
                  <td className="px-4 py-3 min-w-[90px] whitespace-nowrap">
                    {p.googleRating ? (
                      <span className="text-xs text-amber-400">
                        ★ {p.googleRating}
                        <span className="text-slate-600 ml-1">({p.googleReviewCount ?? 0})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 min-w-[110px]">
                    <StatusBadge status={p.status} />
                  </td>

                  {/* Sent */}
                  <td className="px-4 py-3 min-w-[130px] whitespace-nowrap">
                    {msg?.sentAt ? (
                      <span className="text-xs text-slate-400">{fmt(msg.sentAt)}</span>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>

                  {/* Opened */}
                  <td className="px-4 py-3 min-w-[130px] whitespace-nowrap">
                    {msg?.openedAt ? (
                      <span className="text-xs text-amber-400">{fmt(msg.openedAt)}</span>
                    ) : msg?.sentAt ? (
                      <span className="text-xs text-slate-700">Not yet</span>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>

                  {/* Reply preview */}
                  <td className="px-4 py-3 min-w-[190px] max-w-[220px]">
                    {msg?.replyBody ? (
                      <p className="text-xs text-emerald-400 italic truncate" title={msg.replyBody}>
                        &ldquo;{msg.replyBody.slice(0, 55)}{msg.replyBody.length > 55 ? '…' : ''}&rdquo;
                      </p>
                    ) : msg?.repliedAt ? (
                      <span className="text-xs text-emerald-500">Replied {fmt(msg.repliedAt)}</span>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>

                  {/* Sequence — next follow-up countdown */}
                  <td className="px-4 py-3 min-w-[140px]">
                    {p.nextFollowUpAt ? (
                      <FollowUpTimer
                        scheduledAt={p.nextFollowUpAt}
                        stepNumber={(msg?.stepNumber ?? 1) + 1}
                      />
                    ) : msg?.sentAt ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider">
                          Step {msg.stepNumber ?? 1} sent
                        </span>
                        <span className="text-xs text-slate-600">Sequence done</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>

                  {/* Actions — sticky right */}
                  <td className="px-4 py-3 min-w-[180px] sticky right-0 bg-[#0c0a18] group-hover:bg-[#0e0c1e] z-10 transition-colors">
                    <div className="flex items-center gap-2 flex-nowrap">
                      {p.email && (p.status === 'NEW' || p.status === 'ENRICHED') && (
                        <SendButton prospectId={p.id} prospectorUrl={PROSPECTOR_URL} />
                      )}
                      {p.status === 'REPLIED' && (
                        <ConvertButton prospectId={p.id} prospectorUrl={PROSPECTOR_URL} />
                      )}
                      {msg?.sentAt && (
                        <EmailPreviewModal
                          subject={msg.subject}
                          bodyHtml={msg.body}
                          label="Email"
                        />
                      )}
                      <Link
                        href={`/campaigns/${id}/prospects/${p.id}`}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>{/* end rotateX inner */}
        </div>{/* end rotateX outer / overflow-x-auto */}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {total} prospect{total !== 1 ? 's' : ''}{filterStatus ? ` · ${tabs.find(t => t.value === filterStatus)?.label ?? 'Filtered'}` : ''} · Opens tracked via pixel
          </p>
          {total > 50 && (
            <div className="flex items-center gap-2">
              {parseInt(page) > 1 && (
                <Link
                  href={`/campaigns/${id}?${filterStatus ? `status=${filterStatus}&` : ''}page=${parseInt(page) - 1}`}
                  className="text-xs text-violet-600 hover:underline"
                >
                  Previous
                </Link>
              )}
              <span className="text-xs text-slate-500">Page {page}</span>
              {total > parseInt(page) * 50 && (
                <Link
                  href={`/campaigns/${id}?${filterStatus ? `status=${filterStatus}&` : ''}page=${parseInt(page) + 1}`}
                  className="text-xs text-violet-600 hover:underline"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      </div>{/* end content z-10 */}
    </div>
  );
}
