'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusiness } from '../../../../components/auth/business-provider';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  sentAt: string | null;
  sentCount: number | null;
  createdAt: string;
  business: { name: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-emerald-50 text-emerald-700',
  SCHEDULED: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { business } = useBusiness();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<number | null>(null);

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/campaigns/${id}`)
      .then((r) => r.json())
      .then((data: { success: boolean; campaign: Campaign }) => {
        if (data.success) setCampaign(data.campaign);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSend() {
    if (!id || !campaign) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/send`, { method: 'POST' });
      const data = await res.json() as { success: boolean; sentCount?: number; error?: string };
      if (data.success) {
        setSendSuccess(data.sentCount ?? 0);
        setCampaign((c) => c ? { ...c, status: 'SENT', sentAt: new Date().toISOString(), sentCount: data.sentCount ?? 0 } : c);
      } else {
        setSendError(data.error ?? 'Send failed');
      }
    } catch {
      setSendError('Network error — please try again');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8">
        <p className="text-slate-500 text-sm">Campaign not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-up max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/campaigns')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Campaigns
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{campaign.name}</h1>
            <p className="text-sm text-slate-400 mt-1">Created {formatDate(campaign.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[campaign.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {campaign.status}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 uppercase tracking-wide">
              {campaign.type}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {sendSuccess !== null && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Campaign sent to {sendSuccess} {campaign.type === 'EMAIL' ? 'email addresses' : 'phone numbers'}.
        </div>
      )}
      {sendError && (
        <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{sendError}</p>
          <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-slate-900">{campaign.sentCount ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Recipients</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-slate-900">{campaign.sentAt ? formatDate(campaign.sentAt).split(',')[0] : '—'}</p>
          <p className="text-xs text-slate-400 mt-1">Sent date</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-slate-900">{business?.counts?.contacts ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">Total contacts</p>
        </div>
      </div>

      {/* Subject line */}
      {campaign.subject && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</p>
          <p className="text-sm font-medium text-slate-700">{campaign.subject}</p>
        </div>
      )}

      {/* Body */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {campaign.type === 'EMAIL' ? 'Email Body' : 'SMS Message'}
        </p>
        {campaign.type === 'EMAIL' ? (
          <div
            className="prose prose-sm max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: campaign.body }}
          />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{campaign.body}</p>
        )}
      </div>

      {/* Action */}
      {campaign.status === 'DRAFT' && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
            {sending ? 'Sending…' : `Send to all ${campaign.type === 'EMAIL' ? 'email contacts' : 'phone contacts'}`}
          </button>
          <p className="text-xs text-slate-400">This will send immediately to all eligible contacts</p>
        </div>
      )}
      {campaign.status === 'SENT' && campaign.sentAt && (
        <p className="text-xs text-slate-400">Sent {formatDate(campaign.sentAt)} to {campaign.sentCount ?? 0} recipients.</p>
      )}
    </div>
  );
}
