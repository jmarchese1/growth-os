'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  campaignId: string;
  campaignName: string;
  prospectorUrl: string;
}

export function DeleteCampaignButton({ campaignId, campaignName, prospectorUrl }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`${prospectorUrl}/campaigns/${campaignId}`, { method: 'DELETE' });
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400 whitespace-nowrap">Delete &ldquo;{campaignName}&rdquo;?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-600 hover:text-red-400 hover:border-red-500/25 transition-colors"
      title="Delete campaign"
    >
      Delete
    </button>
  );
}
