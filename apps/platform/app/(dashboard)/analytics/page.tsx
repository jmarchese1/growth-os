import Link from 'next/link';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';

interface AnalyticsData {
  totals: { prospects: number; emailed: number; opened: number; replied: number; converted: number; bounced: number; openRate: number; replyRate: number };
  cityRanking: Array<{ city: string; state: string | null; campaigns: number; prospects: number; emailed: number; opened: number; replied: number; converted: number; openRate: number; replyRate: number }>;
  templatePerformance: Array<{ campaignId: string; name: string; city: string; subject: string; bodyPreview: string; emailed: number; opened: number; replied: number; openRate: number; replyRate: number; createdAt: string }>;
  sendTimeAnalysis: Array<{ hour: number; sent: number; opened: number; openRate: number }>;
}

interface DomainData { domain: string; totalSent: number; bounceCount: number; openCount: number; bounceRate: number; openRate: number; healthScore: number; warmupComplete: boolean; active: boolean }
interface TemplateData { id: string; name: string; subject: string; category: string; timesSent: number; timesOpened: number; timesReplied: number; openRate: number; replyRate: number }

async function getAnalytics(): Promise<AnalyticsData | null> {
  try { const res = await fetch(`${PROSPECTOR_URL}/analytics`, { cache: 'no-store' }); if (!res.ok) return null; return res.json(); } catch { return null; }
}
async function getDomains(): Promise<DomainData[]> {
  try { const res = await fetch(`${API_URL}/sending-domains`, { cache: 'no-store' }); if (!res.ok) return []; return res.json(); } catch { return []; }
}
async function getTemplates(): Promise<TemplateData[]> {
  try { const res = await fetch(`${API_URL}/email-templates`, { cache: 'no-store' }); if (!res.ok) return []; return res.json(); } catch { return []; }
}

function rateColor(rate: number, good: number, ok: number): string {
  if (rate >= good) return 'text-emerald-400';
  if (rate >= ok) return 'text-amber-400';
  return 'text-red-400';
}

