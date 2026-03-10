'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ConvertButton({ prospectId, prospectorUrl }: { prospectId: string; prospectorUrl: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  async function convert() {
    await fetch(`${prospectorUrl}/prospects/${prospectId}/convert`, { method: 'PATCH' });
    setDone(true);
    router.refresh();
  }

  if (done) return <span className="text-xs text-green-600 font-medium">Converted</span>;

  return (
    <button
      onClick={convert}
      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
    >
      Mark Converted
    </button>
  );
}
