import Link from 'next/link';
import { Zap, ArrowUpRight, Plus, ExternalLink, CheckCircle2, Circle } from 'lucide-react';
import {
  SectionHeader, HeroMetric, MetricBlock, Button,
} from '../../components/ui/primitives';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  dailyCap: number;
  sheetUrl: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  targetCities: string[];
  targetIndustries: string[];
  _count: { campaigns: number; runs: number };
}

async function getAgents(): Promise<Agent[]> {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/agents`, { next: { revalidate: 20 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const agents = await getAgents();
  const activeCount = agents.filter((a) => a.active).length;
  const totalCapacity = agents.filter((a) => a.active).reduce((a, ag) => a + ag.dailyCap, 0);
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Vol. 01 · Issue {new Date().getDate().toString().padStart(3, '0')}
          </span>
          <span className="h-px w-12 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {today}
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[72px] lg:text-[92px]">
            The machine{activeCount > 0 ? ' is' : ''} <span className={activeCount > 0 ? 'text-signal not-italic' : 'text-paper-3'} style={activeCount > 0 ? { fontFamily: 'var(--font-mono)' } : {}}>
              {activeCount > 0 ? 'working' : 'resting'}
            </span>.
          </h1>
          <div className="flex flex-col items-end gap-3">
            <Link href="/agents">
              <Button variant="primary">
                <Plus className="w-3 h-3" />
                <span>New agent</span>
              </Button>
            </Link>
          </div>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-6 max-w-xl leading-relaxed">
          {agents.length === 0
            ? 'No agents yet. Build your first one — pick industries, cities, daily cap, email copy. The agent handles the rest: discovery, enrichment, personalization, sending.'
            : `Every agent writes to its own Google Sheet. All data — prospects, emails, replies, daily summaries — lives there. The platform just arms, configures, and watches.`}
        </p>
      </section>

      {/* Top-line */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <HeroMetric
            label="Agents armed"
            value={activeCount.toString()}
            unit={`/ ${agents.length}`}
            caption={`${totalCapacity} emails per day capacity across active agents`}
            size="md"
          />
        </div>
        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-3">
            <MetricBlock label="Agents" value={agents.length} />
            <MetricBlock label="Active" value={activeCount} trend={activeCount > 0 ? 'up' : 'flat'} />
            <MetricBlock label="Daily capacity" value={totalCapacity} delta="emails across agents" />
          </div>
        </div>
      </section>

      {/* Agents grid */}
      <section>
        <SectionHeader
          numeral="1"
          title="Your agents"
          subtitle={agents.length === 0 ? 'None yet' : `${agents.length} configured`}
          action={
            <Link href="/agents">
              <Button variant="ghost" size="sm">
                <span>View all</span>
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          }
        />
        <div className="mt-6">
          {agents.length === 0 ? (
            <div className="panel p-20 text-center">
              <Zap className="w-8 h-8 text-paper-4 mx-auto mb-4" />
              <p className="font-display italic text-paper-3 text-2xl font-light">
                No agents yet.
              </p>
              <Link href="/agents" className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4 inline-block">
                Create your first agent →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agents.slice(0, 6).map((agent, idx) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="panel p-6 hover:border-paper-4 transition-colors block group"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-4 min-w-0">
                      <span className="font-mono text-[10px] tracking-mega text-paper-4 pt-1.5 shrink-0">
                        №{(idx + 1).toString().padStart(3, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 shrink-0 relative ${agent.active ? 'bg-signal signal-dot' : 'bg-paper-4'}`} />
                          <span className={`font-mono text-[9px] tracking-mega uppercase ${agent.active ? 'text-signal' : 'text-paper-4'}`}>
                            {agent.active ? 'Armed' : 'Paused'}
                          </span>
                        </div>
                        <h3 className="font-display italic text-paper text-[26px] font-light leading-tight truncate">{agent.name}</h3>
                        {agent.description && (
                          <p className="font-ui text-[13px] text-paper-3 mt-2 line-clamp-2 leading-snug">{agent.description}</p>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-paper-4 group-hover:text-signal transition-colors shrink-0" />
                  </div>

                  <div className="grid grid-cols-3 gap-0 hairline border">
                    <NumCell label="Daily cap" value={`${agent.dailyCap}`} />
                    <NumCell label="Campaigns" value={`${agent._count.campaigns}`} />
                    <NumCell label="Runs" value={`${agent._count.runs}`} />
                  </div>

                  <div className="mt-4 pt-4 hairline-t flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-micro uppercase text-paper-4">
                      {agent.lastRunAt
                        ? `Last ran ${new Date(agent.lastRunAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric' })}`
                        : 'Never run'}
                    </span>
                    {agent.sheetUrl ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-signal">
                        <CheckCircle2 className="w-3 h-3" />
                        Sheet
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-paper-4">
                        <Circle className="w-3 h-3" />
                        No sheet
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <section className="hairline-t pt-6 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          Embedo · Operator
        </span>
        <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          Data lives in your Google Sheets
        </span>
      </section>
    </div>
  );
}

function NumCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 hairline-r last:border-r-0">
      <p className="label-sm">{label}</p>
      <p className="font-display italic font-light text-paper text-xl nums leading-none mt-1">{value}</p>
    </div>
  );
}
