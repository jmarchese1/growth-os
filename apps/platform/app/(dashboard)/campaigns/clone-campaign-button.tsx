'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  campaignId: string;
  campaignName: string;
  prospectorUrl: string;
}

export function CloneCampaignButton({ campaignId, campaignName, prospectorUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClone() {
    const name = prompt('Name for the cloned campaign:', `${campaignName} (copy)`);
    if (!name) return;

    setLoading(true);
    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        router.push(`/campaigns/${data.id}`);
        router.refresh();
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClone}
      disabled={loading}
      className="px-3 py-1.5 bg-ink-2 border border-rule text-paper-3 text-xs font-medium rounded-lg hover:bg-ink-3 hover:text-white transition-colors disabled:opacity-50"
    >
      {loading ? 'Cloning...' : 'Clone'}
    </button>
  );
}
