"use client";

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, MapPin, Zap, ExternalLink } from 'lucide-react';
import { SectionHeader, HeroMetric, MetricBlock, Panel, Button } from '../../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  targetState: string | null;
  targetIndustry: string;
  emailSubject: string;
  emailBodyHtml: string;
  active: boolean;
  agentId: string | null;
  agentExhaustedAt: string | null;
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

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  replies: number;
}

interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  contactFirstName: string | null;
  status: string;
  googleRating: number | null;
  createdAt: string;
}

export default function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const [cRes, sRes, pRes] = await Promise.all([
        fetch(`${PROSPECTOR_URL}/campaigns`),
        fetch(`${PROSPECTOR_URL}/campaigns/${id}/stats`),
        fetch(`${PROSPECTOR_URL}/campaigns/${id}/prospects?pageSize=100${filter ? `&status=${filter}` : ''}`),
      ]);
      if (cRes.ok) {
        const list: Campaign[] = await cRes.json();
        setCampaign(list.find((c) => c.id === id) ?? null);
      }
      if (sRes.ok) setStats(await sRes.json());
      if (pRes.ok) {
        const data = await pRes.json();
        setProspects(data.items ?? data ?? []);
      }
    } catch { /* silent */ }
  }, [id, filter]);

  useEffect(() => { load(); }, [load]);

  const runDiscovery = async () => {
    setRunning(true);
    try {
      await fetch(`${PROSPECTOR_URL}/campaigns/${id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      // Poll while it runs
      setTimeout(() => { load(); setRunning(false); }, 3000);
    } catch {
      setRunning(false);
    }
  };

  if (!campaign) {
    return (
      <div className="pt-10 pb-24 px-10 max-w-[1400px] mx-auto">
        <p className="text-[13px] text-paper-3">Loading campaign…</p>
      </div>
    );
  }

  const s = stats?.byStatus ?? {};
  const hasEmail = (s['ENRICHED'] ?? 0) + (s['CONTACTED'] ?? 0) + (s['OPENED'] ?? 0) + (s['REPLIED'] ?? 0) + (s['CONVERTED'] ?? 0);
  const sendable = s['ENRICHED'] ?? 0;

  const statusFilters = [
    { label: 'All', value: '' },
    { label: 'Ready', value: 'ENRICHED' },
    { label: 'Emailed', value: 'CONTACTED,OPENED,REPLIED,CONVERTED' },
    { label: 'Replied', value: 'REPLIED,CONVERTED' },
    { label: 'Dead', value: 'BOUNCED,DEAD,UNSUBSCRIBED' },
  ];

  const industryLabel = campaign.targetIndustry.charAt(0) + campaign.targetIndustry.slice(1).toLowerCase();

  return (
    <div className="pt-10 pb-24 px-10 max-w-[1400px] mx-auto space-y-10">
      {/* Header */}
      <section className="pb-6 hairline-b">
        <Link href="/campaigns" className="flex items-center gap-1.5 text-[13px] text-paper-3 hover:text-signal transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All campaigns</span>
        </Link>
        <div className="flex items-end justify-between gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                campaign.agentExhaustedAt ? 'bg-amber/10 text-amber' :
                campaign.active ? 'bg-signal/10 text-signal' : 'bg-ink-2 text-paper-3'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  campaign.agentExhaustedAt ? 'bg-amber' :
                  campaign.active ? 'bg-signal' : 'bg-paper-4'
                }`} />
                {campaign.agentExhaustedAt ? 'Exhausted' : campaign.active ? 'Active' : 'Paused'}
              </span>
              <span className="text-[12px] text-paper-3">{industryLabel}</span>
            </div>
            <h1 className="text-paper text-[36px] font-semibold leading-tight tracking-tight">
              {campaign.name}
            </h1>
            <p className="text-[13px] text-paper-3 mt-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{campaign.targetCity}{campaign.targetState ? `, ${campaign.targetState}` : ''}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button variant="primary" onClick={runDiscovery} disabled={running}>
              <Play className="w-3.5 h-3.5" />
              <span>{running ? 'Running…' : 'Run discovery'}</span>
            </Button>
            {campaign.agentId && (
              <Link href={`/agents/${campaign.agentId}`}>
                <Button variant="ghost" className="w-full">
                  <Zap className="w-3.5 h-3.5" />
                  <span>View agent</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4">
          <HeroMetric
            label="Prospects"
            value={(stats?.total ?? campaign._count.prospects).toLocaleString()}
            caption={`${hasEmail.toLocaleString()} with email, ${sendable} ready to send`}
            size="md"
          />
        </div>
        <div className="col-span-12 lg:col-span-8 panel">
          <div className="grid grid-cols-4">
            <MetricBlock label="With email" value={hasEmail.toLocaleString()} />
            <MetricBlock label="Emailed" value={campaign.stats.emailed} />
            <MetricBlock label="Opens" value={campaign.stats.opened} delta={campaign.stats.emailed > 0 ? `${campaign.stats.openRate}%` : ''} />
            <MetricBlock label="Replies" value={campaign.stats.replied} trend={campaign.stats.replied > 0 ? 'up' : 'flat'} />
          </div>
        </div>
      </section>

      {/* Email preview */}
      <section>
        <SectionHeader title="Email template" />
        <div className="mt-4 panel p-6 space-y-3">
          <div>
            <span className="label-sm block mb-1.5">Subject</span>
            <p className="text-[14px] text-paper">{campaign.emailSubject}</p>
          </div>
          <div>
            <span className="label-sm block mb-1.5">Body</span>
            <p className="text-paper-2 text-[13px] leading-relaxed whitespace-pre-wrap">
              {campaign.emailBodyHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')}
            </p>
          </div>
        </div>
      </section>

      {/* Prospects */}
      <section>
        <SectionHeader
          title="Prospects"
          subtitle={`${prospects.length} shown${filter ? ` · filtered` : ''}`}
        />

        <div className="mt-4 flex gap-2 mb-4">
          {statusFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                filter === f.value ? 'border-signal bg-signal/10 text-signal' : 'border-rule text-paper-3 hover:text-paper hover:bg-ink-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="panel overflow-hidden">
          {prospects.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-paper text-[16px] font-medium">
                {filter ? 'No matches in that filter.' : 'No prospects yet.'}
              </p>
              {!filter && (
                <p className="text-[12px] text-paper-3 mt-2">
                  Click "Run discovery" to scrape this city.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule bg-ink-1">
                  <Th>Business</Th>
                  <Th>Email</Th>
                  <Th>Contact</Th>
                  <Th align="right">Google</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} className="border-b border-rule last:border-0 hover:bg-ink-2 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-[13px] text-paper font-medium">{p.name}</p>
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-[12px] text-paper-3 hover:text-signal transition-colors inline-flex items-center gap-1 mt-0.5">
                            {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.email ? (
                        <span className="text-[12px] text-paper-2">{p.email}</span>
                      ) : (
                        <span className="text-[12px] text-paper-4">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.contactFirstName ? (
                        <span className="text-[13px] text-paper-2">{p.contactFirstName}</span>
                      ) : (
                        <span className="text-[12px] text-paper-4">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.googleRating ? (
                        <span className="text-[12px] text-paper nums font-medium">{p.googleRating.toFixed(1)}★</span>
                      ) : (
                        <span className="text-[12px] text-paper-4">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-paper-3">
                        {p.status.charAt(0) + p.status.slice(1).toLowerCase().replace(/_/g, ' ')}
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
    <th className={`px-4 py-2.5 text-[11px] uppercase tracking-wide text-paper-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
