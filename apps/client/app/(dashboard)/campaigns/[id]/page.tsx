'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { EmailStylePicker } from '@/components/ui/email-style-picker';
import { getStyleById } from '@/lib/email-styles';
import type { EmailStyleOptions } from '@/lib/email-styles';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Campaign {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS';
  subject: string | null;
  body: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  sentCount: number;
  openCount: number;
  createdAt: string;
  sentAt?: string | null;
  business: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-500',
  SCHEDULED: 'bg-amber-100 text-amber-700',
  SENT: 'bg-emerald-100 text-emerald-700',
};

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'VOICE', label: 'Phone Call' },
  { value: 'CHATBOT', label: 'Chat Widget' },
  { value: 'SURVEY', label: 'Survey' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'QR_CODE', label: 'QR Code' },
  { value: 'WEBSITE', label: 'Website Form' },
];

const STATUS_TARGET_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'LEAD', label: 'Leads only' },
  { value: 'PROSPECT', label: 'Prospects only' },
  { value: 'CUSTOMER', label: 'Customers only' },
];

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Email style
  const [selectedStyle, setSelectedStyle] = useState('classic');
  const [styleOptions, setStyleOptions] = useState<EmailStyleOptions>({ color: '#7c3aed' });

  // Send targeting
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/campaigns/${id}`);
      const data = await res.json() as { success: boolean; campaign?: Campaign; error?: string };
      if (!data.success || !data.campaign) { setError(data.error ?? 'Campaign not found'); return; }
      setCampaign(data.campaign);
      setEditName(data.campaign.name);
      setEditSubject(data.campaign.subject ?? '');
      setEditBody(data.campaign.body);
    } catch {
      setError('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  useEffect(() => {
    if (!campaign || campaign.status !== 'DRAFT') return;
    setRecipientLoading(true);
    const p = new URLSearchParams();
    if (statusFilter) p.set('statusFilter', statusFilter);
    if (sourceFilter) p.set('sourceFilter', sourceFilter);
    fetch(`${API_URL}/campaigns/${id}/recipients?${p}`)
      .then((r) => r.json())
      .then((d: { success: boolean; count?: number }) => { if (d.success) setRecipientCount(d.count ?? 0); })
      .catch(() => {})
      .finally(() => setRecipientLoading(false));
  }, [id, campaign, statusFilter, sourceFilter]);

  async function handleSaveEdit() {
    setSaving(true);
    setSaveError('');
    try {
      const styledBody = campaign?.type === 'EMAIL' ? getStyleById(selectedStyle).wrap(editBody, styleOptions) : editBody;
      const res = await fetch(`${API_URL}/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, subject: editSubject || undefined, body: styledBody }),
      });
      const data = await res.json() as { success: boolean; campaign?: Campaign; error?: string };
      if (!data.success) { setSaveError(data.error ?? 'Failed to save'); return; }
      setCampaign(data.campaign!);
      setEditing(false);
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setSendError('');
    try {
      const res = await fetch(`${API_URL}/campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusFilter: statusFilter || undefined, sourceFilter: sourceFilter || undefined }),
      });
      const data = await res.json() as { success: boolean; sentCount?: number; error?: string };
      if (!data.success) { setSendError(data.error ?? 'Failed to send'); return; }
      await fetchCampaign();
      setShowConfirm(false);
    } catch {
      setSendError('Network error');
    } finally {
      setSending(false);
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (error || !campaign) return <div className="p-8 text-slate-500">{error || 'Not found'}</div>;

  const isDraft = campaign.status === 'DRAFT';
  const isSent = campaign.status === 'SENT';
  const openRate = isSent && campaign.sentCount > 0
    ? `${Math.round((campaign.openCount / campaign.sentCount) * 100)}%` : null;

  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Confirm Send Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Confirm Send</h2>
            <p className="text-sm text-slate-600">
              This will immediately send <span className="font-semibold text-slate-900">
                {recipientLoading ? '...' : `${recipientCount ?? 0} recipient${recipientCount !== 1 ? 's' : ''}`}
              </span> your campaign <span className="font-semibold">"{campaign.name}"</span>. This cannot be undone.
            </p>
            {sendError && <p className="text-sm text-red-500">{sendError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => void handleSend()} disabled={sending} className="flex-1 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60">
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <button onClick={() => router.push('/campaigns')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        Back to Campaigns
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[campaign.status]}`}>{campaign.status}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">{campaign.type}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{campaign.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Created {new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {campaign.sentAt ? ` · Sent ${new Date(campaign.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
            </p>
          </div>
          {isDraft && (
            <button onClick={() => { setEditing(!editing); setSaveError(''); }} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              {editing ? 'Cancel Edit' : 'Edit'}
            </button>
          )}
        </div>
        {isSent && (
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {[
              { label: 'Sent to', value: campaign.sentCount },
              { label: 'Opens', value: campaign.openCount },
              { label: 'Open rate', value: openRate ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && isDraft && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Edit Campaign</h2>
          <div>
            <label className="text-xs text-slate-500 font-medium">Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          {campaign.type === 'EMAIL' && (
            <>
              <EmailStylePicker
                selectedStyle={selectedStyle}
                onStyleChange={setSelectedStyle}
                options={styleOptions}
                onOptionsChange={setStyleOptions}
              />
              <div>
                <label className="text-xs text-slate-500 font-medium">Subject line</label>
                <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-slate-500 font-medium">{campaign.type === 'EMAIL' ? 'Email body (HTML)' : 'Message'}</label>
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} className={`mt-1 ${inputClass} resize-none font-mono text-xs`} />
            {campaign.type === 'SMS' && <p className="text-[10px] text-slate-400 mt-1">{editBody.length}/160 characters</p>}
          </div>
          {campaign.type === 'EMAIL' && editBody.trim() && (
            <div>
              <label className="text-xs text-slate-500 font-medium">Preview</label>
              <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <iframe
                  srcDoc={getStyleById(selectedStyle).wrap(editBody, styleOptions)}
                  className="w-full border-0"
                  style={{ height: '300px' }}
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={() => void handleSaveEdit()} disabled={saving || !editName.trim() || !editBody.trim()} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {!editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">{campaign.type === 'EMAIL' ? 'Email Preview' : 'Message Preview'}</h2>
          {campaign.type === 'EMAIL' && campaign.subject && (
            <p className="text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100">Subject: <span className="font-medium text-slate-700">{campaign.subject}</span></p>
          )}
          {campaign.type === 'EMAIL' ? (
            <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
              <iframe srcDoc={campaign.body} className="w-full border-0" style={{ height: '360px' }} title="Email preview" sandbox="allow-same-origin" />
            </div>
          ) : (
            <div className="max-w-xs">
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700">{campaign.body}</div>
              <p className="text-[10px] text-slate-400 mt-1">{campaign.body.length}/160 chars</p>
            </div>
          )}
        </div>
      )}

      {/* Send section */}
      {isDraft && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Send to Contacts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Filter which contacts receive this campaign</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{recipientLoading ? '...' : (recipientCount ?? '—')}</p>
              <p className="text-xs text-slate-400">recipients</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`mt-1 ${inputClass} bg-white`}>
                {STATUS_TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Source</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={`mt-1 ${inputClass} bg-white`}>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={recipientLoading || recipientCount === 0}
              className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              Send to {recipientLoading ? '...' : (recipientCount ?? 0)} contacts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
