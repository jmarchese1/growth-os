"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, X, Crosshair, Play, ArrowUpRight, Zap } from 'lucide-react';
import { SectionHeader, HeroMetric, MetricBlock, Button } from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  targetState: string | null;
  targetIndustry: string;
  active: boolean;
  agentId: string | null;
  agentExhaustedAt: string | null;
  agentRotationSource: string | null;
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

interface Agent {
  id: string;
  name: string;
}

const INDUSTRIES = ['RESTAURANT', 'SALON', 'FITNESS', 'RETAIL', 'MEDICAL', 'OTHER'];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        fetch(`${PROSPECTOR_URL}/campaigns`),
        fetch(`${PROSPECTOR_URL}/agents`),
      ]);
      if (cRes.ok) setCampaigns(await cRes.json());
      if (aRes.ok) setAgents(await aRes.json());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runDiscovery = async (id: string) => {
    setRunning(id);
    try {
      await fetch(`${PROSPECTOR_URL}/campaigns/${id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await load();
    } finally {
      setRunning(null);
    }
  };

  const totals = campaigns.reduce(
    (acc, c) => ({
      prospects: acc.prospects + c._count.prospects,
      emailed: acc.emailed + c.stats.emailed,
      replied: acc.replied + c.stats.replied,
    }),
    { prospects: 0, emailed: 0, replied: 0 },
  );

  const activeCount = campaigns.filter((c) => c.active).length;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-12">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 02 · Campaigns
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {activeCount} of {campaigns.length} active
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[80px] max-w-3xl">
            Every scrape.
          </h1>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-3 h-3" />
            <span>New campaign</span>
          </Button>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          A campaign is one city × industry — Geoapify scrape, email enrichment, ready for the agent
          to send. You can create them manually here or let an agent auto-spawn them from its rotation.
        </p>
      </section>

      {/* Summary */}
      {campaigns.length > 0 && (
        <section className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <HeroMetric
              label="Prospects scraped"
              value={totals.prospects.toLocaleString()}
              caption={`${totals.emailed.toLocaleString()} emailed, ${totals.replied} replies`}
              size="md"
            />
          </div>
          <div className="col-span-12 lg:col-span-7 panel">
            <div className="grid grid-cols-3">
              <MetricBlock label="Campaigns" value={campaigns.length} delta={`${activeCount} active`} />
              <MetricBlock label="Emailed" value={totals.emailed.toLocaleString()} />
              <MetricBlock label="Replies" value={totals.replied} trend={totals.replied > 0 ? 'up' : 'flat'} />
            </div>
          </div>
        </section>
      )}

      {/* Table */}
      <section>
        <SectionHeader numeral="1" title="The ledger" subtitle={`${campaigns.length} campaigns on the books`} />
        <div className="mt-6 panel overflow-hidden">
          {loading ? (
            <p className="p-12 text-center font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading…</p>
          ) : campaigns.length === 0 ? (
            <div className="p-20 text-center">
              <Crosshair className="w-8 h-8 text-paper-4 mx-auto mb-4" />
              <p className="font-display italic text-paper-3 text-2xl font-light">The ledger is empty.</p>
              <button onClick={() => setShowCreate(true)} className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4 inline-block">
                Create your first campaign →
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Campaign</Th>
                  <Th>Industry</Th>
                  <Th align="right">Prospects</Th>
                  <Th align="right">Emailed</Th>
                  <Th align="right">Opens</Th>
                  <Th align="right">Replies</Th>
                  <Th>Status</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, idx) => {
                  const agent = agents.find((a) => a.id === c.agentId);
                  return (
                    <tr key={c.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors group">
                      <td className="px-5 py-4 min-w-[240px]">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-[10px] text-paper-4 pt-1 shrink-0">
                            №{(idx + 1).toString().padStart(3, '0')}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/campaigns/${c.id}`} className="font-display italic text-paper text-lg font-light leading-tight hover:text-signal transition-colors block">
                              {c.name}
                            </Link>
                            <p className="font-mono text-[10px] tracking-micro uppercase text-paper-4 mt-0.5">
                              {c.targetCity}{c.targetState ? `, ${c.targetState}` : ''}
                            </p>
                            {agent && (
                              <Link href={`/agents/${agent.id}`} className="inline-flex items-center gap-1 mt-1 font-mono text-[10px] tracking-mega uppercase text-signal hover:underline">
                                <Zap className="w-2.5 h-2.5" />
                                <span>{agent.name}</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-[10px] tracking-mega uppercase text-paper-3">{c.targetIndustry}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-paper nums">
                        {c._count.prospects.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-paper nums">
                        {c.stats.emailed.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-display italic font-light text-xl nums ${c.stats.openRate > 20 ? 'text-signal' : 'text-paper'}`}>
                          {c.stats.opened}
                        </span>
                        {c.stats.emailed > 0 && <span className="font-mono text-[9px] text-paper-4 ml-1">{c.stats.openRate}%</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-display italic font-light text-xl nums ${c.stats.replied > 0 ? 'text-signal' : 'text-paper'}`}>
                          {c.stats.replied}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-mega uppercase ${
                          c.agentExhaustedAt ? 'text-amber' :
                          c.active ? 'text-signal' : 'text-paper-4'
                        }`}>
                          <span className={`w-1.5 h-1.5 ${
                            c.agentExhaustedAt ? 'bg-amber' : c.active ? 'bg-signal' : 'bg-paper-4'
                          }`} />
                          {c.agentExhaustedAt ? 'Exhausted' : c.active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => runDiscovery(c.id)}
                            disabled={running === c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 hairline hover:border-signal font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors disabled:opacity-40"
                            title="Run Geoapify discovery + email enrichment"
                          >
                            <Play className="w-3 h-3" />
                            <span>{running === c.id ? 'Running…' : 'Discover'}</span>
                          </button>
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-paper-4 group-hover:text-signal transition-colors"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          agents={agents}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({ onClose, onCreated, agents }: {
  onClose: () => void;
  onCreated: () => void;
  agents: Agent[];
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [industry, setIndustry] = useState('RESTAURANT');
  const [subject, setSubject] = useState('quick question about {{company}}');
  const [body, setBody] = useState(`Hey {{firstName}},\n\nI'm Jason. I build tools for local businesses and wanted to reach out directly.\n\nMind if I send a quick note?\n\nBest,\nJason`);
  const [agentId, setAgentId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name || !city) return;
    setCreating(true);
    try {
      const res = await fetch(`${PROSPECTOR_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, targetCity: city, targetState: state || undefined,
          targetIndustry: industry,
          emailSubject: subject, emailBodyHtml: body,
        }),
      });
      if (res.ok && agentId) {
        const campaign = await res.json();
        await fetch(`${PROSPECTOR_URL}/campaigns/${campaign.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });
      }
      if (res.ok) onCreated();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-0/80" onClick={onClose} />
      <div className="relative panel-2 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 hairline-b sticky top-0 bg-ink-2 z-10">
          <span className="font-mono text-[11px] tracking-mega uppercase text-paper-2">New campaign</span>
          <button onClick={onClose} className="text-paper-4 hover:text-paper transition-colors"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="label-sm block mb-2">Campaign name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brooklyn pizzerias Q2" className="input w-full" />
            </div>
            <div className="col-span-2">
              <label className="label-sm block mb-2">Target city</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Brooklyn" className="input w-full" />
            </div>
            <div>
              <label className="label-sm block mb-2">State</label>
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="NY" className="input w-full" maxLength={2} />
            </div>
          </div>

          <div>
            <label className="label-sm block mb-2">Industry</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  key={i}
                  onClick={() => setIndustry(i)}
                  className={`px-3 py-1.5 font-mono text-[10px] tracking-mega uppercase hairline transition-colors ${
                    industry === i ? 'border-signal bg-signal-soft text-signal' : 'border-rule text-paper-3 hover:text-paper'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {agents.length > 0 && (
            <div>
              <label className="label-sm block mb-2">Link to agent (optional)</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="input w-full appearance-none"
              >
                <option value="">Unlinked — agents will still pick it up by industry match</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="font-mono text-[10px] text-paper-4 mt-1 tracking-micro uppercase">
                Linked campaigns count toward that agent's rotation
              </p>
            </div>
          )}

          <div>
            <label className="label-sm block mb-2">Email subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label-sm block mb-2">Email body</label>
            <textarea
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input w-full resize-y font-mono text-[12px] leading-relaxed"
            />
            <p className="font-mono text-[10px] text-paper-4 mt-1 tracking-micro">
              vars: &#123;&#123;firstName&#125;&#125; &#123;&#123;shortName&#125;&#125; &#123;&#123;company&#125;&#125; &#123;&#123;city&#125;&#125;
            </p>
          </div>

          <div className="panel p-4">
            <p className="font-mono text-[10px] tracking-mega uppercase text-paper-3 mb-2">What happens next</p>
            <ol className="font-ui text-[12px] text-paper-2 space-y-1.5 leading-relaxed list-decimal list-inside">
              <li>Campaign row created immediately</li>
              <li>Click <span className="text-signal font-mono">Discover</span> on the list page to run Geoapify scrape + email enrichment</li>
              <li>Once enriched, any armed agent with matching industry will start sending</li>
            </ol>
          </div>
        </div>

        <footer className="flex gap-3 px-6 py-4 hairline-t sticky bottom-0 bg-ink-2">
          <Button variant="primary" onClick={handleCreate} disabled={creating || !name || !city}>
            {creating ? 'Creating…' : 'Create campaign'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </footer>
      </div>
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
