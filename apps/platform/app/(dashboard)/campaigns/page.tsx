import Link from 'next/link';
import { NewCampaignForm } from './new-campaign-form';
import { RunCampaignButton } from './run-campaign-button';
import { DeleteCampaignButton } from './delete-campaign-button';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface CampaignStats {
  id: string;
  name: string;
  targetCity: string;
  targetIndustry: string;
  active: boolean;
  createdAt: string;
  _count: { prospects: number };
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

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
        <p className="text-slate-400 mt-1 text-sm">Scrape local businesses and send personalized cold outreach.</p>
      </div>

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
          {/* Scrollbar-on-top: rotateX flips the scrollbar up, inner div flips content back */}
          <div className="overflow-x-auto [transform:rotateX(180deg)]">
          <div className="[transform:rotateX(180deg)]">
          <table className="w-full" style={{ minWidth: '720px' }}>
            <thead>
              <tr className="bg-white/[0.07] border-b-2 border-slate-700/40">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-6 py-3.5">Campaign</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-6 py-3.5">City</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-6 py-3.5">Prospects</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-6 py-3.5">Status</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-violet-950/20 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/campaigns/${c.id}`} className="font-semibold text-sm text-white hover:text-violet-300 transition-colors">
                      {c.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{c.targetIndustry}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{c.targetCity}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-white">{c._count.prospects}</span>
                    <span className="text-xs text-slate-500 ml-1">prospects</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      c.active
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                      >
                        View →
                      </Link>
                      <RunCampaignButton campaignId={c.id} prospectorUrl={PROSPECTOR_URL} initialTotal={c._count.prospects} />
                      <DeleteCampaignButton campaignId={c.id} campaignName={c.name} prospectorUrl={PROSPECTOR_URL} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>{/* end rotateX inner */}
          </div>{/* end rotateX outer */}
        </div>
      )}
    </div>
  );
}
