"use client";

/**
 * Floating multi-agent status widget — bottom-right.
 * Shows aggregate across all agents. Click → /agents.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, ArrowUpRight, X } from 'lucide-react';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface AgentSummary {
  id: string;
  name: string;
  active: boolean;
  dailyCap: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export function AgentStatusWidget() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeout: NodeJS.Timeout;

    const load = async () => {
      try {
        const res = await fetch(`${PROSPECTOR_URL}/agents`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAgents(Array.isArray(data) ? data : []);
        timeout = setTimeout(load, expanded ? 15000 : 60000);
      } catch {
        if (!cancelled) timeout = setTimeout(load, 60000);
      }
    };
    load();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [expanded]);

  if (agents.length === 0) return null;

  const activeCount = agents.filter((a) => a.active).length;
  const totalCap = agents.reduce((a, ag) => a + (ag.active ? ag.dailyCap : 0), 0);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 right-6 z-50 panel rounded-apple-lg px-4 py-3 flex items-center gap-3 hover:shadow-card-hover hover:border-signal transition-all group"
        style={{ minWidth: 220 }}
      >
        <span className="relative w-1.5 h-1.5 shrink-0 rounded-full">
          <span className={`absolute inset-0 rounded-full ${activeCount > 0 ? 'bg-signal signal-dot' : 'bg-paper-4'}`} />
        </span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <Zap className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-signal' : 'text-paper-4'}`} />
            <span className={`text-[12px] font-medium ${activeCount > 0 ? 'text-signal' : 'text-paper-3'}`}>
              {activeCount > 0 ? `${activeCount} agent${activeCount !== 1 ? 's' : ''} active` : 'All agents paused'}
            </span>
          </div>
          <div className="text-[12px] text-paper-3 nums mt-0.5">
            {totalCap} emails/day capacity
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 panel w-[320px] rounded-apple-lg shadow-card-hover">
      <header className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <Zap className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-signal' : 'text-paper-4'}`} />
          <span className="text-[13px] font-semibold text-paper tracking-tight">
            Agents · {activeCount}/{agents.length} active
          </span>
        </div>
        <button onClick={() => setExpanded(false)} className="text-paper-3 hover:text-paper transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="divide-y divide-rule">
        {agents.slice(0, 6).map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="flex items-center gap-3 p-3 hover:bg-ink-2 transition-colors group"
          >
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${agent.active ? 'bg-signal' : 'bg-paper-4'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-paper text-[13px] font-medium tracking-tight leading-tight truncate">
                {agent.name}
              </p>
              <p className="text-[11px] text-paper-3 mt-0.5">
                {agent.lastRunAt
                  ? `Last ran ${new Date(agent.lastRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'Never run'}
              </p>
            </div>
            <span className="text-[12px] text-paper-3 nums shrink-0">{agent.dailyCap}/day</span>
          </Link>
        ))}
      </div>

      <footer className="border-t border-rule">
        <Link href="/agents" className="flex items-center justify-between px-4 py-3 hover:bg-ink-2 transition-colors group">
          <span className="text-[12px] text-paper-3 font-medium group-hover:text-signal transition-colors">
            All agents
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-paper-3 group-hover:text-signal transition-colors" />
        </Link>
      </footer>
    </div>
  );
}
