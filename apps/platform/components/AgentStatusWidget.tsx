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
        className="fixed bottom-6 right-6 z-50 panel px-4 py-3 flex items-center gap-3 hover:border-signal transition-colors group"
        style={{ minWidth: 220 }}
      >
        <span className="relative w-2 h-2 shrink-0">
          <span className={`absolute inset-0 ${activeCount > 0 ? 'bg-signal signal-dot' : 'bg-paper-4'}`} />
        </span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <Zap className={`w-3 h-3 ${activeCount > 0 ? 'text-signal' : 'text-paper-4'}`} />
            <span className={`font-mono text-[10px] tracking-mega uppercase ${activeCount > 0 ? 'text-signal' : 'text-paper-4'}`}>
              {activeCount > 0 ? `${activeCount} Agent${activeCount !== 1 ? 's' : ''} active` : 'All agents paused'}
            </span>
          </div>
          <div className="font-mono text-[10px] text-paper-3 nums mt-0.5">
            {totalCap} emails/day capacity
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 panel w-[320px] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <header className="flex items-center justify-between px-4 py-3 hairline-b">
        <div className="flex items-center gap-2">
          <Zap className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-signal' : 'text-paper-4'}`} />
          <span className="font-mono text-[10px] tracking-mega uppercase text-paper-2">
            Agents · {activeCount}/{agents.length} active
          </span>
        </div>
        <button onClick={() => setExpanded(false)} className="text-paper-4 hover:text-paper transition-colors">
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
            <span className={`w-1.5 h-1.5 shrink-0 ${agent.active ? 'bg-signal' : 'bg-paper-4'}`} />
            <div className="flex-1 min-w-0">
              <p className="font-display italic text-paper text-sm font-light leading-tight truncate">
                {agent.name}
              </p>
              <p className="font-mono text-[9px] tracking-mega uppercase text-paper-4 mt-0.5">
                {agent.lastRunAt
                  ? `Last ran ${new Date(agent.lastRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'Never run'}
              </p>
            </div>
            <span className="font-mono text-[10px] text-paper-3 nums shrink-0">{agent.dailyCap}/day</span>
          </Link>
        ))}
      </div>

      <footer className="hairline-t">
        <Link href="/agents" className="flex items-center justify-between px-4 py-3 hover:bg-ink-2 transition-colors group">
          <span className="font-mono text-[10px] tracking-mega uppercase text-paper-3 group-hover:text-signal transition-colors">
            All agents
          </span>
          <ArrowUpRight className="w-3 h-3 text-paper-3 group-hover:text-signal transition-colors" />
        </Link>
      </footer>
    </div>
  );
}
