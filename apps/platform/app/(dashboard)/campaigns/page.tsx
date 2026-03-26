import Link from 'next/link';
import { NewCampaignForm } from './new-campaign-form';
import { RunCampaignButton } from './run-campaign-button';
import { SendCampaignButton } from './send-campaign-button';
import { DeleteCampaignButton } from './delete-campaign-button';
import { CloneCampaignButton } from './clone-campaign-button';

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

/** Truncate email body for preview — strip HTML and show first ~80 chars */
function emailPreview(body: string): string {
  const plain = body
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 100 ? plain.slice(0, 100) + '...' : plain;
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  const enrichedCounts = await Promise.all(campaigns.map((c) => getEnrichedCount(c.id)));

  // Aggregate stats across all campaigns
  const totals = campaigns.reduce(
    (acc, c) => ({
      prospects: acc.prospects + c._count.prospects,
      emailed: acc.emailed + (c.stats?.emailed ?? 0),
      opened: acc.opened + (c.stats?.opened ?? 0),
      replied: acc.replied + (c.stats?.replied ?? 0),
    }),
    { prospects: 0, emailed: 0, opened: 0, replied: 0 },
  );

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
        <p className="text-slate-400 mt-1 text-sm">Scrape local businesses and send personalized cold outreach.</p>
      </div>

      {/* Global Stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Prospects</p>
            <p className="text-2xl font-bold text-white mt-1">{totals.prospects}</p>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Emailed</p>
            <p className="text-2xl font-bold text-white mt-1">{totals.emailed}</p>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Opened</p>
            <p className="text-2xl font-bold text-white mt-1">{totals.opened}</p>
            {totals.emailed > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{Math.round((totals.opened / totals.emailed) * 100)}% rate</p>
            )}
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Replied</p>
            <p className="text-2xl font-bold text-white mt-1">{totals.replied}</p>
            {totals.emailed > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{Math.round((totals.replied / totals.emailed) * 100)}% rate</p>
            )}
          </div>
        </div>
      )}

      {/* New Campaign Form */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
          </svg>
          New Campaign
        </h2>
        <NewCampaignForm prospectorUrl={PROSPECTOR_URL} />
      </div>

      {/* Campaigns Table */}
      {campaigns.length === 0 ? (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-16 text-center">
          <p className="text-slate-500 text-sm">No campaigns yet. Create one above to get started.</p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">{campaigns.length} Campaign{campaigns.length !== 1 ? 's' : ''}</h2>
          </div>
          <div className="divide-y divide-slate-800/60">
            {campaigns.map((c, idx) => (
              <div key={c.id} className="px-6 py-5 hover:bg-violet-950/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Campaign info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Link href={`/campaigns/${c.id}`} className="font-semibold text-sm text-white hover:text-violet-300 transition-colors">
                        {c.name}
                      </Link>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.active
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${c.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span>{c.targetCity}{c.targetState ? `, ${c.targetState}` : ''}</span>
                      <span>·</span>
                      <span>{c.targetIndustry}</span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Email template preview */}
                    <div className="mt-2.5 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg">
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Subject</p>
                      <p className="text-xs text-slate-300">{c.emailSubject}</p>
                      <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">{emailPreview(c.emailBodyHtml)}</p>
                    </div>

                    {/* Performance stats row */}
                    {c.stats && c.stats.emailed > 0 && (
                      <div className="flex items-center gap-4 mt-2.5">
                        <span className="text-xs text-slate-500">
                          <span className="font-semibold text-white">{c.stats.emailed}</span> sent
                        </span>
                        <span className="text-xs text-slate-500">
                          <span className={`font-semibold ${c.stats.openRate >= 20 ? 'text-emerald-400' : c.stats.openRate >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {c.stats.openRate}%
                          </span> opens
                        </span>
                        <span className="text-xs text-slate-500">
                          <span className={`font-semibold ${c.stats.replyRate >= 5 ? 'text-emerald-400' : c.stats.replyRate >= 2 ? 'text-yellow-400' : 'text-slate-400'}`}>
                            {c.stats.replyRate}%
                          </span> replies
                        </span>
                        {c.stats.converted > 0 && (
                          <span className="text-xs text-slate-500">
                            <span className="font-semibold text-violet-400">{c.stats.converted}</span> converted
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Prospect count + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-lg font-bold text-white">{c._count.prospects}</span>
                      <span className="text-xs text-slate-500 ml-1">prospects</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                      >
                        View
                      </Link>
                      <RunCampaignButton campaignId={c.id} prospectorUrl={PROSPECTOR_URL} initialTotal={c._count.prospects} />
                      <SendCampaignButton campaignId={c.id} prospectorUrl={PROSPECTOR_URL} enrichedCount={enrichedCounts[idx] ?? 0} />
                      <CloneCampaignButton campaignId={c.id} campaignName={c.name} prospectorUrl={PROSPECTOR_URL} />
                      <DeleteCampaignButton campaignId={c.id} campaignName={c.name} prospectorUrl={PROSPECTOR_URL} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
