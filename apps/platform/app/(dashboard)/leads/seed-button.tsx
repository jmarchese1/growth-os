'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SeedTestLead({ prospectorUrl }: { prospectorUrl: string }) {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch(`${prospectorUrl}/seed/test-lead`, { method: 'POST' });
      if (res.ok) {
        setSeeded(true);
        setTimeout(() => {
          setSeeded(false);
          router.refresh();
        }, 1500);
      }
    } finally {
      setSeeding(false);
    }
  }

  return (
    <button
      onClick={handleSeed}
      disabled={seeding || seeded}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
      {seeded ? 'Test Lead Added!' : seeding ? 'Seeding...' : 'Seed Test Lead'}
    </button>
  );
}
