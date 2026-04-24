import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { NewCampaignForm } from './new-campaign-form';
import { RunCampaignButton } from './run-campaign-button';
import { SendCampaignButton } from './send-campaign-button';
import { DeleteCampaignButton } from './delete-campaign-button';
import { CloneCampaignButton } from './clone-campaign-button';
import {
  SectionHeader,
  HeroMetric,
  MetricBlock,
  Panel,
  Button,
} from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface CampaignStats {
  id: string;
  name: string;
  targetCity: string;
  targetState: string | null;
  targetIndustry: string;
  emailSubject: string;
  emailBodyHtml: string;
  active: boolean;
  createdAt: string;
  _count: { prospects: number };
  stats: {
    emailed: number;
    opened: number;
    replied: number;
    converted: number;
    openRate: number;
    replyRate: number;
  };
}

async function getCampaigns(): Promise<CampaignStats[]> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/campaigns`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json() as Promise<CampaignStats[]>;
  } catch {
    return [];
  }
}

async function getEnrichedCount(campaignId: string): Promise<number> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/campaigns/${campaignId}/stats`, { cache: 'no-store' });
    if (!res.ok) return 0;
    const data = (await res.json()) as { byStatus?: Record<string, number> };
    return data.byStatus?.['ENRICHED'] ?? 0;
  } catch {
    return 0;
  }
}

