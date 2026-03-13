'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LeadActions({
  prospectId,
  prospectName,
  status,
  prospectorUrl,
}: {
  prospectId: string;
  prospectName: string;
  status: string;
  prospectorUrl: string;
}) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConvert() {
    if (!confirm(`Convert "${prospectName}" to a business? This will create a new business record.`)) return;
    setConverting(true);
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}/convert`, { method: 'PATCH' });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${prospectName}" from your leads? This will remove all email history and cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/leads');
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status !== 'CONVERTED' && (
        <button
          onClick={handleConvert}
          disabled={converting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {converting ? 'Converting...' : 'Convert to Business'}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {deleting ? 'Deleting...' : 'Delete Lead'}
      </button>
    </div>
  );
}
