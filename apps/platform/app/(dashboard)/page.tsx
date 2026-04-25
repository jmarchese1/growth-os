import Link from 'next/link';
import { clsx } from 'clsx';
import { Zap, ArrowUpRight, Plus } from 'lucide-react';
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
    <div className="pt-10 pb-24 px-10 max-w-[1400px] mx-auto space-y-12">
      {/* Header */}
      <section className="flex items-end justify-between gap-8 pb-8 hairline-b">
        <div>
          <p className="text-[12px] text-paper-3 mb-2">{today}</p>
          <h1 className="text-paper text-[36px] font-semibold leading-tight tracking-tight">
            {activeCount > 0 ? 'Your agents are running.' : 'No agents running yet.'}
          </h1>
          <p className="text-paper-2 text-[15px] mt-3 max-w-xl leading-relaxed">
            {agents.length === 0
              ? 'Build your first agent — pick industries, cities, daily cap, and email copy. The agent handles discovery, enrichment, personalization, and sending.'
              : 'Every agent runs autonomously. Prospects, emails, replies, and bounces are tracked in the Data tab in real time.'}
          </p>
        </div>
        <div className="shrink-0">
          <Link href="/agents">
            <Button variant="primary">
              <Plus className="w-3.5 h-3.5" />
              <span>New agent</span>
            </Button>
          </Link>
        </div>
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
            <div className="panel p-16 text-center">
              <Zap className="w-7 h-7 text-paper-4 mx-auto mb-4" />
              <p className="text-paper text-[18px] font-medium">
                No agents yet
              </p>
              <Link href="/agents" className="text-[13px] text-signal hover:underline mt-3 inline-block font-medium">
                Create your first agent →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agents.slice(0, 6).map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="panel p-6 hover:shadow-card-hover hover:border-paper-4 transition-all block group"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
                            agent.active ? 'bg-signal/10 text-signal' : 'bg-ink-2 text-paper-3',
                          )}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'bg-signal' : 'bg-paper-4'}`} />
                          {agent.active ? 'Armed' : 'Paused'}
                        </span>
                      </div>
                      <h3 className="text-paper text-[18px] font-semibold tracking-tight leading-tight truncate">{agent.name}</h3>
                      {agent.description && (
                        <p className="text-[13px] text-paper-3 mt-1.5 line-clamp-2 leading-snug">{agent.description}</p>
                      )}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-paper-4 group-hover:text-signal transition-colors shrink-0" />
                  </div>

                  <div className="grid grid-cols-3 gap-0 rounded-lg border border-rule overflow-hidden">
                    <NumCell label="Daily cap" value={`${agent.dailyCap}`} />
                    <NumCell label="Campaigns" value={`${agent._count.campaigns}`} />
                    <NumCell label="Runs" value={`${agent._count.runs}`} />
                  </div>

                  <div className="mt-4 pt-4 border-t border-rule flex items-center justify-between">
                    <span className="text-[12px] text-paper-3">
                      {agent.lastRunAt
                        ? `Last ran ${new Date(agent.lastRunAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric' })}`
                        : 'Never run'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-paper-3 font-medium">
                      View in Data →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-rule pt-6 flex items-center justify-between">
        <span className="text-[12px] text-paper-3">
          Embedo
        </span>
        <Link href="/data" className="text-[12px] text-paper-3 hover:text-signal transition-colors">
          All activity in Data →
        </Link>
      </section>
    </div>
  );
}

function NumCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 border-r border-rule last:border-r-0 bg-ink-1">
      <p className="text-[11px] text-paper-3">{label}</p>
      <p className="text-paper text-[18px] nums font-semibold leading-none mt-1.5 tracking-tight">{value}</p>
    </div>
  );
}
