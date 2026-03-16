'use client';

import { useState } from 'react';
import KpiCard from '../../../components/ui/kpi-card';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms';
  subject: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: string;
}

const TYPE_BADGES: Record<string, string> = {
  email: 'bg-sky-100 text-sky-700',
  sms: 'bg-emerald-100 text-emerald-700',
};

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  scheduled: 'bg-amber-100 text-amber-700',
  sent: 'bg-emerald-100 text-emerald-700',
};

/* ── Create Campaign Modal ──────────────────────────────────────── */
function CreateCampaignModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (c: Campaign) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'email' | 'sms'>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  function handleCreate() {
    if (!name.trim() || !body.trim()) return;
    onCreate({
      id: `camp_${Date.now()}`,
      name: name.trim(),
      type,
      subject: subject.trim(),
      body: body.trim(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">New Campaign</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Campaign Type</label>
            <div className="flex gap-2">
              {(['email', 'sms'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    type === t
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t === 'email' ? 'Email Campaign' : 'SMS Campaign'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. March Happy Hour Promo"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
            />
          </div>

          {/* Subject (email only) */}
          {type === 'email' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. This week only: 20% off dinner"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
              />
            </div>
          )}

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {type === 'email' ? 'Email Body' : 'Message'}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={type === 'email'
                ? 'Write your email content here...'
                : 'Keep it under 160 characters for best results'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
            />
            {type === 'sms' && (
              <p className="text-[10px] text-slate-400 mt-1">{body.length}/160 characters</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !body.trim()}
              className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              Create Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('embedo_campaigns') ?? '[]');
    } catch {
      return [];
    }
  });

  function saveCampaigns(list: Campaign[]) {
    setCampaigns(list);
    localStorage.setItem('embedo_campaigns', JSON.stringify(list));
  }

  function handleCreate(c: Campaign) {
    saveCampaigns([c, ...campaigns]);
    setShowCreate(false);
  }

  function handleDelete(id: string) {
    saveCampaigns(campaigns.filter((c) => c.id !== id));
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">Email and SMS marketing to your existing customers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active Campaigns" value={campaigns.filter((c) => c.status !== 'draft').length} color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>} />
        <KpiCard label="Emails Sent" value="0" color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>} />
        <KpiCard label="Open Rate" value="0%" color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Customers Reached" value="0" color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Your Campaigns</h2>
          {campaigns.length > 0 && <span className="text-xs text-slate-400">{campaigns.length} total</span>}
        </div>

        {campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No campaigns yet. Create your first campaign to start reaching your customers with promotions, updates, and announcements.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Created</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    {c.subject && <p className="text-xs text-slate-400 truncate max-w-xs">{c.subject}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGES[c.type]}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
