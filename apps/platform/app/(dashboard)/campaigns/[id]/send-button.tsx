'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SendButton({ prospectId, prospectorUrl }: { prospectId: string; prospectorUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function send() {
    setState('sending');
    setErrorMsg('');
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}/send`, { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Send failed');
        setState('error');
        return;
      }
      setState('sent');
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  }

  if (state === 'sent') return <span className="text-xs text-emerald-600 font-medium">Sent!</span>;
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
