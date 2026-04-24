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
      <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto">
        <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading campaign…</p>
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

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-12">
      {/* Back + masthead */}
      <section className="pb-6 hairline-b">
        <Link href="/campaigns" className="flex items-center gap-2 font-mono text-[10px] tracking-mega uppercase text-paper-4 hover:text-signal transition-colors mb-4">
          <ArrowLeft className="w-3 h-3" />
          <span>All campaigns</span>
        </Link>
        <div className="flex items-end justify-between gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 shrink-0 ${
                campaign.agentExhaustedAt ? 'bg-amber' :
                campaign.active ? 'bg-signal' : 'bg-paper-4'
              }`} />
              <span className={`font-mono text-[10px] tracking-mega uppercase ${
                campaign.agentExhaustedAt ? 'text-amber' :
                campaign.active ? 'text-signal' : 'text-paper-4'
              }`}>
                {campaign.agentExhaustedAt ? 'Exhausted' : campaign.active ? 'Active' : 'Paused'}
              </span>
              <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase ml-3">
                {campaign.targetIndustry}
              </span>
            </div>
            <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[52px] lg:text-[68px]">
              {campaign.name}
            </h1>
            <p className="font-mono text-[11px] tracking-micro text-paper-3 uppercase mt-3 flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>{campaign.targetCity}{campaign.targetState ? `, ${campaign.targetState}` : ''}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button variant="primary" onClick={runDiscovery} disabled={running}>
              <Play className="w-3 h-3" />
              <span>{running ? 'Running…' : 'Run discovery'}</span>
            </Button>
            {campaign.agentId && (
              <Link href={`/agents/${campaign.agentId}`}>
                <Button variant="ghost" className="w-full">
                  <Zap className="w-3 h-3" />
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
        <SectionHeader numeral="1" title="Email template" />
        <div className="mt-6 panel p-6 space-y-3">
          <div>
            <span className="label-sm block mb-1.5">Subject</span>
            <p className="font-ui text-sm text-paper">{campaign.emailSubject}</p>
          </div>
          <div>
            <span className="label-sm block mb-1.5">Body</span>
            <p className="font-display italic text-paper-2 text-[13px] leading-relaxed whitespace-pre-wrap">
              {campaign.emailBodyHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')}
            </p>
          </div>
        </div>
      </section>

      {/* Prospects */}
      <section>
        <SectionHeader
          numeral="2"
          title="Prospects"
          subtitle={`${prospects.length} shown${filter ? ` · filtered` : ''}`}
        />

        <div className="mt-6 flex gap-2 mb-4">
          {statusFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 font-mono text-[10px] tracking-mega uppercase hairline transition-colors ${
                filter === f.value ? 'border-signal bg-signal-soft text-signal' : 'border-rule text-paper-3 hover:text-paper'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="panel overflow-hidden">
          {prospects.length === 0 ? (
            <div className="p-16 text-center">
              <p className="font-display italic text-paper-3 text-xl font-light">
                {filter ? 'No matches in that filter.' : 'No prospects yet.'}
              </p>
              {!filter && (
                <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4 mt-3">
                  Click "Run discovery" to scrape this city
                </p>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Business</Th>
                  <Th>Email</Th>
                  <Th>Contact</Th>
                  <Th align="right">Google</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="font-ui text-sm text-paper">{p.name}</p>
                          {p.website && (
                            <a href={p.website} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-paper-4 hover:text-signal transition-colors inline-flex items-center gap-1 mt-0.5">
                              {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.email ? (
                        <span className="font-mono text-[11px] text-paper-2">{p.email}</span>
                      ) : (
                        <span className="font-mono text-[10px] text-paper-4">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.contactFirstName ? (
                        <span className="font-ui text-sm text-paper-2">{p.contactFirstName}</span>
                      ) : (
                        <span className="font-mono text-[10px] text-paper-4">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.googleRating ? (
                        <span className="font-mono text-xs text-paper nums">{p.googleRating.toFixed(1)}★</span>
                      ) : (
                        <span className="font-mono text-[10px] text-paper-4">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] tracking-micro uppercase text-paper-3">
                        {p.status.replace(/_/g, ' ')}
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
