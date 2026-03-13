'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LeadRowActions({
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
  const [converted, setConverted] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function handleConvert(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Convert "${prospectName}" to a business?`)) return;
    setConverting(true);
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}/convert`, { method: 'PATCH' });
      if (res.ok) {
        setConverted(true);
        setTimeout(() => router.refresh(), 1000);
      }
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${prospectName}"? This removes all email history and cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleted(true);
        setTimeout(() => router.refresh(), 500);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (deleted) {
    return <span className="text-xs text-red-400">Deleted</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {status !== 'CONVERTED' && !converted && (
        <button
          onClick={handleConvert}
          disabled={converting}
          title="Convert to Business"
          className="p-1.5 rounded-md text-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
        >
          {converting ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      )}
      {converted && <span className="text-xs text-emerald-400">Converted!</span>}
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete Lead"
        className="p-1.5 rounded-md text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
