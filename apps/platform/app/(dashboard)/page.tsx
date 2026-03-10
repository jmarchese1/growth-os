import Link from 'next/link';
import { MouseNeuralNetwork } from '../../components/MouseNeuralNetwork';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

type Industry = 'RESTAURANT' | 'SALON' | 'RETAIL' | 'FITNESS' | 'MEDICAL' | 'OTHER';

interface CampaignSummary {
  id: string;
  name: string;
  targetCity: string;
  targetIndustry: Industry;
  active: boolean;
  maxProspects: number | null;
  createdAt: string;
  _count: { prospects: number };
}

interface CampaignStats {
  total: number;
  byStatus: Record<string, number>;
  replies: number;
}

interface EnrichedCampaign extends CampaignSummary {
  stats: CampaignStats;
}

const INDUSTRY_LABELS: Record<Industry, string> = {
  RESTAURANT: 'Restaurant',
  SALON: 'Salon',
  RETAIL: 'Retail',
  FITNESS: 'Fitness',
  MEDICAL: 'Medical',
  OTHER: 'Other',
};

async function getData(): Promise<EnrichedCampaign[]> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/campaigns`, { cache: 'no-store' });
    if (!res.ok) return [];
    const campaigns = (await res.json()) as CampaignSummary[];

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        try {
          const s = await fetch(`${PROSPECTOR_URL}/campaigns/${c.id}/stats`, { cache: 'no-store' });
          const stats = (await s.json()) as CampaignStats;
          return { ...c, stats };
        } catch {
          return { ...c, stats: { total: 0, byStatus: {}, replies: 0 } };
        }
      })
    );
    return enriched;
  } catch {
    return [];
  }
}

function pct(num: number, den: number) {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function funnelStages(stats: CampaignStats) {
  const s = stats.byStatus;
  const scraped  = stats.total;
  const hasEmail = (s['ENRICHED'] ?? 0) + (s['CONTACTED'] ?? 0) + (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const emailed  = (s['CONTACTED'] ?? 0) + (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const opened   = (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const replied  = (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const converted = s['CONVERTED'] ?? 0;
  return { scraped, hasEmail, emailed, opened, replied, converted };
}

const NAV_SECTIONS = [
  {
    href: '/campaigns',
    label: 'Campaigns',
    sub: 'Cold outreach',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'Leads',
    sub: 'Inbound captures',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z"/>
      </svg>
    ),
  },
  {
    href: '/businesses',
    label: 'Businesses',
    sub: 'Managed clients',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zM7 9h2v2H7V9zm4 0h2v2h-2V9zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    href: '/proposals',
    label: 'Proposals',
    sub: 'AI-generated',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
      </svg>
    ),
  },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string }>;
}) {
  const { industry: industryFilter } = await searchParams;
  const allCampaigns = await getData();

  const filtered = industryFilter
    ? allCampaigns.filter((c) => c.targetIndustry === industryFilter)
    : allCampaigns;

  // Aggregate funnel across filtered campaigns
  const agg = filtered.reduce(
    (acc, c) => {
      const f = funnelStages(c.stats);
      acc.scraped   += f.scraped;
      acc.hasEmail  += f.hasEmail;
      acc.emailed   += f.emailed;
      acc.opened    += f.opened;
      acc.replied   += f.replied;
      acc.converted += f.converted;
      return acc;
    },
    { scraped: 0, hasEmail: 0, emailed: 0, opened: 0, replied: 0, converted: 0 }
  );

  const activeCampaigns = filtered.filter((c) => c.active).length;
  const openRate    = pct(agg.opened,   agg.emailed);
  const replyRate   = pct(agg.replied,  agg.emailed);
  const convertRate = pct(agg.converted, agg.emailed);

  const industries = Array.from(new Set(allCampaigns.map((c) => c.targetIndustry)));

  const funnelBars = [
    { label: 'Scraped',   value: agg.scraped,   color: 'bg-slate-400',   pctOfTop: 100 },
    { label: 'Has Email', value: agg.hasEmail,  color: 'bg-blue-400',    pctOfTop: pct(agg.hasEmail,  agg.scraped) },
    { label: 'Emailed',   value: agg.emailed,   color: 'bg-violet-400',  pctOfTop: pct(agg.emailed,   agg.scraped) },
    { label: 'Opened',    value: agg.opened,    color: 'bg-amber-400',   pctOfTop: pct(agg.opened,    agg.scraped) },
    { label: 'Replied',   value: agg.replied,   color: 'bg-emerald-400', pctOfTop: pct(agg.replied,   agg.scraped) },
    { label: 'Converted', value: agg.converted, color: 'bg-green-400',   pctOfTop: pct(agg.converted, agg.scraped) },
  ];

  return (
    <div className="relative p-8 animate-fade-up min-h-screen">
      {/* Neural network — overview only */}
      <MouseNeuralNetwork />

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 space-y-6 max-w-6xl">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[10px] text-violet-300 font-semibold uppercase tracking-[0.14em]">
            {activeCampaigns} Active Campaign{activeCampaigns !== 1 ? 's' : ''}
          </span>
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-gradient">Growth OS</h1>
        <p className="font-body-alt text-sm text-slate-500 mt-1 tracking-wide">Outbound intelligence across all campaigns.</p>
      </div>

      {/* Nav strip */}
      <div className="grid grid-cols-4 gap-3">
        {NAV_SECTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-violet-600/10 hover:border-violet-500/25 transition-all group"
          >
            <span className="text-slate-500 group-hover:text-violet-400 transition-colors flex-shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors leading-none">{item.label}</p>
              <p className="text-[10px] text-slate-600 mt-0.5 truncate">{item.sub}</p>
            </div>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-700 group-hover:text-violet-500 ml-auto flex-shrink-0 transition-colors">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
          </Link>
        ))}
      </div>

      {/* Industry filter pills */}
      {industries.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              !industryFilter
                ? 'bg-violet-600/25 border-violet-500/40 text-white'
                : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:border-white/20'
            }`}
          >
            All Industries
          </Link>
          {industries.map((ind) => (
            <Link
              key={ind}
              href={`/?industry=${ind}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                industryFilter === ind
                  ? 'bg-violet-600/25 border-violet-500/40 text-white'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:border-white/20'
              }`}
            >
              {INDUSTRY_LABELS[ind] ?? ind}
            </Link>
          ))}
        </div>
      )}

      {/* Top KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Scraped',   value: agg.scraped,   sub: 'total',      color: 'text-slate-200',  border: 'border-white/10' },
          { label: 'Has Email', value: agg.hasEmail,  sub: `${pct(agg.hasEmail, agg.scraped)}% of scraped`, color: 'text-blue-400',    border: 'border-blue-500/20' },
          { label: 'Emailed',   value: agg.emailed,   sub: `${pct(agg.emailed, agg.scraped)}% of scraped`,  color: 'text-violet-400',  border: 'border-violet-500/20' },
          { label: 'Opened',    value: agg.opened,    sub: `${openRate}% open rate`,    color: 'text-amber-400',   border: 'border-amber-500/20' },
          { label: 'Replied',   value: agg.replied,   sub: `${replyRate}% reply rate`,  color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Converted', value: agg.converted, sub: `${convertRate}% convert`,   color: 'text-green-400',   border: 'border-green-500/20' },
        ].map((s) => (
          <div key={s.label} className={`bg-white/[0.03] backdrop-blur-sm rounded-2xl border ${s.border} p-4`}>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Funnel visualization */}
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.07] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xs font-bold text-slate-400 uppercase tracking-widest">Outreach Funnel</h2>
          <div className="flex items-center gap-4 text-[10px] text-slate-600">
            <span>Open rate <span className="text-amber-400 font-semibold">{openRate}%</span></span>
            <span>Reply rate <span className="text-emerald-400 font-semibold">{replyRate}%</span></span>
            <span>Convert <span className="text-green-400 font-semibold">{convertRate}%</span></span>
          </div>
        </div>
        <div className="space-y-3">
          {funnelBars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 w-20 text-right flex-shrink-0">{bar.label}</span>
              <div className="flex-1 h-6 bg-white/5 rounded-md overflow-hidden relative">
                <div
                  className={`h-full ${bar.color} opacity-80 rounded-md transition-all duration-700`}
                  style={{ width: `${Math.max(bar.pctOfTop, bar.value > 0 ? 1 : 0)}%` }}
                />
                {bar.value > 0 && (
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-white/80">
                    {bar.value.toLocaleString()}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600 w-10 text-right flex-shrink-0">
                {bar.pctOfTop}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-campaign breakdown */}
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-heading text-xs font-bold text-slate-400 uppercase tracking-widest">Campaigns</h2>
          <Link
            href="/campaigns"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all →
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-600 text-sm">
            No campaigns yet. <Link href="/campaigns" className="text-violet-400 hover:underline">Create one →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto [transform:rotateX(180deg)]">
          <div className="[transform:rotateX(180deg)]">
          <table className="w-full text-sm" style={{ minWidth: '780px' }}>
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Campaign</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Industry</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Scraped</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Emailed</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Opens</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Replies</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Converted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((c) => {
                const f = funnelStages(c.stats);
                const cOpen    = pct(f.opened,    f.emailed);
                const cReply   = pct(f.replied,   f.emailed);
                const cConvert = pct(f.converted, f.emailed);
                return (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-5 py-3.5 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        {c.active
                          ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />}
                        <div>
                          <p className="text-white font-medium text-sm leading-none">{c.name}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{c.targetCity}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-500 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
                        {INDUSTRY_LABELS[c.targetIndustry] ?? c.targetIndustry}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-slate-300 tabular-nums">{f.scraped}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-violet-400 tabular-nums">{f.emailed}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <span className="text-sm text-amber-400 tabular-nums">{f.opened}</span>
                        {f.emailed > 0 && (
                          <span className="text-[10px] text-slate-600 ml-1">{cOpen}%</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <span className="text-sm text-emerald-400 tabular-nums">{f.replied}</span>
                        {f.emailed > 0 && (
                          <span className="text-[10px] text-slate-600 ml-1">{cReply}%</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <span className="text-sm text-green-400 tabular-nums">{f.converted}</span>
                        {f.emailed > 0 && (
                          <span className="text-[10px] text-slate-600 ml-1">{cConvert}%</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm p-5">
        <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.18em] mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-500 transition-all shadow-[0_0_16px_rgba(124,58,237,0.35)] hover:shadow-[0_0_24px_rgba(124,58,237,0.5)]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            New Campaign
          </Link>
          {[
            { href: '/businesses', label: 'Businesses' },
            { href: '/proposals', label: 'Proposals' },
            { href: '/leads', label: 'Leads' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 bg-white/[0.04] text-slate-400 text-xs font-medium rounded-xl hover:bg-white/[0.08] hover:text-white transition-all border border-white/[0.08] hover:border-white/[0.14]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      </div>{/* end content z-10 */}
    </div>
  );
}
