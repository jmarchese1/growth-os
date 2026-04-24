'use client';

import { useEffect, useState } from 'react';

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Sending soon';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function FollowUpTimer({ scheduledAt, stepNumber }: { scheduledAt: string; stepNumber: number }) {
  const [ms, setMs] = useState(() => new Date(scheduledAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setMs(new Date(scheduledAt).getTime() - Date.now());
    }, 30_000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  const isPast = ms <= 0;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold text-paper-4 uppercase tracking-wider">
        Follow-up {stepNumber}
      </span>
      <span className={`text-xs font-mono font-medium ${isPast ? 'text-signal animate-pulse' : 'text-amber-400'}`}>
        {isPast ? 'Sending soon…' : `in ${formatCountdown(ms)}`}
      </span>
    </div>
  );
}
