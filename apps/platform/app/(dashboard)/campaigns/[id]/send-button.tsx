'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  prospectId: string;
  prospectorUrl: string;
  /** If the prospect has a queued send, pass the scheduled time */
  nextFollowUpAt?: string | null;
  /** Current prospect status */
  status?: string;
}

export function SendButton({ prospectId, prospectorUrl, nextFollowUpAt, status }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'queued' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // On mount, check if there's already a queued send
  useEffect(() => {
    if (nextFollowUpAt && status === 'ENRICHED') {
      const remaining = Math.max(0, Math.floor((new Date(nextFollowUpAt).getTime() - Date.now()) / 1000));
      if (remaining > 0 && remaining < 3600) { // Only show if under 1 hour
        setCountdown(remaining);
        setState('queued');
      }
    }
  }, [nextFollowUpAt, status]);

  // Countdown timer
  useEffect(() => {
    if (state !== 'queued' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setState('sent');
          setTimeout(() => router.refresh(), 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state, countdown, router]);

  async function send() {
    setState('sending');
    setErrorMsg('');
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}/send`, { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; error?: string; queued?: boolean; delayMinutes?: number };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Send failed');
        setState('error');
        return;
      }
      if (data.queued && data.delayMinutes) {
        setCountdown(data.delayMinutes * 60);
        setState('queued');
      } else {
        setState('sent');
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  }

  if (state === 'sent') return <span className="text-xs text-emerald-400 font-medium">Sent!</span>;

  if (state === 'queued') {
    const min = Math.floor(countdown / 60);
    const sec = countdown % 60;
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs text-amber-400 font-medium tabular-nums">
          Sending in {min}:{sec.toString().padStart(2, '0')}
        </span>
      </div>
    );
  }

  if (state === 'error') return (
    <span className="text-xs text-red-500" title={errorMsg}>Failed — {errorMsg.slice(0, 40)}</span>
  );

  return (
    <button
      onClick={send}
      disabled={state === 'sending'}
      className="text-xs px-3 py-1.5 rounded-lg bg-signal text-ink-0 text-white hover:bg-paper hover:text-ink-0 border border-signal transition-colors disabled:opacity-50 font-medium"
    >
      {state === 'sending' ? 'Sending…' : 'Send Now'}
    </button>
  );
}