function rateBg(rate: number, good: number, ok: number): string {
  if (rate >= good) return 'bg-emerald-500';
  if (rate >= ok) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatHour(h: number): string {
  const est = (h - 5 + 24) % 24;
  const ampm = est >= 12 ? 'pm' : 'am';
  const hour12 = est === 0 ? 12 : est > 12 ? est - 12 : est;
  return `${hour12}${ampm}`;
}

export default async function AnalyticsPage() {
  const [data, domains, templates] = await Promise.all([getAnalytics(), getDomains(), getTemplates()]);

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
    <div className="p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-slate-400 mt-1 text-sm">Outreach performance across all campaigns, domains, and templates.</p>
      </div>

      {/* ── Funnel Visualization ── */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Outreach Funnel</h2>
        <div className="flex items-end gap-2 h-40">
          {[
            { label: 'Prospects', value: totals.prospects, color: 'bg-slate-500' },
            { label: 'Emailed', value: totals.emailed, color: 'bg-violet-500' },
            { label: 'Delivered', value: totals.emailed - totals.bounced, color: 'bg-blue-500' },
            { label: 'Opened', value: totals.opened, color: 'bg-amber-500' },
            { label: 'Replied', value: totals.replied, color: 'bg-emerald-500' },
            { label: 'Converted', value: totals.converted, color: 'bg-green-500' },
          ].map((stage, i) => {
            const maxVal = totals.prospects || 1;
            const height = Math.max((stage.value / maxVal) * 100, 3);
            const prevValue = i === 0 ? 0 : [totals.prospects, totals.emailed, totals.emailed - totals.bounced, totals.opened, totals.replied][i - 1] ?? 0;
            const convRate = prevValue > 0 ? Math.round((stage.value / prevValue) * 100) : 0;
            return (
              <div key={stage.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-white tabular-nums">{stage.value}</span>
                {i > 0 && <span className="text-[9px] text-slate-500 tabular-nums">{convRate}%</span>}
                <div className={`w-full rounded-t ${stage.color}`} style={{ height: `${height}%`, minHeight: '4px' }} />
                <span className="text-[10px] text-slate-400 mt-1">{stage.label}</span>
              </div>
            );
          })}
        </div>
        {/* Bounce indicator */}
        {totals.bounced > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-400">{totals.bounced} bounced ({totals.emailed > 0 ? Math.round((totals.bounced / totals.emailed) * 100) : 0}%)</span>
          </div>
        )}
      </div>

      {/* ── Key Metrics Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open Rate', value: `${totals.openRate}%`, color: rateColor(totals.openRate, 25, 15), sub: `${totals.opened} of ${totals.emailed}` },
          { label: 'Reply Rate', value: `${totals.replyRate}%`, color: rateColor(totals.replyRate, 5, 2), sub: `${totals.replied} of ${totals.emailed}` },
          { label: 'Bounce Rate', value: totals.emailed > 0 ? `${Math.round((totals.bounced / totals.emailed) * 100)}%` : '0%', color: totals.bounced > 0 ? 'text-red-400' : 'text-emerald-400', sub: `${totals.bounced} bounced` },
          { label: 'Conversion', value: totals.emailed > 0 ? `${Math.round((totals.converted / totals.emailed) * 100)}%` : '0%', color: totals.converted > 0 ? 'text-violet-400' : 'text-slate-400', sub: `${totals.converted} converted` },
        ].map((m) => (
          <div key={m.label} className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Domain Health ── */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Domain Health</h2>
          {domains.length === 0 ? (
            <p className="text-xs text-slate-600">No sending domains configured.</p>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <div key={d.domain} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    d.healthScore >= 80 ? 'bg-emerald-500/15 text-emerald-400' :
                    d.healthScore >= 50 ? 'bg-amber-500/15 text-amber-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>{d.healthScore}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{d.domain}</span>
                      {!d.active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">off</span>}
                      {d.warmupComplete && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">warmed</span>}
                    </div>
                    <div className="flex gap-4 mt-0.5">
                      <span className="text-[10px] text-slate-500">{d.totalSent} sent</span>
                      <span className={`text-[10px] ${d.bounceRate > 5 ? 'text-red-400' : 'text-slate-500'}`}>{d.bounceRate}% bounce</span>
                      <span className={`text-[10px] ${d.openRate > 20 ? 'text-emerald-400' : 'text-slate-500'}`}>{d.openRate}% opens</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Send Time Heatmap ── */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Best Send Times</h2>
          <p className="text-[10px] text-slate-500 mb-4">Open rates by hour (ET). Green = 20%+ open rate.</p>
          <div className="flex items-end gap-0.5 h-28">
            {sendTimeAnalysis.map((h) => {
              const height = Math.max((h.sent / maxSent) * 100, 3);
              const isGood = h.openRate >= 20 && h.sent >= 3;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5" title={`${formatHour(h.hour)}: ${h.sent} sent, ${h.openRate}% opened`}>
                  {h.sent > 0 && <span className={`text-[8px] font-semibold ${isGood ? 'text-emerald-400' : 'text-slate-600'}`}>{h.openRate}%</span>}
                  <div className={`w-full rounded-t-sm ${isGood ? 'bg-emerald-500/60' : h.sent > 0 ? 'bg-violet-500/30' : 'bg-white/5'}`} style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-slate-700">{formatHour(h.hour)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Template Performance ── */}
      <div className="bg-white/5 rounded-2xl border border-white/10">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Email Copy Performance</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Auto-tracked per unique email template. Compare open and reply rates to find winning copy.</p>
        </div>
        {templates.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-600 text-center">No templates tracked yet. Templates auto-create when you send new copy.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {templates.sort((a, b) => b.timesSent - a.timesSent).map((t) => (
              <div key={t.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{t.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        t.category === 'cold' ? 'bg-violet-500/10 text-violet-400' :
                        t.category === 'followup' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>{t.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">Subject: {t.subject}</p>
                  </div>
                  <div className="flex items-center gap-5 flex-shrink-0">
                    <div className="text-center min-w-[45px]">
                      <p className="text-sm font-bold text-white tabular-nums">{t.timesSent}</p>
                      <p className="text-[9px] text-slate-600">sent</p>
                    </div>
                    <div className="text-center min-w-[45px]">
                      <p className={`text-sm font-bold tabular-nums ${rateColor(t.openRate, 25, 15)}`}>{t.openRate}%</p>
                      <p className="text-[9px] text-slate-600">opens</p>
                    </div>
                    <div className="text-center min-w-[45px]">
                      <p className={`text-sm font-bold tabular-nums ${rateColor(t.replyRate, 5, 2)}`}>{t.replyRate}%</p>
                      <p className="text-[9px] text-slate-600">replies</p>
                    </div>
                    {/* Visual bar */}
                    <div className="w-24 flex flex-col gap-1">
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${rateBg(t.openRate, 25, 15)}`} style={{ width: `${Math.min(100, t.openRate)}%` }} />
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${rateBg(t.replyRate, 5, 2)}`} style={{ width: `${Math.min(100, t.replyRate * 5)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── City Performance ── */}
      <div className="bg-white/5 rounded-2xl border border-white/10">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">City Performance</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Sorted by reply rate. Focus on cities that convert.</p>
        </div>
        {cityRanking.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-600 text-center">No campaign data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '700px' }}>
              <thead>
                <tr className="bg-white/[0.03]">
                  {['City', 'Campaigns', 'Prospects', 'Emailed', 'Open Rate', 'Reply Rate', 'Converted'].map((h) => (
                    <th key={h} className={`text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 ${h === 'City' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cityRanking.map((c) => (
                  <tr key={`${c.city}-${c.state}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-white">{c.city}{c.state ? `, ${c.state}` : ''}</td>
                    <td className="px-5 py-3 text-sm text-slate-400 text-right">{c.campaigns}</td>
                    <td className="px-5 py-3 text-sm text-slate-400 text-right">{c.prospects}</td>
                    <td className="px-5 py-3 text-sm text-slate-400 text-right">{c.emailed}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rateBg(c.openRate, 25, 15)}`} style={{ width: `${Math.min(100, c.openRate)}%` }} />
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${rateColor(c.openRate, 25, 15)}`}>{c.openRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rateBg(c.replyRate, 5, 2)}`} style={{ width: `${Math.min(100, c.replyRate * 5)}%` }} />
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${rateColor(c.replyRate, 5, 2)}`}>{c.replyRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={c.converted > 0 ? 'text-violet-400 font-semibold' : 'text-slate-700'}>{c.converted}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
