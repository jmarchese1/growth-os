'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://embedoapi-production.up.railway.app';

interface Proposal {
  id: string;
  shareToken: string;
  status: string;
  viewedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  intakeData: {
    businessName: string;
    industry: string;
    size: string;
    location: string;
    currentSystems?: string;
    goals?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

export function ProposalPreviewModal({
  proposal,
  onClose,
  onSent,
}: {
  proposal: Proposal;
  onClose: () => void;
  onSent: (updatedProposal: Proposal) => void;
}) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchProposal() {
      try {
        const res = await fetch(`${API_URL}/proposals/${proposal.shareToken}`);
        if (res.ok) {
          const html = await res.text();
          setHtmlContent(html);
        }
      } catch (err) {
        console.error('Failed to fetch proposal:', err);
        setError('Failed to load proposal');
      } finally {
        setLoading(false);
      }
    }

    fetchProposal();
  }, [proposal.shareToken]);

  const handleSendProposal = async () => {
    if (!proposal.intakeData.contactEmail) {
      setError('No contact email provided');
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/proposals/${proposal.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactEmail: proposal.intakeData.contactEmail,
          contactName: proposal.intakeData.contactName,
          shareUrl: `https://embedo.io/proposal/${proposal.shareToken}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send proposal');
      }

      setSuccess(true);
      onSent({
        ...proposal,
        status: 'SENT',
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send proposal');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#0c0a18] rounded-2xl border border-white/10 max-w-md w-full p-8 text-center space-y-4">
          <div className="text-emerald-400 text-3xl">✓</div>
          <h2 className="text-xl font-bold text-white">Proposal Sent!</h2>
          <p className="text-slate-400 text-sm">
            Proposal sent to <span className="font-medium text-white">{proposal.intakeData.contactEmail}</span>
          </p>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-[#0c0a18] rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{proposal.intakeData.businessName}</h2>
            <p className="text-sm text-slate-400 mt-1">Proposal Preview</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-slate-500">Loading proposal...</p>
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="bg-red-500/15 border border-red-500/25 rounded-lg p-4 text-red-400 text-sm">{error}</div>
            </div>
          ) : (
            <div className="p-6">
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe srcDoc={htmlContent} className="w-full h-[600px] border-0" title="Proposal Preview" />
              </div>
            </div>
          )}
        </div>

        {/* Footer with send options */}
        {!loading && !error && (
          <div className="border-t border-white/10 p-6 flex-shrink-0 space-y-4">
            {proposal.intakeData.contactEmail ? (
              <div className="bg-blue-500/10 border border-blue-500/25 rounded-lg p-4">
                <p className="text-sm text-white mb-3">
                  Send to: <span className="font-medium">{proposal.intakeData.contactEmail}</span>
                  {proposal.intakeData.contactName && <span className="text-slate-400"> ({proposal.intakeData.contactName})</span>}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSendProposal}
                    disabled={sending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : 'Send via Email'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-4">
                <p className="text-sm text-amber-400">⚠ No contact email provided for this proposal</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <a
                href={`https://embedo.io/proposal/${proposal.shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-violet-600/20 text-violet-400 text-sm font-semibold rounded-lg hover:bg-violet-600/30 transition-colors text-center"
              >
                Open Public Link →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
