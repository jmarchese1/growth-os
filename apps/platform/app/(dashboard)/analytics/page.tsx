import Link from 'next/link';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface AnalyticsData {
  totals: {
    prospects: number;
    emailed: number;
    opened: number;
    replied: number;
    converted: number;
    bounced: number;
    openRate: number;
    replyRate: number;
  };
  cityRanking: Array<{
    city: string;
    state: string | null;
    campaigns: number;
    prospects: number;
    emailed: number;
    opened: number;
    replied: number;
    converted: number;
    openRate: number;
    replyRate: number;
  }>;
  templatePerformance: Array<{
    campaignId: string;
    name: string;
    city: string;
    subject: string;
    bodyPreview: string;
    emailed: number;
    opened: number;
    replied: number;
    openRate: number;
    replyRate: number;
    createdAt: string;
  }>;
  sendTimeAnalysis: Array<{
    hour: number;
    sent: number;
    opened: number;
    openRate: number;
  }>;
}

async function getAnalytics(): Promise<AnalyticsData | null> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/analytics`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<AnalyticsData>;
  } catch {
    return null;
  }
}

function rateColor(rate: number, good: number, ok: number): string {
  if (rate >= good) return 'text-emerald-400';
  if (rate >= ok) return 'text-yellow-400';
  return 'text-red-400';
}

function formatHour(h: number): string {
  const est = (h - 5 + 24) % 24; // UTC to EST
  const ampm = est >= 12 ? 'pm' : 'am';
  const hour12 = est === 0 ? 12 : est > 12 ? est - 12 : est;
  return `${hour12}${ampm}`;
}

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  if (!data) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-slate-500 mt-4">Could not load analytics. Is the prospector service running?</p>
      </div>
    );
  }

  const { totals, cityRanking, templatePerformance, sendTimeAnalysis } = data;
  const maxSent = Math.max(...sendTimeAnalysis.map((h) => h.sent), 1);

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-slate-400 mt-1 text-sm">Campaign performance across all outreach.</p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Prospects', value: totals.prospects },
          { label: 'Emailed', value: totals.emailed },
          { label: 'Opened', value: totals.opened, sub: `${totals.openRate}%`, color: rateColor(totals.openRate, 20, 10) },
          { label: 'Replied', value: totals.replied, sub: `${totals.replyRate}%`, color: rateColor(totals.replyRate, 5, 2) },
          { label: 'Converted', value: totals.converted, color: 'text-violet-400' },
          { label: 'Bounced', value: totals.bounced, color: totals.bounced > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Bounce Rate', value: totals.emailed > 0 ? `${Math.round((totals.bounced / totals.emailed) * 100)}%` : '0%', color: totals.emailed > 0 && (totals.bounced / totals.emailed) >= 0.03 ? 'text-red-400' : 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.color ?? 'text-white'}`}>{stat.value}</p>
            {stat.sub && <p className="text-xs text-slate-500 mt-0.5">{stat.sub} rate</p>}
          </div>
        ))}
      </div>

      {/* Send Time Analysis */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Best Send Times</h2>
        <p className="text-xs text-slate-500 mb-5">Open rates by hour of day (EST). Taller bars = more emails sent.</p>
        <div className="flex items-end gap-1 h-32">
          {sendTimeAnalysis.map((h) => {
            const height = Math.max((h.sent / maxSent) * 100, 4);
            const isGood = h.openRate >= 20 && h.sent >= 3;
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <span className={`text-[9px] font-semibold ${isGood ? 'text-emerald-400' : h.sent > 0 ? 'text-slate-500' : 'text-slate-800'}`}>
                  {h.sent > 0 ? `${h.openRate}%` : ''}
                </span>
                <div
                  className={`w-full rounded-t-sm transition-all ${isGood ? 'bg-emerald-500/60' : h.sent > 0 ? 'bg-violet-500/40' : 'bg-white/5'}`}
                  style={{ height: `${height}%` }}
                  title={`${formatHour(h.hour)}: ${h.sent} sent, ${h.opened} opened (${h.openRate}%)`}
                />
                <span className="text-[9px] text-slate-600">{formatHour(h.hour)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-600 mt-2">Green bars = 20%+ open rate with 3+ sends. Hover for details.</p>
      </div>

      {/* City Performance */}
      <div className="bg-white/5 rounded-2xl border border-white/10">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">City Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sorted by reply rate. Focus on cities that convert.</p>
        </div>
        {cityRanking.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-600 text-center">No campaign data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '600px' }}>
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">City</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Campaigns</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Prospects</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Emailed</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Open Rate</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Reply Rate</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Converted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {cityRanking.map((c) => (
                  <tr key={`${c.city}-${c.state}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-white">
                      {c.city}{c.state ? `, ${c.state}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-right">{c.campaigns}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-right">{c.prospects}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-right">{c.emailed}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${rateColor(c.openRate, 20, 10)}`}>{c.openRate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${rateColor(c.replyRate, 5, 2)}`}>{c.replyRate}%</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      <span className={c.converted > 0 ? 'text-violet-400 font-semibold' : 'text-slate-600'}>{c.converted}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Template Performance */}
      <div className="bg-white/5 rounded-2xl border border-white/10">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Template Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Compare email templates across campaigns. Sorted by reply rate.</p>
        </div>
        {templatePerformance.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-600 text-center">No campaigns yet.</p>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {templatePerformance.map((t) => (
              <div key={t.campaignId} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/campaigns/${t.campaignId}`} className="text-sm font-semibold text-white hover:text-violet-300 transition-colors">
                        {t.name}
                      </Link>
                      <span className="text-xs text-slate-600">{t.city}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Subject: {t.subject}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate">{t.bodyPreview}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{t.emailed} sent</p>
                    </div>
                    <div className="text-right min-w-[50px]">
                      <p className={`text-sm font-semibold ${rateColor(t.openRate, 20, 10)}`}>{t.openRate}%</p>
                      <p className="text-[10px] text-slate-600">opens</p>
                    </div>
                    <div className="text-right min-w-[50px]">
                      <p className={`text-sm font-semibold ${rateColor(t.replyRate, 5, 2)}`}>{t.replyRate}%</p>
                      <p className="text-[10px] text-slate-600">replies</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
