"use client";

/**
 * Floating agent status widget — bottom-right corner, minimal.
 * Shows live stats when running, quiet pulse when armed, dim when paused.
 * Click → opens /agent.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, ArrowUpRight, X } from 'lucide-react';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL']
  ?? 'https://prospector-production-bc03.up.railway.app';

interface MiniStatus {
  active: boolean;
  isRunning: boolean;
  emailsSentToday: number;
  globalDailyCap: number;
  campaignsActive: number;
  lastEvent?: { ts: string; msg: string; level: string };
}

export function AgentStatusWidget() {
  const [status, setStatus] = useState<MiniStatus | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let canceled = false;
    let timeout: NodeJS.Timeout;

    const load = async () => {
      try {
        const res = await fetch(`${PROSPECTOR_URL}/agent/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (canceled) return;

        // Only fetch events when expanded (saves a request on every page)
        let lastEvent: MiniStatus['lastEvent'];
        if (expanded && data.todayRun?.id) {
          const runRes = await fetch(`${PROSPECTOR_URL}/agent/runs/${data.todayRun.id}`);
          if (runRes.ok) {
            const run = await runRes.json();
            const events = (run.events as Array<{ ts: string; msg: string; level: string }>) ?? [];
            if (events.length > 0) lastEvent = events[events.length - 1];
          }
        }

        setStatus({
          active: data.config.active,
          isRunning: data.isRunning,
          emailsSentToday: data.todayRun?.emailsSent ?? 0,
          globalDailyCap: data.config.globalDailyCap,
          campaignsActive: data.campaigns.filter((c: { agentActive: boolean }) => c.agentActive).length,
          ...(lastEvent ? { lastEvent } : {}),
        });

        // Conditional polling: fast when running/expanded, slow when idle
        if (canceled) return;
        const nextInterval = data.isRunning ? 5000 : expanded ? 15000 : 60000;
        timeout = setTimeout(load, nextInterval);
      } catch {
        if (!canceled) timeout = setTimeout(load, 60000);
      }
    };

    load();
    return () => { canceled = true; clearTimeout(timeout); };
  }, [expanded]);

  if (!status) return null;

  const sendPct = status.globalDailyCap > 0
    ? Math.min(100, (status.emailsSentToday / status.globalDailyCap) * 100)
    : 0;

  const state = status.isRunning ? 'running' : status.active ? 'armed' : 'paused';
  const stateLabel = { running: 'Running', armed: 'Armed', paused: 'Paused' }[state];
  const stateColor = {
    running: 'text-signal',
    armed: 'text-signal',
    paused: 'text-paper-4',
  }[state];

  // ── Collapsed pill ────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 right-6 z-50 panel px-4 py-3 flex items-center gap-3 hover:border-signal transition-colors group"
        style={{ minWidth: 220 }}
      >
        <span className="relative w-2 h-2 shrink-0">
          <span className={`absolute inset-0 ${state === 'paused' ? 'bg-paper-4' : 'bg-signal'} ${state === 'running' ? 'signal-dot' : ''}`} />
        </span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <Zap className={`w-3 h-3 ${stateColor}`} />
            <span className={`font-mono text-[10px] tracking-mega uppercase ${stateColor}`}>
              Agent {stateLabel}
            </span>
          </div>
          <div className="font-mono text-[10px] text-paper-3 nums mt-0.5">
            {status.emailsSentToday} / {status.globalDailyCap} sent today
          </div>
        </div>
      </button>
    );
  }

  // ── Expanded card ────
  return (
    <div
      className="fixed bottom-6 right-6 z-50 panel w-[320px] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
    >
      <header className="flex items-center justify-between px-4 py-3 hairline-b">
        <div className="flex items-center gap-2">
          <Zap className={`w-3.5 h-3.5 ${stateColor}`} />
          <span className={`font-mono text-[10px] tracking-mega uppercase ${stateColor}`}>
            Agent · {stateLabel}
          </span>
        </div>
        <button onClick={() => setExpanded(false)} className="text-paper-4 hover:text-paper transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Today's progress bar */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="font-mono text-[9px] tracking-mega uppercase text-paper-4">Today</span>
            <span className="font-display italic font-light text-paper text-2xl nums leading-none">
              {status.emailsSentToday}<span className="text-paper-4 text-sm"> / {status.globalDailyCap}</span>
            </span>
          </div>
          <div className="h-[2px] bg-rule overflow-hidden">
            <div className="h-full bg-signal transition-all duration-500" style={{ width: `${sendPct}%` }} />
          </div>
        </div>

        {/* Campaigns */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-micro uppercase text-paper-3">Campaigns armed</span>
          <span className="font-mono text-sm text-paper nums">{status.campaignsActive}</span>
        </div>

        {/* Last event */}
        {status.lastEvent && (
          <div className="hairline-t pt-3">
            <span className="font-mono text-[9px] tracking-mega uppercase text-paper-4 block mb-1.5">Latest</span>
            <p className={`font-mono text-[11px] leading-relaxed line-clamp-2 ${
              status.lastEvent.level === 'success' ? 'text-signal' :
              status.lastEvent.level === 'error' ? 'text-ember' :
              status.lastEvent.level === 'warn' ? 'text-amber' :
              'text-paper-2'
            }`}>
              {status.lastEvent.msg}
            </p>
          </div>
        )}
      </div>

      <footer className="hairline-t">
        <Link
          href="/agent"
          className="flex items-center justify-between px-4 py-3 hover:bg-ink-2 transition-colors group"
        >
          <span className="font-mono text-[10px] tracking-mega uppercase text-paper-3 group-hover:text-signal transition-colors">
            Open control room
          </span>
          <ArrowUpRight className="w-3 h-3 text-paper-3 group-hover:text-signal transition-colors" />
        </Link>
      </footer>
    </div>
  );
}
