import { SectionHeader, HeroMetric, MetricBlock, Panel, FunnelBar } from '../../../components/ui/primitives';

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
      <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto">
        <section className="pb-10 hairline-b">
          <h1 className="font-display italic font-light text-paper text-[64px] leading-none tracking-tight">
            Analytics unreachable.
          </h1>
          <p className="font-mono text-[11px] tracking-micro uppercase text-paper-3 mt-4">
            Could not reach prospector service.
          </p>
        </section>
      </div>
    );
  }

  const { totals, cityRanking, sendTimeAnalysis } = data;
  const maxSent = Math.max(...sendTimeAnalysis.map((h) => h.sent), 1);
  const bounceRate = totals.emailed > 0 ? Math.round((totals.bounced / totals.emailed) * 100) : 0;
  const convRate = totals.emailed > 0 ? Math.round((totals.converted / totals.emailed) * 100) : 0;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 12 · Analytics
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            All time
          </span>
        </div>
        <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px]">
          Numbers on the wall.
        </h1>
      </section>

      {/* Top-line */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <HeroMetric
            label="Reply rate"
            value={totals.replyRate.toString()}
            unit="%"
            caption={`${totals.replied.toLocaleString()} replies on ${totals.emailed.toLocaleString()} sent`}
            size="md"
          />
        </div>
        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-4">
            <MetricBlock label="Open rate" value={`${totals.openRate}%`} trend={totals.openRate > 15 ? 'up' : 'flat'} />
            <MetricBlock label="Reply rate" value={`${totals.replyRate}%`} trend={totals.replyRate > 2 ? 'up' : 'flat'} />
            <MetricBlock label="Bounce" value={`${bounceRate}%`} trend={bounceRate > 5 ? 'down' : 'flat'} />
            <MetricBlock label="Conversion" value={`${convRate}%`} trend={convRate > 0 ? 'up' : 'flat'} />
          </div>
        </div>
      </section>

      {/* Funnel */}
      <section>
        <SectionHeader numeral="1" title="The funnel" subtitle="Stage-by-stage conversion" />
        <div className="mt-6 panel p-5">
          <FunnelBar label="Prospects" value={totals.prospects} max={totals.prospects} />
          <FunnelBar label="Emailed" value={totals.emailed} max={totals.prospects} />
          <FunnelBar label="Delivered" value={totals.emailed - totals.bounced} max={totals.prospects} />
          <FunnelBar label="Opened" value={totals.opened} max={totals.prospects} />
          <FunnelBar label="Replied" value={totals.replied} max={totals.prospects} accent />
          <FunnelBar label="Converted" value={totals.converted} max={totals.prospects} accent />
        </div>
      </section>

      {/* Domain health + send time heatmap */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Panel title="Domain health" numeral="2">
          {domains.length === 0 ? (
            <p className="p-8 font-mono text-[11px] tracking-micro uppercase text-paper-4 text-center">
              No sending domains configured.
            </p>
          ) : (
            <div className="p-5 space-y-4">
              {domains.map((d) => (
                <div key={d.domain} className="flex items-center gap-4">
                  <div className="text-right min-w-[50px]">
                    <p className={`font-display italic font-light text-3xl leading-none nums ${
                      d.healthScore >= 80 ? 'text-signal' : d.healthScore >= 50 ? 'text-amber' : 'text-ember'
                    }`}>
                      {d.healthScore}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display italic text-paper text-base">{d.domain}</span>
                      {!d.active && <span className="font-mono text-[9px] tracking-mega text-ember uppercase">Off</span>}
                      {d.warmupComplete && <span className="font-mono text-[9px] tracking-mega text-signal uppercase">Warmed</span>}
                    </div>
                    <div className="flex gap-4 font-mono text-[10px] tracking-micro uppercase">
                      <span className="text-paper-4">{d.totalSent.toLocaleString()} sent</span>
                      <span className={d.bounceRate > 5 ? 'text-ember' : 'text-paper-4'}>{d.bounceRate}% bounce</span>
                      <span className={d.openRate > 20 ? 'text-signal' : 'text-paper-4'}>{d.openRate}% opens</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Best send times" numeral="3" action={<span className="font-mono text-[9px] tracking-mega text-paper-4 uppercase">All times ET</span>}>
          <div className="p-5">
            <p className="font-mono text-[10px] tracking-micro uppercase text-paper-4 mb-4">
              Open rates by hour. Signal bars = 20%+ open rate.
            </p>
            <div className="flex items-end gap-0.5 h-32">
              {sendTimeAnalysis.map((h) => {
                const height = Math.max((h.sent / maxSent) * 100, 3);
                const isGood = h.openRate >= 20 && h.sent >= 3;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1" title={`${formatHour(h.hour)}: ${h.sent} sent, ${h.openRate}% opened`}>
                    {h.sent > 0 && (
                      <span className={`font-mono text-[8px] nums ${isGood ? 'text-signal' : 'text-paper-4'}`}>
                        {h.openRate}%
                      </span>
                    )}
                    <div
                      className={isGood ? 'bg-signal w-full' : h.sent > 0 ? 'bg-paper-4 w-full' : 'bg-rule w-full'}
                      style={{ height: `${height}%` }}
                    />
                    <span className="font-mono text-[8px] text-paper-4">{formatHour(h.hour)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </section>

      {/* Template performance */}
      <section>
        <SectionHeader numeral="4" title="Email copy performance" subtitle="Sorted by send volume" />

        <div className="mt-6 panel overflow-hidden">
          {templates.length === 0 ? (
            <p className="p-12 text-center font-mono text-[11px] tracking-micro uppercase text-paper-4">
              No templates tracked yet.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Template</Th>
                  <Th>Category</Th>
                  <Th align="right">Sent</Th>
                  <Th align="right">Open</Th>
                  <Th align="right">Reply</Th>
                </tr>
              </thead>
              <tbody>
                {templates.sort((a, b) => b.timesSent - a.timesSent).map((t, idx) => (
                  <tr key={t.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors">
                    <td className="px-5 py-4 min-w-[240px]">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-paper-4 pt-1 shrink-0">
                          №{(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display italic text-paper text-base font-light leading-tight">{t.name}</p>
                          <p className="font-mono text-[10px] text-paper-4 mt-0.5 truncate">{t.subject}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-mono text-[10px] tracking-mega uppercase ${
                        t.category === 'cold' ? 'text-signal' : t.category === 'followup' ? 'text-amber' : 'text-paper-3'
                      }`}>{t.category}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-paper nums">{t.timesSent.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-display italic font-light text-xl nums ${t.openRate > 20 ? 'text-signal' : 'text-paper'}`}>
                        {t.openRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-display italic font-light text-xl nums ${t.replyRate > 3 ? 'text-signal' : 'text-paper'}`}>
                        {t.replyRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* City performance */}
      <section>
        <SectionHeader numeral="5" title="City performance" subtitle="Sorted by reply rate" />

        <div className="mt-6 panel overflow-hidden">
          {cityRanking.length === 0 ? (
            <p className="p-12 text-center font-mono text-[11px] tracking-micro uppercase text-paper-4">
              No campaign data yet.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>City</Th>
                  <Th align="right">Campaigns</Th>
                  <Th align="right">Prospects</Th>
                  <Th align="right">Emailed</Th>
                  <Th align="right">Open rate</Th>
                  <Th align="right">Reply rate</Th>
                  <Th align="right">Booked</Th>
                </tr>
              </thead>
              <tbody>
                {cityRanking.map((c) => (
                  <tr key={`${c.city}-${c.state}`} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-display italic text-paper text-base font-light">
                        {c.city}{c.state ? `, ${c.state}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-paper-3 nums">{c.campaigns}</td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-paper nums">{c.prospects.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-paper nums">{c.emailed.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-display italic font-light text-xl nums ${c.openRate > 20 ? 'text-signal' : 'text-paper'}`}>
                        {c.openRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-display italic font-light text-xl nums ${c.replyRate > 3 ? 'text-signal' : 'text-paper'}`}>
                        {c.replyRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-mono text-sm nums ${c.converted > 0 ? 'text-signal' : 'text-paper-4'}`}>
                        {c.converted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 font-mono text-[9px] tracking-mega uppercase text-paper-4 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