function emailPreview(body: string): string {
  const plain = body
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 140 ? plain.slice(0, 140) + '…' : plain;
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  const enrichedCounts = await Promise.all(campaigns.map((c) => getEnrichedCount(c.id)));

  const totals = campaigns.reduce(
    (acc, c) => ({
      prospects: acc.prospects + c._count.prospects,
      emailed: acc.emailed + (c.stats?.emailed ?? 0),
      opened: acc.opened + (c.stats?.opened ?? 0),
      replied: acc.replied + (c.stats?.replied ?? 0),
    }),
    { prospects: 0, emailed: 0, opened: 0, replied: 0 },
  );

  const activeCount = campaigns.filter(c => c.active).length;
  const openRate = totals.emailed > 0 ? Math.round((totals.opened / totals.emailed) * 100) : 0;
  const replyRate = totals.emailed > 0 ? Math.round((totals.replied / totals.emailed) * 100) : 0;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">

      {/* ── Masthead ── */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 02 · Campaigns
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {activeCount} of {campaigns.length} live
          </span>
        </div>
        <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
          Where we cast the net.
        </h1>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Geo-scrape local businesses, enrich, and deliver personalized cold emails.
          Each campaign is its own ledger — targeted, tracked, and re-runnable.
        </p>
      </section>

      {/* ── Top-line numbers ── */}
      {campaigns.length > 0 && (
        <section className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <HeroMetric
              label="Prospects across the ledger"
              value={totals.prospects.toLocaleString()}
              caption={`${campaigns.length} campaigns, ${activeCount} running`}
              size="md"
            />
          </div>
          <div className="col-span-12 lg:col-span-7 panel">
            <div className="grid grid-cols-3 hairline-b">
              <MetricBlock
                label="Emailed"
                value={totals.emailed.toLocaleString()}
                delta={`${totals.prospects > 0 ? Math.round((totals.emailed / totals.prospects) * 100) : 0}% of prospects`}
              />
              <MetricBlock
                label="Opens"
                value={totals.opened.toLocaleString()}
                delta={`${openRate}% rate`}
                trend={openRate > 15 ? 'up' : 'flat'}
              />
              <MetricBlock
                label="Replies"
                value={totals.replied.toLocaleString()}
                delta={`${replyRate}% rate`}
                trend={replyRate > 3 ? 'up' : 'flat'}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── New campaign composer ── */}
      <section>
        <SectionHeader
          numeral="1"
          title="New dispatch"
          subtitle="Define target, compose copy, release."
          action={
            <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
              <Plus className="inline w-3 h-3 mr-1" />
              Compose
            </span>
          }
        />

        <div className="mt-6 panel">
          <div className="p-8">
            <NewCampaignForm prospectorUrl={PROSPECTOR_URL} />
          </div>
        </div>
      </section>

      {/* ── Campaign ledger ── */}
      <section>
        <SectionHeader
          numeral="2"
          title="The ledger"
          subtitle={`${campaigns.length} campaigns on the books`}
        />

        <div className="mt-6">
          {campaigns.length === 0 ? (
            <div className="panel p-20 text-center">
              <p className="font-display italic text-paper-3 text-2xl font-light">
                The ledger is empty.
              </p>
              <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4 mt-3">
                Compose your first dispatch above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((c, idx) => {
                const cOpen = c.stats?.openRate ?? 0;
                const cReply = c.stats?.replyRate ?? 0;
                return (
                  <article
                    key={c.id}
                    className="panel grid grid-cols-12 gap-0 hover:border-paper-4 transition-colors"
                  >
                    {/* LEFT — index + name + meta */}
                    <div className="col-span-12 lg:col-span-5 p-6 hairline-r">
                      <div className="flex items-start gap-4">
                        <span className="font-mono text-[10px] tracking-mega text-paper-4 pt-1.5 shrink-0">
                          №{(idx + 1).toString().padStart(3, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className={`w-1.5 h-1.5 shrink-0 relative ${
                                c.active ? 'bg-signal signal-dot' : 'bg-paper-4'
                              }`}
                            />
                            <span className="font-mono text-[10px] tracking-mega uppercase text-paper-3">
                              {c.active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="font-display italic font-light text-paper text-[28px] leading-tight hover:text-signal transition-colors block"
                          >
                            {c.name}
                          </Link>
                          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] tracking-micro uppercase text-paper-4">
                            <span>{c.targetCity}{c.targetState ? `, ${c.targetState}` : ''}</span>
                            <span>·</span>
                            <span>{c.targetIndustry}</span>
                            <span>·</span>
                            <span>{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Email preview */}
                      <div className="mt-5 pl-8">
                        <p className="label-sm mb-1">Subject</p>
                        <p className="font-ui text-sm text-paper-2 mb-3">{c.emailSubject}</p>
                        <p className="label-sm mb-1">Body</p>
                        <p className="font-ui text-[12px] text-paper-3 leading-relaxed italic">
                          “{emailPreview(c.emailBodyHtml)}”
                        </p>
                      </div>
                    </div>

                    {/* MIDDLE — numbers */}
                    <div className="col-span-12 lg:col-span-4 p-6 hairline-r grid grid-cols-2 gap-y-5 gap-x-4 content-start">
                      <NumCell
                        label="Prospects"
                        value={c._count.prospects.toLocaleString()}
                      />
                      <NumCell
                        label="Emailed"
                        value={(c.stats?.emailed ?? 0).toLocaleString()}
                      />
                      <NumCell
                        label="Opens"
                        value={(c.stats?.opened ?? 0).toLocaleString()}
                        suffix={`${cOpen}%`}
                      />
                      <NumCell
                        label="Replies"
                        value={(c.stats?.replied ?? 0).toLocaleString()}
                        suffix={`${cReply}%`}
                        accent={(c.stats?.replied ?? 0) > 0}
                      />
                    </div>

                    {/* RIGHT — actions */}
                    <div className="col-span-12 lg:col-span-3 p-6 flex flex-col gap-2 justify-between">
                      <div className="flex flex-col gap-2">
                        <Link href={`/campaigns/${c.id}`}>
                          <Button size="sm" className="w-full justify-between">
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        </Link>
                        <div className="flex gap-1.5">
                          <div className="flex-1">
                            <RunCampaignButton
                              campaignId={c.id}
                              prospectorUrl={PROSPECTOR_URL}
                              initialTotal={c._count.prospects}
                            />
                          </div>
                          <div className="flex-1">
                            <SendCampaignButton
                              campaignId={c.id}
                              prospectorUrl={PROSPECTOR_URL}
                              enrichedCount={enrichedCounts[idx] ?? 0}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-auto">
                        <div className="flex-1">
                          <CloneCampaignButton
                            campaignId={c.id}
                            campaignName={c.name}
                            prospectorUrl={PROSPECTOR_URL}
                          />
                        </div>
                        <div className="flex-1">
                          <DeleteCampaignButton
                            campaignId={c.id}
                            campaignName={c.name}
                            prospectorUrl={PROSPECTOR_URL}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <section className="hairline-t pt-6 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          § 02 · Campaigns
        </span>
        <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          {campaigns.length} records
        </span>
      </section>
    </div>
  );
}

function NumCell({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="label-sm mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-display italic font-light nums text-[28px] leading-none tracking-tight ${
            accent ? 'text-signal' : 'text-paper'
          }`}
        >
          {value}
        </span>
        {suffix && (
          <span className="font-mono text-[10px] text-paper-4 tracking-micro">{suffix}</span>
        )}
      </div>
    </div>
  );
}
