'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SendButton({ prospectId, prospectorUrl }: { prospectId: string; prospectorUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'queued' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [delayMin, setDelayMin] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for queued sends
  useEffect(() => {
    if (state !== 'queued' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setState('sent');
          setTimeout(() => router.refresh(), 1500);
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
        setDelayMin(data.delayMinutes);
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
      <span className="text-xs text-amber-400 font-medium tabular-nums">
        Queued · {min}:{sec.toString().padStart(2, '0')}
      </span>
    );
  }

  if (state === 'error') return (
    <span className="text-xs text-red-500" title={errorMsg}>Failed — {errorMsg.slice(0, 40)}</span>
  );

  return (
    <button
      onClick={send}
      disabled={state === 'sending'}
      className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 border border-violet-500/50 transition-colors disabled:opacity-50 font-medium"
    >
      {state === 'sending' ? 'Sending…' : 'Send Now'}
    </button>
  );
}
