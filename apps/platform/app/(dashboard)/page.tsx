import Link from 'next/link';
import { ArrowUpRight, Crosshair, Mail, Users, Building2, FileText } from 'lucide-react';
import {
  SectionHeader,
  HeroMetric,
  MetricBlock,
  LiveBadge,
  Panel,
  FunnelBar,
  DottedRow,
  Button,
} from '../../components/ui/primitives';

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
  const scraped = stats.total;
  const hasEmail = (s['ENRICHED'] ?? 0) + (s['CONTACTED'] ?? 0) + (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const emailed = (s['CONTACTED'] ?? 0) + (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const opened = (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const replied = (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const converted = s['CONVERTED'] ?? 0;
  return { scraped, hasEmail, emailed, opened, replied, converted };
}

const QUICK_NAV = [
  { href: '/campaigns',  label: 'Campaigns',  code: 'CMP', icon: Crosshair,  sub: 'Outbound sequences' },
  { href: '/emails',     label: 'Emails',     code: 'EML', icon: Mail,       sub: 'Inbox & replies' },
  { href: '/leads',      label: 'Leads',      code: 'LED', icon: Users,      sub: 'Engaged prospects' },
  { href: '/businesses', label: 'Businesses', code: 'BIZ', icon: Building2,  sub: 'Signed clients' },
  { href: '/proposals',  label: 'Proposals',  code: 'PRP', icon: FileText,   sub: 'AI-generated docs' },
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
  const openRate   = pct(agg.opened,    agg.emailed);
  const replyRate  = pct(agg.replied,   agg.emailed);
  const bookedRate = pct(agg.converted, agg.emailed);

  const industries = Array.from(new Set(allCampaigns.map((c) => c.targetIndustry)));

  const date = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">

      {/* ──────────── Masthead ──────────── */}
      <section className="grid grid-cols-12 gap-8 items-end pb-10 hairline-b">
        <div className="col-span-8">
          <div className="flex items-center gap-4 mb-3">
            <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
              Vol. 01 · Issue {new Date().getDate().toString().padStart(3, '0')}
            </span>
            <span className="h-px w-12 bg-rule" />
            <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
              {date}
            </span>
          </div>
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[72px] lg:text-[84px]">
            The state of <br />
            <span className="text-signal not-italic font-normal text-[64px] lg:text-[72px]" style={{ fontFamily: 'var(--font-mono)' }}>
              {agg.scraped.toLocaleString()}
            </span>{' '}prospects.
          </h1>
          <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
            Outbound intelligence across{' '}
            <span className="font-mono text-signal">{filtered.length}</span> campaigns,{' '}
            <span className="font-mono text-signal">{activeCampaigns}</span> currently live.
          </p>
        </div>

        <div className="col-span-4 flex flex-col gap-3 items-end">
          <LiveBadge active={activeCampaigns > 0} label={activeCampaigns > 0 ? `${activeCampaigns} Live` : 'Idle'} />
          <Link href="/campaigns">
            <Button variant="primary">
              <span>New campaign</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ──────────── Hero numbers ──────────── */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between">
          <div>
            <span className="label">§ 01 — Top line</span>
            <p className="font-display italic text-paper-2 text-[19px] mt-4 leading-relaxed max-w-md">
              Reply rate is the only number that pays rent. Opens are a vanity metric, bookings are real.
            </p>
          </div>
          <div className="mt-8">
            <HeroMetric
              label="Reply rate — trailing all-time"
              value={replyRate.toString()}
              unit="%"
              caption={`${agg.replied.toLocaleString()} replies on ${agg.emailed.toLocaleString()} sent`}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-3 hairline-b">
            <MetricBlock
              label="Scraped"
              value={agg.scraped.toLocaleString()}
              delta={`${filtered.length} campaigns`}
            />
            <MetricBlock
              label="Has email"
              value={agg.hasEmail.toLocaleString()}
              delta={`${pct(agg.hasEmail, agg.scraped)}% of scraped`}
              trend="up"
            />
            <MetricBlock
              label="Emailed"
              value={agg.emailed.toLocaleString()}
              delta={`${pct(agg.emailed, agg.hasEmail)}% of reachable`}
            />
          </div>
          <div className="grid grid-cols-3">
            <MetricBlock
              label="Opens"
              value={agg.opened.toLocaleString()}
              delta={`${openRate}% open rate`}
            />
            <MetricBlock
              label="Replies"
              value={agg.replied.toLocaleString()}
              delta={`${replyRate}% reply rate`}
              trend="up"
            />
            <MetricBlock
              label="Booked"
              value={agg.converted.toLocaleString()}
              delta={`${bookedRate}% booked`}
              trend="up"
            />
          </div>
        </div>
      </section>

      {/* ──────────── Quick navigation strip ──────────── */}
      <section>
        <div className="flex items-center gap-4 mb-5">
          <span className="label">§ 02 — Dispatch</span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-0 hairline border-t border-l">
          {QUICK_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative p-5 hairline border-r border-b hover:bg-ink-2 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <Icon className="w-4 h-4 text-paper-3 group-hover:text-signal transition-colors" />
                  <span className="font-mono text-[9px] tracking-mega text-paper-4 group-hover:text-signal transition-colors">
                    {item.code}
                  </span>
                </div>
                <p className="font-display italic text-paper text-xl font-light mt-6 leading-none">
                  {item.label}
                </p>
                <p className="font-mono text-[10px] tracking-micro text-paper-4 mt-2 uppercase">
                  {item.sub}
                </p>
                <ArrowUpRight className="w-3 h-3 text-paper-4 group-hover:text-signal absolute bottom-4 right-4 transition-colors" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ──────────── Funnel + filters ──────────── */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <SectionHeader
            numeral="3"
            title="The funnel"
            subtitle="Pipeline conversion from scrape to booking"
            action={
              <div className="flex items-center gap-5 font-mono text-[11px]">
                <DottedItem label="Open" value={`${openRate}%`} />
                <DottedItem label="Reply" value={`${replyRate}%`} />
                <DottedItem label="Book" value={`${bookedRate}%`} accent />
              </div>
            }
          />

          <div className="mt-6 panel p-5">
            <FunnelBar label="Scraped"   value={agg.scraped}   max={agg.scraped} />
            <FunnelBar label="Has email" value={agg.hasEmail}  max={agg.scraped} />
            <FunnelBar label="Emailed"   value={agg.emailed}   max={agg.scraped} />
            <FunnelBar label="Opened"    value={agg.opened}    max={agg.scraped} />
            <FunnelBar label="Replied"   value={agg.replied}   max={agg.scraped} accent />
            <FunnelBar label="Booked"    value={agg.converted} max={agg.scraped} accent />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Panel title="Industry filter" numeral="04">
            <div className="p-5 space-y-1.5">
              <Link
                href="/"
                className={`block px-3 py-2 font-mono text-[11px] tracking-micro uppercase transition-colors hairline ${
                  !industryFilter
                    ? 'border-signal bg-signal-soft text-signal'
                    : 'border-transparent text-paper-3 hover:text-paper hover:border-rule'
                }`}
              >
                <span className="flex justify-between items-center">
                  <span>All industries</span>
                  <span className="nums">{allCampaigns.length}</span>
                </span>
              </Link>
              {industries.map((ind) => {
                const count = allCampaigns.filter(c => c.targetIndustry === ind).length;
                const isActive = industryFilter === ind;
                return (
                  <Link
                    key={ind}
                    href={`/?industry=${ind}`}
                    className={`block px-3 py-2 font-mono text-[11px] tracking-micro uppercase transition-colors hairline ${
                      isActive
                        ? 'border-signal bg-signal-soft text-signal'
                        : 'border-transparent text-paper-3 hover:text-paper hover:border-rule'
                    }`}
                  >
                    <span className="flex justify-between items-center">
                      <span>{INDUSTRY_LABELS[ind] ?? ind}</span>
                      <span className="nums">{count}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="At a glance" numeral="05" className="mt-6">
            <div className="p-5 space-y-1">
              <DottedRow label="Total campaigns" value={filtered.length} />
              <DottedRow label="Live now" value={activeCampaigns} accent={activeCampaigns > 0} />
              <DottedRow label="Avg open rate" value={`${openRate}%`} />
              <DottedRow label="Avg reply rate" value={`${replyRate}%`} accent />
              <DottedRow label="Conversion" value={`${bookedRate}%`} />
            </div>
          </Panel>
        </div>
      </section>

      {/* ──────────── Campaign ledger ──────────── */}
      <section>
        <SectionHeader
          numeral="6"
          title="Campaign ledger"
          subtitle={`${filtered.length} campaigns on the books`}
          action={
            <Link href="/campaigns">
              <Button variant="ghost" size="sm">
                <span>View all</span>
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          }
        />

        <div className="mt-6 panel overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <p className="font-display italic text-paper-3 text-xl font-light">
                Nothing in the ledger yet.
              </p>
              <Link
                href="/campaigns"
                className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4 inline-block"
              >
                Open the first campaign →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Campaign</Th>
                  <Th>Industry</Th>
                  <Th align="right">Scraped</Th>
                  <Th align="right">Emailed</Th>
                  <Th align="right">Opens</Th>
                  <Th align="right">Replies</Th>
                  <Th align="right">Booked</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const f = funnelStages(c.stats);
                  const cOpen = pct(f.opened, f.emailed);
                  const cReply = pct(f.replied, f.emailed);
                  return (
                    <tr key={c.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors group">
                      <td className="px-5 py-4 min-w-[240px]">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-1.5 h-1.5 shrink-0 relative ${
                              c.active ? 'bg-signal signal-dot' : 'bg-paper-4'
                            }`}
                          />
                          <div>
                            <p className="font-display italic text-paper text-lg font-light leading-tight">
                              {c.name}
                            </p>
                            <p className="font-mono text-[10px] tracking-micro text-paper-4 mt-0.5 uppercase">
                              {c.targetCity}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-[10px] tracking-micro text-paper-3 uppercase hairline px-2 py-1">
                          {INDUSTRY_LABELS[c.targetIndustry] ?? c.targetIndustry}
                        </span>
                      </td>
                      <Td>{f.scraped.toLocaleString()}</Td>
                      <Td>{f.emailed.toLocaleString()}</Td>
                      <Td>
                        {f.opened.toLocaleString()}
                        {f.emailed > 0 && (
                          <span className="block font-mono text-[9px] text-paper-4 mt-0.5">{cOpen}%</span>
                        )}
                      </Td>
                      <Td accent={f.replied > 0}>
                        {f.replied.toLocaleString()}
                        {f.emailed > 0 && (
                          <span className="block font-mono text-[9px] text-paper-4 mt-0.5">{cReply}%</span>
                        )}
                      </Td>
                      <Td accent={f.converted > 0}>{f.converted.toLocaleString()}</Td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-paper-4 group-hover:text-signal transition-colors"
                        >
                          <span>View</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ──────────── Footer ────────────  */}
      <section className="hairline-t pt-6 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          Embedo · Operator · Growth OS
        </span>
        <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          All times Eastern
        </span>
      </section>
    </div>
  );
}

/* ─── small helpers local to dashboard ─── */

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[9px] tracking-mega uppercase text-paper-4 font-medium ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <td
      className={`px-4 py-4 text-right font-mono text-sm nums ${
        accent ? 'text-signal' : 'text-paper'
      }`}
    >
      {children}
    </td>
  );
}

function DottedItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-paper-4 tracking-micro uppercase">{label}</span>
      <span className={`nums font-semibold ${accent ? 'text-signal' : 'text-paper'}`}>
        {value}
      </span>
    </span>
  );
}
